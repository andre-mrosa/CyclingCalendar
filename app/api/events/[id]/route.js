import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.POSTGRES_PRISMA_URL ? process.env.POSTGRES_PRISMA_URL.replace('sslmode=require', '') : '';
const pool = new Pool({ 
    connectionString,
    ssl: { rejectUnauthorized: false } 
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export async function GET(request, { params }) {
    try {
        const resolvedParams = await params;
        const id = resolvedParams.id;
        
        if (!id) {
            return Response.json({ success: false, error: 'ID is required' }, { status: 400 });
        }

        const event = await prisma.event.findUnique({
            where: { id }
        });

        if (!event) {
            return Response.json({ success: false, error: 'Event not found' }, { status: 404 });
        }

        // Convert stringified arrays back to arrays for frontend
        const formattedEvent = {
            ...event,
            escaloes: event.escaloes ? JSON.parse(event.escaloes) : [],
            extraLinks: event.extraLinks ? JSON.parse(event.extraLinks) : []
        };

        return Response.json({ success: true, event: formattedEvent });

    } catch (error) {
        console.error('Error fetching single event:', error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
}
