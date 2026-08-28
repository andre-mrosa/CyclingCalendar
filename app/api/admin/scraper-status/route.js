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
        
        // Compute active step and step durations from logs between start and now
        const runLogs = logs.filter(l => new Date(l.createdAt).getTime() >= (startTime - 2000));
        
        let activeStep = 1;
        const stepTimestamps = { 1: startTime };
        const stepDurations = {};

        // Find timestamps for each step
        for (const l of runLogs) {
            const msg = (l.message || '').toLowerCase();
            const logTime = new Date(l.createdAt).getTime();

            if (msg.includes('unificação') || msg.includes('fundidas')) {
                if (activeStep < 5) activeStep = 5;
                if (!stepTimestamps[5] || logTime < stepTimestamps[5]) stepTimestamps[5] = logTime;
            } else if (msg.includes('deep scraping') || msg.includes('programas')) {
                if (activeStep < 4) activeStep = 4;
                if (!stepTimestamps[4] || logTime < stepTimestamps[4]) stepTimestamps[4] = logTime;
            } else if (msg.includes('stop and go')) {
                if (activeStep < 3) activeStep = 3;
                if (!stepTimestamps[3] || logTime < stepTimestamps[3]) stepTimestamps[3] = logTime;
            } else if (msg.includes('cabreira')) {
                if (activeStep < 2) activeStep = 2;
                if (!stepTimestamps[2] || logTime < stepTimestamps[2]) stepTimestamps[2] = logTime;
            }
        }

        // Calculate durations for completed steps
        for (let s = 1; s < activeStep; s++) {
            if (stepTimestamps[s] && stepTimestamps[s + 1]) {
                const secs = Math.max(0.5, (stepTimestamps[s + 1] - stepTimestamps[s]) / 1000).toFixed(1);
                stepDurations[s] = `${secs}s`;
            }
        }

        // If no log emitted for > 75 seconds, serverless instance was terminated
        if (timeSinceLatestLog > 75000) {
            return Response.json({
                success: true,
                isRunning: false,
                completed: false,
                interrupted: true,
                status: 'interrupted',
                message: 'A sincronização anterior foi interrompida pelo servidor. Clica em "Retomar Scraping" para continuar exatamente de onde ficou.',
                activeStep,
                elapsedSeconds: Math.floor((latestLogTime - startTime) / 1000),
                startTime,
                stepDurations,
                logs: logs.slice(0, 25)
            });
        }

        return Response.json({
            success: true,
            isRunning: true,
            activeStep,
            elapsedSeconds,
            startTime,
            stepDurations,
            logs: logs.slice(0, 25)
        });
    } catch (e) {
        console.error('Error checking scraper status:', e);
        return Response.json({ success: false, error: e.message }, { status: 500 });
    }
}
