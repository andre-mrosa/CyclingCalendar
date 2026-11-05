// An ordering anchor is never evidence of a known race day.
const months = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
export function raceMonth(event) {
    const match=String(event?.date||'').trim().match(/^[—–-]\s*([A-Z]{3})\s+(20\d{2})$/i);
    const index=match?months.indexOf(match[1].toUpperCase()):-1;
    return index<0?null:`${match[2]}-${String(index+1).padStart(2,'0')}`;
}
export function monthEnd(month) {
    const [year,number]=month.split('-').map(Number);
    return new Date(Date.UTC(year,number,0)).toISOString().slice(0,10);
}
export function cleanTemporalEvidence(value) {
    if(!value||value.version!==1)return null;
    const out={version:1};
    if(typeof value.series==='string'&&/^[a-z0-9-]{1,80}$/.test(value.series))out.series=value.series;
    for(const field of ['race','registrationOpen','registrationClose']) {
        const item=value[field];
        if(!item||!['day','month'].includes(item.precision)||typeof item.value!=='string')continue;
        const pattern=item.precision==='month'?/^20\d{2}-(0[1-9]|1[0-2])$/:/^20\d{2}-(0[1-9]|1[0-2])-([0-2]\d|3[01])(?:T\d{2}:\d{2}:\d{2}\.000Z)?$/;
        if(!pattern.test(item.value)||!Number.isFinite(Date.parse(item.value+(item.precision==='month'?'-01':''))))continue;
        if(item.precision==='day'&&new Date(item.value).toISOString().slice(0,10)!==item.value.slice(0,10))continue;
        let source;try{const url=new URL(item.source);if(url.protocol!=='https:'||url.username||url.password)continue;source=url.href;}catch{continue;}
        out[field]={precision:item.precision,value:item.value,source};
    }
    return Object.keys(out).length>1?out:null;
}
export const monthlyRegistration = event => event?.temporalEvidence?.registrationOpen?.precision==='month';
export function monthLabel(month,language='pt') {
    return new Intl.DateTimeFormat(language,{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(month+'-01T12:00:00Z'));
}
export const expectedOpeningLabel = language => ({pt:'Abertura prevista de inscrições',en:'Expected registration opening',es:'Apertura prevista de inscripciones',fr:'Ouverture prévue des inscriptions'})[language]||'Expected registration opening';
export const monthlyOpeningNote = 'A organização anunciou apenas o mês. O dia 1 é um lembrete; confirma a data exata na fonte.';

export function organizerSeries(event) {
    const name=String(event?.title||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\b20\d{2}\b/g,'').replace(/[^a-z0-9]+/g,' ').trim();
    if(name==='mountain quest')return 'mountain-quest';
    if(['bairrada ultra marathon','bairrada ultra marathon 150','bairrada 150'].includes(name))return 'bairrada-ultra-marathon';
    if(name==='iron rider salvador do monte')return 'iron-rider-salvador';
    if(name==='iron rider castelo de paiva')return 'iron-rider-castelo';
    if(name==='terra norte')return 'terra-norte';
    return null;
}
