import { prisma } from '../app/lib/db.js';
import { originalEventUrl, getPreferredEventLink, isFpcUrl } from '../app/lib/publicEvent.js';

export async function migrateFpcLinks(options = {}) {
    const dryRun = options.dryRun ?? false;
    console.log(`Iniciando migração de links FPC (dryRun: ${dryRun})...`);

    const events = await prisma.event.findMany({
        where: {
            link: { contains: 'fpciclismo.pt' }
        },
        select: { id: true, title: true, link: true, extraLinks: true, source: true }
    });

    console.log(`Total de eventos com link FPC na base de dados: ${events.length}`);

    const updates = [];

    for (const event of events) {
        const preferredLink = getPreferredEventLink(event.link, event.extraLinks);
        if (!preferredLink || isFpcUrl(preferredLink) || preferredLink.toLowerCase() === event.link.toLowerCase()) {
            continue;
        }

        // Reconstruir lista de links extras: manter links existentes, retirar novo preferredLink, arquivar link FPC antigo
        let extra = [];
        try {
            extra = typeof event.extraLinks === 'string' ? JSON.parse(event.extraLinks) : event.extraLinks;
        } catch {}
        if (!Array.isArray(extra)) extra = [];

        const seenUrls = new Set([preferredLink.toLowerCase()]);
        const newExtra = [];

        for (const item of extra) {
            if (!item || !item.link) continue;
            const valid = originalEventUrl(item.link);
            if (valid && !seenUrls.has(valid.toLowerCase())) {
                seenUrls.add(valid.toLowerCase());
                newExtra.push({ label: item.label || 'Link da Prova', link: valid });
            }
        }

        const oldValidFpc = originalEventUrl(event.link);
        if (oldValidFpc && !seenUrls.has(oldValidFpc.toLowerCase())) {
            seenUrls.add(oldValidFpc.toLowerCase());
            newExtra.push({ label: 'Ficha Homologação FPC', link: oldValidFpc });
        }

        updates.push({
            id: event.id,
            title: event.title,
            source: event.source,
            oldLink: event.link,
            newLink: preferredLink,
            newExtraLinks: newExtra.length > 0 ? JSON.stringify(newExtra) : null
        });
    }

    console.log(`Eventos identificados para atualização: ${updates.length}`);

    if (!dryRun) {
        let count = 0;
        for (const item of updates) {
            await prisma.event.update({
                where: { id: item.id },
                data: {
                    link: item.newLink,
                    extraLinks: item.newExtraLinks
                }
            });
            count++;
            if (count % 20 === 0 || count === updates.length) {
                console.log(`Progresso: ${count}/${updates.length} eventos atualizados.`);
            }
        }
        console.log(`Migração concluída com sucesso! ${count} eventos atualizados.`);
    }

    return updates;
}

// Se executado diretamente na linha de comandos:
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
    const isDryRun = process.argv.includes('--dry-run');
    migrateFpcLinks({ dryRun: isDryRun })
        .then(async () => {
            await prisma.$disconnect();
            if (globalThis.pgPool) await globalThis.pgPool.end();
            process.exit(0);
        })
        .catch(async err => {
            console.error('Erro na migração:', err);
            await prisma.$disconnect();
            if (globalThis.pgPool) await globalThis.pgPool.end();
            process.exit(1);
        });
}
