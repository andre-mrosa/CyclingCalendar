import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const toEmail = process.env.CONTACT_EMAIL || 'andre.rosa1603@gmail.com';
const escapeHtml = value => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export async function POST(req) {
  try {
    let body;
    try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    const { name = '', email = '', message } = body;
    if (typeof name !== 'string' || name.length > 200 || typeof email !== 'string' || email.length > 254 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) || typeof message !== 'string' || !message.trim() || message.length > 10000) return NextResponse.json({ error: 'Invalid message' }, { status: 400 });
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error('Missing RESEND_API_KEY environment variable');
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 });
    }

    const resend = new Resend(apiKey);

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const fromName = name || 'Utilizador do Calendário';

    const { data, error } = await resend.emails.send({
      from: 'Calendário Ciclismo <onboarding@resend.dev>', // Usando o email de teste do Resend
      to: [toEmail],
      subject: `Nova mensagem no Calendário de Ciclismo de ${fromName}`,
      html: `
        <h2>Nova Mensagem de Contacto</h2>
        <p><strong>Nome:</strong> ${escapeHtml(name) || 'N/A'}</p>
        <p><strong>E-mail:</strong> ${escapeHtml(email) || 'N/A'}</p>
        <br />
        <h3>Mensagem:</h3>
        <p style="white-space: pre-wrap; padding: 15px; background-color: #f5f5f5; border-radius: 5px;">${escapeHtml(message)}</p>
      `,
      replyTo: email || undefined
    });

    if (error) {
      console.error('Resend Error:', error);
      return NextResponse.json({ error: 'Não foi possível enviar a mensagem' }, { status: 502 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Contact Form Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
