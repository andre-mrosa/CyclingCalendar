import { clerkClient } from '@clerk/nextjs/server';
import { Prisma } from '@prisma/client';
import { Resend } from 'resend';
import { prisma } from '@/app/lib/db';
import { getPublicCalendarEvents } from '@/app/lib/getPublicCalendarEvents';
import { editionEmailAvailable } from '@/app/lib/favoriteEditionSettings';
import { processFavoriteEditions } from '@/app/lib/sendEditionAlerts';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;
const response = (value, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'private, no-store' } });
export async function GET(request) {
    if (!process.env.CRON_SECRET) return response({ success: false, error: 'Cron authentication unavailable' }, 503);
    if (request.headers.get('authorization') !== 'Bearer ' + process.env.CRON_SECRET) return response({ success: false, error: 'Unauthorized' }, 401);
    try {
        const [client, events, rows] = await Promise.all([clerkClient(), getPublicCalendarEvents(),
            prisma.favoriteEditionPreference.findMany({ where: { follow: true }, orderBy: { checkedAt: 'asc' }, take: 100 })]);
        const available = editionEmailAvailable();
        const resend = available ? new Resend(process.env.RESEND_API_KEY) : null;
        const counts = {};
        for (const row of rows) {
            try {
                const result = await processFavoriteEditions({ db: prisma, users: client.users, events, row,
                    emailAvailable: available, jsonNull: Prisma.DbNull,
                    send: (message, key) => resend.emails.send({ from: process.env.EDITION_ALERTS_FROM_EMAIL, ...message },
                        { idempotencyKey: 'favorite-editions/' + key }) });
                counts[result] = (counts[result] || 0) + 1;
            } catch { counts.failed = (counts.failed || 0) + 1; }
        }
        return response({ success: !counts.failed && !counts['needs-review'], processed: rows.length, counts },
            counts.failed || counts['needs-review'] ? 503 : 200);
    } catch { return response({ success: false, error: 'Edition processing unavailable' }, 503); }
}
