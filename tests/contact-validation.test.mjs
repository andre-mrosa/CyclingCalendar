import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('contact rejects invalid input, escapes HTML and passes replyTo to the SDK', async () => {
    const sent = [];
    const source = (await readFile(new URL('../app/api/contact/route.js', import.meta.url), 'utf8')).replace(/^import .*;\r?$/gm, '');
    const before = process.env.RESEND_API_KEY;
    process.env.RESEND_API_KEY = 'qa_mock_only';
    globalThis.__contactValidation = { NextResponse: { json: Response.json }, Resend: class { emails = { send: async payload => { sent.push(payload); return { data: { id: 'mock' } }; } }; } };
    try {
        const route = await import('data:text/javascript;base64,' + Buffer.from('const { NextResponse, Resend } = globalThis.__contactValidation;\n' + source).toString('base64'));
        const request = body => new Request('https://calendar.test/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
        for (const body of ['{','null','{}',JSON.stringify({message:'hello',email:'bad'})]) assert.equal((await route.POST(request(body))).status,400);
        assert.equal(sent.length,0);
        assert.equal((await route.POST(request(JSON.stringify({name:'<b>QA</b>',email:'qa@example.com',message:'<img src=x onerror=alert(1)>'})))).status,200);
        assert.equal(sent[0].replyTo,'qa@example.com');
        assert.doesNotMatch(sent[0].html, /<img|<b>QA/);
        assert.match(sent[0].html,/&lt;img/);
    } finally { delete globalThis.__contactValidation; if(before === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = before; }
});
