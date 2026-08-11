import * as cheerio from 'cheerio';

const getTag = (name, det = '') => {
    const lowerName = name.toLowerCase();
    const lowerDet = det.toLowerCase();
    
    let tag = 'Evento';
    if (lowerName.includes('xco') || lowerDet.includes('xco')) tag = 'BTT XCO';
    else if (lowerName.includes('xcm') || lowerName.includes('maratona') || lowerDet.includes('xcm')) tag = 'BTT XCM';
    else if (lowerName.includes('enduro')) tag = 'BTT Enduro';
    else if (lowerName.includes('dhu') || lowerName.includes('dhi') || lowerName.includes('downhill')) tag = 'BTT DHI/DHU';
    else if (lowerName.includes('btt')) tag = 'BTT XCM'; 
    else if (lowerName.includes('circuito') || lowerName.includes('prémio') || lowerName.includes('premio')) tag = 'Estrada Circuito';
    else if (lowerName.includes('estrada') || lowerName.includes('volta') || lowerName.includes('clássica') || lowerName.includes('classica')) tag = 'Estrada Linha';
    else if (lowerName.includes('pista') || lowerDet.includes('pista') || lowerName.includes('velódromo')) tag = 'Pista';
    else if (lowerName.includes('passeio') || lowerName.includes('cicloturismo') || lowerName.includes('granfondo') || lowerName.includes('gran fondo') || lowerName.includes('audace') || lowerName.includes('urban race')) tag = 'Passeio / Granfondo';
    else if (lowerName.includes('bmx') || lowerName.includes('pump track')) tag = 'BMX';
    else if (lowerName.includes('gravel')) tag = 'Gravel';
    else if (lowerName.includes('ciclocross') || lowerName.includes('ciclocrosse')) tag = 'Ciclocrosse';
    
    return tag;
};

const getAmbito = (name, det = '') => {
    const lowerName = name.toLowerCase();
    const lowerDet = det.toLowerCase();
    const full = lowerName + ' ' + lowerDet;
    
    if (full.includes('nacional') || full.includes('campeonato nacional') || full.includes('camp. nacional')) return 'Nacional';
    if (full.includes('taça') || full.includes('taca') || full.includes('taã§a') || full.includes('taa a') || full.includes('taa')) return 'Taça de Portugal';
    if (full.includes('internacional') || full.includes(' c1') || full.includes(' c2') || full.includes(' hc')) return 'Internacional';
    if (full.includes('regional') || full.includes('associação') || full.includes('associacao') || full.includes('ac minho') || full.includes('ac porto') || full.includes('campeonato do ')) return 'Regional';
    if (full.includes('passeio') || full.includes('granfondo') || full.includes('maratona') || full.includes('rota') || full.includes('aberta') || full.includes('urban race') || full.includes('resistência') || full.includes('resistencia')) return 'Prova Aberta';
    
    return 'Outro / A Definir';
};

const getLicenca = (name, det = '', ambito = '') => {
    const full = (name + ' ' + det).toLowerCase();
    
    if (full.includes('cpt') || ambito === 'Prova Aberta' || full.includes('granfondo') || full.includes('passeio') || full.includes('aberta')) {
        return 'CPT / Lazer';
    }
    
    if (ambito === 'Nacional' || ambito === 'Taça de Portugal' || ambito === 'Regional' || ambito === 'Internacional') {
        return 'Competição';
    }
    
    return 'CPT / Lazer';
};

