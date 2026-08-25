import { PrismaClient } from '@prisma/client';
export const dynamic = 'force-dynamic';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.POSTGRES_PRISMA_URL ? process.env.POSTGRES_PRISMA_URL.replace('sslmode=require', '') : '';
const pool = new Pool({ 
    connectionString,
    ssl: { rejectUnauthorized: false } 
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const yearsParam = searchParams.get('years') || searchParams.get('year') || new Date().getFullYear().toString();
        const isAllYears = yearsParam === 'all';
        const years = isAllYears ? [] : yearsParam.split(',').filter(Boolean).map(y => y.trim());
        
        const sourcesParam = searchParams.get('sources') || 'FPC,Cabreira';
        const activeSources = sourcesParam.split(',');

        const andConditions = [
            {
                source: {
                    in: activeSources
                }
            }
        ];

        if (!isAllYears && years.length > 0) {
            andConditions.push({
                OR: years.map(year => ({
                    date: {
                        contains: year
                    }
                }))
            });
        }

        const events = await prisma.event.findMany({
            where: {
                AND: andConditions
            },
            select: {
                id: true,
                title: true,
                date: true,
                sortDate: true,
                details: true,
                tag: true,
                ambito: true,
                escaloes: true,
                licenca: true,
                regiao: true,
                distrito: true,
                source: true,
                link: true,
                extraLinks: true,
                registrationOpensAt: true,
                registrationClosesAt: true,
                // Omitted: description, prices, insurance, prizes, programa, logo, image
            },
            orderBy: {
                sortDate: 'asc'
            }
        });

        // Convert stringified arrays back to arrays for frontend
        const formattedEvents = events.map(e => ({
            ...e,
            escaloes: e.escaloes ? JSON.parse(e.escaloes) : [],
            extraLinks: e.extraLinks ? JSON.parse(e.extraLinks) : []
        }));

        return Response.json({ success: true, events: formattedEvents });

    } catch (error) {
        console.error('Error in API:', error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
}
