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
  bookingStatus?: string;
  pickupLocation?: string;
  departureTime?: string;
  note?: string;
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

  const hotline = String(process.env.SUPPORT_HOTLINE || "1900999").trim();
  const supportEmail = String(process.env.SUPPORT_EMAIL || process.env.MAIL_FROM_EMAIL || "").trim();

  const start = fmt(args.startDate);
  const end = fmt(args.endDate);
  const dateLine = start && end ? `${start} → ${end}` : start ? start : "";

  const subject = `Phân công hướng dẫn: ${args.tourName}${start ? ` (${start})` : ""}`;

  const statusLabel =
    args.bookingStatus === "pending" ? "Chờ xử lý" :
    args.bookingStatus === "cancelled" ? "Đã hủy" :
    args.bookingStatus ? "Đã xác nhận" : "Đã xác nhận";

  const pickup = String(args.pickupLocation || "").trim() || "...";
  const departTime = String(args.departureTime || "").trim() || "...";
  const note = String(args.note || "").trim() || "...";

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
      <p style="margin: 0 0 10px;">Xin chào <b>${args.guideName || "Hướng dẫn viên"}</b>,</p>
      <p style="margin: 0 0 16px;">Bạn đã được phân công dẫn tour.</p>

      <div style="margin: 0 0 10px; font-weight: 700;">Thông tin booking:</div>

      <div style="border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px; background: #fafafa;">
        <div><b>Tour:</b> ${args.tourName}</div>
        ${dateLine ? `<div><b>Thời gian:</b> ${dateLine}</div>` : ""}
        ${args.customerName ? `<div><b>Khách đặt:</b> ${args.customerName}</div>` : ""}
        ${typeof args.groupSize === "number" ? `<div><b>Số khách:</b> ${args.groupSize}</div>` : ""}
        <div><b>Trạng thái:</b> ${statusLabel}</div>
        <div><b>Mã booking:</b> ${args.bookingId}</div>
      </div>

      <div style="margin: 14px 0 6px; font-weight: 700;">Chi tiết:</div>
      <div style="border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px; background: #ffffff;">
        <div><b>Địa điểm đón:</b> ${pickup}</div>
        <div><b>Giờ khởi hành:</b> ${departTime}</div>
        <div><b>Ghi chú:</b> ${note}</div>
      </div>

      <p style="margin: 16px 0 8px;">👉 Vui lòng kiểm tra và xác nhận lịch trình.</p>

      <div style="margin: 10px 0 16px;">
        <a href="${hdvLink}" target="_blank" rel="noreferrer"
           style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 14px;border-radius:10px;font-weight:700;">
          Xem chi tiết booking
        </a>
      </div>

      <div style="color:#6b7280;font-size: 13px;">
        Nếu có vấn đề, liên hệ:<br/>
        Hotline: ${hotline}<br/>
        ${supportEmail ? `Email: ${supportEmail}<br/>` : ""}
        <br/>
        —<br/>
        ${String(process.env.MAIL_FROM_NAME || "DATN Tour")}
      </div>
    </div>
  `.trim();

  await sendMail({
    to: args.toEmail,
    subject,
    html,
    text:
      `Xin chào ${args.guideName || "HDV"},\n` +
      `Bạn đã được phân công dẫn tour.\n\n` +
      `Thông tin booking:\n` +
      `- Tour: ${args.tourName}\n` +
      `${dateLine ? `- Thời gian: ${dateLine}\n` : ""}` +
      `${args.customerName ? `- Khách đặt: ${args.customerName}\n` : ""}` +
      `${typeof args.groupSize === "number" ? `- Số khách: ${args.groupSize}\n` : ""}` +
      `- Trạng thái: ${statusLabel}\n\n` +
      `Chi tiết:\n` +
      `- Địa điểm đón: ${pickup}\n` +
      `- Giờ khởi hành: ${departTime}\n` +
      `- Ghi chú: ${note}\n\n` +
      `Xem chi tiết booking: ${hdvLink}\n`,
  });
};

