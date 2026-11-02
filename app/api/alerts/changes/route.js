import {auth,clerkClient} from '@clerk/nextjs/server';
import {Prisma} from '@prisma/client';
import {prisma} from '@/app/lib/db';
import {privateJson,sameOriginJson,requestError} from '@/app/lib/requestBody';
import {editionEmailAvailable} from '@/app/lib/favoriteEditionSettings';
import {verifiedEmail} from '@/app/utils/favoriteAlerts';
import {getPublicCalendarEvents} from '@/app/lib/getPublicCalendarEvents';
import {changeFavoriteEvents,planFavoriteChanges} from '@/app/lib/favoriteChangeAlerts';
export const dynamic='force-dynamic';
const view=row=>({enabled:row?.enabled||false,available:editionEmailAvailable(),needsReview:!!(row?.pending&&Date.now()-Date.parse(row.pending.createdAt)>=23*3600000)});
export async function GET(){const {userId}=await auth();if(!userId)return privateJson({error:'Unauthorized'},401);try{return privateJson(view(await prisma.favoriteChangePreference.findUnique({where:{userId}})));}catch{return privateJson({error:'Unavailable'},503);}}
export async function PUT(request){const {userId}=await auth();if(!userId)return privateJson({error:'Unauthorized'},401);try{
    const body=await sameOriginJson(request);if(typeof body.enabled!=='boolean'||body.enabled&&body.consent!==true)throw requestError(400,'Explicit consent required');
    let state={};
    if(body.enabled){
        if(!editionEmailAvailable())throw requestError(503,'Email unavailable');
        const client=await clerkClient(),user=await client.users.getUser(userId);if(!verifiedEmail(user))throw requestError(409,'Verified primary email required');
        state=planFavoriteChanges(await changeFavoriteEvents(prisma,user,await getPublicCalendarEvents())).state;
    }
    const language=['pt','en','es','fr'].includes(body.language)?body.language:'pt';
    const row=await prisma.favoriteChangePreference.upsert({where:{userId},create:{userId,enabled:body.enabled,language,state,pending:Prisma.DbNull},update:{enabled:body.enabled,language,state,pending:Prisma.DbNull,revision:{increment:1}}});
    return privateJson(view(row));
}catch(e){return privateJson({error:e.status?e.message:'Unavailable'},e.status||503);}}
