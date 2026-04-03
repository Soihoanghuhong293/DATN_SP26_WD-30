import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Empty, List, Segmented, Space, Spin, Tag, Typography, message, Button } from "antd";
import axios from "axios";
import dayjs from "dayjs";

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
                return (
                  <List.Item
                    key={String(b?._id || b?.id)}
                    style={{ padding: "16px 8px" }}
                    actions={[
                      <Button key="detail" type="primary" onClick={() => navigate(`/my-bookings/${b?._id || b?.id}`)}>
                        Xem chi tiết
                      </Button>,
                      <Button
                        key="pay"
                        disabled={pay.label === "Đã thanh toán" || pay.label === "Đã hoàn tiền" || st.label === "Đã hủy"}
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
    </div>
  );
};

export default MyBookingsPage;

