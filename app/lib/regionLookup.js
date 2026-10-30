import {createHash, randomUUID} from 'node:crypto';

export const REGION_LOOKUP_LEASE = 'operational-nominatim-lease';
const cache = new Map();
const failure = (code,status) => Object.assign(new Error(code),{status});

export function regionLookupUrl(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw failure('INVALID_LOOKUP',400);
    if (input.mode === 'search') {
        if (typeof input.query !== 'string' || input.query.trim().length < 2 || input.query.length > 100 || /[\u0000-\u001f]/u.test(input.query)) throw failure('INVALID_LOOKUP',400);
        const url=new URL('https://nominatim.openstreetmap.org/search');
        url.search=new URLSearchParams({format:'jsonv2',countrycodes:'pt',limit:'1',addressdetails:'1',q:input.query.trim()}).toString();
        return url;
    }
    if (input.mode === 'reverse' && Number.isFinite(input.latitude) && Number.isFinite(input.longitude) && Math.abs(input.latitude)<=90 && Math.abs(input.longitude)<=180) {
        const url=new URL('https://nominatim.openstreetmap.org/reverse');
        // District suggestions do not require precise household coordinates.
        url.search=new URLSearchParams({format:'jsonv2',zoom:'8',addressdetails:'1',lat:input.latitude.toFixed(2),lon:input.longitude.toFixed(2)}).toString();
        return url;
    }
    throw failure('INVALID_LOOKUP',400);
}

function minimalPlace(value) {
    if (!value || typeof value !== 'object') return null;
    if (value.address?.country_code && value.address.country_code !== 'pt') return null;
    const address={};
    for (const key of ['city','county','state_district','state']) {
        const item=value.address?.[key];
        if(typeof item==='string' && item.length<=150)address[key]=item;
    }
    const display_name=[...new Set(Object.values(address))].join(', ');
    return display_name ? {address,display_name} : null;
}

export async function lookupRegion(input,{db,fetchImpl=fetch,clock=Date.now,cacheStore=cache}={}) {
    const url=regionLookupUrl(input);
    const key=createHash('sha256').update(url.href).digest('hex');
    const stored=cacheStore.get(key);
    if(stored?.expires>clock())return stored.result;
    const token=JSON.stringify({lease:randomUUID()});
    const data={source:'SYSTEM',level:'INFO',message:'Reserva de consulta geográfica',details:token,createdAt:new Date(clock()+30000)};
    let acquired=false;
    try {await db.systemLog.create({data:{id:REGION_LOOKUP_LEASE,...data}});acquired=true;}
    catch(error){
        if(error.code!=='P2002')throw error;
        acquired=!!(await db.systemLog.updateMany({where:{id:REGION_LOOKUP_LEASE,createdAt:{lte:new Date(clock())}},data})).count;
    }
    if(!acquired)throw failure('LOOKUP_BUSY',429);
    try {
        const response=await fetchImpl(url.href,{
            headers:{'User-Agent':'CyclingCalendar/2.0 (+https://www.cyclingcalendar.pt/contacto)','Accept':'application/json','Referer':'https://www.cyclingcalendar.pt/'},
            signal:AbortSignal.timeout(8000),redirect:'error',cache:'no-store',
        });
        if(!response.ok)throw failure('LOOKUP_UNAVAILABLE',503);
        const payload=await response.json();
        const result=input.mode==='search' ? (Array.isArray(payload)?payload.map(minimalPlace).filter(Boolean).slice(0,1):[]) : minimalPlace(payload);
        // Instance-local bounded cache: hashed keys, regional facts only, no account/IP.
        for(const [id,item]of cacheStore)if(item.expires<=clock())cacheStore.delete(id);
        if(cacheStore.size>=64)cacheStore.delete(cacheStore.keys().next().value);
        cacheStore.set(key,{result,expires:clock()+3600000});
        return result;
    } finally {
        // One outstanding request per application, then more than a second cooldown.
        await db.systemLog.updateMany({where:{id:REGION_LOOKUP_LEASE,details:token},data:{details:null,createdAt:new Date(clock()+1200)}});
    }
}
