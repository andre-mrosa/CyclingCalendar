import * as cheerio from 'cheerio';

import sharp from 'sharp';

export const fetchImageAsBase64 = async (url) => {
    if (!url) return null;
    try {
        const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!response.ok) return null;
        
        const contentType = (response.headers.get('content-type') || '').toLowerCase();
        
        // Skip non-image responses (HTML pages, redirects, etc.)
        if (!contentType.includes('image') && !contentType.includes('octet-stream')) {
            return null;
        }
        
        const arrayBuffer = await response.arrayBuffer();
        let buffer = Buffer.from(arrayBuffer);
        
        // SVGs can't be processed by sharp — pass through directly
        if (contentType.includes('svg')) {
            return `data:image/svg+xml;base64,${buffer.toString('base64')}`;
        }
        
        try {
            buffer = await sharp(buffer)
                .resize({ width: 800, withoutEnlargement: true })
                .webp({ quality: 80 })
                .toBuffer();
            return `data:image/webp;base64,${buffer.toString('base64')}`;
        } catch (sharpError) {
            // If sharp fails, return raw image as-is (better than nothing)
            return `data:${contentType || 'image/jpeg'};base64,${Buffer.from(arrayBuffer).toString('base64')}`;
        }
    } catch (e) {
        console.error('Error fetching image as base64:', url, e);
        return null;
    }
};

export const getTag = (name, det = '') => {
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

export const getAmbito = (name, det = '') => {
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

export const getLicenca = (name, det = '', ambito = '') => {
    const full = (name + ' ' + det).toLowerCase();
    if (full.includes('cpt') || ambito === 'Prova Aberta' || full.includes('granfondo') || full.includes('passeio') || full.includes('aberta') || full.includes('audace')) {
        return 'CPT / Lazer';
    }
    return 'Competição';
};

export const getRegiao = (name, det = '') => {
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
    
    for (const [region, keywords] of Object.entries(regions)) {
        keywords.sort((a, b) => b.length - a.length);
        for (const keyword of keywords) {
            const paddedFull = ' ' + full.replace(/[^\w\s\u00C0-\u017F]/g, ' ') + ' ';
            const paddedKeyword = ' ' + keyword + ' ';
            if (paddedFull.includes(paddedKeyword)) return region;
        }
    }
    return '';
};

export const getDistrito = (name, det = '') => {
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
            if (paddedFull.includes(paddedKeyword)) return distrito;
        }
    }
    return '';
};

export const parseSortDate = (dateStr, year) => {
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

export const formatDateStr = (dateStr, year) => {
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
    
    const hasYear = /\b202\d\b/.test(str);
    if (year && !hasYear) {
        str = `${str} ${year}`;
    }
    
    return str;
};

export const toTitleCase = (str) => {
    if (!str) return '';
    return str.toLowerCase().split(/\s+/).map((word, index) => {
        const exceptions = ['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'em', 'na', 'no', 'nas', 'nos'];
        if (index > 0 && exceptions.includes(word)) {
            return word;
        }
        return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
};

export const parsePTDateToISO = (dateStr) => {
    if (!dateStr) return null;
    try {
        const parts = dateStr.trim().split(' ');
        const datePart = parts[0]; 
        const [day, month, year] = datePart.split('-');
        
        let timePart = "00:00:00";
        if (parts.length >= 3 && parts[1] === 'pelas') {
            timePart = parts[2].replace('h', ':') + ':00';
        }
        
        if (day && month && year) {
            return new Date(`${year}-${month}-${day}T${timePart}Z`);
        }
    } catch(e) {
        return null;
    }
    return null;
};

export const sanitizeHtml = (htmlString) => {
    if (!htmlString || typeof htmlString !== 'string') return '';
    try {
        const $c = cheerio.load(htmlString);
        // Remove dangerous tags completely
        $c('script, iframe, object, embed, form, input, button, select, textarea, link, meta, style').remove();
        
        // Remove all on* event handlers and javascript: hrefs
        $c('*').each(function() {
            const el = $c(this);
            const attribs = el.attr() || {};
            for (const attr of Object.keys(attribs)) {
                const lower = attr.toLowerCase();
                if (lower.startsWith('on') || lower === 'srcdoc') {
                    el.removeAttr(attr);
                }
            }
            const href = el.attr('href');
            if (href && href.trim().toLowerCase().startsWith('javascript:')) {
                el.removeAttr('href');
            }
        });

        $c('*').removeAttr('style').removeAttr('class').removeAttr('id').removeAttr('dir').removeAttr('align');
        $c('span').each(function() { $c(this).replaceWith($c(this).html()); });
        $c('img, svg, i').remove();
        return $c('body').html() || htmlString;
    } catch {
        return '';
    }
};
