import {requireAdmin} from '@/app/lib/auth-helpers';
import {privateJson,sameOriginJson} from '@/app/lib/requestBody';
import {ensureStopAndGoRetry,getStopAndGoRetryStatus} from '@/app/lib/scrapers/stopandgoRetry';
export const dynamic='force-dynamic';
export async function GET(){
    const admin=await requireAdmin();if(!admin.authorized)return privateJson({error:admin.error},admin.status);
    try{return privateJson(await getStopAndGoRetryStatus());}
    catch{return privateJson({error:'Não foi possível confirmar a retoma automática.'},503);}
}
export async function POST(request){
    const admin=await requireAdmin();if(!admin.authorized)return privateJson({error:admin.error},admin.status);
    try {
        await sameOriginJson(request);
        return privateJson(await ensureStopAndGoRetry());
    } catch(error) {return privateJson({error:error.message},error.status||(error.code==='SCRAPER_ALREADY_RUNNING'?409:503));}
}
