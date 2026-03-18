import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Badge,
  Button,
  Calendar,
  Card,
  Col,
  ConfigProvider,
  Empty,
  List,
  Row,
  Space,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import { CalendarOutlined, EyeOutlined } from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import viVN from "antd/locale/vi_VN";
import "dayjs/locale/vi";

const { Text } = Typography;

dayjs.locale("vi");

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
});

interface IBooking {
  _id: string;
  tour_id?: { _id: string; name: string; duration_days?: number };
  startDate: string;
  endDate?: string;
  status: "pending" | "confirmed" | "paid" | "cancelled";
  tour_stage?: "scheduled" | "in_progress" | "completed";
  groupSize: number;
  customer_name?: string;
}

const API = "http://localhost:5000/api/v1/bookings";

const statusMap: Record<string, { color: string; label: string }> = {
  pending: { color: "orange", label: "Chờ duyệt" },
  confirmed: { color: "blue", label: "Đã xác nhận" },
  paid: { color: "green", label: "Đã thanh toán" },
  cancelled: { color: "red", label: "Đã hủy" },
};

const stageMap: Record<string, { color: string; label: string }> = {
  scheduled: { color: "default", label: "Sắp khởi hành" },
  in_progress: { color: "blue", label: "Đang diễn ra" },
  completed: { color: "green", label: "Đã kết thúc" },
};

function normalizeDateKey(d: Dayjs) {
  return d.format("YYYY-MM-DD");
}

function getBookingRange(booking: IBooking) {
  const start = dayjs(booking.startDate).startOf("day");
  const end = dayjs(booking.endDate || booking.startDate).startOf("day");
  return { start, end };
}

const HdvSchedule = () => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Dayjs>(() => dayjs().startOf("day"));

  const { data, isLoading } = useQuery({
    queryKey: ["hdv-bookings"],
    queryFn: async () => {
      const res = await axios.get(`${API}/guide/me`, getAuthHeader());
      return (res.data?.data || []) as IBooking[];
    },
  });

  const bookings: IBooking[] = data || [];

  const dayToBookings = useMemo(() => {
    const map = new Map<string, IBooking[]>();
    for (const b of bookings) {
      const { start, end } = getBookingRange(b);
      const days = Math.max(0, end.diff(start, "day"));
      for (let i = 0; i <= days; i++) {
        const key = normalizeDateKey(start.add(i, "day"));
        const arr = map.get(key) || [];
        arr.push(b);
        map.set(key, arr);
      }
    }
    // sắp xếp theo startDate cho mỗi ngày
    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => dayjs(a.startDate).valueOf() - dayjs(b.startDate).valueOf());
      map.set(k, arr);
    }
    return map;
  }, [bookings]);

  const selectedKey = normalizeDateKey(selectedDate);
  const selectedBookings = dayToBookings.get(selectedKey) || [];

  return (
    <ConfigProvider locale={viVN}>
      <div>
      <h1
        style={{
          fontSize: 24,
          fontWeight: 600,
          marginBottom: 8,
          color: "#1f2937",
        }}
      >
        Lịch làm việc
      </h1>
      <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 24 }}>
        Xem lịch các tour bạn được phân công theo ngày
      </p>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card
            bordered={false}
            style={{ borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}
            title={
              <Space>
                <CalendarOutlined />
                <span>Lịch</span>
              </Space>
            }
          >
            <Calendar
              value={selectedDate}
              onSelect={(v) => setSelectedDate(v.startOf("day"))}
              fullscreen={false}
              cellRender={(current) => {
                const key = normalizeDateKey(current);
                const items = dayToBookings.get(key) || [];
                if (items.length === 0) return null;
                return (
                  <div style={{ marginTop: 6 }}>
                    <Badge
                      count={items.length}
                      style={{ backgroundColor: "#1677ff" }}
                      overflowCount={99}
                    />
                  </div>
                );
              }}
            />
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card
            bordered={false}
            style={{ borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}
            title={
              <Space>
                <Text strong>Ngày</Text>
                <Tag color="blue">{selectedDate.format("DD/MM/YYYY")}</Tag>
              </Space>
            }
          >
            {selectedBookings.length === 0 && !isLoading ? (
              <Empty
                description="Không có tour trong ngày này"
                style={{ padding: 24 }}
              />
            ) : (
              <List
                loading={isLoading}
                dataSource={selectedBookings}
                rowKey={(b) => b._id}
                renderItem={(b) => {
                  const { start, end } = getBookingRange(b);
                  const status = statusMap[b.status] || { color: "default", label: b.status };
                  const stage =
                    stageMap[b.tour_stage || "scheduled"] || stageMap.scheduled;
                  return (
                    <List.Item
                      actions={[
                        <Button
                          key="detail"
                          type="primary"
                          icon={<EyeOutlined />}
                          onClick={() => navigate(`/hdv/tours/${b._id}`)}
                        >
                          Xem
                        </Button>,
                      ]}
                    >
                      <List.Item.Meta
                        title={
                          <Space wrap>
                            <Text strong style={{ color: "#1f2937" }}>
                              {b.tour_id?.name || "—"}
                            </Text>
                            <Tag color={status.color}>{status.label}</Tag>
                            <Tag color={stage.color}>{stage.label}</Tag>
                          </Space>
                        }
                        description={
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <Text type="secondary">
                              {start.format("DD/MM/YYYY")}
                              {end.isSame(start) ? "" : ` → ${end.format("DD/MM/YYYY")}`}
                            </Text>
                            <Text type="secondary">
                              {b.customer_name ? `Khách: ${b.customer_name} • ` : ""}
                              {b.groupSize || 0} khách
                            </Text>
                          </div>
                        }
                      />
                    </List.Item>
                  );
                }}
              />
            )}
          </Card>
        </Col>
      </Row>
      </div>
    </ConfigProvider>
  );
};

export default HdvSchedule;
