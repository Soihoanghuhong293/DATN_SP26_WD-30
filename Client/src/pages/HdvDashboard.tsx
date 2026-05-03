import { useMemo } from "react";
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
import { resolveEffectivePayment } from "../features/bookings/bookingPaymentResolve";

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
    refetchOnMount: 'always',
  });

  const { data: myGuide } = useQuery({
    queryKey: ["hdv-guide-profile"],
    queryFn: async () => {
      const res = await axios.get("http://localhost:5000/api/v1/guides/me", getAuthHeader());
      return res.data?.data?.guide || null;
    },
  });

  const tourScheduleItems = useMemo(() => {
    const tourMap = new Map<string, any>();

    const normalizeStatus = (record: any) => {
      const tourStage = String(record.tour_stage || "scheduled").toLowerCase();
      if (tourStage === "completed") return "completed";
      if (tourStage === "in_progress") return "in_progress";
      if (String(record.status || "").toLowerCase() === "cancelled") return "cancelled";
      const payment = resolveEffectivePayment(record);
      if (payment === "paid") return "paid";
      if (payment === "deposit") return "deposit";
      if (String(record.status || "").toLowerCase() === "confirmed") return "confirmed";
      return "pending";
    };

    const getMergedStatus = (statuses: string[]) => {
      if (statuses.includes("completed")) return "completed";
      if (statuses.includes("in_progress")) return "in_progress";
      if (statuses.includes("cancelled")) return "cancelled";
      if (statuses.includes("paid")) return "paid";
      if (statuses.includes("deposit")) return "deposit";
      if (statuses.includes("confirmed")) return "confirmed";
      return "pending";
    };

    for (const b of bookings as any[]) {
      if (!b.tour_id || !b.startDate) continue;
      if (String(b.status || "").toLowerCase() === "cancelled") continue;

      const tourId = typeof b.tour_id === "object" ? b.tour_id._id : b.tour_id;
      if (!tourId) continue;
      const startDate = dayjs(b.startDate).format("YYYY-MM-DD");
      const key = `${tourId}|${startDate}`;
      const existing = tourMap.get(key);

      const title = typeof b.tour_id === "object" ? b.tour_id.name : String(b.tour_id || "Tour");
      const endDate = b.endDate || (b.tour_id?.duration_days ? dayjs(b.startDate).add(Number(b.tour_id.duration_days || 1) - 1, "day").format("YYYY-MM-DD") : undefined);
      const status = normalizeStatus(b);

      if (existing) {
        existing.totalPassengers += Number(b.groupSize || 0);
        existing.statusList.push(status);
        if (!existing.endDate && endDate) existing.endDate = endDate;
      } else {
        tourMap.set(key, {
          key,
          tourId,
          title,
          startDate,
          endDate,
          totalPassengers: Number(b.groupSize || 0),
          statusList: [status],
        });
      }
    }

    return Array.from(tourMap.values()).map((item) => ({
      ...item,
      status: getMergedStatus(item.statusList),
    }));
  }, [bookings]);

  const upcomingTours = tourScheduleItems.filter((item) =>
    !dayjs(item.startDate).startOf("day").isBefore(dayjs().startOf("day"))
  );

  const completedTours = tourScheduleItems.filter((item) =>
    dayjs(item.endDate || item.startDate).isBefore(dayjs(), "day")
  );

  const stats = [
    {
      title: "Tour đã dẫn",
      value: completedTours.length,
      icon: <CarOutlined style={{ fontSize: 28, color: "#667eea" }} />,
    },
    {
      title: "Tour sắp tới",
      value: upcomingTours.length,
      icon: <CalendarOutlined style={{ fontSize: 28, color: "#10b981" }} />,
    },
    {
      title: "Đánh giá trung bình",
      value:
        myGuide && myGuide.rating && typeof myGuide.rating.average === "number"
          ? Number(myGuide.rating.average.toFixed(1))
          : "—",
      suffix: "/5",
      icon: <StarOutlined style={{ fontSize: 28, color: "#f59e0b" }} />,
    },
    {
      title: "Khách đã phục vụ",
      value: bookings.reduce((sum: number, b: any) => sum + (b.groupSize || 0), 0),
      icon: <TeamOutlined style={{ fontSize: 28, color: "#8b5cf6" }} />,
    },
  ];

  const renderTourStatusTag = (status: string) => {
    switch (status) {
      case "completed":
        return <Tag color="default">Đã kết thúc</Tag>;
      case "in_progress":
        return <Tag color="blue">Đang diễn ra</Tag>;
      case "cancelled":
        return <Tag color="error">Đã hủy</Tag>;
      case "paid":
        return <Tag color="green">Đã thanh toán</Tag>;
      case "deposit":
        return <Tag color="purple">Đã đặt cọc</Tag>;
      case "confirmed":
        return <Tag color="blue">Đã xác nhận</Tag>;
      default:
        return <Tag color="orange">Chờ xác nhận</Tag>;
    }
  };

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
            {upcomingTours.length > 0 ? (
              <List
                dataSource={upcomingTours.slice(0, 5)}
                renderItem={(item: any) => (
                  <List.Item>
                    <div style={{ width: "100%" }}>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>
                        {item.title || "Tour"}
                      </div>
                      <div style={{ fontSize: 13, color: "#6b7280" }}>
                        {dayjs(item.startDate).format("DD/MM/YYYY")}
                        {item.endDate && ` - ${dayjs(item.endDate).format("DD/MM/YYYY")}`} • {item.totalPassengers} khách
                      </div>
                      <div style={{ marginTop: 4 }}>
                        {renderTourStatusTag(item.status)}
                      </div>
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
