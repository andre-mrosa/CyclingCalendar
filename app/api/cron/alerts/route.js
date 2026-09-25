import { clerkClient } from '@clerk/nextjs/server';
import { Prisma } from '@prisma/client';
import { Resend } from 'resend';
import { prisma } from '@/app/lib/db';
import { deliverFavoriteAlert } from '@/app/lib/sendFavoriteAlerts';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;
export async function GET(request) {
    if (!process.env.CRON_SECRET) return Response.json({ error: 'Unavailable' }, { status: 503 });
    if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!process.env.RESEND_API_KEY || !process.env.ALERTS_FROM_EMAIL) return Response.json({ error: 'Configure RESEND_API_KEY and ALERTS_FROM_EMAIL' }, { status: 503 });
    const now = new Date();
    const counts = {};
    const client = await clerkClient();
    const resend = new Resend(process.env.RESEND_API_KEY);
    // Oldest checked users first; a bounded batch resumes fairly next run.
    const rows = await prisma.favoriteAlert.findMany({ where: { enabled: true, checkedAt: { lt: new Date(now.getTime() - 50 * 60 * 1000) } }, orderBy: { checkedAt: 'asc' }, take: 100 });
    for (const row of rows) {
        if (Date.now() - now.getTime() > 240000) break;
        try {
            const status = await deliverFavoriteAlert({ db: prisma, users: client.users, row, now, jsonNull: Prisma.DbNull,
                send: (email, key) => resend.emails.send({ from: process.env.ALERTS_FROM_EMAIL, ...email }, { idempotencyKey: key }) });
            counts[status] = (counts[status] || 0) + 1;
        } catch { counts.failed = (counts.failed || 0) + 1; }
    }
    return Response.json({ success: !counts.failed && !counts['needs-review'], counts }, { status: counts.failed || counts['needs-review'] ? 503 : 200 });
}
