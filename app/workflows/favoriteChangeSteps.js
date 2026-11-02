export async function deliverFavoriteChangeBatch(cursor){
    'use step';
    const [{prisma},{Prisma},{clerkClient},{Resend},{getPublicCalendarEvents},{editionEmailAvailable},{deliverFavoriteChanges}]=await Promise.all([
        import('../lib/db.js'),import('@prisma/client'),import('@clerk/nextjs/server'),import('resend'),import('../lib/getPublicCalendarEvents.js'),import('../lib/favoriteEditionSettings.js'),import('../lib/favoriteChangeAlerts.js'),
    ]);
    if(!editionEmailAvailable())throw Error('Email unavailable');
    const [client,events,rows]=await Promise.all([clerkClient(),getPublicCalendarEvents(),prisma.favoriteChangePreference.findMany({where:{enabled:true},orderBy:{userId:'asc'},take:50,...(cursor?{cursor:{userId:cursor},skip:1}:{})})]);
    const resend=new Resend(process.env.RESEND_API_KEY),counts={};
    for(const row of rows){try{const result=await deliverFavoriteChanges({db:prisma,users:client.users,events,row,jsonNull:Prisma.DbNull,send:(message,key)=>resend.emails.send({from:process.env.EDITION_ALERTS_FROM_EMAIL,...message},{idempotencyKey:'favorite-changes/'+key})});counts[result]=(counts[result]||0)+1;}catch{counts.failed=(counts.failed||0)+1;}}
    if(counts.failed)throw Error('Some favorite change deliveries failed');
    return {counts,nextCursor:rows.length===50?rows.at(-1).userId:null};
}
deliverFavoriteChangeBatch.maxRetries=2;
