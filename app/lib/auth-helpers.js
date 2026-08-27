import { auth, clerkClient } from '@clerk/nextjs/server';

/**
 * Obter a lista de emails com privilégio Master Admin
 */
export function getMasterAdminEmails() {
    const envEmails = process.env.MASTER_ADMIN_EMAIL || process.env.NEXT_PUBLIC_MASTER_ADMIN_EMAIL || '';
    const list = envEmails.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    
    // Lista de fallback caso não esteja configurado no .env
    const defaults = [
        'andre.rosa1603@gmail.com',
        'andremrosa@gmail.com',
        'andre_rosa',
        'andrerosa'
    ];
    return [...new Set([...list, ...defaults])];
}

/**
 * Verifica se um email ou utilizador é Master Admin
 */
export function isMasterAdmin(userOrEmail) {
    if (!userOrEmail) return false;
    
    const masterList = getMasterAdminEmails();
    
    if (typeof userOrEmail === 'string') {
        const clean = userOrEmail.toLowerCase().trim();
        return masterList.some(m => clean.includes(m) || m.includes(clean));
    }
    
    // Se for objeto User do Clerk
    const emails = [
        userOrEmail.email,
        ...(userOrEmail.emailAddresses || []).map(e => e.emailAddress),
        userOrEmail.primaryEmailAddress?.emailAddress
    ].filter(Boolean).map(e => e.toLowerCase().trim());
    
    return emails.some(e => masterList.some(m => e.includes(m) || m.includes(e)));
}

/**
 * Obter o cargo formatado de um utilizador ('master_admin' | 'admin' | 'user')
 */
export function getUserRole(user) {
    if (!user) return 'user';
    if (isMasterAdmin(user)) return 'master_admin';
    if (user.publicMetadata?.role === 'admin') return 'admin';
    return 'user';
}

/**
 * Middleware auxiliar para APIs que requerem privilégios de Administrador
 */
export async function requireAdmin() {
    const authSession = await auth();
    const userId = authSession.userId;
    
    if (!userId) {
        return {
            authorized: false,
            status: 401,
            error: 'Sessão não iniciada. Por favor faz login.'
        };
    }

    try {
        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        
        if (!user) {
            return {
                authorized: false,
                status: 401,
                error: 'Utilizador não encontrado no sistema de autenticação.'
            };
        }

        const isMaster = isMasterAdmin(user);
        const isAdmin = isMaster || user.publicMetadata?.role === 'admin';

        if (!isAdmin) {
            return {
                authorized: false,
                status: 403,
                error: 'Acesso restrito: Esta operação requer privilégios de Administrador.'
            };
        }

        const primaryEmail = user.emailAddresses?.find(e => e.id === user.primaryEmailAddressId)?.emailAddress || user.emailAddresses?.[0]?.emailAddress || '';

        return {
            authorized: true,
            user,
            userId,
            userEmail: primaryEmail,
            role: isMaster ? 'master_admin' : 'admin',
            isMaster
        };
    } catch (e) {
        console.error('Erro ao verificar permissões de admin:', e);
        return {
            authorized: false,
            status: 500,
            error: 'Erro interno ao validar permissões de acesso.'
        };
    }
}
