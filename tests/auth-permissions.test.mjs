import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
let sequence = 0;
async function load(deps, path = '../app/lib/auth-helpers.js') {
    const key = `authRegression${sequence++}`;
    globalThis[key] = deps;
    const source = (await readFile(new URL(path, import.meta.url), 'utf8')).replace(/^import .*;\r?$/gm, '');
    try { return await import('data:text/javascript;base64,' + Buffer.from(`const {${Object.keys(deps)}} = globalThis[${JSON.stringify(key)}];\n${source}`).toString('base64')); }
    finally { delete globalThis[key]; }
}
const account = (extra = {}) => ({ id: 'user_test', publicMetadata: {}, emailAddresses: [], ...extra });
async function helpers(user, extra = {}) {
    return load({ auth: async () => ({userId: user?.id}), currentUser: async () => user, clerkClient: async () => { throw new Error('Unavailable'); }, ...extra });
}
test('guest cannot become admin through forged header or cookie claims', async () => {
    const h = await helpers(null, {headers: async () => new Headers({authorization:'Bearer x.'+Buffer.from(JSON.stringify({sub:'user_test',email:'andre.rosa1603@gmail.com'})).toString('base64url')+'.x'})});
    assert.equal((await h.requireAdmin()).status, 401);
});
test('ordinary account is signed in but forbidden; admin and master are authorized', async () => {
    for (const [user, role] of [[account(), 'user'], [account({publicMetadata:{role:'admin'}}), 'admin'], [account({id:'user_3HpcOqdlvjNVk8LTexM9hXcP5DE'}), 'master_admin']]) {
        const h = await helpers(user); const result = await h.requireAdmin();
        assert.equal(result.authorized, role !== 'user');
        if (role === 'user') { assert.equal(result.status,403); assert.equal(result.userId,user.id); }
        else assert.equal(result.role,role);
    }
});
test('master identity requires exact verified email or immutable ID, never username', async () => {
    const h = await helpers(null);
    assert.equal(h.isMasterAdmin(account({username:'andre_rosa'})), false);
    for (const [email, status, expected] of [['andre.rosa1603@gmail.com','unverified',false],['andre.rosa1603@gmail.com.evil.test','verified',false],['ANDRE.ROSA1603@gmail.com','verified',true]]) {
        assert.equal(h.isMasterAdmin(account({emailAddresses:[{emailAddress:email,verification:{status}}]})),expected);
    }
});
test('Clerk errors and mismatched identities fail closed', async () => {
    const failed = await helpers(null, {auth: async () => {throw new Error('Unavailable');}});
    assert.equal((await failed.requireAdmin()).authorized,false);
    const mismatched = await helpers(account({publicMetadata:{role:'admin'}}), {auth:async()=>({userId:'someone_else'})});
    assert.equal((await mismatched.requireAdmin()).authorized,false);
});
test('admin status identifies an ordinary account as signed in', async () => {
    const route = await load({requireAdmin:async()=>({authorized:false,status:403,userId:'user_test'})},'../app/api/admin/me/route.js');
    const body = await (await route.GET()).json();
    assert.equal(body.isSignedIn,true); assert.equal(body.isAdmin,false); assert.equal(body.role,'user');
});

test('protected admin routes reject guest and ordinary accounts before accessing data', async () => {
    for (const name of ['stats', 'users', 'logs']) {
        for (const status of [401, 403]) {
            const route = await load({requireAdmin:async()=>({authorized:false,status,error:'Denied'})}, `../app/api/admin/${name}/route.js`);
            assert.equal((await route.GET(new Request(`https://calendar.test/api/admin/${name}`))).status,status);
            if (route.DELETE) assert.equal((await route.DELETE(new Request(`https://calendar.test/api/admin/${name}`,{method:'DELETE'}))).status,status);
        }
    }
});
