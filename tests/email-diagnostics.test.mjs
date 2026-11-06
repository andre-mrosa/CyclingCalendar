import test from 'node:test';
import assert from 'node:assert/strict';
import {sendOwnTestEmail,emailTestId} from '../app/lib/emailDiagnostics.js';
import {fixtureModule} from './fixtureModule.mjs';
import {privateJson,sameOriginJson} from '../app/lib/requestBody.js';
const user={id:'owner',primaryEmailAddressId:'primary',emailAddresses:[{id:'primary',emailAddress:'owner@example.test',verification:{status:'verified'}}]};
test('a test email goes only to the verified account, is clearly labelled and rate limited',async()=>{
 let row;const sent=[],db={systemLog:{create:async({data})=>{if(row)throw Object.assign(Error(),{code:'P2002'});row=data;},updateMany:async({where,data})=>{assert.equal(where.userId,'owner');if(row.createdAt>where.createdAt.lte)return {count:0};row={...row,...data};return {count:1};},update:async({data})=>{row={...row,...data};}}};
 const send=async(message,key)=>{sent.push({message,key});return {data:{id:'email-one'}};};
 const now=new Date('2026-11-06T12:00:00Z');
 assert.equal((await sendOwnTestEmail({db,user,send,now})).status,'accepted');assert.equal(sent.length,1);assert.equal(sent[0].message.to,'owner@example.test');assert.match(sent[0].message.subject,/teste/);assert.match(sent[0].message.text,/não anuncia alterações/);assert.equal(JSON.parse(row.details).emailId,'email-one');assert.doesNotMatch(row.details,/owner@example/);
 await assert.rejects(sendOwnTestEmail({db,user,send,now}),{status:429});assert.equal(sent.length,1);
 await sendOwnTestEmail({db,user,send,now:new Date(now.getTime()+16*60000)});assert.equal(sent.length,2);
 await assert.rejects(sendOwnTestEmail({db,user:{...user,emailAddresses:[]},send,now}),{status:409});assert.equal(sent.length,2);
});
test('test endpoint rejects anonymous/cross-origin requests before mail, and scopes delivery lookup to the account',async()=>{
 let userId=null,calls=0;const old=process.env.RESEND_API_KEY;process.env.RESEND_API_KEY='fixture';
 try{
 const route=await fixtureModule('../app/api/notifications/email-test/route.js',{
 '@clerk/nextjs/server':{auth:async()=>({userId}),clerkClient:async()=>({users:{getUser:async()=>user}})},'resend':{Resend:class{emails={get:async()=>({data:{last_event:'delivered'}})};}},
 '@/app/lib/db':{prisma:{systemLog:{findUnique:async({where})=>{assert.equal(where.id,emailTestId('owner'));return {userId:'owner',createdAt:new Date('2026-11-06T12:00:00Z'),details:JSON.stringify({status:'accepted',emailId:'own-email'})};}}}},
 '@/app/lib/requestBody':{privateJson,sameOriginJson},'@/app/lib/favoriteEditionSettings':{editionEmailAvailable:()=>true},'@/app/lib/emailDiagnostics':{emailTestId,sendOwnTestEmail:async({user:own})=>{assert.equal(own.id,'owner');calls++;return {success:true};}},
 });
 const request=origin=>new Request('https://calendar.test/api/notifications/email-test',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({to:'stranger@example.test'})});
 assert.equal((await route.POST(request('https://calendar.test'))).status,401);userId='owner';assert.equal((await route.POST(request('https://other.test'))).status,403);assert.equal(calls,0);
 assert.equal((await route.POST(request('https://calendar.test'))).status,200);assert.equal(calls,1);assert.equal((await (await route.GET()).json()).status,'delivered');
 }finally{if(old===undefined)delete process.env.RESEND_API_KEY;else process.env.RESEND_API_KEY=old;}
});
