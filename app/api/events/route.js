import { prisma } from '@/app/lib/db';
import { getEventDiscipline } from '@/app/utils/eventClassifier';
export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const yearsParam = searchParams.get('years') || searchParams.get('year') || new Date().getFullYear().toString();
        const isAllYears = yearsParam === 'all';
        const years = isAllYears ? [] : yearsParam.split(',').filter(Boolean).map(y => y.trim());
        
        const sourcesParam = searchParams.get('sources') || 'FPC,Cabreira,Stop and Go,Classificações.net';
        const activeSources = sourcesParam.split(',').map(s => s.trim()).filter(Boolean);

        const andConditions = [{ NOT: { source: { contains: 'Quarentena' } } }];

        if (activeSources.length > 0) {
            andConditions.push({
                OR: activeSources.map(src => ({
                    source: {
                        contains: src,
                        mode: 'insensitive'
                    }
                }))
            });
        }

        if (!isAllYears && years.length > 0) {
            andConditions.push({
                OR: years.map(year => {
                    const y = parseInt(year, 10);
                    if (isNaN(y)) {
                        return { date: { contains: year } };
                    }
                    const startOfYear = new Date(`${y}-01-01T00:00:00.000Z`);
                    const endOfYear = new Date(`${y}-12-31T23:59:59.999Z`);
                    return {
                        OR: [
                            { date: { contains: year } },
                            { sortDate: { gte: startOfYear, lte: endOfYear } }
                        ]
                    };
                })
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
                logo: true,
                translations: {
                    select: {
                        language: true,
                        title: true,
                        details: true,
                        description: true,
                        programa: true
                    }
                }
            },
            orderBy: {
                sortDate: 'asc'
            }
        });

        // Convert stringified arrays back to arrays and assign accurate discipline tag
        const formattedEvents = events.map(e => ({
            ...e,
            tag: getEventDiscipline(e),
            escaloes: e.escaloes ? (typeof e.escaloes === 'string' ? JSON.parse(e.escaloes) : e.escaloes) : []
        }));

        return Response.json(
            { success: true, events: formattedEvents },
            {
                headers: {
                    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60'
                }
            }
        );

    } catch (error) {
        console.error('Error in API:', error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
}
