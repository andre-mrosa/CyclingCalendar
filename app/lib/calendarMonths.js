import {eventDateDisplay} from '../utils/eventDateDisplay.js';
import {lisbonWallClock} from '../utils/planning.js';
export function monthCollection(slug){
    if(typeof slug!=='string'||!/^20\d{2}-(0[1-9]|1[0-2])$/.test(slug))return null;
    const start=slug+'-01',end=new Date(Date.UTC(Number(slug.slice(0,4)),Number(slug.slice(5)),0)).toISOString().slice(0,10);
    const name=new Intl.DateTimeFormat('pt-PT',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(start+'T12:00:00Z'));
    return {slug,name,intro:`Consulta as datas publicadas de provas de ciclismo em ${name}. Incluímos provas de vários dias quando o intervalo publicado abrange este mês. Confirma o programa e eventuais alterações na fonte.`,match:event=>{const dates=eventDateDisplay(event);return !!dates.start&&dates.start<=end&&dates.end>=start;}};
}
export function availableMonths(events,today=lisbonWallClock().slice(0,10)){
    const [year,month]=today.split('-').map(Number);
    return Array.from({length:12},(_,i)=>monthCollection(new Date(Date.UTC(year,month-1+i,1)).toISOString().slice(0,7))).filter(item=>events.some(item.match));
}
