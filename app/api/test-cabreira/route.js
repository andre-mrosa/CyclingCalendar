import { requireAdmin } from '@/app/lib/auth-helpers';
import { prisma } from '../../lib/db';
import { deepScrapeCabreira } from '../../lib/scrapers/cabreira';
import { NextResponse } from 'next/server';

export async function GET(request) {
    const admin = await requireAdmin();
    if (!admin.authorized) return Response.json({ success: false, error: admin.error }, { status: admin.status });

    try {
        const events = await prisma.event.findMany({
            where: {
                OR: [
                    { title: { contains: 'Basto', mode: 'insensitive' } },
                    { details: { contains: 'Basto', mode: 'insensitive' } },
                    { title: { contains: 'Rota', mode: 'insensitive' } }
                ]
            }
        });
        return NextResponse.json({ success: true, count: events.length, events });
    } catch(e) {
        return NextResponse.json({ success: false, error: e.message });
    }
}
