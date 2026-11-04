import { sleep } from 'workflow';
import { planSourceRetry, beginSourceRetry, finishSourceRetry } from './stopAndGoRetrySteps.js';
import { executeCalendarStage, recordCalendarFailure } from './calendarSteps.js';

// Durable waits release the server. Only Stop and Go is collected on waking;
// other calendar sources and the browser are not needed for this retry.
export async function stopAndGoRetryWorkflow({token}) {
    'use workflow';
    for(let attempt=0;attempt<3;attempt++) {
        let started;
        for(let reschedule=0;reschedule<100;reschedule++) {
            const plan=await planSourceRetry(token);
            if(plan.cancelled)return;
            await sleep(new Date(plan.scheduledAt));
            started=await beginSourceRetry(token);
            if(started.cancelled||started.exhausted)return;
            if(started.options)break;
        }
        if(!started?.options)throw Error('Não foi possível iniciar a retoma automática.');
        let options=started.options, retryAt=null, finished=false;
        try {
            for(let block=0;block<36;block++) {
                const result=await executeCalendarStage(options);
                retryAt=result.sourceRetryAt||retryAt;
                if(!result.nextStage){finished=true;break;}
                options={...options,pipelineStage:result.nextStage,years:result.years,attempt:result.nextAttempt,hadErrors:result.hadErrors,sourceContinuation:result.sourceContinuation||null};
            }
            if(!finished)throw Error('Limite de blocos da retoma excedido.');
        } catch(error) {
            await recordCalendarFailure(options.runId,options.pipelineStage,String(error.message||error));
            throw error;
        }
        const next=await finishSourceRetry(token,retryAt);
        if(!next.again)return;
    }
}
