import { prisma } from '@/app/lib/db';
import { requireAdmin } from '@/app/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function GET() {
    const adminCheck = await requireAdmin();
    if (!adminCheck.authorized) {
        return Response.json({ success: false, error: adminCheck.error }, { status: adminCheck.status });
    }

    try {
        // Query recent SCRAPER logs from the last 30 minutes
        const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
        const logs = await prisma.systemLog.findMany({
            where: {
                source: 'SCRAPER',
                createdAt: { gte: thirtyMinAgo }
            },
            orderBy: { createdAt: 'desc' },
            take: 50
        });

        // Find the latest start log
        const startLog = logs.find(l => (l.message || '').includes('Iniciada sincronização global'));

        if (!startLog) {
            return Response.json({
                success: true,
                isRunning: false,
                activeStep: 0,
                elapsedSeconds: 0,
                stepDurations: {},
                lastLog: logs[0] || null
            });
        }

        const startTime = new Date(startLog.createdAt).getTime();

        // Check if there is any completion log created at or after the start log
        const completionLog = logs.find(l => {
            const t = new Date(l.createdAt).getTime();
            const msg = (l.message || '').toLowerCase();
            return t >= (startTime - 2000) && (msg.includes('sincronização global concluída') || msg.includes('falha crítica na sincronização'));
        });

        // If completion log exists, it is NOT currently running
        if (completionLog) {
            const isSuccess = !completionLog.message.toLowerCase().includes('falha crítica');
            const compTime = new Date(completionLog.createdAt).getTime();
            const totalDurationSecs = Math.max(0, (compTime - startTime) / 1000).toFixed(1);

            return Response.json({
                success: true,
                isRunning: false,
                completed: true,
                status: isSuccess ? 'success' : 'error',
                message: completionLog.message,
                durationSeconds: totalDurationSecs,
                startTime,
                completionTime: compTime,
                logs: logs.slice(0, 25)
            });
        }

        // If start log was within the last 30 minutes and NO completion log exists, check if active or stalled
        const latestLogTime = logs[0] ? new Date(logs[0].createdAt).getTime() : startTime;
        const timeSinceLatestLog = Date.now() - latestLogTime;
        const elapsedSeconds = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
        
        // Compute active sources, pipeline steps, and durations from logs between start and now
        const runLogs = logs.filter(l => new Date(l.createdAt).getTime() >= (startTime - 2000));
        
        const sources = {
            fpc: { id: 'fpc', name: 'FPCiclismo', desc: 'Calendários FPC 26/27', status: 'running', duration: null, count: 0, message: 'A recolher provas...' },
            cabreira: { id: 'cabreira', name: 'Cabreira Solutions', desc: 'Granfondos & Provas', status: 'running', duration: null, count: 0, message: 'A recolher provas...' },
            stopandgo: { id: 'stopandgo', name: 'Stop & Go', desc: 'Sitemap Ciclismo/BTT', status: 'running', duration: null, count: 0, message: 'A recolher provas...' },
            classificacoes: { id: 'classificacoes', name: 'Classificações.net', desc: 'Rankings & PDFs', status: 'running', duration: null, count: 0, message: 'A recolher provas...' }
        };

        const steps = {
            deepScrape: { id: 'deepScrape', name: 'Deep Scraping FPC', desc: 'Programas & Cartazes', status: 'idle', duration: null, count: 0, message: 'Pendente' },
            unification: { id: 'unification', name: 'Unificação & Fusão', desc: 'Deduplicação Multi-Fonte', status: 'idle', duration: null, count: 0, message: 'Pendente' },
            translation: { id: 'translation', name: 'Tradução Multilíngue', desc: 'EN / ES / FR', status: 'idle', duration: null, count: 0, message: 'Pendente' }
        };

        let fpcEvents = 0;

        for (const l of runLogs) {
            const msg = (l.message || '');
            const lowerMsg = msg.toLowerCase();
            const durMatch = msg.match(/em\s*([0-9\.]+)s/i);

            // FPC
            const fpcCountMatch = msg.match(/concluída\s*\((\d+)\s*eventos\s*processados\)/i);
            if (fpcCountMatch) {
                fpcEvents += parseInt(fpcCountMatch[1], 10);
                sources.fpc.count = fpcEvents;
            }
            if (lowerMsg.includes('fpc: sincronização de calendários concluída')) {
                sources.fpc.status = 'done';
                sources.fpc.duration = durMatch ? `${durMatch[1]}s` : (sources.fpc.duration || 'Concluído');
                sources.fpc.message = sources.fpc.count > 0 ? `${sources.fpc.count} provas oficiais` : 'Concluído';
            }

            // Cabreira
            const cabCountMatch = msg.match(/(\d+)\s*provas\s*atualizadas/i);
            if (cabCountMatch) {
                sources.cabreira.count = parseInt(cabCountMatch[1], 10);
            }
            if (lowerMsg.includes('cabreira: sincronização concluída')) {
                sources.cabreira.status = 'done';
                sources.cabreira.duration = durMatch ? `${durMatch[1]}s` : (sources.cabreira.duration || 'Concluído');
                sources.cabreira.message = sources.cabreira.count > 0 ? `${sources.cabreira.count} granfondos` : 'Concluído';
            }

            // Stop & Go
            const sgCountMatch = msg.match(/(\d+)\s*provas\s*de\s*ciclismo/i) || msg.match(/concluída\s*\((\d+)\s*provas\)/i);
            if (sgCountMatch) {
                sources.stopandgo.count = parseInt(sgCountMatch[1], 10);
            }
            if (lowerMsg.includes('stop and go: sincronização')) {
                sources.stopandgo.status = 'done';
                sources.stopandgo.duration = durMatch ? `${durMatch[1]}s` : (sources.stopandgo.duration || 'Concluído');
                sources.stopandgo.message = sources.stopandgo.count > 0 ? `${sources.stopandgo.count} provas BTT/Estrada` : 'Concluído';
            }

            // Classificações.net
            const cnCountMatch = msg.match(/concluída\s*\((\d+)\s*provas\)/i) || msg.match(/(\d+)\s*já\s*sincronizadas/i);
            if (cnCountMatch) {
                sources.classificacoes.count = parseInt(cnCountMatch[1], 10);
            }
            if (lowerMsg.includes('classificações.net: sincronização')) {
                sources.classificacoes.status = 'done';
                sources.classificacoes.duration = durMatch ? `${durMatch[1]}s` : (sources.classificacoes.duration || 'Concluído');
                sources.classificacoes.message = sources.classificacoes.count > 0 ? `${sources.classificacoes.count} provas/PDFs` : 'Concluído';
            }

            // Deep Scraping FPC
            if (lowerMsg.includes('deep scraping fpc')) {
                const deepCountMatch = msg.match(/(\d+)\s*programas/i);
                if (deepCountMatch) steps.deepScrape.count = parseInt(deepCountMatch[1], 10);
                steps.deepScrape.status = 'done';
                steps.deepScrape.duration = durMatch ? `${durMatch[1]}s` : 'Concluído';
                steps.deepScrape.message = steps.deepScrape.count > 0 ? `${steps.deepScrape.count} atualizados` : 'Atualizado';
            }

            // Unificação
            if (lowerMsg.includes('unificação: a verificar')) {
                if (steps.deepScrape.status !== 'done') steps.deepScrape.status = 'done';
                steps.unification.status = 'running';
                steps.unification.message = 'A fundir provas...';
            }
            if (lowerMsg.includes('unificação concluída')) {
                const unifyCountMatch = msg.match(/(\d+)\s*provas\s*fundidas/i);
                if (unifyCountMatch) steps.unification.count = parseInt(unifyCountMatch[1], 10);
                steps.unification.status = 'done';
                steps.unification.duration = durMatch ? `${durMatch[1]}s` : 'Concluído';
                steps.unification.message = steps.unification.count > 0 ? `${steps.unification.count} provas fundidas` : 'Sem duplicados';
            }

            // Tradução
            if (lowerMsg.includes('tradução: a verificar')) {
                steps.translation.status = 'running';
                steps.translation.message = 'A traduzir...';
            }
            if (lowerMsg.includes('tradução concluída')) {
                const transCountMatch = msg.match(/(\d+)\s*eventos\s*traduzidos/i);
                if (transCountMatch) steps.translation.count = parseInt(transCountMatch[1], 10);
                steps.translation.status = 'done';
                steps.translation.duration = durMatch ? `${durMatch[1]}s` : 'Concluído';
                steps.translation.message = steps.translation.count > 0 ? `${steps.translation.count} traduzidos` : 'Atualizado';
            }
        }

        // Backward compatibility for legacy stepDurations map
        const stepDurations = {
            1: sources.fpc.duration,
            2: sources.cabreira.duration,
            3: sources.stopandgo.duration,
            4: sources.classificacoes.duration,
            5: steps.deepScrape.duration,
            6: steps.unification.duration
        };

        const allSourcesDone = sources.fpc.status === 'done' && 
                               sources.cabreira.status === 'done' && 
                               sources.stopandgo.status === 'done' && 
                               sources.classificacoes.status === 'done';

        // If no log emitted for > 75 seconds, serverless instance was terminated
        if (timeSinceLatestLog > 75000) {
            return Response.json({
                success: true,
                isRunning: false,
                completed: false,
                interrupted: true,
                status: 'interrupted',
                message: 'A sincronização anterior foi interrompida pelo servidor. Clica em "Retomar Scraping" para continuar exatamente de onde ficou.',
                elapsedSeconds: Math.floor((latestLogTime - startTime) / 1000),
                startTime,
                sources,
                steps,
                stepDurations,
                allSourcesDone,
                logs: logs.slice(0, 25)
            });
        }

        return Response.json({
            success: true,
            isRunning: true,
            elapsedSeconds,
            startTime,
            sources,
            steps,
            stepDurations,
            allSourcesDone,
            logs: logs.slice(0, 25)
        });
    } catch (e) {
        console.error('Error checking scraper status:', e);
        return Response.json({ success: false, error: e.message }, { status: 500 });
    }
}
