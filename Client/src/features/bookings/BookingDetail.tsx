import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  Card,
  Button,
  Typography,
  Tag,
  Descriptions,
  List,
  Spin,
  Empty,
} from "antd";
import {
  ArrowLeftOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

const { Text } = Typography;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
});

const STAGE_LABELS: Record<string, string> = {
  scheduled: "Sắp khởi hành",
  in_progress: "Đang diễn ra",
  completed: "Đã kết thúc",
};

const BookingDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-booking", id],
    queryFn: async () => {
      const res = await axios.get(
        `http://localhost:5000/api/v1/bookings/${id}`,
        getAuthHeader()
      );
      return res.data?.data;
    },
    enabled: !!id,
  });

  if (!id) return null;
  if (isLoading)
    return (
      <div style={{ textAlign: "center", padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  if (!data) return <Empty description="Không tìm thấy đơn hàng" />;

  const booking = data;
  const tour = booking.tour_id;
  const guide = booking.guide_id;
  const tourStage = booking.tour_stage || "scheduled";
  const checkInCompleted = booking.checkInCompleted || false;
  const passengers = booking.passengers || [];
  const leaderCheckedIn = booking.leaderCheckedIn || false;

  const displayList = [
    { name: booking.customer_name, phone: booking.customer_phone, role: "Trưởng đoàn", checkedIn: leaderCheckedIn },
    ...passengers.map((p: any, i: number) => ({
      name: p.name || `Khách ${i + 1}`,
      phone: p.phone,
      role: "",
      checkedIn: p.checkedIn || false,
    })),
  ];

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/admin/bookings")} style={{ marginBottom: 24 }}>
        Quay lại
      </Button>

      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8, color: "#1f2937" }}>
        Chi tiết đơn hàng #{booking._id?.slice(-6).toUpperCase()}
      </h1>
      <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 24 }}>
        Thông tin chi tiết và dữ liệu check-in từ HDV
      </p>

      <Card title="Thông tin chung" bordered={false} style={{ marginBottom: 24, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="Tour">{tour?.name || "—"}</Descriptions.Item>
          <Descriptions.Item label="Thời gian">
            {dayjs(booking.startDate).format("DD/MM/YYYY")}
            {booking.endDate && ` - ${dayjs(booking.endDate).format("DD/MM/YYYY")}`}
          </Descriptions.Item>
          <Descriptions.Item label="HDV phụ trách">
            {guide ? `${guide.name} (${guide.email || guide.phone || ""})` : "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Khách hàng (Trưởng đoàn)">
            {booking.customer_name} - {booking.customer_phone}
          </Descriptions.Item>
          <Descriptions.Item label="Số khách">{booking.groupSize} người</Descriptions.Item>
          <Descriptions.Item label="Tổng tiền">{booking.total_price?.toLocaleString("vi-VN")} đ</Descriptions.Item>
          <Descriptions.Item label="Trạng thái đơn">
            <Tag color={booking.status === "cancelled" ? "red" : "blue"}>
              {booking.status === "confirmed" ? "Đã xác nhận" : booking.status === "paid" ? "Đã thanh toán" : booking.status === "cancelled" ? "Đã hủy" : "Chờ duyệt"}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Giai đoạn tour">
            <Tag color={tourStage === "completed" ? "green" : tourStage === "in_progress" ? "blue" : "default"}>
              {STAGE_LABELS[tourStage] || tourStage}
            </Tag>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card
        title={
          <span>
            <TeamOutlined /> Dữ liệu check-in từ HDV
            {checkInCompleted && (
              <Tag color="success" style={{ marginLeft: 8 }}>
                Đã hoàn tất {booking.checkInCompletedAt && dayjs(booking.checkInCompletedAt).format("DD/MM/YYYY HH:mm")}
              </Tag>
            )}
          </span>
        }
        bordered={false}
        style={{ borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}
      >
        {checkInCompleted ? (
          <List
            dataSource={displayList}
            renderItem={(item) => (
              <List.Item>
                <List.Item.Meta
                  avatar={
                    item.checkedIn ? (
                      <CheckCircleOutlined style={{ color: "#10b981", fontSize: 20 }} />
                    ) : (
                      <ClockCircleOutlined style={{ color: "#9ca3af", fontSize: 20 }} />
                    )
                  }
                  title={
                    <span>
                      {item.name}
                      {item.role && <Tag color="blue" style={{ marginLeft: 8 }}>{item.role}</Tag>}
                      <Tag color={item.checkedIn ? "green" : "default"} style={{ marginLeft: 8 }}>
                        {item.checkedIn ? "Có mặt" : "Vắng mặt"}
                      </Tag>
                    </span>
                  }
                  description={item.phone}
                />
              </List.Item>
            )}
          />
        ) : (
          <Text type="secondary">
            HDV chưa xác nhận hoàn tất check-in. Dữ liệu sẽ hiển thị khi HDV bấm &quot;Xác nhận hoàn tất check-in&quot;.
          </Text>
        )}
      </Card>
    </div>
  );
};

export default BookingDetail;
