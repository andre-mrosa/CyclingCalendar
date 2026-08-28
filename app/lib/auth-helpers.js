import { auth, currentUser, clerkClient } from '@clerk/nextjs/server';
import { headers } from 'next/headers';

/**
 * Função utilitária para descodificar payloads JWT em Base64URL
 */
function decodeJwtPayload(rawToken) {
    if (!rawToken || typeof rawToken !== 'string') return null;
    try {
        const clean = rawToken.replace(/^Bearer\s+/i, '').trim();
        const parts = clean.split('.');
        if (parts.length >= 2) {
            let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
            while (base64.length % 4) {
                base64 += '=';
            }
            const json = Buffer.from(base64, 'base64').toString('utf8');
            return JSON.parse(json);
        }
    } catch (e) {
        console.error('Error decoding JWT payload:', e);
    }
    return null;
}

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
        'user_3HpcOqdlvjNVk8LTexM9hXcP5DE',
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
        return masterList.includes(clean);
    }
    
    // Se for objeto User do Clerk (backend ou frontend)
    if (userOrEmail.id && masterList.includes(userOrEmail.id)) {
        return true;
    }

    if (userOrEmail.username && masterList.includes(userOrEmail.username.toLowerCase().trim())) {
        return true;
    }
    
    const allEmails = [
        userOrEmail.email,
        ...(userOrEmail.emailAddresses || []).map(e => typeof e === 'string' ? e : e?.emailAddress),
        typeof userOrEmail.primaryEmailAddress === 'string' ? userOrEmail.primaryEmailAddress : userOrEmail.primaryEmailAddress?.emailAddress,
        ...(userOrEmail.externalAccounts || []).map(a => a?.emailAddress)
    ].filter(Boolean).map(e => String(e).toLowerCase().trim());
    
    return allEmails.some(e => masterList.includes(e));
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
 * Obter a sessão e utilizador autenticado com tripla redundância
 */
export async function getAuthUser() {
    let userId = null;
    let authSession = null;
    let userObj = null;

    try {
        authSession = await auth();
        userId = authSession?.userId;
    } catch (authErr) {
        console.error('Error in auth():', authErr?.message);
    }

    if (!userId) {
        try {
            userObj = await currentUser();
            userId = userObj?.id;
        } catch (currErr) {
            console.error('Error in currentUser():', currErr?.message);
        }
    }

    let claimsEmail = authSession?.sessionClaims?.email || authSession?.sessionClaims?.primary_email_address || authSession?.sessionClaims?.email_address || authSession?.sessionClaims?.user?.email || '';
    let claimsUsername = authSession?.sessionClaims?.username || authSession?.sessionClaims?.preferred_username || '';

    try {
        const reqHeaders = await headers();
        const authHeader = reqHeaders?.get('authorization') || reqHeaders?.get('Authorization');
        let tokenPayload = null;

        if (authHeader) {
            tokenPayload = decodeJwtPayload(authHeader);
        }

        if (!tokenPayload && reqHeaders) {
            const cookieHeader = reqHeaders.get('cookie') || '';
            const sessionMatch = cookieHeader.match(/__session=([^;]+)/);
            if (sessionMatch) {
                tokenPayload = decodeJwtPayload(sessionMatch[1]);
            }
        }

        if (tokenPayload) {
            if (tokenPayload.sub && !userId) userId = tokenPayload.sub;
            const jwtEmail = tokenPayload.email || tokenPayload.primary_email_address || tokenPayload.email_address || tokenPayload.user?.email || '';
            const jwtUsername = tokenPayload.username || tokenPayload.preferred_username || '';
            if (jwtEmail && !claimsEmail) claimsEmail = jwtEmail;
            if (jwtUsername && !claimsUsername) claimsUsername = jwtUsername;
        }
    } catch (hErr) {
        console.error('Error reading request headers:', hErr);
    }

    return {
        userId,
        userObj,
        authSession,
        claimsEmail,
        claimsUsername
    };
}

/**
 * Middleware auxiliar para APIs que requerem privilégios de Administrador
 */
export async function requireAdmin() {
    const { userId, userObj, claimsEmail, claimsUsername } = await getAuthUser();

    if (!userId && !claimsEmail) {
        return {
            authorized: false,
            status: 401,
            error: 'Sessão não iniciada. Por favor faz login.'
        };
    }

    // Se obtivemos userObj diretamente do currentUser(), extrair emails
    const directEmails = [
        claimsEmail,
        ...(userObj?.emailAddresses || []).map(e => e?.emailAddress),
        typeof userObj?.primaryEmailAddress === 'string' ? userObj.primaryEmailAddress : userObj?.primaryEmailAddress?.emailAddress
    ].filter(Boolean);

    // Verifica se já é Master Admin por ID, email nas claims ou username
    const isMasterDirect = isMasterAdmin(userId) || isMasterAdmin(claimsEmail) || isMasterAdmin(claimsUsername) || directEmails.some(e => isMasterAdmin(e));

    try {
        let user = userObj;
        if (!user && userId) {
            try {
                const client = await clerkClient();
                user = await client.users.getUser(userId);
            } catch (clerkErr) {
                console.error('Aviso: Não foi possível obter detalhes do Clerk via REST API:', clerkErr?.message);
            }
        }
        
        if (!user) {
            if (isMasterDirect) {
                return {
                    authorized: true,
                    userId: userId || 'user_3HoiHwpGl9suYXrYx0QFhDMXHWD',
                    userEmail: directEmails[0] || claimsEmail || 'andre.rosa1603@gmail.com',
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

        const isMaster = isMasterDirect || isMasterAdmin(user);
        const isAdmin = isMaster || user.publicMetadata?.role === 'admin';

        if (!isAdmin) {
            return {
                authorized: false,
                status: 403,
                error: 'Acesso restrito: Esta operação requer privilégios de Administrador.'
            };
        }

        const primaryEmail = user.emailAddresses?.find(e => e.id === user.primaryEmailAddressId)?.emailAddress || user.emailAddresses?.[0]?.emailAddress || directEmails[0] || claimsEmail || '';

        return {
            authorized: true,
            user,
            userId: userId || user.id,
            userEmail: primaryEmail,
            role: isMaster ? 'master_admin' : 'admin',
            isMaster
        };
    } catch (e) {
        console.error('Erro ao verificar permissões de admin:', e);
        if (isMasterDirect) {
            return {
                authorized: true,
                userId: userId || 'user_3HoiHwpGl9suYXrYx0QFhDMXHWD',
                userEmail: directEmails[0] || claimsEmail || 'andre.rosa1603@gmail.com',
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
