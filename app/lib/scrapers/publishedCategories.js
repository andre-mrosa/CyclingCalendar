import * as cheerio from 'cheerio';
import {publishedEventCategories} from '../../utils/eventClassifier.js';

export function categoryOptions(html) {
    const $=cheerio.load(html);
    const text=$('select[name*="escalao"] option,select[name*="categoria"] option').map((_,element)=>$(element).text()).get().join(' ');
    return publishedEventCategories(text);
}
export function regulationCategories(html) {
    const $=cheerio.load(html), labels=new Set(categoryOptions(html));
    $('h2,h3,h4,h5,strong,b').each((_,element)=>{
        const heading=$(element), name=heading.text().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
        if(!/^(?:\d+[.\s]*)?(?:escaloes|categorias)(?:\s+\d{4})?\s*:?$/i.test(name))return;
        const block=heading.parent().is('p')?heading.parent():heading;
        const text=block.nextUntil('h1,h2,h3,h4,h5').slice(0,6).text().slice(0,1500);
        for(const label of publishedEventCategories(text))labels.add(label);
    });
    return [...labels];
}
