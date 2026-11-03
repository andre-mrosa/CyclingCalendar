import {auth} from '@clerk/nextjs/server';
import {prisma} from '@/app/lib/db';
import {sameOriginJson,privateJson,requestError} from '@/app/lib/requestBody';
import {getPublicEvent} from '@/app/lib/getPublicCalendarEvents';
export const dynamic='force-dynamic';
// Dismiss a legacy calendar entry without deleting it in Google.
const statuses=['interested','going','registered','dismissed'];
export async function GET(){const {userId}=await auth();if(!userId)return privateJson({error:'Unauthorized'},401);try{return privateJson({states:await prisma.eventParticipation.findMany({where:{userId},select:{eventId:true,status:true,updatedAt:true},take:500,orderBy:{updatedAt:'desc'}})});}catch{return privateJson({error:'Unavailable'},503);}}
export async function PUT(request){const {userId}=await auth();if(!userId)return privateJson({error:'Unauthorized'},401);try{const body=await sameOriginJson(request);if(typeof body.eventId!=='string'||!body.eventId||body.eventId.length>1000||!['',...statuses].includes(body.status))throw requestError(400,'Invalid status');
    const aliases=[...new Set([body.eventId,...(Array.isArray(body.aliases)?body.aliases:[])])];if(aliases.length>50||aliases.some(id=>typeof id!=='string'||!id||id.length>1000))throw requestError(400,'Invalid aliases');
    if(!body.status){await prisma.eventParticipation.deleteMany({where:{userId,eventId:{in:aliases}}});return privateJson({success:true});}
    if(!await getPublicEvent(body.eventId))throw requestError(404,'Unknown event');
    await prisma.$transaction(async tx=>{await tx.eventParticipation.deleteMany({where:{userId,eventId:{in:aliases.filter(id=>id!==body.eventId)}}});const existing=await tx.eventParticipation.findUnique({where:{userId_eventId:{userId,eventId:body.eventId}}});if(!existing&&await tx.eventParticipation.count({where:{userId}})>=500)throw requestError(409,'Planning limit');await tx.eventParticipation.upsert({where:{userId_eventId:{userId,eventId:body.eventId}},create:{userId,eventId:body.eventId,status:body.status},update:{status:body.status}});},{isolationLevel:'Serializable'});
    return privateJson({success:true});
}catch(e){return privateJson({error:e.status?e.message:'Unavailable'},e.status||503);}}
