import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);
const toEmail = process.env.CONTACT_EMAIL || 'andre.rosa1603@gmail.com';

export async function POST(req) {
  try {
    const body = await req.json();
    const { name, email, message } = body;

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
        <p><strong>Nome:</strong> ${name || 'N/A'}</p>
        <p><strong>E-mail:</strong> ${email || 'N/A'}</p>
        <br />
        <h3>Mensagem:</h3>
        <p style="white-space: pre-wrap; padding: 15px; background-color: #f5f5f5; border-radius: 5px;">${message}</p>
      `,
      reply_to: email || undefined
    });

    if (error) {
      console.error('Resend Error:', error);
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Contact Form Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
