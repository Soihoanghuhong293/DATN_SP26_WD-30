import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  Card,
  Button,
  Typography,
  Tag,
  List,
  Switch,
  Tabs,
  Spin,
  Empty,
  Steps,
  message,
} from "antd";
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  UserOutlined,
  RocketOutlined,
  SyncOutlined,
  CheckOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

const { Title, Text } = Typography;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
});

const API = "http://localhost:5000/api/v1/bookings";

const HdvBookingDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["hdv-booking", id],
    queryFn: async () => {
      const res = await axios.get(`${API}/guide/${id}`, getAuthHeader());
      return res.data?.data;
    },
    enabled: !!id,
  });

  const updateStageMutation = useMutation({
    mutationFn: async (tour_stage: string) => {
      await axios.patch(`${API}/guide/${id}/stage`, { tour_stage }, getAuthHeader());
    },
    onSuccess: (_, stage) => {
      const label = stage === "scheduled" ? "Sắp khởi hành" : stage === "in_progress" ? "Đang diễn ra" : "Đã kết thúc";
      message.success(`Đã cập nhật: ${label}`);
      queryClient.invalidateQueries({ queryKey: ["hdv-booking", id] });
      queryClient.invalidateQueries({ queryKey: ["hdv-bookings"] });
    },
  });

  const checkInMutation = useMutation({
    mutationFn: async (payload: { type: string; passengerIndex?: number }) => {
      await axios.patch(`${API}/guide/${id}/checkin`, payload, getAuthHeader());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hdv-booking", id] });
      queryClient.invalidateQueries({ queryKey: ["hdv-bookings"] });
    },
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
  const schedule = tour?.schedule || [];
  const scheduleDetail = booking.schedule_detail || "";
  const passengers = booking.passengers || [];
  const leaderCheckedIn = booking.leaderCheckedIn || false;
  const tourStage = booking.tour_stage || "scheduled";

  const STAGES = [
    { key: "scheduled", label: "Sắp khởi hành", icon: <RocketOutlined /> },
    { key: "in_progress", label: "Đang diễn ra", icon: <SyncOutlined spin /> },
    { key: "completed", label: "Đã kết thúc", icon: <CheckOutlined /> },
  ];

  // Danh sách hiển thị: Trưởng đoàn + passengers
  const displayList = [
    {
      key: "leader",
      name: booking.customer_name,
      phone: booking.customer_phone,
      role: "Trưởng đoàn",
      checkedIn: leaderCheckedIn,
      type: "leader" as const,
      passengerIndex: undefined,
    },
    ...passengers.map((p: any, i: number) => ({
      key: `p-${i}`,
      name: p.name || `Khách ${i + 1}`,
      phone: p.phone,
      role: "",
      checkedIn: p.checkedIn || false,
      type: "passenger" as const,
      passengerIndex: i,
    })),
  ];

  const tabItems = [
    {
      key: "schedule",
      label: (
        <span>
          <CalendarOutlined /> Lịch trình tour
        </span>
      ),
      children: (
        <div>
          {schedule.length > 0 ? (
            <List
              dataSource={schedule}
              renderItem={(item: any) => (
                <List.Item>
                  <Card size="small" style={{ width: "100%", marginBottom: 8 }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <Tag color="blue">Ngày {item.day}</Tag>
                      <div>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>{item.title}</div>
                        {item.activities?.length > 0 && (
                          <ul style={{ margin: 0, paddingLeft: 20 }}>
                            {item.activities.map((a: string, i: number) => (
                              <li key={i}>{a}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </Card>
                </List.Item>
              )}
            />
          ) : scheduleDetail ? (
            <div
              style={{
                whiteSpace: "pre-wrap",
                padding: 16,
                background: "#f9fafb",
                borderRadius: 8,
              }}
            >
              {scheduleDetail}
            </div>
          ) : (
            <Empty description="Chưa có lịch trình chi tiết" />
          )}
        </div>
      ),
    },
    {
      key: "passengers",
      label: (
        <span>
          <TeamOutlined /> Danh sách khách
        </span>
      ),
      children: (
        <List
          dataSource={displayList}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Switch
                  key="checkin"
                  checked={item.checkedIn}
                  onChange={() =>
                    checkInMutation.mutate({
                      type: item.type,
                      passengerIndex: item.passengerIndex,
                    })
                  }
                  loading={checkInMutation.isPending}
                  checkedChildren="Có mặt"
                  unCheckedChildren="Vắng mặt"
                />,
              ]}
            >
              <List.Item.Meta
                avatar={
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      background: item.checkedIn ? "#10b981" : "#e5e7eb",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {item.checkedIn ? (
                      <CheckCircleOutlined style={{ color: "white", fontSize: 20 }} />
                    ) : (
                      <UserOutlined style={{ color: "#6b7280" }} />
                    )}
                  </div>
                }
                title={
                  <span>
                    {item.name}
                    {item.role && (
                      <Tag color="blue" style={{ marginLeft: 8 }}>
                        {item.role}
                      </Tag>
                    )}
                    {item.checkedIn ? (
                      <Tag color="green" style={{ marginLeft: 8 }}>Có mặt</Tag>
                    ) : (
                      <Tag color="default" style={{ marginLeft: 8 }}>Vắng mặt</Tag>
                    )}
                  </span>
                }
                description={item.phone}
              />
            </List.Item>
          )}
        />
      ),
    },
    {
      key: "checkin",
      label: (
        <span>
          <CheckCircleOutlined /> Check-in khách
        </span>
      ),
      children: (
        <Card>
          <p style={{ color: "#6b7280", marginBottom: 16 }}>
            Gạt công tắc sang &quot;Có mặt&quot; khi khách đến điểm tập trung. Chưa gạt = Vắng mặt.
          </p>
          <div style={{ fontSize: 14 }}>
            Có mặt:{" "}
            <strong>
              {displayList.filter((p) => p.checkedIn).length} / {displayList.length}
            </strong>{" "}
            khách
          </div>
        </Card>
      ),
    },
  ];

  return (
    <div>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate("/hdv/tours")}
        style={{ marginBottom: 24 }}
      >
        Quay lại
      </Button>

      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ marginBottom: 4 }}>
          {tour?.name || "Chi tiết booking"}
        </Title>
        <Card style={{ marginBottom: 24 }} title="Trạng thái giai đoạn tour">
          <Steps
            current={STAGES.findIndex((s) => s.key === tourStage)}
            items={STAGES.map((s) => ({
              title: s.label,
              icon: s.icon,
              description: (
                <Button
                  type={tourStage === s.key ? "primary" : "default"}
                  size="small"
                  disabled={updateStageMutation.isPending}
                  loading={updateStageMutation.isPending}
                  onClick={() => updateStageMutation.mutate(s.key)}
                >
                  {tourStage === s.key ? "Đang ở giai đoạn này" : `Xác nhận ${s.label}`}
                </Button>
              ),
            }))}
          />
        </Card>

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <Text type="secondary">
            {dayjs(booking.startDate).format("DD/MM/YYYY")}
            {booking.endDate && ` - ${dayjs(booking.endDate).format("DD/MM/YYYY")}`}
          </Text>
          <Tag color={tourStage === "completed" ? "green" : tourStage === "in_progress" ? "blue" : "default"}>
            {STAGES.find((s) => s.key === tourStage)?.label || "Sắp khởi hành"}
          </Tag>
          <Tag color={booking.status === "cancelled" ? "red" : "blue"}>
            {booking.status === "confirmed"
              ? "Đã xác nhận"
              : booking.status === "paid"
              ? "Đã thanh toán"
              : booking.status === "cancelled"
              ? "Đã hủy"
              : "Chờ duyệt"}
          </Tag>
          <Text>{booking.groupSize} khách</Text>
        </div>
      </div>

      <Tabs items={tabItems} />
    </div>
  );
};

export default HdvBookingDetail;
