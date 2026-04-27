import nodemailer from 'nodemailer';

type SendMailInput = {
  to: string;
  subject: string;
  html: string;
};

let cachedTransport: nodemailer.Transporter | null = null;

async function getTransport() {
  if (cachedTransport) return cachedTransport;

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && port && user && pass) {
    cachedTransport = nodemailer.createTransport({
      host,
      port,
      auth: { user, pass },
    });
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
  }
  return info;
}

