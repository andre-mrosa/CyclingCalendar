import { cookies } from 'next/headers';
import { ANALYTICS_CONSENT_ACCEPTED, ANALYTICS_CONSENT_COOKIE, ANALYTICS_CONSENT_MAX_AGE, ANALYTICS_CONSENT_REJECTED } from '@/app/lib/analyticsConsent';

export const dynamic = 'force-dynamic';
const noStore = { 'Cache-Control': 'no-store' };

export async function GET() {
    const choice = (await cookies()).get(ANALYTICS_CONSENT_COOKIE)?.value;
    return Response.json({ choice: choice === ANALYTICS_CONSENT_ACCEPTED ? 'accepted' : choice === ANALYTICS_CONSENT_REJECTED ? 'rejected' : null }, { headers: noStore });
}

export async function POST(request) {
    const origin = request.headers.get('origin');
    if (origin) {
        try {
            if (new URL(origin).host !== new URL(request.url).host) return Response.json({ error: 'Origem inválida.' }, { status: 403, headers: noStore });
        } catch { return Response.json({ error: 'Origem inválida.' }, { status: 403, headers: noStore }); }
    }

    let choice;
    try { choice = (await request.json()).choice; }
    catch { return Response.json({ error: 'Escolha inválida.' }, { status: 400, headers: noStore }); }
    if (choice !== 'accepted' && choice !== 'rejected') return Response.json({ error: 'Escolha inválida.' }, { status: 400, headers: noStore });

    (await cookies()).set(ANALYTICS_CONSENT_COOKIE, choice === 'accepted' ? ANALYTICS_CONSENT_ACCEPTED : ANALYTICS_CONSENT_REJECTED, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: ANALYTICS_CONSENT_MAX_AGE,
    });
    return Response.json({ success: true, choice }, { headers: noStore });
}
