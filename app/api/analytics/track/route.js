import { headers } from 'next/headers';
import { prisma } from '@/app/lib/db';
import { getAuthUser, isMasterAdmin } from '@/app/lib/auth-helpers';
import { extractGeoAndDevice } from '@/app/lib/analytics';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    try {
        let body = {};
        try {
            const raw = await request.text();
            if (raw) body = JSON.parse(raw);
        } catch {
            return Response.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
        }

        const {
            visitorId,
            sessionId,
            type,
            path = '/',
            targetId = null,
            targetTitle = null,
            metadata = null,
            duration = 0,
            referrer = null
        } = body;

        if (!visitorId) {
            return Response.json({ success: false, error: 'visitorId required' }, { status: 400 });
        }

        const reqHeaders = await headers();
        const cookieHeader = reqHeaders.get('cookie') || '';
        const geoAndDevice = extractGeoAndDevice(reqHeaders);

        // Check if current user is admin (to flag & completely drop admin traffic)
        let isAdmin = false;
        let userId = null;
        let userEmail = null;

        if (cookieHeader.includes('cc_admin_device=1')) {
            isAdmin = true;
        }

        try {
            const authUser = await getAuthUser();
            if (authUser) {
                userId = authUser.userId;
                userEmail = authUser.userEmail;
                const role = authUser.role;
                if (role === 'admin' || isMasterAdmin(authUser) || isMasterAdmin(userId) || isMasterAdmin(userEmail)) {
                    isAdmin = true;
                }
            }
        } catch {}

        if (userEmail && isMasterAdmin(userEmail)) {
            isAdmin = true;
        }
        if (userId && isMasterAdmin(userId)) {
            isAdmin = true;
        }
        if (path && path.startsWith('/admin')) {
            isAdmin = true;
        }

        // SE FOR ADMIN / DISPOSITIVO DO ADMINISTRADOR, DESCARTAR SILENCIOSAMENTE!
        if (isAdmin) {
            return Response.json({ success: true, ignored: true, reason: 'Admin traffic excluded' });
        }

        const activeSessionId = sessionId || `sess_${visitorId}_${Date.now()}`;

        // 1. Upsert Session
        const session = await prisma.analyticsSession.upsert({
            where: { id: activeSessionId },
            create: {
                id: activeSessionId,
                visitorId,
                userId,
                userEmail,
                isAdmin,
                country: geoAndDevice.country,
                city: geoAndDevice.city,
                region: geoAndDevice.region,
                device: geoAndDevice.device,
                browser: geoAndDevice.browser,
                os: geoAndDevice.os,
                referrer: referrer || null,
                initialPath: path,
                durationSeconds: Math.max(0, parseInt(duration, 10) || 0),
                pageViewsCount: type === 'PAGE_VIEW' ? 1 : 0,
                eventsCount: type && type !== 'PAGE_VIEW' && type !== 'PING' ? 1 : 0,
                lastActiveAt: new Date()
            },
            update: {
                durationSeconds: {
                    increment: Math.max(0, parseInt(duration, 10) || 0)
                },
                ...(type === 'PAGE_VIEW' ? { pageViewsCount: { increment: 1 } } : {}),
                ...(type && type !== 'PAGE_VIEW' && type !== 'PING' ? { eventsCount: { increment: 1 } } : {}),
                ...(userId ? { userId, userEmail, isAdmin } : {}),
                lastActiveAt: new Date()
            }
        });

        // 2. Record Event (if type is not just a duration PING)
        if (type && type !== 'PING') {
            await prisma.analyticsEvent.create({
                data: {
                    sessionId: session.id,
                    visitorId,
                    type: String(type).toUpperCase().substring(0, 50),
                    path: String(path).substring(0, 255),
                    targetId: targetId ? String(targetId).substring(0, 100) : null,
                    targetTitle: targetTitle ? String(targetTitle).substring(0, 255) : null,
                    metadata: metadata ? (typeof metadata === 'string' ? metadata.substring(0, 5000) : JSON.stringify(metadata).substring(0, 5000)) : null,
                    isAdmin: session.isAdmin || isAdmin
                }
            });
        }

        return Response.json({
            success: true,
            sessionId: session.id
        });

    } catch (error) {
        console.error('Error tracking analytics event:', error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
}
