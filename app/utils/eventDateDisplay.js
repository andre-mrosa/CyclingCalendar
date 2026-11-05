import { detectRaceDate } from './detectRaceDate.js';
import {raceMonth,monthEnd} from './partialDates.js';

const MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
export function eventDateDisplay(event) {
    const monthly=raceMonth(event);
    if(monthly)return {day:'—',month:MONTHS[Number(monthly.slice(5))-1],year:Number(monthly.slice(0,4)),monthIdx:Number(monthly.slice(5))-1,key:monthly,singleDay:false,precision:'month',periodStart:monthly+'-01',periodEnd:monthEnd(monthly)};
    const dates = detectRaceDate(event);
    if (!dates) return { day: '—', month: '', year: null, monthIdx: null, key: 'unknown', singleDay: false };
    const start = dates.raceDateISO, end = dates.raceEndDateISO;
    const firstMonth = MONTHS[Number(start.slice(5, 7)) - 1];
    const lastMonth = MONTHS[Number(end.slice(5, 7)) - 1];
    const singleDay = start === end;
    return {
        day: singleDay ? String(Number(start.slice(8))) : `${Number(start.slice(8))}–${Number(end.slice(8))}`,
        month: firstMonth === lastMonth ? firstMonth : `${firstMonth}/${lastMonth}`,
        year: Number(start.slice(0, 4)), monthIdx: Number(start.slice(5, 7)) - 1,
        key: start.slice(0, 7), start, end, singleDay,
    };
}
