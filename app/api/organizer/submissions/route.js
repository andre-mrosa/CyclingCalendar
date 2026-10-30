import {auth,clerkClient} from '@clerk/nextjs/server';
import {prisma} from '@/app/lib/db';
import {verifiedEmail} from '@/app/utils/favoriteAlerts';
import {normalizeSubmission} from '@/app/lib/organizerSubmissions';
import {sameOriginJson,privateJson,requestError} from '@/app/lib/requestBody';
export const dynamic='force-dynamic';
export async function GET(){
    const {userId}=await auth();if(!userId)return privateJson({error:'Unauthorized'},401);
    try{return privateJson({submissions:await prisma.organizerSubmission.findMany({where:{userId},select:{id:true,status:true,eventId:true,payload:true,createdAt:true},orderBy:{createdAt:'desc'},take:30})});}
    catch{return privateJson({error:'Unavailable'},503);}
}
export async function POST(request){
    const {userId}=await auth();if(!userId)return privateJson({error:'Unauthorized'},401);
    try{
        const normalized=normalizeSubmission(await sameOriginJson(request));
        const client=await clerkClient(),user=await client.users.getUser(userId),email=verifiedEmail(user);
        if(!email)throw requestError(409,'Verified primary email required');
        const result=await prisma.$transaction(async tx=>{
            if(await tx.organizerSubmission.count({where:{userId,createdAt:{gte:new Date(Date.now()-86400000)}}})>=5)throw requestError(429,'Daily submission limit');
            if(normalized.eventId&&!await tx.event.findFirst({where:{id:normalized.eventId,NOT:{source:{contains:'Quarentena'}}},select:{id:true}}))throw requestError(400,'Unknown target event');
            return tx.organizerSubmission.create({data:{userId,userEmail:email,...normalized},select:{id:true,status:true}});
        },{isolationLevel:'Serializable'});
        return privateJson(result,201);
    }catch(error){return privateJson({error:error.status?error.message:'Could not save submission'},error.status||503);}
}
