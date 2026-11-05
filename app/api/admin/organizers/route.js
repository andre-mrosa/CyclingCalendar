import {requireAdmin} from '@/app/lib/auth-helpers';
import {privateJson,sameOriginJson} from '@/app/lib/requestBody';
import {organizerStatus} from '@/app/lib/scrapers/organizers';
import {startCalendarSync} from '@/app/lib/scrapers/startSync';
export const dynamic='force-dynamic';
export async function GET(){const check=await requireAdmin();if(!check.authorized)return privateJson({error:check.error},check.status);try{return privateJson({sources:await organizerStatus()});}catch{return privateJson({error:'Estado indisponível'},503);}}
export async function POST(request){
 const check=await requireAdmin();if(!check.authorized)return privateJson({error:check.error},check.status);
 try{await sameOriginJson(request);return privateJson(await startCalendarSync({scope:'organizers',triggeredBy:'ADMIN_ORGANIZERS'}),202);}
 catch(error){return privateJson({error:error.message},error.status|| (error.code==='SCRAPER_ALREADY_RUNNING'?409:500));}
}
