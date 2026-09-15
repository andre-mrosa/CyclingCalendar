import { auth, currentUser, clerkClient } from '@clerk/nextjs/server';

export function getMasterAdminEmails() {
    const configured = (process.env.MASTER_ADMIN_EMAIL || '').split(',').map(value => value.trim()).filter(Boolean);
    return [...new Set([...configured, 'andre.rosa1603@gmail.com', 'andremrosa@gmail.com',
        'user_3HpcOqdlvjNVk8LTexM9hXcP5DE', 'user_3HoiHwpGl9suYXrYx0QFhDMXHWD'])];
}

export function isMasterAdmin(userOrEmail) {
    if (!userOrEmail) return false;
    const list = getMasterAdminEmails();
    const matchesEmail = email => typeof email === 'string' && list.some(value => value.includes('@') && value.toLowerCase() === email.trim().toLowerCase());
    if (typeof userOrEmail === 'string') return matchesEmail(userOrEmail) || list.includes(userOrEmail);
    if (list.includes(userOrEmail.id)) return true;
    // Usernames and unverified addresses are controlled by the account owner.
    return (userOrEmail.emailAddresses || []).some(email => email.verification?.status === 'verified' && matchesEmail(email.emailAddress));
}

export function getUserRole(user) {
    if (isMasterAdmin(user)) return 'master_admin';
    return user?.publicMetadata?.role === 'admin' ? 'admin' : 'user';
}

export async function getAuthUser() {
    // Only Clerk may establish identity. Decoding a JWT does not verify it.
    const authSession = await auth();
    const userId = authSession?.userId || null;
    const userObj = userId ? await currentUser() : null;
    if (userObj && userObj.id !== userId) throw new Error('Session identity mismatch');
    const primary = userObj?.emailAddresses?.find(email => email.id === userObj.primaryEmailAddressId && email.verification?.status === 'verified');
    return { userId, userObj, authSession, claimsEmail: primary?.emailAddress || '', claimsUsername: '' };
}

export async function requireAdmin() {
    try {
        const { userId, userObj } = await getAuthUser();
        if (!userId) return { authorized: false, status: 401, error: 'Sessão não iniciada. Por favor faz login.' };
        const user = userObj || await (await clerkClient()).users.getUser(userId);
        if (!user || user.id !== userId) return { authorized: false, status: 401, error: 'Utilizador não encontrado no sistema de autenticação.' };
        const role = getUserRole(user);
        if (role === 'user') return { authorized: false, status: 403, userId, error: 'Acesso restrito: Esta operação requer privilégios de Administrador.' };
        const primary = user.emailAddresses?.find(email => email.id === user.primaryEmailAddressId);
        return { authorized: true, user, userId, userEmail: primary?.emailAddress || '', role, isMaster: role === 'master_admin' };
    } catch (error) {
        console.error('Erro ao verificar permissões de admin:', error?.message);
        return { authorized: false, status: 503, error: 'Não foi possível validar as permissões. Tenta novamente.' };
    }
}
