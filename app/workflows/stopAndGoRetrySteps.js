import { RetryableError } from 'workflow';

export async function planSourceRetry(token) {
    'use step';
    const {planStopAndGoRetry}=await import('../lib/scrapers/stopandgoRetry.js');
    return planStopAndGoRetry(token);
}
export async function beginSourceRetry(token) {
    'use step';
    const {beginStopAndGoRetry}=await import('../lib/scrapers/stopandgoRetry.js');
    try {return await beginStopAndGoRetry(token);}
    catch(error) {
        if(error.code==='SCRAPER_ALREADY_RUNNING')throw new RetryableError('A aguardar a sincronização em curso.',{retryAfter:'1m'});
        throw error;
    }
}
beginSourceRetry.maxRetries=60;
export async function finishSourceRetry(token,retryAt) {
    'use step';
    const {finishStopAndGoRetry}=await import('../lib/scrapers/stopandgoRetry.js');
    return finishStopAndGoRetry(token,retryAt);
}
