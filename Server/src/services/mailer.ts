import nodemailer from "nodemailer";

type MailerConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
};

const readMailerConfig = (): MailerConfig | null => {
  const host = String(process.env.SMTP_HOST || "").trim();
  const port = Number(process.env.SMTP_PORT || 0);
  const user = String(process.env.SMTP_USER || "").trim();
  const pass = String(process.env.SMTP_PASS || "").trim();
  const fromName = String(process.env.MAIL_FROM_NAME || "Tour Management").trim();
  const fromEmail = String(process.env.MAIL_FROM_EMAIL || user).trim();

  if (!host || !port || !user || !pass || !fromEmail) return null;
  return { host, port, user, pass, fromName, fromEmail };
};

export const canSendMail = () => Boolean(readMailerConfig());

export const sendMail = async (args: { to: string; subject: string; html: string; text?: string }) => {
  const cfg = readMailerConfig();
  if (!cfg) {
    throw new Error("Thiếu cấu hình SMTP. Vui lòng kiểm tra SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS.");
  }

  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: { user: cfg.user, pass: cfg.pass },
  });

  await transporter.sendMail({
    from: `"${cfg.fromName}" <${cfg.fromEmail}>`,
    to: args.to,
    subject: args.subject,
    text: args.text,
    html: args.html,
  });
};

