import {auth,clerkClient} from '@clerk/nextjs/server';
import {Resend} from 'resend';
import {prisma} from '@/app/lib/db';
import {privateJson,sameOriginJson} from '@/app/lib/requestBody';
import {editionEmailAvailable} from '@/app/lib/favoriteEditionSettings';
import {sendOwnTestEmail,emailTestId} from '@/app/lib/emailDiagnostics';
export const dynamic='force-dynamic';
export async function POST(request){
 const {userId}=await auth();if(!userId)return privateJson({error:'Unauthorized'},401);
 try{
  await sameOriginJson(request);if(!editionEmailAvailable())return privateJson({error:'O envio de email está indisponível.'},503);
  const client=await clerkClient(),user=await client.users.getUser(userId);if(user.id!==userId)return privateJson({error:'Unauthorized'},401);
  const resend=new Resend(process.env.RESEND_API_KEY);
  return privateJson(await sendOwnTestEmail({db:prisma,user,send:(message,key)=>resend.emails.send({from:process.env.EDITION_ALERTS_FROM_EMAIL,...message},{idempotencyKey:key})}));
 }catch(error){return privateJson({error:error.status?error.message:'Não foi possível enviar o teste.'},error.status||503);}
}
export async function GET(){
 const {userId}=await auth();if(!userId)return privateJson({error:'Unauthorized'},401);
 try{
  const row=await prisma.systemLog.findUnique({where:{id:emailTestId(userId)}});
  if(!row||row.userId!==userId)return privateJson({status:'none'});
  const details=JSON.parse(row.details);let status=details.status;
  if(details.emailId&&process.env.RESEND_API_KEY){const result=await new Resend(process.env.RESEND_API_KEY).emails.get(details.emailId);if(!result.error&&result.data?.last_event)status=result.data.last_event;}
  return privateJson({status,sentAt:row.createdAt.toISOString()});
 }catch{return privateJson({error:'Não foi possível consultar a entrega.'},503);}
}
