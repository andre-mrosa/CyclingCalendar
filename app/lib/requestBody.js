export const requestError=(status,message)=>Object.assign(new Error(message),{status});
export async function sameOriginJson(request,max=16000){
    if(request.headers.get('origin')!==new URL(request.url).origin)throw requestError(403,'Invalid origin');
    if(!request.headers.get('content-type')?.startsWith('application/json'))throw requestError(400,'Invalid content type');
    const text=await request.text();if(text.length>max)throw requestError(413,'Request too large');
    try{return JSON.parse(text);}catch{throw requestError(400,'Invalid JSON');}
}
export const privateJson=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'private, no-store'}});
