import {prisma} from '@/app/lib/db';
import {requireAdmin} from '@/app/lib/auth-helpers';
import {reviewSubmission} from '@/app/lib/organizerSubmissions';
import {sameOriginJson,privateJson} from '@/app/lib/requestBody';
import {revalidateTag} from 'next/cache';
export const dynamic='force-dynamic';
export async function GET(request){
    const admin=await requireAdmin();if(!admin.authorized)return privateJson({error:'Unauthorized'},admin.status);
    const params=new URL(request?.url||'https://local.test/api/admin/submissions').searchParams,status=params.get('status')||'PENDING',pageValue=params.get('page')||'1';
    if(!['PENDING','APPROVED','REJECTED','ALL'].includes(status)||!/^[1-9]\d{0,5}$/.test(pageValue))return privateJson({error:'Filtros inválidos.'},400);
    try{return privateJson(await prisma.$transaction(async tx=>{
        const where=status==='ALL'?{}:{status};
        const total=await tx.organizerSubmission.count({where}),pendingCount=await tx.organizerSubmission.count({where:{status:'PENDING'}}),pages=Math.max(1,Math.ceil(total/20)),page=Math.min(Number(pageValue),pages);
        const submissions=await tx.organizerSubmission.findMany({where,orderBy:[{createdAt:'desc'},{id:'asc'}],take:20,skip:(page-1)*20});
        return {submissions,total,pendingCount,page,pages};
    },{isolationLevel:'RepeatableRead'}));}catch{return privateJson({error:'Não foi possível consultar as submissões.'},503);}
}
export async function POST(request){
    const admin=await requireAdmin();if(!admin.authorized)return privateJson({error:'Unauthorized'},admin.status);
    try{const result=await reviewSubmission(prisma,await sameOriginJson(request));if(result.status==='APPROVED')revalidateTag('calendar-events',{expire:0});return privateJson(result);}
    catch(error){return privateJson({error:error.status?error.message:'Review unavailable'},error.status||503);}
}
