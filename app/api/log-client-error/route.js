import { auth, clerkClient } from '@clerk/nextjs/server';
import { logError } from '@/app/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    try {
        let body = {};
        try {
            body = await request.json();
        } catch {
            return Response.json({ success: false, error: 'JSON inválido' }, { status: 400 });
        }

        const { message, stack, source, lineno, colno, url, pathname, userAgent } = body;

        // Obter utilizador se autenticado
        let userContext = null;
        try {
            const { userId } = await auth();
            if (userId) {
                const client = await clerkClient();
                const user = await client.users.getUser(userId);
                const primaryEmail = user?.emailAddresses?.find(e => e.id === user?.primaryEmailAddressId)?.emailAddress || user?.emailAddresses?.[0]?.emailAddress;
                userContext = { id: userId, email: primaryEmail };
            }
        } catch {}

        const details = {
            url: url || pathname || 'Desconhecido',
            stack: stack || 'Sem stack trace',
            browser: userAgent || 'Desconhecido',
            file: source || 'inline/bundle',
            line: lineno,
            col: colno
        };

        const logMsg = message ? `[Frontend Error] ${message}` : '[Frontend Error] Erro desconhecido no cliente';

        await logError('CLIENT', logMsg, details, userContext);

        return Response.json({ success: true });
    } catch (e) {
        console.error('Error logging client error to database:', e);
        return Response.json({ success: false, error: e.message }, { status: 500 });
    }
}
