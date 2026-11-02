import {filterEvents} from './filterEvents.js';
import {filterCalendarByDate} from './calendarList.js';
import {eventsInPeriod} from './calendarPresentation.js';
import {matchesPeriod} from './planning.js';
import {eventDateDisplay} from './eventDateDisplay.js';
export function searchResultEvents(events,filters,context){
    let rows=filterEvents(events,{...filters,...context,...context.fixed});
    rows=filterCalendarByDate(rows,filters.pastEventsFilter,context.today,filters.selectedYears||[]);
    rows=rows.filter(event=>matchesPeriod(event,filters.quickPeriod,new Date(context.today+'T12:00:00Z')));
    return eventsInPeriod(rows,filters.selectedMonth,filters.selectedDay);
}
export function searchSuggestions(events,filters,context){
    const allYears=[...new Set(events.flatMap(event=>{const date=eventDateDisplay(event);return [date.start?.slice(0,4),date.end?.slice(0,4)];}).filter(Boolean))];
    const datePatch={selectedYears:allYears,pastEventsFilter:'todos',selectedMonth:null,selectedDay:null,monthFrom:1,monthTo:12,quickPeriod:''};
    const candidates=[];
    if(filters.selectedEscaloes?.length&&!filters.includeUnknownCategories)candidates.push({key:'unknown',patch:{includeUnknownCategories:true}});
    candidates.push({key:'dates',patch:datePatch});
    if(filters.searchTerm)candidates.push({key:'text',patch:{searchTerm:''}});
    if(!context.fixed?.selectedEscaloes&&filters.selectedEscaloes?.length)candidates.push({key:'categories',patch:{selectedEscaloes:[]}});
    if(filters.selectedRegiao!=='Todas'||filters.selectedDistrito!=='Todos')candidates.push({key:'location',patch:{selectedRegiao:'Todas',selectedDistrito:'Todos'}});
    if(filters.selectedTags?.length||filters.selectedType!=='Todos')candidates.push({key:'discipline',patch:{selectedTags:[],selectedType:'Todos'}});
    candidates.push({key:'broaden',patch:{...datePatch,searchTerm:'',selectedEscaloes:[],includeUnknownCategories:true,selectedRegiao:'Todas',selectedDistrito:'Todos',selectedTags:[],selectedType:'Todos'}});
    const suggestions=[],seen=new Set();
    for(const candidate of candidates){
        const rows=searchResultEvents(events,{...filters,...candidate.patch},context),signature=JSON.stringify(rows.map(event=>event.id).sort());
        if(!rows.length||seen.has(signature))continue;
        seen.add(signature);suggestions.push({...candidate,count:rows.length});
        if(suggestions.length===3)break;
    }
    return suggestions;
}
