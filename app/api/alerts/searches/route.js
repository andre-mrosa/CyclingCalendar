import {auth,clerkClient} from '@clerk/nextjs/server';
import {Prisma} from '@prisma/client';
import {prisma} from '@/app/lib/db';
import {verifiedEmail} from '@/app/utils/favoriteAlerts';
import {normalizeSearchAlert} from '@/app/lib/searchAlerts';
import {editionEmailAvailable} from '@/app/lib/favoriteEditionSettings';
import {sameOriginJson,privateJson,requestError} from '@/app/lib/requestBody';
export const dynamic='force-dynamic';
const selection={id:true,name:true,path:true,filters:true,enabled:true,language:true,createdAt:true};
export async function GET(){
    const {userId}=await auth();if(!userId)return privateJson({error:'Unauthorized'},401);
    try{return privateJson({available:editionEmailAvailable(),alerts:await prisma.searchAlert.findMany({where:{userId},select:selection,orderBy:{createdAt:'desc'},take:10})});}catch{return privateJson({error:'Unavailable'},503);}
}
export async function POST(request){
    const {userId}=await auth();if(!userId)return privateJson({error:'Unauthorized'},401);
    try{
        const data=normalizeSearchAlert(await sameOriginJson(request));
        if(!editionEmailAvailable())throw requestError(503,'Email unavailable');
        const client=await clerkClient();if(!verifiedEmail(await client.users.getUser(userId)))throw requestError(409,'Verified primary email required');
        const row=await prisma.$transaction(async tx=>{
            if(await tx.searchAlert.count({where:{userId}})>=10)throw requestError(409,'Maximum ten search alerts');
            return tx.searchAlert.create({data:{userId,...data},select:selection});
        },{isolationLevel:'Serializable'});
        return privateJson(row,201);
    }catch(error){return privateJson({error:error.status?error.message:'Could not create alert'},error.status||503);}
}
export async function PUT(request){
    const {userId}=await auth();if(!userId)return privateJson({error:'Unauthorized'},401);
    try{
        const body=await sameOriginJson(request);if(typeof body?.id!=='string'||typeof body.enabled!=='boolean')throw requestError(400,'Invalid preferences');
        if(body.enabled){if(body.consent!==true)throw requestError(400,'Consent required');if(!editionEmailAvailable())throw requestError(503,'Email unavailable');const client=await clerkClient();if(!verifiedEmail(await client.users.getUser(userId)))throw requestError(409,'Verified email required');}
        const existing=await prisma.searchAlert.findFirst({where:{id:body.id,userId},select:{state:true,pending:true,revision:true}});
        if(!existing)throw requestError(404,'Unknown alert');
        // Pausing discards the pending notice. Its event cursor is retained so
        // an uncertain provider response cannot become a duplicate on resume.
        const state=!body.enabled&&existing.pending?.state?existing.pending.state:existing.state;
        const result=await prisma.searchAlert.updateMany({where:{id:body.id,userId,revision:existing.revision},data:{enabled:body.enabled,state,pending:Prisma.DbNull,revision:{increment:1}}});
        return privateJson({success:result.count===1},result.count?200:404);
    }catch(error){return privateJson({error:error.status?error.message:'Could not update alert'},error.status||503);}
}
export async function DELETE(request){
    const {userId}=await auth();if(!userId)return privateJson({error:'Unauthorized'},401);
    try{const body=await sameOriginJson(request);if(typeof body?.id!=='string')throw requestError(400,'Invalid ID');await prisma.searchAlert.deleteMany({where:{id:body.id,userId}});return privateJson({success:true});}
    catch(error){return privateJson({error:'Could not delete alert'},error.status||503);}
}
