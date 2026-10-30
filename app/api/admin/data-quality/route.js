import {prisma} from '@/app/lib/db';
import {requireAdmin} from '@/app/lib/auth-helpers';
export const dynamic='force-dynamic';
export async function GET(){
    const admin=await requireAdmin();if(!admin.authorized)return Response.json({error:'Unauthorized'},{status:admin.status});
    try{
        const rows=await prisma.sourceQualitySnapshot.findMany({orderBy:{createdAt:'desc'},take:100});
        const seen=new Set(),latest=rows.filter(row=>{if(seen.has(row.scopeKey))return false;seen.add(row.scopeKey);return true;});
        return Response.json({snapshots:latest},{headers:{'Cache-Control':'private, no-store'}});
    }catch{return Response.json({error:'Quality unavailable'},{status:503});}
}
