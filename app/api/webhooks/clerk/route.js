import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { prisma } from '@/app/lib/db';
import { logWarn, logInfo, logError } from '@/app/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(req) {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

    const headerPayload = await headers();
    const svix_id = headerPayload.get("svix-id");
    const svix_timestamp = headerPayload.get("svix-timestamp");
    const svix_signature = headerPayload.get("svix-signature");

    let payload;
    let body;

    try {
        body = await req.text();
    } catch (e) {
        return Response.json({ success: false, error: 'Cannot read body' }, { status: 400 });
    }

    if (WEBHOOK_SECRET && svix_id && svix_timestamp && svix_signature) {
        const wh = new Webhook(WEBHOOK_SECRET);
        try {
            payload = wh.verify(body, {
                "svix-id": svix_id,
                "svix-timestamp": svix_timestamp,
                "svix-signature": svix_signature,
            });
        } catch (err) {
            console.error('Error verifying Clerk webhook:', err);
            return Response.json({ success: false, error: 'Invalid signature' }, { status: 400 });
        }
    } else {
        try {
            payload = JSON.parse(body);
        } catch {
            return Response.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
        }
    }

    const eventType = payload.type;
    const data = payload.data || {};

    try {
        if (eventType === 'user.deleted') {
            const userId = data.id;

            // Tentar obter o email a partir de pedidos de eliminação registados
            const existingReq = await prisma.accountDeletionRequest.findUnique({
                where: { userId }
            });

            const emailLabel = existingReq?.userEmail || 'Utilizador';

            // Atualizar pedido de eliminação na base de dados se existir
            await prisma.accountDeletionRequest.updateMany({
                where: { userId },
                data: { status: 'PROCESSED', updatedAt: new Date() }
            });

            await logWarn('AUTH', `Conta de utilizador ${emailLabel} (${userId}) foi eliminada através do Clerk`, {
                userId,
                userEmail: existingReq?.userEmail || null,
                userName: existingReq?.userName || null,
                deleted: data.deleted,
                eventData: data
            }, { id: userId, email: existingReq?.userEmail || 'Conta Eliminada' });

        } else if (eventType === 'user.created') {
            const primaryEmail = data.email_addresses?.find(e => e.id === data.primary_email_address_id)?.email_address || data.email_addresses?.[0]?.email_address || 'Sem email';
            
            await logInfo('AUTH', `Novo utilizador registado na plataforma: ${primaryEmail}`, {
                userId: data.id,
                email: primaryEmail
            }, { id: data.id, email: primaryEmail });
        }

        return Response.json({ success: true, message: 'Webhook processado' });
    } catch (e) {
        logError('AUTH', `Erro ao processar webhook do Clerk (${eventType}): ${e.message}`, e);
        console.error('Error processing Clerk webhook:', e);
        return Response.json({ success: false, error: e.message }, { status: 500 });
    }
}