const getRegiao = (name, det = '') => {
    const full = (name + ' ' + det).toLowerCase();
    
    if (full.includes('ac minho') || full.includes('do minho')) return 'AC Minho';
    if (full.includes('ac porto') || full.includes('do porto')) return 'AC Porto';
    if (full.includes('ac vila real') || full.includes('vila real')) return 'AC Vila Real';
    if (full.includes('ac beira litoral') || full.includes('beira litoral')) return 'AC Beira Litoral';
    if (full.includes('ac beira alta') || full.includes('beira alta')) return 'AC Beira Alta';
    if (full.includes('ac beira interior') || full.includes('beira interior')) return 'AC Beira Interior';
    if (full.includes('ac santarém') || full.includes('santarem') || full.includes('santarém') || full.includes('ac santarem')) return 'AC Santarém';
    if (full.includes('ac setúbal') || full.includes('setubal') || full.includes('setúbal') || full.includes('ac setubal')) return 'AC Setúbal';
    if (full.includes('ac algarve') || full.includes('do algarve')) return 'AC Algarve';
    if (full.includes('ac madeira') || full.includes('da madeira')) return 'AC Madeira';
    if (full.includes('ac açores') || full.includes('ac acores') || full.includes('açores')) return 'AC Açores';
    
    // Some general mappings based on location can be risky, so we just stick to explicit association mentions
    return '';
};

const parseSortDate = (dateStr, year) => {
    const str = dateStr.toLowerCase();
    const months = {
        jan: '01', fev: '02', mar: '03', abr: '04', mai: '05', jun: '06',
        jul: '07', ago: '08', set: '09', out: '10', nov: '11', dez: '12',
        março: '03'
    };
    
    let monthNum = '12'; 
    for (const [m, num] of Object.entries(months)) {
        if (str.includes(m)) {
            monthNum = num;
            break; 
        }
    }

    const dayMatch = str.match(/\b(\d{1,2})\b/);
    let dayNum = dayMatch ? dayMatch[1].padStart(2, '0') : '01';

    return `${year}-${monthNum}-${dayNum}`;
};

const fetchFPC = async (year) => {
    const formData = new URLSearchParams();
    formData.append('epoca_site2', year);
    formData.append('mes_de_new', '01');
    formData.append('mes_ate_new', '12');

    const response = await fetch(`https://www.fpciclismo.pt/calendario`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        body: formData.toString(),
        next: { revalidate: 3600 }
    });

    if (!response.ok) return [];

    const buffer = await response.arrayBuffer();
    const decoder = new TextDecoder('utf-8');
    let html = decoder.decode(buffer);
    
    // Fallback if utf-8 fails to parse accented chars correctly and leaves replacement characters
    if (html.includes('\uFFFD')) {
        const isoDecoder = new TextDecoder('iso-8859-1');
        html = isoDecoder.decode(buffer);
    }
    
    const $ = cheerio.load(html);
    const events = [];
    
    $('tr').each((index, element) => {
        const ths = $(element).find('th');
        const cols = $(element).find('td');
        if (ths.length >= 1 && cols.length >= 3) {
            let dateText = $(ths[0]).text().trim();
            const nameText = $(cols[0]).text().trim();
            const locText = $(cols[1]).text().trim();
            const extraText = $(cols[2]).text().trim();
            
            if (nameText && dateText && dateText.length > 2 && !nameText.toLowerCase().includes('evento')) {
                const parts = dateText.split('-');
                if (parts.length === 3) {
                    const months = {'01':'JAN', '02':'FEV', '03':'MAR', '04':'ABR', '05':'MAI', '06':'JUN', '07':'JUL', '08':'AGO', '09':'SET', '10':'OUT', '11':'NOV', '12':'DEZ'};
                    dateText = `${parts[0]} ${months[parts[1]] || parts[1]} ${parts[2]}`;
                }

                let escalao = 'Geral / Vários';
                const det = extraText.trim();
                const lowerName = nameText.toLowerCase();
                
                const codes = det.match(/\.\d{2}/g) || [];
                
                if (det.toLowerCase().includes('cpt') || lowerName.includes('aberta') || lowerName.includes('amador')) {
                    escalao = 'Todos (Aberto)';
                } else if (codes.length > 1) {
                    escalao = 'Geral / Vários';
                } else if (det.includes('.12') || lowerName.includes('elite')) {
                    escalao = 'Elite / Sub-23';
                } else if (det.includes('.13') || lowerName.includes('sub23') || lowerName.includes('sub-23')) {
                    escalao = 'Sub-23';
                } else if (det.includes('.14') || lowerName.includes('sub19') || lowerName.includes('sub-19') || lowerName.includes('juniores')) {
                    escalao = 'Sub-19 (Juniores)';
                } else if (det.includes('.15') || lowerName.includes('sub17') || lowerName.includes('sub-17') || lowerName.includes('cadetes')) {
                    escalao = 'Sub-17 (Cadetes)';
                } else if (det.includes('.16') || lowerName.includes('sub15') || lowerName.includes('sub-15') || lowerName.includes('juvenis')) {
                    escalao = 'Sub-15 (Juvenis)';
                } else if (det.includes('.17') || lowerName.includes('master') || lowerName.includes('veteranos')) {
                    escalao = 'Masters / Veteranos';
                } else if (det.includes('.18') || lowerName.includes('feminin')) {
                    escalao = 'Femininas';
                } else if (det.toLowerCase().includes('escolas') || lowerName.includes('escolas')) {
                    escalao = 'Escolas';
                }

                const ambitoVal = getAmbito(nameText, det);
                const regiaoVal = getRegiao(nameText, `${det} ${locText}`);

                events.push({
                    id: Math.random().toString(36).substr(2, 9),
                    date: dateText,
                    sortDate: parseSortDate(dateText, year),
                    title: nameText,
                    details: `${locText} | ${extraText}`,
                    escalao: escalao,
                    tag: getTag(nameText, det),
                    ambito: ambitoVal,
                    licenca: getLicenca(nameText, det, ambitoVal),
                    regiao: regiaoVal,
                    source: 'FPC'
                });
            }
        }
    });
    return events;
};

