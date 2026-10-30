import {prisma} from '@/app/lib/db';
import {requireAdmin} from '@/app/lib/auth-helpers';
import {reviewSubmission} from '@/app/lib/organizerSubmissions';
import {sameOriginJson,privateJson} from '@/app/lib/requestBody';
import {revalidateTag} from 'next/cache';
export const dynamic='force-dynamic';
export async function GET(){
    const admin=await requireAdmin();if(!admin.authorized)return privateJson({error:'Unauthorized'},admin.status);
    try{return privateJson({submissions:await prisma.organizerSubmission.findMany({orderBy:{createdAt:'desc'},take:100})});}catch{return privateJson({error:'Unavailable'},503);}
}
export async function POST(request){
    const admin=await requireAdmin();if(!admin.authorized)return privateJson({error:'Unauthorized'},admin.status);
    try{const result=await reviewSubmission(prisma,await sameOriginJson(request));if(result.status==='APPROVED')revalidateTag('calendar-events',{expire:0});return privateJson(result);}
    catch(error){return privateJson({error:error.status?error.message:'Review unavailable'},error.status||503);}
}
