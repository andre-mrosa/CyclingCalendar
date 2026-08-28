import { NextResponse } from 'next/server';
import { translateAllPendingEvents } from '@/app/lib/translationService';
import { prisma } from '@/app/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(request) {
    try {
        const { searchParams } = new URL(request.url);
        const lang = searchParams.get('lang') || 'en';
        const limit = parseInt(searchParams.get('limit') || '100', 10);

        const result = await translateAllPendingEvents(lang, limit);
        const totalTranslations = await prisma.eventTranslation.count({
            where: { language: lang }
        });

        return NextResponse.json({
            success: result.success,
            translatedThisRun: result.count,
            totalTranslationsInDb: totalTranslations,
            totalPendingBeforeRun: result.totalPending
        });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function GET(request) {
    try {
        const totalEvents = await prisma.event.count();
        const totalEnTranslations = await prisma.eventTranslation.count({
            where: { language: 'en' }
        });

        return NextResponse.json({
            success: true,
            totalEvents,
            totalEnTranslations,
            pendingEn: Math.max(0, totalEvents - totalEnTranslations)
        });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
