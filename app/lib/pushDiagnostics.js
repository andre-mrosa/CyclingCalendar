export async function testOwnPushDevices({db,userId,send,now=new Date()}) {
 const rows=await db.favoritePushSubscription.findMany({where:{userId,enabled:true},take:10,orderBy:{id:'asc'}});
 const counts={registered:rows.length,sent:0,failed:0,limited:0};
 for(const row of rows){
  const claimed=await db.favoritePushSubscription.updateMany({where:{id:row.id,userId,enabled:true,OR:[{lastTestAt:null},{lastTestAt:{lt:new Date(now.getTime()-60000)}}]},data:{lastTestAt:now}});
  if(!claimed.count){counts.limited++;continue;}
  try{await send({endpoint:row.endpoint,keys:{p256dh:row.p256dh,auth:row.auth}},{title:'Cycling Calendar · Teste',body:'Notificação de teste enviada a teu pedido. Se a recebeste, o push funciona neste dispositivo.',url:'/definicoes',tag:'push-test'});counts.sent++;}catch{counts.failed++;}
 }
 await db.systemLog?.create({data:{source:'PUSH',level:counts.failed?'ERROR':'INFO',userId,message:'Teste de notificações nos dispositivos da conta',details:JSON.stringify(counts)}});
 return counts;
}
