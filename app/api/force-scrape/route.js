import { runUnifiedScrapingPipeline, triggerNextStage } from '@/app/lib/scrapers/unifiedPipeline';
import { requireAdmin } from '@/app/lib/auth-helpers';
import { logError, logInfo, withScraperLogContext } from '@/app/lib/logger';
import { prisma } from '@/app/lib/db';
import { SCRAPER_LEASE_ID, SCRAPER_LEASE_MS } from '@/app/lib/scrapers/runLock';
import { after } from 'next/server';
import { randomUUID } from 'node:crypto';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request) {
    const admin = await requireAdmin();
    if (!admin.authorized) return Response.json({ success: false, error: admin.error }, { status: admin.status });
    try {
        const { searchParams } = new URL(request.url);
        const fullHistorical = searchParams.get('history') === 'true';
        const existingLease = await prisma.systemLog.findUnique({ where: { id: SCRAPER_LEASE_ID } });
        if (existingLease && Date.now() - new Date(existingLease.createdAt).getTime() < SCRAPER_LEASE_MS) {
            return Response.json({
                success: false,
                alreadyRunning: true,
                error: 'Já existe uma sincronização em curso. A ligar ao progresso existente.'
            }, { status: 409, headers: { 'Retry-After': '30' } });
        }
        const runId = randomUUID();
        const startedAt = new Date();
        const currentYear = startedAt.getFullYear();
        const years = [currentYear, currentYear + 1, ...(fullHistorical ? [currentYear - 1, currentYear - 2] : [])].map(String);

        // Persistir a execução antes de responder permite ao painel reencontrá-la
        // imediatamente, inclusive depois de um refresh ou noutro dispositivo.
        const queuedLog = await withScraperLogContext({ runId }, () => logInfo(
            'SCRAPER',
            `Iniciada sincronização manual [${fullHistorical ? 'Auditoria Histórica' : 'Sincronização Rápida Ativa'} (${years.join(', ')})] via ADMIN_MANUAL...`,
            { event: 'run-start', status: 'queued', scope: 'manual', years, startedAt: startedAt.toISOString() }
        ));
        if (!queuedLog?.id) throw new Error('Não foi possível persistir o arranque da sincronização.');

        after(async () => {
            try {
                const result = await runUnifiedScrapingPipeline('ADMIN_MANUAL', {
                    scope: 'manual', fullHistorical, years, runId, startLogged: true
                });
                await triggerNextStage(result);
            } catch (error) {
                if (error.code === 'SCRAPER_ALREADY_RUNNING') {
                    // Uma corrida rara com outro trigger não pode deixar uma
                    // execução fantasma a aparecer no painel.
                    await prisma.systemLog.deleteMany({ where: { id: queuedLog?.id } });
                } else {
                    await withScraperLogContext({ runId }, () => logError(
                        'SCRAPER',
                        `Falha crítica ao arrancar a sincronização manual: ${error.message}`,
                        { event: 'run-complete', status: 'error', error: error.message, startedAt: startedAt.toISOString(), completedAt: new Date().toISOString() }
                    ));
                }
                console.error('Erro ao iniciar a sincronização manual:', error);
            }
        });

        return Response.json({
            success: true,
            accepted: true,
            message: 'Sincronização aceite e iniciada no servidor.',
            runId,
            years,
            startedAt: startedAt.toISOString()
        }, { status: 202 });
    } catch(e) {
        if (e.code === 'SCRAPER_ALREADY_RUNNING') return Response.json({ success: false, alreadyRunning: true, error: e.message }, { status: 409, headers: { 'Retry-After': '30' } });
        console.error('Erro na sincronização manual:', e);
        return Response.json({ success: false, error: e.message }, { status: 500 });
    }
}
