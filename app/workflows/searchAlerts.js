import {deliverSearchAlertBatch} from './searchAlertSteps.js';
export async function searchAlertWorkflow(){
    'use workflow';
    let cursor=null;
    do{const result=await deliverSearchAlertBatch(cursor);cursor=result.nextCursor;}while(cursor);
}
