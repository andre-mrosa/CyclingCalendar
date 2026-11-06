import {verifiedEmail} from '../utils/favoriteAlerts.js';
export const EMAIL_TEST_INTERVAL_MS=15*60000;
export const emailTestId=userId=>'operational-email-test-'+userId;
export function diagnosticEmail(){return {subject:'Cycling Calendar — email de teste',text:'Este é um email de teste do Cycling Calendar, enviado a teu pedido.\n\nSe recebeste esta mensagem, o serviço de email da app conseguiu chegar à tua caixa de correio.\n\nEste teste não anuncia alterações a provas nem datas de inscrições. Os emails automáticos de alterações só são enviados quando existe uma alteração confirmada nas provas que segues.\n\nAbrir as minhas provas: https://www.cyclingcalendar.pt/minhas-provas'};}
export async function sendOwnTestEmail({db,user,send,now=new Date()}){
 const to=verifiedEmail(user);if(!to)throw Object.assign(Error('É necessário um email principal verificado.'),{status:409});
 const id=emailTestId(user.id),claim={source:'EMAIL',level:'INFO',userId:user.id,message:'Teste de email solicitado pelo próprio utilizador',details:JSON.stringify({status:'sending'}),createdAt:now};
 try{await db.systemLog.create({data:{id,...claim}});}catch(error){
  if(error.code!=='P2002')throw error;
  const updated=await db.systemLog.updateMany({where:{id,userId:user.id,createdAt:{lte:new Date(now.getTime()-EMAIL_TEST_INTERVAL_MS)}},data:claim});
  if(updated.count!==1)throw Object.assign(Error('Já foi pedido um teste. Aguarda 15 minutos antes de repetir.'),{status:429});
 }
 try{
  const result=await send({to,...diagnosticEmail()},'email-test/'+user.id+'/'+now.toISOString());
  if(result.error||!result.data?.id)throw Error('O serviço de email não aceitou o envio.');
  await db.systemLog.update({where:{id},data:{details:JSON.stringify({status:'accepted',emailId:result.data.id})}});
  return {success:true,status:'accepted',sentAt:now.toISOString()};
 }catch(error){await db.systemLog.update({where:{id},data:{level:'ERROR',details:JSON.stringify({status:'failed'})}});throw error;}
}
