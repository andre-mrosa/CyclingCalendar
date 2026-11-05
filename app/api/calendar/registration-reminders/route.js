import {auth,clerkClient} from '@clerk/nextjs/server';
import {privateJson,sameOriginJson} from '@/app/lib/requestBody';
import {updateGoogleRegistrationReminders} from '@/app/lib/googleRegistrationReminders';
export const dynamic='force-dynamic';
export const maxDuration=300;
export async function POST(request){
 const {userId}=await auth();if(!userId)return privateJson({error:'Unauthorized'},401);
 try{
  await sameOriginJson(request);const client=await clerkClient();let tokens;
  try{tokens=await client.users.getUserOauthAccessToken(userId,'oauth_google');}catch{tokens=await client.users.getUserOauthAccessToken(userId,'google');}
  const token=(tokens.data||tokens)?.[0]?.token;if(!token)return privateJson({error:'Google Calendar authorization required'},403);
  return privateJson({success:true,...await updateGoogleRegistrationReminders(token)});
 }catch(error){return privateJson({error:error.message||'Calendar unavailable'},error.status||503);}
}
