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
    
    if (full.includes('nacional') || full.includes('campeonato nacional') || full.includes('camp. nacional') || full.includes('volta a portugal') || full.includes('volta ao algarve') || full.includes('volta ao alentejo')) return 'Nacional';
    if (full.includes('taça') || full.includes('taca') || full.includes('taã§a') || full.includes('taa a') || full.includes('taa')) return 'Taça de Portugal';
    if (full.includes('internacional') || full.includes(' c1') || full.includes(' c2') || full.includes(' hc')) return 'Internacional';
    if (full.includes('regional') || full.includes('associação') || full.includes('associacao') || full.includes('ac minho') || full.includes('ac porto') || full.includes('campeonato do ')) return 'Regional';
    if (full.includes('passeio') || full.includes('granfondo') || full.includes('maratona') || full.includes('rota') || full.includes('aberta') || full.includes('urban race') || full.includes('resistência') || full.includes('resistencia')) return 'Prova Aberta';
    
    return 'Outro / A Definir';
};

const getLicenca = (name, det = '', ambito = '') => {
    const full = (name + ' ' + det).toLowerCase();
    
    if (full.includes('cpt') || ambito === 'Prova Aberta' || full.includes('granfondo') || full.includes('passeio') || full.includes('aberta') || full.includes('audace')) {
        return 'CPT / Lazer';
    }
    
    return 'Competição';
};

const getRegiao = (name, det = '') => {
    const full = (name + ' ' + det).toLowerCase();
    const regions = {
        'AC Minho': ['ac minho', 'do minho', 'braga', 'viana do castelo', 'guimarães', 'guimaraes', 'barcelos', 'fafe', 'famalicão', 'famalicao', 'esposende', 'ponte de lima', 'melgaço', 'arcos de valdevez', 'vizela', 'lanhoso'],
        'AC Porto': ['ac porto', 'do porto', 'vila nova de gaia', 'gaia', 'matosinhos', 'maia', 'gondomar', 'valongo', 'santo tirso', 'trofa', 'paredes', 'penafiel', 'amarante', 'marco de canaveses', 'paços de ferreira', 'felgueiras', 'lousada', 'arouca', 'vale de cambra', 'oliveira de azeméis', 'azemeis', 'são joão da madeira', 'santa maria da feira', 'ovar', 'sanguedo', 'porto'],
        'AC Vila Real': ['ac vila real', 'vila real', 'chaves', 'peso da régua', 'regua', 'alijó', 'alijo', 'boticas', 'murça', 'murca', 'sabrosa', 'valpaços', 'valpacos', 'mesão frio', 'mesao frio', 'santa marta de penaguião'],
        'AC Beira Litoral': ['ac beira litoral', 'beira litoral', 'aveiro', 'ílhavo', 'ilhavo', 'vagos', 'águeda', 'agueda', 'anadia', 'sangalhos', 'mealhada', 'cantanhede', 'figueira da foz', 'coimbra', 'condeixa', 'montemor', 'soure', 'lousã', 'lousa', 'penacova', 'pombal', 'leiria', 'marinha grande', 'batalha', 'alcobaça', 'mira', 'esteia'],
        'AC Beira Alta': ['ac beira alta', 'beira alta', 'viseu', 'mangualde', 'tondela', 'são pedro do sul', 'castro daire', 'penalva do castelo', 'guarda', 'pinhel', 'trancoso', 'celorico da beira'],
        'AC Beira Interior': ['ac beira interior', 'beira interior', 'castelo branco', 'covilhã', 'covilha', 'fundão', 'fundao', 'belmonte', 'penamacor', 'idanha'],
        'AC Santarém': ['ac santarém', 'ac santarem', 'santarém', 'santarem', 'cartaxo', 'almeirim', 'abrantes', 'coruche', 'rio maior', 'tomar', 'fátima', 'fatima', 'ourém', 'ourem', 'entroncamento'],
        'AC Setúbal': ['ac setúbal', 'ac setubal', 'setúbal', 'setubal', 'palmela', 'sesimbra', 'barreiro', 'seixal', 'almada', 'montijo', 'alcochete', 'sines', 'grândola', 'grandola', 'alcácer', 'alcacer'],
        'AC Algarve': ['ac algarve', 'do algarve', 'faro', 'portimão', 'portimao', 'lagos', 'loulé', 'loule', 'tavira', 'silves', 'albufeira', 'olhão', 'olhao', 'quarteira', 'são brás', 'sao bras'],
        'AC Madeira': ['ac madeira', 'da madeira', 'funchal', 'câmara de lobos', 'camara de lobos', 'machico', 'santa cruz', 'santana', 'calheta', 'ponta do sol', 'são vicente', 'sao vicente', 'porto moniz'],
        'AC Açores': ['ac açores', 'ac acores', 'açores', 'acores', 'ponta delgada', 'ribeira grande', 'lagoa', 'vila franca do campo', 'povoação', 'povoacao', 'nordeste', 'angra do heroísmo', 'praia da vitória'],
        'AC Lisboa': ['ac lisboa', 'lisboa', 'oeiras', 'cascais', 'sintra', 'amadora', 'odivelas', 'loures', 'vila franca de xira', 'mafra', 'bela vista']
    };
    
    // Sort keywords by length descending to match longest phrases first (e.g. 'vila nova de gaia' before 'gaia')
    for (const [region, keywords] of Object.entries(regions)) {
        keywords.sort((a, b) => b.length - a.length);
        for (const keyword of keywords) {
            // Ensure we don't do partial matches on small words like 'mira' inside 'mirandela'
            // We pad the search text with spaces and replace punctuation with spaces
            const paddedFull = ' ' + full.replace(/[^\w\s\u00C0-\u017F]/g, ' ') + ' ';
            const paddedKeyword = ' ' + keyword + ' ';
            
            if (paddedFull.includes(paddedKeyword)) {
                return region;
            }
        }
    }
    
    return '';
};

