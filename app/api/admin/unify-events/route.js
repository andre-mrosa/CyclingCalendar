import { prisma } from '@/app/lib/db';
import { isSameEvent } from '@/app/lib/merging/eventMatcher';
import { mergeEventRecords } from '@/app/lib/merging/eventMerger';
import { logInfo, logError } from '@/app/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    try {
        const events = await prisma.event.findMany({
            orderBy: { sortDate: 'asc' }
        });

        const mergedMap = new Set(); // Ids que foram apagados/fundidos
        const mergedDetails = [];

        for (let i = 0; i < events.length; i++) {
            const primary = events[i];
            if (mergedMap.has(primary.id)) continue;

            for (let j = i + 1; j < events.length; j++) {
                const secondary = events[j];
                if (mergedMap.has(secondary.id)) continue;

                if (isSameEvent(primary, secondary)) {
                    // Fusão dos dois eventos
                    const mergedData = mergeEventRecords(primary, secondary);

                    // Atualizar o evento primário com os dados complementados
                    await prisma.event.update({
                        where: { id: primary.id },
                        data: mergedData
                    });

                    // Apagar o secundário duplicado
                    await prisma.event.delete({
                        where: { id: secondary.id }
                    });

                    mergedMap.add(secondary.id);
                    mergedDetails.push({
                        keptId: primary.id,
                        deletedId: secondary.id,
                        title: primary.title,
                        combinedSources: mergedData.source
                    });

                    // Atualizar objeto local do primary para possíveis fusões adicionais
                    Object.assign(primary, mergedData);
                }
            }
        }

        if (mergedDetails.length > 0) {
            logInfo('SYSTEM', `Unificação de provas concluída: ${mergedDetails.length} duplicados fundidos e enriquecidos.`, mergedDetails);
        }

        return Response.json({
            success: true,
            mergedCount: mergedDetails.length,
            mergedDetails
        });

    } catch (error) {
        console.error('Error unifying events:', error);
        logError('SYSTEM', `Erro ao unificar provas na base de dados: ${error.message}`, error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function GET(request) {
    return POST(request);
}
