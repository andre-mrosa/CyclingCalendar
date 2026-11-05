import * as cheerio from 'cheerio';
import {parsePublishedRaceDate} from './publishedDates.js';
const MONTHS=['janeiro','fevereiro','marco','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const SHORT=['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
const normal=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toLowerCase();
export const ORGANIZER_PAGES=Object.freeze({
 mq:'https://mountainquest.pt/',mqRegistration:'https://mountainquest.pt/registrations/',series:'https://mountainquest.pt/mqseries/',
 salvador:'https://ironrider.pt/regulamento/',castelo:'https://ironrider.pt/regulamento-castelo/',terra:'https://terranorte.pt/percurso/regulamento/',
 bairrada:'https://www.bairrada150.pt/bairrada150/',bairradaRules:'https://www.bairrada150.pt/bairrada150/index.php/informacoes/regulamento',
});
function exact(value){const match=String(value).match(/\b\d{1,2}\s+(?:de\s+)?[a-zç]+\s+(?:de\s+)?20\d{2}\b/i);return match&&parsePublishedRaceDate(match[0]);}
function monthly(value){const text=normal(value),match=text.match(/\b([a-z]+)\s*(?:de\s+)?(20\d{2})\b/);if(!match)return null;const m=MONTHS.indexOf(match[1])>=0?MONTHS.indexOf(match[1]):SHORT.map(x=>x.toLowerCase()).indexOf(match[1]);return m<0?null:`${match[2]}-${String(m+1).padStart(2,'0')}`;}
const fact=(value,source,precision='day')=>({value,source,precision});
function event(series,title,location,date,source,tag='BTT') {
 const month=monthly(date),parsed=exact(date);
 if(!parsed&&!month)throw Error(`${title}: data publicada não reconhecida`);
 const year=parsed?parsed.endDate.slice(0,4):month.slice(0,4);
 return {id:`organizador-${series}-${year}`,title:`${title} ${year}`,date:parsed?parsed.date:`— ${SHORT[Number(month.slice(5))-1]} ${year}`,sortDate:parsed?parsed.sortDate:new Date(month+'-01T00:00:00Z'),details:location,distrito:location,source:'Organizador',link:source,tag,
  temporalEvidence:{version:1,series,race:fact(parsed?parsed.sortDate.toISOString().slice(0,10):month,source,parsed?'day':'month')}};
}
function text(html){const $=cheerio.load(html);$('script,style,nav,header,footer').remove();$('p,div,h1,h2,h3,h4,li,br,td').after(' ');return $('body').text().replace(/\s+/g,' ').trim();}
function applyRegistration(row,opening,closing,source){
 for(const [name,raw] of [['Open',opening],['Close',closing]]) {
  if(!raw)continue;
  const date=exact(raw),month=monthly(raw);if(!date&&!month)continue;
  const value=date?date.sortDate.toISOString():month+'-01T00:00:00.000Z';
  // Month-only closing statements do not establish a deadline.
  if(!date&&name==='Close')continue;
  const time=raw.match(/\b(\d{1,2})[h:](\d{2})\b/);
  const moment=new Date(value);moment.setUTCHours(time?Number(time[1]):name==='Close'?23:0,time?Number(time[2]):name==='Close'?59:0,0,0);
  if(time&&(Number(time[1])>23||Number(time[2])>59))throw Error('Hora de inscrições inválida');
  if(moment>=new Date(row.sortDate)&&row.temporalEvidence.race.precision==='day')throw Error(`${row.title}: inscrições posteriores à prova`);
  row[`registration${name==='Open'?'Opens':'Closes'}At`]=moment.toISOString();
  row.temporalEvidence[`registration${name}`]=fact(date?moment.toISOString():month,source,date?'day':'month');
 }
 if(row.registrationOpensAt&&row.registrationClosesAt&&row.registrationOpensAt>row.registrationClosesAt)throw Error('Período de inscrições invertido');
}
export function parseMountainQuest(home,registration,seriesHtml,details={}) {
 const $=cheerio.load(home),headline=$('.hub-date').text().trim();
 if(!headline||!/amarante/i.test(headline))throw Error('Mountain Quest: destaque da edição não reconhecido');
 const mq=event('mountain-quest','Mountain Quest','Amarante',headline,ORGANIZER_PAGES.mq);
 // Only literals used by the current registration UI; never stale JSON-LD or comments.
 const reg=cheerio.load(registration),scripts=reg('script:not([src]):not([type="application/ld+json"])').map((_,el)=>reg(el).text()).get().join('\n').replace(/\/\*[\s\S]*?\*\//g,'');
 const config=scripts.match(/\bvar\s+CONFIG\s*=\s*\{\s*date\s*:\s*['"]([^'"]+)['"]/);
 const opening=scripts.match(/kReg\s*:\s*['"]Inscri[çc][õo]es abrem['"]\s*,\s*vReg\s*:\s*['"]([^'"]+)['"]/);
 if(!config||config[1]!==mq.temporalEvidence.race.value)throw Error('Mountain Quest: inscrições sem confirmação da edição atual');
 if(opening)applyRegistration(mq,opening[1],null,ORGANIZER_PAGES.mqRegistration);
 const out=[mq],s=cheerio.load(seriesHtml);
 for(const [slug,title,location] of [['salvador','Iron Rider — Salvador do Monte','Salvador do Monte'],['castelo','Iron Rider — Castelo de Paiva','Castelo de Paiva']]) {
  const cards=s('.ir-card').filter((_,el)=>normal(s(el).text()).includes(normal(location)));
  if(cards.length!==1)throw Error(`MQ Series: ronda ${location} não reconhecida`);
  const raw=cards.find('.ir-date').text().replace(/([a-z])(?=20\d{2})/i,'$1 ');
  const row=event(`iron-rider-${slug}`,title,location,raw,ORGANIZER_PAGES.series);
  const detail=text(details[slug]||'');
  const date=detail.match(/\bData:\s*(\d{1,2}\s+de\s+[a-zç]+\s+de\s+20\d{2})/i);
  if(date&&exact(date[1])?.endDate.slice(0,4)===row.sortDate.getUTCFullYear().toString()) {
   const precise=event(`iron-rider-${slug}`,title,location,date[1],ORGANIZER_PAGES[slug]);
   const open=detail.match(/inscri[çc][õo]es estar[ãa]o abertas a partir das (\d{1,2}:\d{2})h?[^.]*?,\s*(\d{1,2}\s+de\s+[a-zç]+\s+de\s+20\d{2})/i);
   const close=detail.match(/inscri[çc][õo]es[^.]{0,350}?at[ée] ao dia (\d{1,2}\s+de\s+[a-zç]+\s+de\s+20\d{2})/i);
   applyRegistration(precise,open?`${open[2]} ${open[1]}`:null,close?.[1],ORGANIZER_PAGES[slug]);out.push(precise);
  }else out.push(row);
 }
 const terra=s('.tn-ban').text();if(!monthly(terra))throw Error('MQ Series: anúncio Terra Norte não reconhecido');
 const tn=event('terra-norte','Terra Norte','Vila Real',terra,ORGANIZER_PAGES.series,'Gravel');
 const terraDate=text(details.terra||'').match(/evento realiza-se no dia (\d{1,2}\s+de\s+[a-zç]+\s+de\s+20\d{2})/i);
 out.push(terraDate&&exact(terraDate[1])?.endDate.slice(0,4)===tn.sortDate.getUTCFullYear().toString()?event('terra-norte','Terra Norte','Vila Real',terraDate[1],ORGANIZER_PAGES.terra,'Gravel'):tn);
 return out;
}
export function parseBairrada(home,rules) {
 const $=cheerio.load(home),heading=$('h2').filter((_,el)=>/\b20\d{2}\b/.test($(el).text())).first().text();
 if(!/agueda/.test(normal(heading)))throw Error('Bairrada: destaque da prova não reconhecido');
 const row=event('bairrada-ultra-marathon','Bairrada Ultra Marathon','Águeda',heading,ORGANIZER_PAGES.bairrada);
 const body=text(rules),edition=body.match(/Regulamento Oficial\s*[—–-]\s*Bairrada Ultra Marathon\s+(20\d{2})/i);
 if(!edition)throw Error('Bairrada: edição do regulamento não reconhecida');
 if(edition[1]!==String(row.sortDate.getUTCFullYear())){row._warnings=['Regulamento de outra edição: inscrições e condições não importadas'];return [row];}
 const race=body.match(/Data:\s*(\d{1,2}\s+de\s+[a-zç]+\s+de\s+20\d{2})/i);
 if(row.temporalEvidence.race.precision==='month'&&race) {
  const precise=event('bairrada-ultra-marathon','Bairrada Ultra Marathon','Águeda',race[1],ORGANIZER_PAGES.bairradaRules);
  if(precise.temporalEvidence.race.value.slice(0,7)!==row.temporalEvidence.race.value)throw Error('Bairrada: datas contraditórias entre página e regulamento');
  Object.assign(row,precise,{link:ORGANIZER_PAGES.bairrada});
 }else if(row.temporalEvidence.race.precision==='day'&&(!race||exact(race[1])?.endDate!==row.temporalEvidence.race.value))throw Error('Bairrada: datas contraditórias entre página e regulamento');
 const period=body.match(/Per[ií]odo de Inscri[çc][õo]es\s+De\s+(\d{1,2}\s+de\s+[a-zç]+\s+de\s+20\d{2})\s*\((\d{2})h(\d{2})\)\s+a\s+(\d{1,2}\s+de\s+[a-zç]+\s+de\s+20\d{2})\s*\((\d{2})h(\d{2})\)/i);
 if(period)applyRegistration(row,`${period[1]} ${period[2]}:${period[3]}`,`${period[4]} ${period[5]}:${period[6]}`,ORGANIZER_PAGES.bairradaRules);
 return [row];
}