const fetchCabreira = async (year) => {
    const response = await fetch(`https://cabreirasolutions.com/eventos/`, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        },
        next: { revalidate: 3600 }
    });

    if (!response.ok) return [];

    const html = await response.text();
    const $ = cheerio.load(html);
    const events = [];

    $('.evento-grid-item').each((index, element) => {
        const aTag = $(element).find('.evento-item-image-container a');
        let href = aTag.attr('href') || '';
        
        let title = 'Evento Cabreira';
        if (href) {
            const parts = href.split('/').filter(Boolean);
            const slug = parts[parts.length - 1];
            if (slug) {
                title = slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
            }
        }

        const dateText = $(element).find('.evento-item-data').text().trim().toUpperCase() || 'DATA A DEFINIR';
        const locText = $(element).find('.evento-item-local').text().trim() || 'A DEFINIR';
        
        if (year && dateText.includes(year)) {
            const ambitoVal = getAmbito(title);
            events.push({
                id: Math.random().toString(36).substr(2, 9),
                date: dateText,
                sortDate: parseSortDate(dateText, year),
                title: title,
                details: locText,
                escalao: 'Todos (Aberto)', 
                tag: getTag(title),
                ambito: ambitoVal,
                licenca: 'CPT / Lazer', // Cabreira events are generally open
                regiao: getRegiao(title, locText),
                source: 'Cabreira'
            });
        }
    });

    return events;
};

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const year = searchParams.get('year') || new Date().getFullYear().toString();
        const sourcesParam = searchParams.get('sources') || 'FPC,Cabreira';
        const activeSources = sourcesParam.split(',');

        let promises = [];
        if (activeSources.includes('FPC')) promises.push(fetchFPC(year));
        if (activeSources.includes('Cabreira')) promises.push(fetchCabreira(year));

        const results = await Promise.all(promises);
        
        // Flatten array
        let allEvents = results.flat();
        
        // Sort chronologically
        allEvents.sort((a, b) => a.sortDate.localeCompare(b.sortDate));

        return Response.json({ success: true, events: allEvents });

    } catch (error) {
        console.error('Error in API:', error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
}
