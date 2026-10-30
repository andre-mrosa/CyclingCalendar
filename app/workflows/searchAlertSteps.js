export async function deliverSearchAlertBatch(cursor){
    'use step';
    const [{prisma},{Prisma},{clerkClient},{Resend},{getPublicCalendarEvents},{editionEmailAvailable},{processSearchAlert}]=await Promise.all([
        import('../lib/db.js'),import('@prisma/client'),import('@clerk/nextjs/server'),import('resend'),import('../lib/getPublicCalendarEvents.js'),import('../lib/favoriteEditionSettings.js'),import('../lib/searchAlerts.js'),
    ]);
    if(!editionEmailAvailable())throw new Error('Search alert email unavailable');
    const [client,events,rows]=await Promise.all([clerkClient(),getPublicCalendarEvents(),prisma.searchAlert.findMany({where:{enabled:true},orderBy:{id:'asc'},take:50,...(cursor?{cursor:{id:cursor},skip:1}:{})})]);
    const resend=new Resend(process.env.RESEND_API_KEY),cache=new Map(),counts={};
    for(const row of rows){try{
        const result=await processSearchAlert({db:prisma,events,row,jsonNull:Prisma.DbNull,users:{getUser:id=>{if(!cache.has(id))cache.set(id,client.users.getUser(id));return cache.get(id);}},send:(message,key)=>resend.emails.send({from:process.env.EDITION_ALERTS_FROM_EMAIL,...message},{idempotencyKey:'search-alerts/'+key})});counts[result]=(counts[result]||0)+1;
    }catch{counts.failed=(counts.failed||0)+1;}}
    if(counts.failed)throw new Error('Some search alert deliveries failed');
    const nextCursor=rows.length===50?rows.at(-1).id:null;
    return {nextCursor,counts};
}
deliverSearchAlertBatch.maxRetries=2;
