import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, Descriptions, Divider, Empty, Spin, Tag, Timeline, Typography, Button, Space, message } from "antd";
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
  if (p === "paid") return { color: "green" as const, label: "Đã thanh toán đủ" };
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

const MyBookingDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<any>(null);

  useEffect(() => {
    const fetchDetail = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const res = await axios.get(`${API_V1}/bookings/me/${id}`, getAuthHeader());
        setBooking(res.data?.data || res.data);
      } catch (e: any) {
        message.error(e?.response?.data?.message || "Không tải được chi tiết đơn.");
        setBooking(null);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  const tourName = booking?.tour_id?.name || "Tour";
  const pay = paymentStatusInfo(booking?.payment_status || "unpaid");
  const st = bookingStatusInfo(booking?.status || "confirmed");

  const total = Number(booking?.total_price || booking?.totalPrice || 0);
  const deposit = Number(booking?.deposit_amount || Math.round(total * 0.3));
  const remaining = Math.max(0, total - deposit);

  const logs = useMemo(() => {
    const arr = Array.isArray(booking?.logs) ? booking.logs : [];
    return arr.map((l: any, idx: number) => ({
      key: `${idx}`,
      time: l?.time || "",
      user: l?.user || "",
      old: l?.old || "",
      next: l?.new || "",
      note: l?.note || "",
    }));
  }, [booking]);

  if (loading) {
    return (
      <div style={{ padding: 24, display: "flex", justifyContent: "center" }}>
        <Spin />
      </div>
    );
  }

  if (!booking) {
    return (
      <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
        <Empty description="Không tìm thấy đơn hàng." />
        <div style={{ marginTop: 16 }}>
          <Button type="primary" onClick={() => navigate("/my-bookings")}>
            Quay lại danh sách
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 980, margin: "0 auto" }}>
      <Space direction="vertical" size={14} style={{ width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <Title level={3} style={{ marginBottom: 0 }}>
              Chi tiết đơn
            </Title>
            <Text type="secondary">{tourName}</Text>
          </div>
          <Space>
            <Button onClick={() => navigate("/my-bookings")}>Quay lại</Button>
            <Button type="primary" onClick={() => navigate(`/booking/success/${id}`)}>
              Thanh toán / Hóa đơn
            </Button>
          </Space>
        </div>

        <Card style={{ borderRadius: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <Text>
              Mã booking: <Text copyable>{booking?._id || id}</Text>
            </Text>
            <Space size={8}>
              <Tag color={st.color}>{st.label}</Tag>
              <Tag color={pay.color}>{pay.label}</Tag>
            </Space>
          </div>

          <Divider />

          <Descriptions
            bordered
            column={1}
            styles={{ label: { width: 200, fontWeight: 700 } }}
          >
            <Descriptions.Item label="Ngày khởi hành">
              {booking?.startDate ? dayjs(booking.startDate).format("DD/MM/YYYY") : "---"}
            </Descriptions.Item>
            <Descriptions.Item label="Ngày kết thúc">
              {booking?.endDate ? dayjs(booking.endDate).format("DD/MM/YYYY") : "---"}
            </Descriptions.Item>
            <Descriptions.Item label="Số khách">{booking?.groupSize ?? "---"}</Descriptions.Item>
            <Descriptions.Item label="Tổng tiền">
              <Text strong style={{ color: "#d90429" }}>{total.toLocaleString("vi-VN")}đ</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Đặt cọc (30%)">
              <Text strong>{deposit.toLocaleString("vi-VN")}đ</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Còn lại">
              <Text strong>{remaining.toLocaleString("vi-VN")}đ</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Phương thức thanh toán">{booking?.paymentMethod || "---"}</Descriptions.Item>
          </Descriptions>

          <Divider />

          <Title level={4} style={{ marginBottom: 10 }}>Lịch sử</Title>
          {logs.length ? (
            <Timeline
              items={logs.map((l: any) => ({
                color: "#1677ff",
                children: (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <Text strong>{l.time || "---"}</Text>
                      <Text type="secondary">{l.user || ""}</Text>
                    </div>
                    <div style={{ marginTop: 4 }}>
                      <Text type="secondary">{l.old ? `${l.old} → ` : ""}</Text>
                      <Text strong>{l.next || ""}</Text>
                    </div>
                    {l.note ? <div style={{ marginTop: 4 }}><Text>{l.note}</Text></div> : null}
                  </div>
                ),
              }))}
            />
          ) : (
            <Empty description="Chưa có lịch sử." />
          )}
        </Card>
      </Space>
    </div>
  );
};

export default MyBookingDetailPage;

