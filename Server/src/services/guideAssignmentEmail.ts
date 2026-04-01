import { sendMail } from "./mailer";

type GuideAssignmentEmailArgs = {
  toEmail: string;
  guideName?: string;
  bookingId: string;
  tourName: string;
  startDate?: Date | string;
  endDate?: Date | string;
  customerName?: string;
  groupSize?: number;
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

export const sendGuideAssignmentEmail = async (args: GuideAssignmentEmailArgs) => {
  const clientUrl = String(process.env.CLIENT_URL || "http://localhost:5173").trim();
  const hdvLink = `${clientUrl}/hdv/tours/${args.bookingId}`;

  const start = fmt(args.startDate);
  const end = fmt(args.endDate);
  const dateLine = start && end ? `${start} → ${end}` : start ? start : "";

  const subject = `Phân công hướng dẫn: ${args.tourName}${start ? ` (${start})` : ""}`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
      <h2 style="margin: 0 0 12px;">Bạn được phân công dẫn tour</h2>
      <p style="margin: 0 0 10px;">
        Xin chào <b>${args.guideName || "Hướng dẫn viên"}</b>,
      </p>
      <p style="margin: 0 0 16px;">
        Hệ thống vừa phân công bạn phụ trách booking sau:
      </p>

      <div style="border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px; background: #fafafa;">
        <div><b>Tour:</b> ${args.tourName}</div>
        ${dateLine ? `<div><b>Thời gian:</b> ${dateLine}</div>` : ""}
        ${args.customerName ? `<div><b>Khách đặt:</b> ${args.customerName}</div>` : ""}
        ${typeof args.groupSize === "number" ? `<div><b>Số khách:</b> ${args.groupSize}</div>` : ""}
        <div><b>Mã booking:</b> ${args.bookingId}</div>
      </div>

      <p style="margin: 16px 0 0;">
        Mở chi tiết booking tại:
        <a href="${hdvLink}" target="_blank" rel="noreferrer">${hdvLink}</a>
      </p>
    </div>
  `.trim();

  await sendMail({
    to: args.toEmail,
    subject,
    html,
    text: `Bạn được phân công dẫn tour: ${args.tourName}. Booking: ${args.bookingId}. Link: ${hdvLink}`,
  });
};

