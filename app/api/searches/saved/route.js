import {auth} from '@clerk/nextjs/server';
import {prisma} from '@/app/lib/db';
import {privateJson,sameOriginJson,requestError} from '@/app/lib/requestBody';
import {storeSavedEntries} from '@/app/lib/savedSearchAccount';
export const dynamic='force-dynamic';
export async function GET(){const {userId}=await auth();if(!userId)return privateJson({error:'Unauthorized'},401);try{return privateJson({entries:await prisma.savedSearch.findMany({where:{userId},orderBy:{updatedAt:'asc'},take:20})});}catch{return privateJson({error:'Unavailable'},503);}}
export async function POST(request){const {userId}=await auth();if(!userId)return privateJson({error:'Unauthorized'},401);try{const body=await sameOriginJson(request,64000);return privateJson({entries:await storeSavedEntries(prisma,userId,body.entries,body.importing===true)});}catch(e){return privateJson({error:e.status?e.message:'Unavailable'},e.status||503);}}
export async function DELETE(request){const {userId}=await auth();if(!userId)return privateJson({error:'Unauthorized'},401);try{const body=await sameOriginJson(request);if(typeof body.id!=='string'||body.id.length>100)throw requestError(400,'Invalid ID');await prisma.savedSearch.deleteMany({where:{userId,id:body.id}});return privateJson({entries:await prisma.savedSearch.findMany({where:{userId},orderBy:{updatedAt:'asc'},take:20})});}catch(e){return privateJson({error:'Unavailable'},e.status||503);}}
