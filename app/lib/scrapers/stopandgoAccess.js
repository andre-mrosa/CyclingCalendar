import { assertSourceAccess, SOURCE_USER_AGENT } from './sourceAccess.js';

export const STOPANDGO_ACCESS_ID = 'operational-stopandgo-access';
export const STOPANDGO_INTERVAL_MS = 2000;
export function retryAt(response, timestamp) {
    const value = response.headers?.get('retry-after')?.trim();
    const parsed = value && /^\d+$/.test(value) ? timestamp + Number(value) * 1000 : Date.parse(value || '');
    return Number.isFinite(parsed) && parsed > timestamp ? parsed : timestamp + (response.status === 429 ? 3600000 : 86400000);
}
function refusal(until, status=429) {
    return Object.assign(new Error(`Stop and Go: recolha suspensa após HTTP ${status}; nova consulta apenas a partir de ${new Date(until).toISOString()}.`), {
        code:'SOURCE_ACCESS_DENIED',retryable:false,status,retryAt:new Date(until).toISOString(),
    });
}
// One queue is shared by sitemap, listings and details for the entire source stage.
// The persisted gate also applies after a manual restart or a cold server invocation.
export function createStopAndGoAccess({ db, fetcher=fetch, now=Date.now, wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)), interval=STOPANDGO_INTERVAL_MS, deadline=Infinity, notBefore=0 }={}) {
    let tail=Promise.resolve(), nextRequest=notBefore, gateLoaded=false, blocked=null;
    async function read(url, options={}) {
        const target=new URL(url);
        if(target.origin!=='https://stopandgo.net')throw Error('Stop and Go: pedido fora da origem autorizada');
        if(!gateLoaded) {
            const row=await db?.systemLog?.findUnique?.({where:{id:STOPANDGO_ACCESS_ID}});
            if(row?.details) {
                const value=JSON.parse(row.details), until=Date.parse(value.retryAt);
                const resolved=value.status===200 && value.retryAt===null;
                if(!resolved && !Number.isFinite(until))throw Error('Stop and Go: período de espera inválido; confirmar o estado operacional');
                if(!resolved && until>now())blocked=refusal(until,value.status);
            } else {
                // The first updated run must also respect a refusal logged by
                // the previous deployment, which did not yet persist Retry-After.
                const previous=await db?.systemLog?.findFirst?.({where:{source:'SCRAPER',createdAt:{gte:new Date(now()-86400000)},AND:[{message:{contains:'Stop and Go'}},{OR:[401,403,429].map(status=>({message:{contains:`HTTP ${status}`}}))}]},orderBy:{createdAt:'desc'},select:{message:true,createdAt:true}});
                const status=Number(previous?.message?.match(/HTTP (401|403|429)/)?.[1]);
                if(status) {
                    const until=retryAt({status},new Date(previous.createdAt).getTime());
                    if(until>now()) {
                        blocked=refusal(until,status);
                        const data={source:'SYSTEM',level:'INFO',message:'Período de espera operacional da fonte Stop and Go',details:JSON.stringify({status,retryAt:new Date(until).toISOString()}),createdAt:new Date(now())};
                        await db?.systemLog?.upsert?.({where:{id:STOPANDGO_ACCESS_ID},create:{id:STOPANDGO_ACCESS_ID,...data},update:data});
                    }
                }
            }
            gateLoaded=true;
        }
        if(blocked)throw blocked;
        const pause=nextRequest-now(); if(pause>0)await wait(pause);
        if(now()>=deadline)throw Object.assign(new Error('Stop and Go: limite de tempo da descoberta atingido; recolha incompleta.'),{retryable:false});
        // AbortSignal.timeout must start after waiting, not while queued.
        nextRequest=now()+interval;
        const response=await fetcher(target.href,{...options,headers:{...options.headers,'User-Agent':SOURCE_USER_AGENT},signal:AbortSignal.timeout(12000)});
        try {assertSourceAccess(response,'Stop and Go');}
        catch(error) {
            const until=retryAt(response,now()); blocked=refusal(until,response.status);
            const data={source:'SYSTEM',level:'INFO',message:'Período de espera operacional da fonte Stop and Go',details:JSON.stringify({status:response.status,retryAt:new Date(until).toISOString()}),createdAt:new Date(now())};
            try {await db?.systemLog?.upsert?.({where:{id:STOPANDGO_ACCESS_ID},create:{id:STOPANDGO_ACCESS_ID,...data},update:data});}
            catch {blocked.message+=' Não foi possível guardar o período de espera.';}
            await response.body?.cancel(); throw blocked;
        }
        return response;
    }
    const queued = (url, options) => {
        const request=tail.then(()=>read(url,options));
        tail=request.catch(()=>{}); return request;
    };
    queued.nextAllowedAt=()=>nextRequest;
    queued.markResolved=async()=>{
        const row=await db?.systemLog?.findUnique?.({where:{id:STOPANDGO_ACCESS_ID}});
        const gate=row?.details&&JSON.parse(row.details);
        if(gate?.status===429 && Date.parse(gate.retryAt)<=now()) {
            await db.systemLog.updateMany({where:{id:STOPANDGO_ACCESS_ID,details:row.details},data:{details:JSON.stringify({...gate,status:200,retryAt:null,resolvedAt:new Date(now()).toISOString()})}});
        }
    };
    return queued;
}
