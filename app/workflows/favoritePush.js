import { sleep } from 'workflow';
import { deliverFavoritePushBatch } from './favoritePushSteps.js';

// One daily starter; durable wake-ups also cover quarter-hour time zones.
export async function favoritePushWorkflow(startedAt) {
    'use workflow';
    const slot = 15 * 60000;
    const firstSlot = Math.floor(new Date(startedAt).getTime() / slot) * slot;
    for (let tick = 0; tick <= 100; tick++) {
        if (tick) await sleep(new Date(firstSlot + tick * slot));
        try { await deliverFavoritePushBatch(); }
        catch { /* The failed step is recorded; the next wake-up retries outstanding deliveries. */ }
    }
}
