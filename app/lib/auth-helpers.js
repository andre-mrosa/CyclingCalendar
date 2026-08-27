import { auth, clerkClient } from '@clerk/nextjs/server';

/**
 * Obter a lista de emails e IDs com privilégio Master Admin
 */
export function getMasterAdminEmails() {
    const envEmails = process.env.MASTER_ADMIN_EMAIL || process.env.NEXT_PUBLIC_MASTER_ADMIN_EMAIL || '';
    const list = envEmails.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    
    // Lista de fallback permanente caso não esteja configurado no .env
    const defaults = [
        'andre.rosa1603@gmail.com',
        'andremrosa@gmail.com',
        'andre_rosa',
        'andrerosa',
        'user_3HoiHwpGl9suYXrYx0QFhDMXHWD'
    ];
    return [...new Set([...list, ...defaults])];
}

/**
 * Verifica se um email, ID ou utilizador é Master Admin
 */
export function isMasterAdmin(userOrEmail) {
    if (!userOrEmail) return false;
    
    const masterList = getMasterAdminEmails();
    
    if (typeof userOrEmail === 'string') {
        const clean = userOrEmail.toLowerCase().trim();
        return masterList.some(m => clean === m || clean.includes(m) || m.includes(clean));
    }
    
    // Se for objeto User do Clerk (backend ou frontend)
    if (userOrEmail.id && masterList.includes(userOrEmail.id)) {
        return true;
    }

    if (userOrEmail.username && masterList.some(m => userOrEmail.username.toLowerCase().includes(m))) {
        return true;
    }
    
    const allEmails = [
        userOrEmail.email,
        ...(userOrEmail.emailAddresses || []).map(e => typeof e === 'string' ? e : e?.emailAddress),
        typeof userOrEmail.primaryEmailAddress === 'string' ? userOrEmail.primaryEmailAddress : userOrEmail.primaryEmailAddress?.emailAddress,
        ...(userOrEmail.externalAccounts || []).map(a => a?.emailAddress)
    ].filter(Boolean).map(e => String(e).toLowerCase().trim());
    
    return allEmails.some(e => masterList.some(m => e === m || e.includes(m) || m.includes(e)));
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

    const isMasterById = isMasterAdmin(userId);

    try {
        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        
        if (!user) {
            if (isMasterById) {
                return {
                    authorized: true,
                    userId,
                    userEmail: 'andre.rosa1603@gmail.com',
                    role: 'master_admin',
                    isMaster: true
                };
            }
            return {
                authorized: false,
                status: 401,
                error: 'Utilizador não encontrado no sistema de autenticação.'
            };
        }

        const isMaster = isMasterById || isMasterAdmin(user);
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
        if (isMasterById) {
            return {
                authorized: true,
                userId,
                userEmail: 'andre.rosa1603@gmail.com',
                role: 'master_admin',
                isMaster: true
            };
        }
        return {
            authorized: false,
            status: 500,
            error: `Erro interno ao validar permissões: ${e.message || 'Erro no servidor'}`
        };
    }
}
