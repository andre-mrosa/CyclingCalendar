import {start} from 'workflow/api';
import {prisma} from '@/app/lib/db';
import {editionEmailAvailable} from '@/app/lib/favoriteEditionSettings';
import {searchAlertWorkflow} from '@/app/workflows/searchAlerts';
import {privateJson} from '@/app/lib/requestBody';
export const dynamic='force-dynamic';export const maxDuration=300;
export async function GET(request){
    if(!process.env.CRON_SECRET)return privateJson({error:'Unavailable'},503);
    if(request.headers.get('authorization')!=='Bearer '+process.env.CRON_SECRET)return privateJson({error:'Unauthorized'},401);
    if(!editionEmailAvailable())return privateJson({error:'Email unavailable'},503);
    try{
        const day=new Date().toISOString().slice(0,10);
        try{await prisma.searchAlertRun.create({data:{day}});}catch(error){if(error.code==='P2002')return privateJson({success:true,alreadyStarted:true});throw error;}
        try{await start(searchAlertWorkflow,[]);}catch(error){await prisma.searchAlertRun.delete({where:{day}});throw error;}
        await prisma.searchAlertRun.deleteMany({where:{createdAt:{lt:new Date(Date.now()-30*86400000)}}});
        return privateJson({success:true,scheduled:true},202);
    }catch{return privateJson({error:'Search alerts unavailable'},503);}
}
