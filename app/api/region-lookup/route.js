import {prisma} from '@/app/lib/db';
import {lookupRegion} from '@/app/lib/regionLookup';

export const dynamic='force-dynamic';
export const maxDuration=20;
const response=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store',...(status===429?{'Retry-After':'2'}:{})}});
export async function POST(request) {
    if(request.headers.get('origin')!==new URL(request.url).origin)return response({error:'Invalid origin'},403);
    if(!request.headers.get('content-type')?.startsWith('application/json'))return response({error:'Invalid request'},400);
    let input;
    try {const text=await request.text();if(text.length>2048)return response({error:'Invalid request'},400);input=JSON.parse(text);}
    catch{return response({error:'Invalid request'},400);}
    try {return response(await lookupRegion(input,{db:prisma}));}
    catch(error){return response({error:error.status===429?'Try again shortly':'Location unavailable'},[400,429,503].includes(error.status)?error.status:503);}
}
