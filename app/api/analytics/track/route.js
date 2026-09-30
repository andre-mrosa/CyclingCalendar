// Detailed analytics are disabled. Also stop ingestion from older cached clients.
// A future implementation must establish an appropriate consent flow first.
export const dynamic = 'force-dynamic';
export async function POST() {
    return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
}
