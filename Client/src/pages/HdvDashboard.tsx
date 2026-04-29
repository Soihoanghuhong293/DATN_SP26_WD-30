import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Card, Row, Col, Statistic, List, Tag } from "antd";
import {
  CarOutlined,
  CalendarOutlined,
  StarOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";

dayjs.extend(isSameOrAfter);

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
});

const HdvDashboard = () => {
  const { data: bookings = [] } = useQuery({
    queryKey: ["hdv-bookings"],
    queryFn: async () => {
      const res = await axios.get(
        "http://localhost:5000/api/v1/bookings/guide/me",
        getAuthHeader()
      );
      return res.data?.data || [];
    },
  });

  const upcomingBookings = bookings.filter(
    (b: any) =>
      b.status !== "cancelled" &&
      !dayjs(b.startDate).startOf("day").isBefore(dayjs().startOf("day")),
  );

  const stats = [
    {
      title: "Tour đã dẫn",
      value: bookings.filter((b: any) => b.status !== "cancelled" && dayjs(b.endDate || b.startDate).isBefore(dayjs(), "day")).length,
      icon: <CarOutlined style={{ fontSize: 28, color: "#667eea" }} />,
    },
    {
      title: "Tour sắp tới",
      value: upcomingBookings.length,
      icon: <CalendarOutlined style={{ fontSize: 28, color: "#10b981" }} />,
    },
    {
      title: "Đánh giá trung bình",
      value: "—",
      suffix: "/5",
      icon: <StarOutlined style={{ fontSize: 28, color: "#f59e0b" }} />,
    },
    {
      title: "Khách đã phục vụ",
      value: bookings.reduce((sum: number, b: any) => sum + (b.groupSize || 0), 0),
      icon: <TeamOutlined style={{ fontSize: 28, color: "#8b5cf6" }} />,
    },
  ];

  return (
    <div>
      <h1
        style={{
          fontSize: 24,
          fontWeight: 600,
          marginBottom: 8,
          color: "#1f2937",
        }}
      >
        Tổng quan
      </h1>
      <p
        style={{
          fontSize: 14,
          color: "#6b7280",
          marginBottom: 24,
        }}
      >
        Chào mừng trở lại! Đây là tình hình công việc của bạn.
      </p>

      <Row gutter={[24, 24]}>
        {stats.map((item, index) => (
          <Col xs={24} sm={12} lg={6} key={index}>
            <Card
              bordered={false}
              style={{
                borderRadius: 12,
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <Statistic
                  title={
                    <span style={{ color: "#6b7280", fontSize: 14 }}>
                      {item.title}
                    </span>
                  }
                  value={item.value}
                  suffix={item.suffix}
                  valueStyle={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: "#1f2937",
                  }}
                />
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: "rgba(102, 126, 234, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {item.icon}
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={24} style={{ marginTop: 24 }}>
        <Col xs={24} lg={16}>
          <Card
            title="Lịch sắp tới"
            bordered={false}
            style={{
              borderRadius: 12,
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            }}
          >
            {upcomingBookings.length > 0 ? (
              <List
                dataSource={upcomingBookings.slice(0, 5)}
                renderItem={(b: any) => (
                  <List.Item>
                    <div style={{ width: "100%" }}>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>
                        {b.tour_id?.name || "Tour"}
                      </div>
                      <div style={{ fontSize: 13, color: "#6b7280" }}>
                        {dayjs(b.startDate).format("DD/MM/YYYY")}
                        {b.endDate && ` - ${dayjs(b.endDate).format("DD/MM/YYYY")}`} • {b.groupSize} khách
                      </div>
                      <Tag color={b.status === "confirmed" ? "blue" : b.status === "paid" ? "green" : "orange"} style={{ marginTop: 4 }}>
                        {b.status === "confirmed" ? "Đã xác nhận" : b.status === "paid" ? "Đã thanh toán" : "Chờ duyệt"}
                      </Tag>
                    </div>
                  </List.Item>
                )}
              />
            ) : (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px 20px",
                  color: "#9ca3af",
                }}
              >
                <CalendarOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                <p style={{ margin: 0 }}>Chưa có lịch tour nào sắp tới</p>
                <p style={{ margin: "8px 0 0 0", fontSize: 13 }}>
                  Dữ liệu sẽ hiển thị khi Admin gán tour cho bạn
                </p>
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card
            title="Thông tin nhanh"
            bordered={false}
            style={{
              borderRadius: 12,
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div
                style={{
                  padding: 12,
                  background: "#f8fafc",
                  borderRadius: 8,
                }}
              >
                <div style={{ fontSize: 12, color: "#64748b" }}>Trạng thái</div>
                <div style={{ fontWeight: 600, color: "#10b981" }}>Sẵn sàng</div>
              </div>
              <div
                style={{
                  padding: 12,
                  background: "#f8fafc",
                  borderRadius: 8,
                }}
              >
                <div style={{ fontSize: 12, color: "#64748b" }}>Hạng</div>
                <div style={{ fontWeight: 600, color: "#1f2937" }}>HDV nội địa</div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default HdvDashboard;
