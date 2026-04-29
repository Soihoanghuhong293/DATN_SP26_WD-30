import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Divider, Input, Modal, Segmented, Select, Space, Typography, Upload, message } from "antd";
import axios from "axios";
import dayjs from "dayjs";
import type { UploadFile } from "antd";
import type { RcFile } from "antd/es/upload";
import { BookingList } from "../components/Client/bookings/BookingList";
import type { BookingCardModel } from "../components/Client/bookings/BookingCard";
import pageStyles from "./styles/MyBookingsPage.module.css";

const { Title, Text } = Typography;

const API_V1 =
  (import.meta.env?.VITE_API_URL as string | undefined) || "http://localhost:5000/api/v1";

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
});

const normalizePaymentStatus = (booking: any): "unpaid" | "deposit" | "paid" | "refunded" => {
  const raw =
    booking?.payment_status ??
    (booking?.status === "paid"
      ? "paid"
      : booking?.status === "deposit"
        ? "deposit"
        : booking?.status === "refunded"
          ? "refunded"
          : "unpaid");
  const s = typeof raw === "string" ? raw.trim().toLowerCase() : raw;
  if (s === "paid" || s === "deposit" || s === "refunded" || s === "unpaid") return s;
  return "unpaid";
};

const normalizeBookingStatus = (status: any): "pending" | "confirmed" | "cancelled" => {
  const s = ["pending", "confirmed", "cancelled"].includes(String(status)) ? String(status) : "confirmed";
  return s as any;
};

const MyBookingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [status, setStatus] = useState<"all" | "pending" | "confirmed" | "cancelled">("all");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelBooking, setCancelBooking] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [cancelBankName, setCancelBankName] = useState<string>("Vietcombank");
  const [cancelBankAccountNumber, setCancelBankAccountNumber] = useState<string>("");
  const [cancelBankAccountName, setCancelBankAccountName] = useState<string>("");
  const [cancelQrFileList, setCancelQrFileList] = useState<UploadFile[]>([]);
  const [cancelQrDataUrl, setCancelQrDataUrl] = useState<string>("");
  const cancelFormError = useMemo(() => {
    if (!cancelReason.trim()) return "Vui lòng nhập lý do hủy";
    if (!cancelBankName.trim()) return "Vui lòng chọn ngân hàng";
    if (!cancelBankAccountNumber.trim()) return "Vui lòng nhập số tài khoản";
    if (!cancelBankAccountName.trim()) return "Vui lòng nhập chủ tài khoản";
    if (!cancelQrDataUrl) return "Vui lòng upload QR ngân hàng";
    return "";
  }, [cancelBankAccountName, cancelBankAccountNumber, cancelBankName, cancelQrDataUrl, cancelReason]);

  useEffect(() => {
    const fetchMine = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API_V1}/bookings/me`, {
          ...getAuthHeader(),
          // luôn fetch all để gom "chưa thanh toán" vào tab "Chờ xử lý"
          params: {},
        });
        const data = res.data?.data || [];
        setItems(Array.isArray(data) ? data : []);
      } catch (e: any) {
        message.error(e?.response?.data?.message || "Không tải được danh sách đơn.");
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    fetchMine();
  }, [status]);

  const grouped = useMemo(() => {
    const all = Array.isArray(items) ? items : [];
    if (status === "all") return all;
    if (status === "cancelled") return all.filter((b: any) => String(b?.status) === "cancelled");
    if (status === "pending") {
      return all.filter((b: any) => String(b?.status) === "pending" || normalizePaymentStatus(b) === "unpaid");
    }
    // confirmed tab: confirmed nhưng đã có thanh toán (deposit/paid) hoặc các trường hợp không unpaid
    return all.filter((b: any) => String(b?.status) === "confirmed" && normalizePaymentStatus(b) !== "unpaid");
  }, [items, status]);

  const bookingCards: BookingCardModel[] = useMemo(() => {
    return grouped
      .map((b: any) => {
        const id = String(b?._id || b?.id || "");
        if (!id) return null;
        const paymentStatusRaw = normalizePaymentStatus(b);
        const bookingStatusRaw = normalizeBookingStatus(b?.status);

        const startDateObj = b?.startDate ? new Date(b.startDate) : null;
        const isPastOrOnStart = startDateObj ? Date.now() >= startDateObj.getTime() : false;
        const hasPendingCancel = Boolean(b?.cancel_request?.status === "pending");
        const tourStage = String(b?.tour_stage || "scheduled");
        const canCancel =
          bookingStatusRaw !== "cancelled" &&
          !hasPendingCancel &&
          tourStage !== "in_progress" &&
          tourStage !== "completed" &&
          !isPastOrOnStart;

        return {
          id,
          tourName: b?.tour_id?.name || "Tour",
          tourThumb: b?.tour_id?.images?.[0] || "",
          startDate: b?.startDate || null,
          endDate: b?.endDate || null,
          createdAt: b?.created_at || null,
          totalPrice: Number(b?.total_price || b?.totalPrice || 0),
          bookingStatus: bookingStatusRaw,
          paymentStatus: paymentStatusRaw,
          canCancel,
          hasPendingCancel,
        } as BookingCardModel;
      })
      .filter(Boolean) as BookingCardModel[];
  }, [grouped]);

  return (
    <div className={pageStyles.page}>
      <div className={pageStyles.header}>
        <div>
          <Title level={3} className={pageStyles.title}>
            Đơn của tôi
          </Title>
          <div className={pageStyles.subtitle}>Theo dõi tình trạng booking và thanh toán.</div>
        </div>
        <div className={pageStyles.filter}>
          <Segmented
            value={status}
            onChange={(v) => setStatus(v as any)}
            options={[
              { label: "Tất cả", value: "all" },
              { label: "Chờ xử lý", value: "pending" },
              { label: "Đã xác nhận", value: "confirmed" },
              { label: "Đã hủy", value: "cancelled" },
            ]}
          />
        </div>
      </div>

      <Card className={pageStyles.cardWrap} bodyStyle={{ padding: 14 }}>
        <BookingList
          loading={loading}
          items={bookingCards}
          onViewDetail={(id) => navigate(`/my-bookings/${id}`)}
          onPay={(id) => navigate(`/booking/payment/${id}?gateway=bank`)}
          onInvoice={(id) => navigate(`/booking/success/${id}`)}
          onCancel={(id) => {
            const b = items.find((x: any) => String(x?._id || x?.id) === String(id));
            if (!b) return;

            const total = Number(b?.total_price || b?.totalPrice || 0);
            const deposit = Number(b?.deposit_amount || Math.round(total * 0.3));
            const startDateObj = b?.startDate ? new Date(b.startDate) : null;
            const daysBeforeStart = startDateObj
              ? Math.floor((startDateObj.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
              : 0;
            const timeRefundPercent = daysBeforeStart > 7 ? 100 : daysBeforeStart >= 3 ? 50 : 0;
            const paymentStatusRaw = normalizePaymentStatus(b);
            const paidAmount =
              paymentStatusRaw === "paid" ? total : paymentStatusRaw === "deposit" ? Math.max(0, deposit) : 0;
            const refundAmount = Math.max(0, Math.round((paidAmount * timeRefundPercent) / 100));

            setCancelBooking({ ...b, _refundAmount: refundAmount, _refundPercent: timeRefundPercent });
            setCancelOpen(true);
          }}
        />
      </Card>

      <Modal
        open={cancelOpen}
        title="Xác nhận hủy tour"
        okText="Xác nhận"
        cancelText="Đóng"
        okButtonProps={{ danger: true, loading: cancelSubmitting, disabled: !cancelBooking || !!cancelFormError }}
        onCancel={() => {
          if (cancelSubmitting) return;
          setCancelOpen(false);
          setCancelBooking(null);
          setCancelReason("");
          setCancelBankName("Vietcombank");
          setCancelBankAccountNumber("");
          setCancelBankAccountName("");
          setCancelQrFileList([]);
          setCancelQrDataUrl("");
        }}
        onOk={async () => {
          const id = cancelBooking?._id || cancelBooking?.id;
          if (!id) return;
          if (cancelFormError) {
            message.error(cancelFormError);
            return;
          }
          setCancelSubmitting(true);
          try {
            await axios.post(
              `${API_V1}/bookings/me/${id}/cancel-request`,
              {
                reason: cancelReason || "",
                bank_name: cancelBankName || "",
                bank_account_number: cancelBankAccountNumber || "",
                bank_account_name: cancelBankAccountName || "",
                qr_image_data_url: cancelQrDataUrl || "",
              },
              getAuthHeader()
            );
            message.success("Đã tạo yêu cầu hủy");
            setCancelOpen(false);
            setCancelBooking(null);
            setCancelReason("");
            setCancelBankName("Vietcombank");
            setCancelBankAccountNumber("");
            setCancelBankAccountName("");
            setCancelQrFileList([]);
            setCancelQrDataUrl("");
            // reload list
            const res = await axios.get(`${API_V1}/bookings/me`, {
              ...getAuthHeader(),
              params: status === "all" ? {} : { status },
            });
            const data = res.data?.data || [];
            setItems(Array.isArray(data) ? data : []);
          } catch (e: any) {
            message.error(e?.response?.data?.message || "Không thể tạo yêu cầu hủy");
          } finally {
            setCancelSubmitting(false);
          }
        }}
      >
        <Space direction="vertical" size={10} style={{ width: "100%" }}>
          <div>
            <Text strong>Số tiền được hoàn:</Text>{" "}
            <Text strong style={{ color: "#d90429" }}>
              {Number(cancelBooking?._refundAmount || 0).toLocaleString("vi-VN")}đ
            </Text>{" "}
            <Text type="secondary">({Number(cancelBooking?._refundPercent || 0)}%)</Text>
          </div>
          <div>
            <Text type="secondary">
              Trạng thái thanh toán: <b>{String(cancelBooking?._payLabel || "")}</b>
            </Text>
          </div>
          <Input.TextArea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Lý do hủy"
            autoSize={{ minRows: 3, maxRows: 6 }}
            maxLength={500}
            showCount
          />

          <Divider style={{ margin: "4px 0" }} />

          <Text strong>Thông tin nhận hoàn tiền</Text>
          <Select
            value={cancelBankName}
            onChange={(v) => setCancelBankName(String(v))}
            options={[
              { label: "Vietcombank", value: "Vietcombank" },
              { label: "Techcombank", value: "Techcombank" },
              { label: "BIDV", value: "BIDV" },
              { label: "Agribank", value: "Agribank" },
              { label: "ACB", value: "ACB" },
              { label: "MB Bank", value: "MB Bank" },
            ]}
          />
          <Input
            value={cancelBankAccountNumber}
            onChange={(e) => setCancelBankAccountNumber(e.target.value)}
            placeholder="Số tài khoản"
          />
          <Input
            value={cancelBankAccountName}
            onChange={(e) => setCancelBankAccountName(e.target.value)}
            placeholder="Chủ tài khoản"
          />

          <Upload
            listType="picture"
            fileList={cancelQrFileList}
            maxCount={1}
            accept="image/*"
            beforeUpload={async (file: RcFile) => {
              try {
                const dataUrl = await new Promise<string>((resolve) => {
                  const reader = new FileReader();
                  reader.onload = () => resolve(String(reader.result || ""));
                  reader.onerror = () => resolve("");
                  reader.readAsDataURL(file);
                });
                if (!dataUrl) {
                  message.error("Không đọc được ảnh QR. Vui lòng thử ảnh khác.");
                  return false;
                }
                setCancelQrDataUrl(dataUrl);
                setCancelQrFileList([
                  {
                    uid: file.uid,
                    name: file.name,
                    status: "done",
                    url: dataUrl,
                  },
                ]);
              } catch {
                message.error("Upload QR thất bại. Vui lòng thử lại.");
              }
              return false;
            }}
            onRemove={() => {
              setCancelQrFileList([]);
              setCancelQrDataUrl("");
            }}
          >
            <Button>Upload QR</Button>
          </Upload>

          {cancelFormError ? <Text type="danger">{cancelFormError}</Text> : null}
        </Space>
      </Modal>
    </div>
  );
};

export default MyBookingsPage;

