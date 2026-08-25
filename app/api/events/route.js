import { prisma } from '@/app/lib/db';
export const dynamic = 'force-dynamic';

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
                organizador: true,
                registrationOpensAt: true,
                registrationClosesAt: true,
                logo: true
            },
            orderBy: {
                sortDate: 'asc'
            }
        });

        // Convert stringified arrays back to arrays for frontend
        const formattedEvents = events.map(e => ({
            ...e,
            escaloes: e.escaloes ? (typeof e.escaloes === 'string' ? JSON.parse(e.escaloes) : e.escaloes) : []
        }));

        return Response.json(
            { success: true, events: formattedEvents },
            {
                headers: {
                    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400'
                }
            }
        );

    } catch (error) {
        console.error('Error in API:', error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
}