const getDistrito = (name, det = '') => {
    const full = (name + ' ' + det).toLowerCase();
    
    const distritos = {
        'Aveiro': ['aveiro', 'águeda', 'agueda', 'albergaria', 'anadia', 'arouca', 'castelo de paiva', 'espinho', 'estarreja', 'ílhavo', 'ilhavo', 'mealhada', 'murtosa', 'oliveira de azeméis', 'azemeis', 'oliveira do bairro', 'ovar', 'santa maria da feira', 'são joão da madeira', 'sao joao da madeira', 'sever do vouga', 'vagos', 'vale de cambra'],
        'Beja': ['beja', 'aljustrel', 'almodôvar', 'almodovar', 'alvito', 'barrancos', 'castro verde', 'cuba', 'ferreira do alentejo', 'mértola', 'mertola', 'moura', 'odemira', 'ourique', 'serpa', 'vidigueira'],
        'Braga': ['braga', 'amares', 'barcelos', 'cabeceiras de basto', 'celorico de basto', 'esposende', 'fafe', 'guimarães', 'guimaraes', 'póvoa de lanhoso', 'terras de bouro', 'vieira do minho', 'vila nova de famalicão', 'famalicao', 'vila verde', 'vizela'],
        'Bragança': ['bragança', 'braganca', 'alfândega da fé', 'alfandega da fe', 'carrazeda de ansiães', 'carrazeda de ansiaes', 'freixo de espada', 'macedo de cavaleiros', 'miranda do douro', 'mirandela', 'mogadouro', 'torre de moncorvo', 'vila flor', 'vimioso', 'vinhais'],
        'Castelo Branco': ['castelo branco', 'belmonte', 'covilhã', 'covilha', 'fundão', 'fundao', 'idanha-a-nova', 'idanha', 'oleiros', 'penamacor', 'proença-a-nova', 'sertã', 'serta', 'vila de rei', 'vila velha de ródão'],
        'Coimbra': ['coimbra', 'arganil', 'cantanhede', 'condeixa-a-nova', 'condeixa', 'figueira da foz', 'góis', 'gois', 'lousã', 'lousa', 'mira', 'miranda do corvo', 'montemor-o-velho', 'oliveira do hospital', 'pampilhosa da serra', 'penacova', 'penela', 'soure', 'tábua', 'tabua', 'vila nova de poiares'],
        'Évora': ['évora', 'evora', 'alandroal', 'arraiolos', 'borba', 'estremoz', 'montemor-o-novo', 'mora', 'mourão', 'mourao', 'portel', 'redondo', 'reguengos de monsaraz', 'vendas novas', 'viana do alentejo', 'vila viçosa', 'vila vicosa'],
        'Faro': ['faro', 'albufeira', 'alcoutim', 'aljezur', 'castro marim', 'lagoa', 'lagos', 'loulé', 'loule', 'monchique', 'olhão', 'olhao', 'portimão', 'portimao', 'são brás', 'sao bras', 'silves', 'tavira', 'vila do bispo', 'vila real de santo antónio'],
        'Guarda': ['guarda', 'aguiar da beira', 'almeida', 'celorico da beira', 'figueira de castelo rodrigo', 'fornos de algodres', 'gouveia', 'manteigas', 'mêda', 'meda', 'pinhel', 'sabugal', 'seia', 'trancoso', 'vila nova de foz côa'],
        'Leiria': ['leiria', 'alcobaça', 'alcobaca', 'alvaiázere', 'alvaiazere', 'ansião', 'ansiao', 'batalha', 'bombarral', 'caldas da rainha', 'castanheira de pêra', 'figueiró dos vinhos', 'marinha grande', 'nazaré', 'nazare', 'óbidos', 'obidos', 'pedrógão grande', 'pedrogao grande', 'peniche', 'pombal', 'porto de mós'],
        'Lisboa': ['lisboa', 'alenquer', 'amadora', 'arruda dos vinhos', 'azambuja', 'cadaval', 'cascais', 'loures', 'lourinhã', 'lourinha', 'mafra', 'odivelas', 'oeiras', 'sintra', 'sobral de monte agraço', 'torres vedras', 'vila franca de xira'],
        'Portalegre': ['portalegre', 'alter do chão', 'alter do chao', 'aronches', 'avis', 'campo maior', 'castelo de vide', 'crato', 'elvas', 'fronteira', 'gavião', 'gaviao', 'marvão', 'marvao', 'monforte', 'nisa', 'ponte de sor', 'sousel'],
        'Porto': ['porto', 'amarante', 'baião', 'baiao', 'felgueiras', 'gondomar', 'lousada', 'maia', 'marco de canaveses', 'matosinhos', 'paços de ferreira', 'pacos de ferreira', 'paredes', 'penafiel', 'póvoa de varzim', 'povoa de varzim', 'santo tirso', 'trofa', 'valongo', 'vila do conde', 'vila nova de gaia', 'gaia', 'sanguedo'],
        'Santarém': ['santarém', 'santarem', 'abrantes', 'alcanena', 'almeirim', 'alpiarça', 'alpiarca', 'benavente', 'cartaxo', 'chamusca', 'constância', 'constancia', 'coruche', 'entroncamento', 'ferreira do zêzere', 'golegã', 'golega', 'mação', 'macao', 'ourém', 'ourem', 'fátima', 'fatima', 'rio maior', 'salvaterra de magos', 'sardoal', 'tomar', 'torres novas', 'vila nova da barquinha'],
        'Setúbal': ['setúbal', 'setubal', 'alcácer do sal', 'alcacer do sal', 'alcochete', 'almada', 'barreiro', 'grândola', 'grandola', 'moita', 'montijo', 'palmela', 'santiago do cacém', 'santiago do cacem', 'seixal', 'sesimbra', 'sines'],
        'Viana do Castelo': ['viana do castelo', 'arcos de valdevez', 'caminha', 'melgaço', 'melgaco', 'monção', 'moncao', 'paredes de coura', 'ponte da barca', 'ponte de lima', 'valença', 'valenca', 'vila nova de cerveira'],
        'Vila Real': ['vila real', 'alijó', 'alijo', 'boticas', 'chaves', 'mesão frio', 'mesao frio', 'mondim de basto', 'montalegre', 'murça', 'murca', 'peso da régua', 'regua', 'ribeira de pena', 'sabrosa', 'santa marta de penaguião', 'valpaços', 'valpacos'],
        'Viseu': ['viseu', 'armamar', 'carregal do sal', 'castro daire', 'cinfães', 'cinfaes', 'lamego', 'mangualde', 'moimenta da beira', 'mortágua', 'mortagua', 'nelas', 'oliveira de frades', 'penalva do castelo', 'penedono', 'resende', 'santa comba dão', 'são joão da pesqueira', 'são pedro do sul', 'sátão', 'satao', 'sernancelhe', 'tabuaço', 'tabuaco', 'tarouca', 'tondela', 'vila nova de paiva'],
        'Açores': ['açores', 'acores', 'ponta delgada', 'ribeira grande', 'lagoa', 'vila franca do campo', 'povoação', 'nordeste', 'angra do heroísmo', 'praia da vitória'],
        'Madeira': ['madeira', 'funchal', 'câmara de lobos', 'machico', 'santa cruz', 'santana', 'calheta', 'ponta do sol', 'são vicente', 'porto moniz']
    };
    
    for (const [distrito, keywords] of Object.entries(distritos)) {
        keywords.sort((a, b) => b.length - a.length);
        for (const keyword of keywords) {
            const paddedFull = ' ' + full.replace(/[^\w\s\u00C0-\u017F]/g, ' ') + ' ';
            const paddedKeyword = ' ' + keyword + ' ';
            
            if (paddedFull.includes(paddedKeyword)) {
                return distrito;
            }
        }
    }
    
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

const formatDateStr = (dateStr, year) => {
    let str = dateStr.toUpperCase();
    if (str === 'DATA A DEFINIR') return str;
    
    const monthMap = {
        'JANEIRO': 'JAN', 'FEVEREIRO': 'FEV', 'MARÇO': 'MAR', 'ABRIL': 'ABR',
        'MAIO': 'MAI', 'JUNHO': 'JUN', 'JULHO': 'JUL', 'AGOSTO': 'AGO',
        'SETEMBRO': 'SET', 'OUTUBRO': 'OUT', 'NOVEMBRO': 'NOV', 'DEZEMBRO': 'DEZ'
    };
    
    for (const [longM, shortM] of Object.entries(monthMap)) {
        str = str.replace(new RegExp(`\\b${longM}\\b`, 'g'), shortM);
    }
    
    str = str.replace(/\bDE\b/g, '').replace(/\s+/g, ' ').trim();
    
    if (year && !str.includes(year)) {
        str = `${str} ${year}`;
    }
    
    return str;
};

const toTitleCase = (str) => {
    if (!str) return '';
    return str.toLowerCase().split(/\s+/).map((word, index) => {
        const exceptions = ['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'em', 'na', 'no', 'nas', 'nos'];
        if (index > 0 && exceptions.includes(word)) {
            return word;
        }
        return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
};

const fetchFPC = async (year) => {
    const formData = new URLSearchParams();
    formData.append('epoca_site', year);
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
            let endDateText = ths.length > 1 ? $(ths[1]).text().trim() : '';
            const nameText = $(cols[0]).text().trim();
            let locText = $(cols[1]).text().trim();
            locText = toTitleCase(locText);
            const extraText = $(cols[2]).text().trim();
            
            if (nameText && dateText && dateText.length > 2 && !nameText.toLowerCase().includes('evento')) {
                const parts = dateText.split('-');
                const months = {'01':'JAN', '02':'FEV', '03':'MAR', '04':'ABR', '05':'MAI', '06':'JUN', '07':'JUL', '08':'AGO', '09':'SET', '10':'OUT', '11':'NOV', '12':'DEZ'};
                if (parts.length === 3) {
                    dateText = `${parts[0]} ${months[parts[1]] || parts[1]} ${parts[2]}`;
                }
                
                if (endDateText && endDateText !== $(ths[0]).text().trim()) {
                    const eParts = endDateText.split('-');
                    if (eParts.length === 3) {
                        endDateText = `${eParts[0]} ${months[eParts[1]] || eParts[1]} ${eParts[2]}`;
                    }
                } else {
                    endDateText = null;
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

                let fpcLinks = [];
                $(element).find('a').each((i, a) => {
                    const href = $(a).attr('href') || '';
                    const onclick = $(a).attr('onclick') || '';
                    const title = $(a).attr('title') || $(a).find('img').attr('title') || $(a).find('img').attr('alt') || '';
                    let extracted = '';
                    
                    if (onclick.includes('pagina_ver(')) {
                        const match = onclick.match(/'([^']+)'/);
                        if (match) extracted = match[1];
                    } else if (href.startsWith('http') && !href.endsWith('fpciclismo.pt') && !href.endsWith('fpciclismo.pt/')) {
                        extracted = href;
                    }
                    
                    if (extracted && !fpcLinks.some(l => l.link === extracted)) {
                        let label = 'Mais Info (FPC)';
                        if (title.toLowerCase().includes('inscrever') || extracted.includes('inscrever')) label = 'Inscrever (FPC)';
                        else if (title.toLowerCase().includes('classifica') || extracted.includes('classifica')) label = 'Resultados (FPC)';
                        else if (title.toLowerCase().includes('site') || title.toLowerCase().includes('página')) label = 'Website Oficial';
                        else if (title) label = `${title} (FPC)`;
                        
                        fpcLinks.push({ label, link: extracted });
                    }
                });

                events.push({
                    id: Math.random().toString(36).substr(2, 9),
                    date: dateText,
                    endDate: endDateText,
                    sortDate: parseSortDate(dateText, year),
                    title: nameText,
                    details: `${locText} | ${extraText}`,
                    escalao: escalao,
                    tag: getTag(nameText, det),
                    ambito: ambitoVal,
                    licenca: getLicenca(nameText, det, ambitoVal),
                    regiao: regiaoVal,
                    distrito: getDistrito(nameText, `${det} ${locText}`),
                    source: 'FPC',
                    link: fpcLinks.length > 0 ? fpcLinks[0].link : 'https://www.fpciclismo.pt/',
                    extraLinks: fpcLinks
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

        let dateText = $(element).find('.evento-item-data').text().trim().toUpperCase() || 'DATA A DEFINIR';
        const rawDateForSort = dateText;
        dateText = formatDateStr(dateText, year);
        
        let locText = $(element).find('.evento-item-local').text().trim() || 'A DEFINIR';
        if (locText !== 'A DEFINIR') {
            locText = toTitleCase(locText);
        }
        
        if (year && dateText.includes(year)) {
            const ambitoVal = getAmbito(title);
            events.push({
                id: Math.random().toString(36).substr(2, 9),
                date: dateText,
                sortDate: parseSortDate(rawDateForSort, year),
                title: title,
                details: locText,
                escalao: 'Todos (Aberto)', 
                tag: getTag(title),
                ambito: ambitoVal,
                licenca: 'CPT / Lazer', // Cabreira events are generally open
                regiao: getRegiao(title, locText),
                distrito: getDistrito(title, locText),
                source: 'Cabreira',
                link: href || 'https://cabreirasolutions.com/eventos/',
                extraLinks: href ? [{ label: 'Ver na Cabreira Solutions', link: href }] : []
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
        
        // --- Deduplication Logic ---
        const deduplicatedEvents = [];
        
        const getWords = (title) => {
            return title.toLowerCase().replace(/[^a-z0-9áéíóúãõç]/g, ' ').split(/\s+/).filter(w => w.length > 2);
        };

        for (const event of allEvents) {
            event.sourcesInfo = [{ source: event.source, link: event.link }];
            const eventWords = getWords(event.title);
            let duplicateIdx = -1;
            
            for (let i = 0; i < deduplicatedEvents.length; i++) {
                const existing = deduplicatedEvents[i];
                if (existing.sortDate === event.sortDate) {
                    const existingWords = getWords(existing.title);
                    
                    let overlap = 0;
                    for (const w of eventWords) {
                        if (existingWords.includes(w)) overlap++;
                    }
                    
                    const threshold = Math.min(2, Math.max(existingWords.length, eventWords.length));
                    if (overlap >= threshold || (overlap > 0 && (existingWords.length === 1 || eventWords.length === 1))) {
                        duplicateIdx = i;
                        break;
                    }
                }
            }
            
            if (duplicateIdx === -1) {
                deduplicatedEvents.push(event);
            } else {
                const existing = deduplicatedEvents[duplicateIdx];
                
                // Merge extraLinks
                if (event.extraLinks && event.extraLinks.length > 0) {
                    const existingLinks = existing.extraLinks || [];
                    for (const elink of event.extraLinks) {
                        if (!existingLinks.some(l => l.link === elink.link)) {
                            existingLinks.push(elink);
                        }
                    }
                    existing.extraLinks = existingLinks;
                }
                
                const currentSourceIndex = activeSources.indexOf(event.source);
                const existingSourceIndex = activeSources.indexOf(existing.source);
                
                if (currentSourceIndex !== -1 && (existingSourceIndex === -1 || currentSourceIndex < existingSourceIndex)) {
                    // Update main event data but preserve merged links
                    const mergedLinks = existing.extraLinks;
                    deduplicatedEvents[duplicateIdx] = { ...event, extraLinks: mergedLinks };
                }
            }
        }
        
        allEvents = deduplicatedEvents;
        
        // Sort chronologically
        allEvents.sort((a, b) => a.sortDate.localeCompare(b.sortDate));

        return Response.json({ success: true, events: allEvents });

    } catch (error) {
        console.error('Error in API:', error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
}
