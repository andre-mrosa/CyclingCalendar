import {detectRaceDate} from '../utils/detectRaceDate.js';
import {categoryStatus} from '../utils/categoryEvidence.js';

export function sourceQualityMetrics(events) {
    const metrics={processed:events.length,unknownDiscipline:0,unknownCategories:0,invalidDates:0,duplicatePages:0};
    const pages=new Set();
    for(const event of events){
        if(!event.tag)metrics.unknownDiscipline++;
        if(categoryStatus(event).status!=='published')metrics.unknownCategories++;
        if(!detectRaceDate(event))metrics.invalidDates++;
        // Calendar indexes legitimately contain many events on the same page.
        if(event.link){try{const url=new URL(event.link);if(!/^\/(?:calendario(?:\.php)?|calendar)?\/?$/i.test(url.pathname)){const key=event.link+'|'+new Date(event.sortDate).getUTCFullYear();if(pages.has(key))metrics.duplicatePages++;pages.add(key);}}catch{/* Invalid links are handled at the publication boundary. */}}
    }
    return metrics;
}
export function qualityIssues(metrics,previous,partial=false) {
    const issues=[];
    if(partial)issues.push({code:'partial',severity:'error',value:1});
    if(previous?.processed>=5&&metrics.processed<previous.processed*0.5)issues.push({code:'volume_drop',severity:'warning',value:metrics.processed,previous:previous.processed});
    for(const code of ['unknownDiscipline','invalidDates','duplicatePages'])if(metrics[code]>0)issues.push({code,severity:'warning',value:metrics[code]});
    // Missing age categories are common in listings: surface the count without
    // declaring the events invalid or suppressing them from the calendar.
    if(metrics.unknownCategories)issues.push({code:'unknownCategories',severity:'info',value:metrics.unknownCategories});
    return issues;
}
export async function recordSourceQuality({db,source,year,runId,startedAt,partial=false}) {
    const scopeKey=source+':'+(year||'active');
    const [events,previous]=await Promise.all([
        db.event.findMany({where:{lastVerifiedSource:source,lastVerifiedAt:{gte:startedAt},...(year?{sortDate:{gte:new Date(year+'-01-01'),lt:new Date((Number(year)+1)+'-01-01')}}:{})},select:{id:true,tag:true,date:true,sortDate:true,categoryEvidence:true,link:true}}),
        db.sourceQualitySnapshot.findFirst({where:{scopeKey},orderBy:{createdAt:'desc'}}),
    ]);
    const metrics=sourceQualityMetrics(events);
    const issues=qualityIssues(metrics,previous?.metrics,partial);
    const result=await db.sourceQualitySnapshot.create({data:{scopeKey,source,runId,metrics,issues}});
    return result;
}
