import {prisma} from '../db.js';
import {saveOrMergeEvent} from '../merging/eventMerger.js';
import {logInfo} from '../logger.js';
import {SOURCE_USER_AGENT} from './sourceAccess.js';
import {ORGANIZER_PAGES,parseMountainQuest,parseBairrada} from './organizerParser.js';
import {retryAt} from './stopandgoAccess.js';
import {monthEnd,raceMonth} from '../../utils/partialDates.js';

export const ORGANIZER_GROUPS=Object.freeze({mq:{name:'MQ Series',pages:['mq','mqRegistration','series','salvador','castelo','terra']},bairrada:{name:'Bairrada 150',pages:['bairrada','bairradaRules']}});
export const organizerStateId=group=>'operational-organizer-'+group;
export function nextOrganizerCheck(now) {const date=new Date(now);return new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,1,5)).toISOString();}
export async function organizerStatus(db=prisma){return Promise.all(Object.entries(ORGANIZER_GROUPS).map(async([id,group])=>{const row=await db.systemLog.findUnique({where:{id:organizerStateId(id)}});return {id,name:group.name,...(row?.details?JSON.parse(row.details):{status:'not-run',nextCheckAt:null})};}));}
// The enclosing pipeline lease serializes collection. The persisted claim is
// written before network access, so workflow re-entry cannot repeat a month's reads.
export async function collectOrganizer(group,options={},deps={}) {
 const db=deps.db||prisma,fetcher=deps.fetcher||fetch,wait=deps.wait||(ms=>new Promise(r=>setTimeout(r,ms))),now=deps.now||(()=>new Date()),save=deps.save||saveOrMergeEvent;
 const definition=ORGANIZER_GROUPS[group];if(!definition)throw Error('Organização inválida');
 const id=organizerStateId(group),previous=await db.systemLog.findUnique({where:{id}}),before=previous?.details?JSON.parse(previous.details):{};
 const started=now(),nextCheckAt=nextOrganizerCheck(started);
 if(before.nextCheckAt&&Date.parse(before.nextCheckAt)>started.getTime()) {await logInfo('SCRAPER',`${definition.name}: consulta mensal ainda não devida.`,{event:'organizer-skipped',nextCheckAt:before.nextCheckAt});return {skipped:true,nextCheckAt:before.nextCheckAt,events:[]};}
 const state={...before,status:'running',lastAttemptAt:started.toISOString(),nextCheckAt};
 const persist=async()=>{const data={source:'SYSTEM',level:'INFO',message:`Estado mensal de ${definition.name}`,details:JSON.stringify(state),createdAt:now()};await db.systemLog.upsert({where:{id},create:{id,...data},update:data});};
 await persist();
 const pages={},hosts=new Map();
 try {
  for(const page of definition.pages){
   const url=ORGANIZER_PAGES[page],host=new URL(url).hostname,gateId='operational-organizer-access-'+host.replaceAll('.','-');
   const gate=await db.systemLog.findUnique({where:{id:gateId}}),blocked=gate?.details&&JSON.parse(gate.details);
   if(blocked?.retryAt&&Date.parse(blocked.retryAt)>now().getTime())throw Error(`${host}: suspenso até ${blocked.retryAt}`);
   if(hosts.has(host))await wait(Math.max(0,2000-(now().getTime()-hosts.get(host))));
   hosts.set(host,now().getTime());
   const response=await fetcher(url,{headers:{'User-Agent':SOURCE_USER_AGENT},redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(12000)});
   if([401,403,429].includes(response.status)) {
    const until=new Date(retryAt(response,now().getTime())).toISOString();
    const data={source:'SYSTEM',level:'INFO',message:`Acesso suspenso: ${host}`,details:JSON.stringify({status:response.status,retryAt:until}),createdAt:now()};
    await db.systemLog.upsert({where:{id:gateId},create:{id:gateId,...data},update:data});
    await response.body?.cancel();throw Error(`${host}: HTTP ${response.status}; nova consulta não antes de ${until}`);
   }
   if(!response.ok)throw Error(`${host}: HTTP ${response.status}`);
   if(Number(response.headers.get('content-length'))>3000000)throw Error(`${host}: página demasiado extensa`);
   pages[page]=await response.text();if(pages[page].length>3000000)throw Error(`${host}: página demasiado extensa`);
  }
  const rows=group==='mq'?parseMountainQuest(pages.mq,pages.mqRegistration,pages.series,pages):parseBairrada(pages.bairrada,pages.bairradaRules);
  const today=started.toISOString().slice(0,10),years=options.years||[String(started.getUTCFullYear()),String(started.getUTCFullYear()+1)];
  const current=rows.filter(row=>years.includes(String(row.sortDate.getUTCFullYear()))&&(raceMonth(row)?monthEnd(raceMonth(row)):row.temporalEvidence.race.value)>=today);
  for(const row of current)await save(db,row,{...options,verifiedSource:definition.name});
  state.status='done';state.lastSuccessAt=now().toISOString();state.message=current.length?`${current.length} provas atuais verificadas`:'Sem nova edição atual publicada';state.count=current.length;delete state.error;
  await options.onCoverage?.({discovered:rows.length,saved:current.length,past:rows.length-current.length,nonCycling:0,outsideYears:0,unavailable:0,failed:0,unresolved:0});
  state.events=current.map(row=>({id:row.id,title:row.title,date:row.date,link:row.link,registrationOpensAt:row.registrationOpensAt||null}));
  state.warnings=current.flatMap(row=>row._warnings||[]);
  await persist();return {events:current,nextCheckAt};
 }catch(error){state.status='error';state.error=String(error.message).slice(0,1000);state.message='Consulta incompleta; dados anteriores conservados';await persist();throw Object.assign(error,{retryable:false});}
}
