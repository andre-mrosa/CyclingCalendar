/**
 * Utilitário centralizado para extrair e categorizar hiperligações de provas de ciclismo.
 */

export function categorizeEventLinks(event) {
    if (!event) return {
        registrationList: [],
        resultsList: [],
        rulesList: [],
        tracksList: [],
        participantsList: [],
        conditionsList: [],
        fpcList: [],
        genericDocuments: [],
        primaryRules: null,
        primaryResults: null,
        officialSite: null,
        resources: []
    };

    const rawList = [];

    // 1. Extrair extraLinks
    if (event.extraLinks) {
        const extra = typeof event.extraLinks === 'string' 
            ? JSON.parse(event.extraLinks) 
            : event.extraLinks;
        if (Array.isArray(extra)) rawList.push(...extra);
    }

    // 2. Extrair link principal
    if (event.link) {
        rawList.push({ label: 'Site do Evento', link: event.link });
    }

    // 3. Adicionar track GPX local se o evento possuir gpxData na BD
    if (event.gpxData && event.id) {
        const cleanId = event.id.replace(/[^a-zA-Z0-9_-]/g, '_');
        rawList.push({ label: 'Track GPX Oficial', link: `/media/events/${cleanId}/track.gpx` });
    }

    // 4. Extrair links do programa ou descrição se houverem links de GPX ou PDF embutidos
    const textToScan = `${event.programa || ''} ${event.description || ''}`;
    const gpxMatches = textToScan.match(/https?:\/\/[^\s"'<>]+\.gpx(?:\?[^\s"'<>]*)?/gi);
    if (gpxMatches) {
        gpxMatches.forEach((url, i) => {
            rawList.push({ label: `Track GPX ${i > 0 ? i + 1 : ''}`.trim(), link: url });
        });
    }

    const pdfMatches = textToScan.match(/https?:\/\/[^\s"'<>]+\.pdf(?:\?[^\s"'<>]*)?/gi);
    if (pdfMatches) {
        pdfMatches.forEach(url => {
            if (/regulamento/i.test(url)) {
                rawList.push({ label: 'Regulamento Oficial (PDF)', link: url });
            } else if (!url.includes('fpciclismo.pt/calendarios_ficheiros/')) {
                rawList.push({ label: 'Documento PDF', link: url });
            }
        });
    }

    // Deduplica por URL exato (suporta URLs http e caminhos locais /media/)
    const uniqueByUrl = Array.from(new Map(
        rawList
            .filter(item => item && item.link && typeof item.link === 'string' && (item.link.startsWith('http') || item.link.startsWith('/media/')))
            .map(item => [item.link.trim(), item])
    ).values());

    const isRegistration = (item) => {
        const l = (item.label || '').toLowerCase();
        const url = (item.link || '').toLowerCase();
        return l.includes('inscrev') || l.includes('inscriç') || l.includes('inscric') || url.includes('/registrations/create') || url.includes('prova-inscrever') || url.includes('/inscricoes');
    };

    const isResults = (item) => {
        const l = (item.label || '').toLowerCase();
        const url = (item.link || '').toLowerCase();
        return l.includes('resultado') || l.includes('classifica') || l.includes('ranking') || l.includes('tempos') || l.includes('results') || url.includes('/results') || url.includes('/classificacoes') || url.includes('classificacoes.net') || url.includes('/download/');
    };

    const isRules = (item) => {
        const l = (item.label || '').toLowerCase();
        const url = (item.link || '').toLowerCase();
        return l.includes('regulamento') || l.includes('rules') || url.includes('/rules') || url.includes('regulamento');
    };

    // Apenas ficheiros de percurso reais e descarregáveis (.gpx, .kml, .fit, .tcx)
    const isDownloadableTrack = (item) => {
        if (!item || !item.link) return false;
        const url = (item.link || '').toLowerCase();
        
        // Excluir páginas web informativas
        if (
            url.includes('tab=percursos') || 
            url.includes('tab=regulamento') || 
            url.includes('/evento/') || 
            url.includes('/event/') ||
            url.includes('/noticias/') ||
            url.includes('/pagina/') ||
            url.includes('facebook.com') ||
            url.includes('instagram.com') ||
            url.includes('youtube.com')
        ) {
            return false;
        }

        const isFileExt = /\.(?:gpx|kml|fit|tcx)(?:$|[?#])/i.test(url);
        const isLocalGpx = url.startsWith('/media/events/') && url.endsWith('.gpx');
        const isGpxDownloadUrl = /(?:download|export|ficheiro).*(?:gpx|kml|fit)/i.test(url) || /get_gpx/i.test(url);
        
        return isFileExt || isLocalGpx || isGpxDownloadUrl;
    };

    const isRouteWebPage = (item) => {
        const url = (item.link || '').toLowerCase();
        const l = (item.label || '').toLowerCase();
        return (l.includes('percurso') || url.includes('tab=percursos') || url.includes('/percurso')) && !isDownloadableTrack(item);
    };

    const isParticipants = (item) => {
        const l = (item.label || '').toLowerCase();
        const url = (item.link || '').toLowerCase();
        return l.includes('inscritos') || l.includes('participantes') || l.includes('entries') || (url.includes('/registrations') && !url.includes('/create'));
    };

    const isConditions = (item) => {
        const l = (item.label || '').toLowerCase();
        const url = (item.link || '').toLowerCase();
        return l.includes('condiç') || l.includes('condic') || l.includes('cancelam') || url.includes('/conditions');
    };

    const isFpcPage = (item) => {
        const l = (item.label || '').toLowerCase();
        const url = (item.link || '').toLowerCase();
        const isDownload = url.includes('/calendarios_ficheiros/') || /\.(?:pdf|gpx|kml|zip)(?:$|\?)/i.test(url);
        return !isDownload && (l.includes('fpc') || url.includes('fpciclismo.pt')) && !isRegistration(item) && !isRules(item);
    };

    const isCabreiraPage = (item) => {
        const l = (item.label || '').toLowerCase();
        const url = (item.link || '').toLowerCase();
        return (l.includes('cabreira') || url.includes('cabreirasolutions.com')) && !isRegistration(item) && !isRules(item);
    };

    const isStopAndGoPage = (item) => {
        const l = (item.label || '').toLowerCase();
        const url = (item.link || '').toLowerCase();
        return (l.includes('stopandgo') || l.includes('stop and go') || url.includes('stopandgo.net')) && !isRegistration(item) && !isRules(item);
    };

    const isClassificacoesPage = (item) => {
        const l = (item.label || '').toLowerCase();
        const url = (item.link || '').toLowerCase();
        return (l.includes('classificacoes') || url.includes('classificacoes.net')) && !isRegistration(item) && !isRules(item);
    };

    // Categorização
    const registrationList = uniqueByUrl.filter(isRegistration);
    const resultsList = uniqueByUrl.filter(isResults);
    const rulesList = uniqueByUrl.filter(isRules);
    const tracksList = uniqueByUrl.filter(isDownloadableTrack);
    const routesPage = uniqueByUrl.find(isRouteWebPage) || null;
    const participantsList = uniqueByUrl.filter(isParticipants);
    const conditionsList = uniqueByUrl.filter(isConditions);
    const fpcList = uniqueByUrl.filter(isFpcPage);
    const genericDocuments = uniqueByUrl.filter(item =>
        !isRegistration(item) &&
        !isResults(item) &&
        !isRules(item) &&
        !isDownloadableTrack(item) &&
        !isRouteWebPage(item) &&
        !isParticipants(item) &&
        !isConditions(item) &&
        !isFpcPage(item) &&
        !isCabreiraPage(item) &&
        !isStopAndGoPage(item) &&
        !isClassificacoesPage(item)
    );

    // Regulamento principal
    const primaryRules = rulesList.find(r => r.link.includes('cabreira')) 
        || rulesList.find(r => !r.link.includes('fpc') && !r.link.includes('stopandgo')) 
        || rulesList[0] 
        || null;

    // Resultados principais
    const primaryResults = resultsList[0] || null;

    // Site oficial
    let officialSite = null;
    if (event.source?.includes('Cabreira') || (event.organizador && event.organizador.toLowerCase().includes('cabreira'))) {
        const cabLink = uniqueByUrl.find(isCabreiraPage);
        officialSite = cabLink ? { label: 'Cabreira Solutions', link: cabLink.link } : { label: 'Cabreira Solutions', link: 'https://cabreirasolutions.com/eventos/' };
    } else if (event.source?.includes('Stop') || (event.link && event.link.includes('stopandgo.net'))) {
        const sgLink = uniqueByUrl.find(isStopAndGoPage) || { label: 'Stop and Go', link: event.link || 'https://stopandgo.net' };
        officialSite = sgLink;
    } else if (event.source?.includes('Classificações') || (event.link && event.link.includes('classificacoes.net'))) {
        officialSite = { label: 'Classificações.net', link: event.link || 'https://www.classificacoes.net' };
    } else if (event.link && !event.link.includes('fpciclismo.pt')) {
        officialSite = { label: 'Site Oficial da Prova', link: event.link };
    } else if (event.link && event.link.includes('fpciclismo.pt')) {
        officialSite = { label: 'FPCiclismo', link: event.link };
    }

    // Recursos estruturados com ícones e metadados
    const resources = [];
    tracksList.forEach((tItem, idx) => {
        resources.push({
            type: 'track',
            label: tItem.label || `Track GPX ${idx + 1}`,
            link: tItem.link,
            desc: 'Percurso GPS para ciclocomputador (Garmin, Wahoo, Hammerhead)'
        });
    });

    rulesList.forEach((rItem, idx) => {
        resources.push({
            type: 'rules',
            label: rItem.label || `Regulamento da Prova ${idx > 0 ? idx + 1 : ''}`.trim(),
            link: rItem.link,
            desc: 'Regulamento oficial, normas de segurança e categorias'
        });
    });

    resultsList.forEach((resItem) => {
        resources.push({
            type: 'results',
            label: resItem.label || 'Classificações e Resultados Oficiais',
            link: resItem.link,
            desc: 'Tempos oficiais, pódios e classificações por escalão'
        });
    });

    participantsList.forEach((pItem) => {
        resources.push({
            type: 'participants',
            label: pItem.label || 'Lista de Inscritos / Dorsais',
            link: pItem.link,
            desc: 'Atletas confirmados e atribuição de dorsais'
        });
    });

    genericDocuments.forEach((dItem) => {
        resources.push({
            type: 'doc',
            label: dItem.label || 'Documento Oficial',
            link: dItem.link,
            desc: 'Informação adicional da organização'
        });
    });

    return {
        registrationList,
        resultsList,
        rulesList,
        tracksList,
        routesPage,
        participantsList,
        conditionsList,
        fpcList,
        genericDocuments,
        primaryRules,
        primaryResults,
        officialSite,
        resources
    };
}
