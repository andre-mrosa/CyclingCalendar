import { createRoadDistanceService, roadDistanceResponse } from '../../lib/roadDistance.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const service = createRoadDistanceService({ apiKey: process.env.ORS_API_KEY });

export function GET() {
    return Response.json({ available: service.available }, { headers: { 'Cache-Control': 'no-store' } });
}

export function POST(request) {
    return roadDistanceResponse(request, service);
}
