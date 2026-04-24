import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Empty, List, Segmented, Space, Spin, Tag, Typography, message, Button, Modal, Input, Select, Upload, Divider } from "antd";
import axios from "axios";
import dayjs from "dayjs";
import type { UploadFile } from "antd";
import type { RcFile } from "antd/es/upload";

const { Title, Text } = Typography;

const API_V1 =
  (import.meta.env?.VITE_API_URL as string | undefined) || "http://localhost:5000/api/v1";

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
});

const paymentStatusInfo = (payment: string) => {
  const p = String(payment || "unpaid");
  if (p === "paid") return { color: "green" as const, label: "Đã thanh toán" };
  if (p === "deposit") return { color: "orange" as const, label: "Đã đặt cọc" };
  if (p === "refunded") return { color: "default" as const, label: "Đã hoàn tiền" };
  return { color: "blue" as const, label: "Chưa thanh toán" };
};

const bookingStatusInfo = (status: string) => {
  const s = ["pending", "confirmed", "cancelled"].includes(String(status)) ? String(status) : "confirmed";
  if (s === "pending") return { color: "gold" as const, label: "Chờ xử lý" };
  if (s === "cancelled") return { color: "red" as const, label: "Đã hủy" };
  return { color: "green" as const, label: "Đã xác nhận" };
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
          params: status === "all" ? {} : { status },
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

  const grouped = useMemo(() => items, [items]);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
      <Space direction="vertical" size={14} style={{ width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <Title level={3} style={{ marginBottom: 0 }}>
              Đơn của tôi
            </Title>
            <Text type="secondary">Theo dõi tình trạng booking và thanh toán.</Text>
          </div>
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

        <Card style={{ borderRadius: 12 }}>
          {loading ? (
            <div style={{ padding: 40, display: "flex", justifyContent: "center" }}>
              <Spin />
            </div>
          ) : grouped.length === 0 ? (
            <Empty description="Chưa có đơn nào." />
          ) : (
            <List
              itemLayout="vertical"
              dataSource={grouped}
              renderItem={(b: any) => {
                const pay = paymentStatusInfo(b?.payment_status || "unpaid");
                const st = bookingStatusInfo(b?.status || "confirmed");
                const tourName = b?.tour_id?.name || "Tour";
                const start = b?.startDate ? dayjs(b.startDate).format("DD/MM/YYYY") : "---";
                const end = b?.endDate ? dayjs(b.endDate).format("DD/MM/YYYY") : "---";
                const total = Number(b?.total_price || b?.totalPrice || 0);
                const deposit = Number(b?.deposit_amount || Math.round(total * 0.3));
                const hasPendingCancel = Boolean(b?.cancel_request?.status === "pending");
                const tourStage = String(b?.tour_stage || "scheduled");
                const startDateObj = b?.startDate ? new Date(b.startDate) : null;
                const isPastOrOnStart = startDateObj ? Date.now() >= startDateObj.getTime() : false;
                const canCancel =
                  st.label !== "Đã hủy" &&
                  !hasPendingCancel &&
                  tourStage !== "in_progress" &&
                  tourStage !== "completed" &&
                  !isPastOrOnStart;
                const paymentStatusRaw = String(b?.payment_status || "unpaid");
                const daysBeforeStart = startDateObj ? Math.floor((startDateObj.getTime() - Date.now()) / (24 * 60 * 60 * 1000)) : 0;
                const timeRefundPercent = daysBeforeStart > 7 ? 100 : daysBeforeStart >= 3 ? 50 : 0;
                const paidAmount = paymentStatusRaw === "paid" ? total : paymentStatusRaw === "deposit" ? Math.max(0, deposit) : 0;
                const refundPercent = timeRefundPercent;
                const refundAmount = Math.max(0, Math.round((paidAmount * refundPercent) / 100));
                return (
                  <List.Item
                    key={String(b?._id || b?.id)}
                    style={{ padding: "16px 8px" }}
                    actions={[
                      <Button key="detail" type="primary" onClick={() => navigate(`/my-bookings/${b?._id || b?.id}`)}>
                        Xem chi tiết
                      </Button>,
                      <Button
                        key="cancel"
                        danger
                        disabled={!canCancel}
                        onClick={() => {
                          setCancelBooking({ ...b, _refundAmount: refundAmount, _refundPercent: refundPercent, _payLabel: pay.label });
                          setCancelOpen(true);
                        }}
                      >
                        {hasPendingCancel ? "Đang chờ hủy" : "Hủy tour"}
                      </Button>,
                      <Button
                        key="pay"
                        disabled={
                          st.label === "Đã hủy" ||
                          pay.label === "Đã hoàn tiền" ||
                          (pay.label !== "Đã thanh toán" && isPastOrOnStart)
                        }
                        onClick={() => navigate(`/booking/success/${b?._id || b?.id}`)}
                      >
                        Thanh toán / Hóa đơn
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      title={
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                          <Text strong>{tourName}</Text>
                          <Space size={8}>
                            <Tag color={st.color}>{st.label}</Tag>
                            <Tag color={pay.color}>{pay.label}</Tag>
                          </Space>
                        </div>
                      }
                      description={
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                          <Text type="secondary">
                            Khởi hành: <b>{start}</b> · Kết thúc: <b>{end}</b>
                          </Text>
                          <Text>
                            Tổng tiền:{" "}
                            <Text strong style={{ color: "#d90429" }}>
                              {total.toLocaleString("vi-VN")}đ
                            </Text>
                          </Text>
                        </div>
                      }
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <Text type="secondary">Mã booking: <Text copyable>{b?._id || b?.id}</Text></Text>
                      <Text type="secondary">
                        Ngày tạo: {b?.created_at ? dayjs(b.created_at).format("DD/MM/YYYY HH:mm") : "---"}
                      </Text>
                    </div>
                  </List.Item>
                );
              }}
            />
          )}
        </Card>
      </Space>

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

