import nodemailer from 'nodemailer';

type SendMailInput = {
  to: string;
  subject: string;
  html: string;
};

let cachedTransport: nodemailer.Transporter | null = null;
let cachedMode: 'smtp' | 'preview' | null = null;

async function getTransport() {
  if (cachedTransport) return cachedTransport;

  const forcePreview = String(process.env.MAIL_MODE || '').toLowerCase() === 'preview';
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!forcePreview && host && port && user && pass) {
    cachedTransport = nodemailer.createTransport({
      host,
      port,
      auth: { user, pass },
    });
    cachedMode = 'smtp';
    return cachedTransport;
  }

  const testAccount = await nodemailer.createTestAccount();
  cachedTransport = nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
  cachedMode = 'preview';
  return cachedTransport;
}

export async function sendMail({ to, subject, html }: SendMailInput) {
  const transport = await getTransport();
  const from = process.env.MAIL_FROM || 'no-reply@datn.local';

  const info = await transport.sendMail({ from, to, subject, html });
  const preview = nodemailer.getTestMessageUrl(info);
  if (preview) {
    // eslint-disable-next-line no-console
    console.log(`[mail] preview: ${preview}`);
  } else {
    // eslint-disable-next-line no-console
    console.log(
      `[mail] sent: to=${to} subject=${JSON.stringify(subject)} mode=${cachedMode || 'smtp'} id=${info.messageId}`
    );
  }
  return info;
}

