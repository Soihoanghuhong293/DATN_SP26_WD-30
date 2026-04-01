import { sendMail } from "./mailer";

type GuideUnassignmentEmailArgs = {
  toEmail: string;
  guideName?: string;
  bookingId: string;
  tourName: string;
  startDate?: Date | string;
  endDate?: Date | string;
};

const fmt = (d?: Date | string) => {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(String(d));
  if (Number.isNaN(date.getTime())) return "";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = String(date.getFullYear());
  return `${dd}/${mm}/${yyyy}`;
};

export const sendGuideUnassignmentEmail = async (args: GuideUnassignmentEmailArgs) => {
  const clientUrl = String(process.env.CLIENT_URL || "http://localhost:5173").trim();
  const subject = `Cập nhật phân công HDV: ${args.tourName}`;

  const start = fmt(args.startDate);
  const end = fmt(args.endDate);
  const dateLine = start && end ? `${start} → ${end}` : start ? start : "";

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
      <p style="margin: 0 0 10px;">Xin chào <b>${args.guideName || "Hướng dẫn viên"}</b>,</p>
      <p style="margin: 0 0 12px;">
        Bạn <b>không còn</b> được phân công phụ trách booking dưới đây.
      </p>
      <div style="border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px; background: #fafafa;">
        <div><b>Tour:</b> ${args.tourName}</div>
        ${dateLine ? `<div><b>Thời gian:</b> ${dateLine}</div>` : ""}
        <div><b>Mã booking:</b> ${args.bookingId}</div>
      </div>
      <p style="margin: 14px 0 0; color:#6b7280; font-size: 13px;">
        Nếu bạn cần đối soát lại thông tin, vui lòng liên hệ quản trị viên.
      </p>
      <p style="margin: 10px 0 0; color:#6b7280; font-size: 12px;">
        Link hệ thống: ${clientUrl}
      </p>
    </div>
  `.trim();

  await sendMail({
    to: args.toEmail,
    subject,
    html,
    text:
      `Xin chào ${args.guideName || "HDV"},\n` +
      `Bạn không còn được phân công phụ trách booking này.\n` +
      `- Tour: ${args.tourName}\n` +
      `${dateLine ? `- Thời gian: ${dateLine}\n` : ""}` +
      `- Mã booking: ${args.bookingId}\n`,
  });
};

