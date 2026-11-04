import { prisma } from '@/app/lib/db';
import { requireAdmin } from '@/app/lib/auth-helpers';
import { PUBLISHED_EVENTS_WHERE } from '@/app/lib/admin/eventInventory';
import { eventPath } from '@/app/lib/eventDiscovery';

export const dynamic = 'force-dynamic';
const respond = (body, status=200) => Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(request) {
    const access=await requireAdmin();
    if(!access.authorized)return respond({success:false,error:access.error},access.status);
    const params=new URL(request.url).searchParams, pageText=params.get('page')||'1', period=params.get('period')||'future', source=params.get('source')||'', query=(params.get('search')||'').trim();
    const sources=['FPC','Cabreira','Stop and Go','Recorde Pessoal','Apedalar','Organizador'];
    if(!/^[1-9]\d{0,5}$/.test(pageText)||!['future','past','all'].includes(period)||source&&!sources.includes(source)||query.length>200)return respond({success:false,error:'Filtros inválidos.'},400);
    const today=new Date(new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Lisbon',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())+'T00:00:00Z');
    const where={AND:[PUBLISHED_EVENTS_WHERE,...(period==='all'?[]:[{sortDate:period==='past'?{lt:today}:{gte:today}}]),...(source?[{source:{contains:source,mode:'insensitive'}}]:[]),...(query?[{OR:['title','details','distrito','regiao'].map(field=>({[field]:{contains:query,mode:'insensitive'}}))}]:[])]};
    try {
        const result=await prisma.$transaction(async tx=>{
            const total=await tx.event.count({where}), pages=Math.max(1,Math.ceil(total/20)), page=Math.min(Number(pageText),pages);
            const events=await tx.event.findMany({where,skip:(page-1)*20,take:20,orderBy:[{sortDate:period==='past'?'desc':'asc'},{id:'asc'}],select:{id:true,title:true,date:true,sortDate:true,details:true,distrito:true,regiao:true,ambito:true,tag:true,source:true,link:true,updatedAt:true,registrationClosesAt:true}});
            return {events:events.map(event=>({...event,path:eventPath(event)})),total,page,pages};
        },{isolationLevel:'RepeatableRead'});
        return respond({success:true,...result});
    } catch {return respond({success:false,error:'Não foi possível consultar as provas. Tenta novamente.'},503);}
}
