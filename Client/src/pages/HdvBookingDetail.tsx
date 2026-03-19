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
  Form,
  Input,
  Select,
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
  ProfileOutlined,
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

  const { data: postsData, isLoading: isPostsLoading } = useQuery({
    queryKey: ["hdv-booking-posts", id],
    queryFn: async () => {
      const res = await axios.get(`${API}/${id}/posts`, getAuthHeader());
      return res.data?.data || [];
    },
    enabled: !!id,
  });

  const createPostMutation = useMutation({
    mutationFn: async (payload: {
      title: string;
      content: string;
      type: string;
      images?: string[];
    }) => {
      await axios.post(`${API}/${id}/posts`, payload, getAuthHeader());
    },
    onSuccess: () => {
      message.success("Đã thêm bài viết mới cho chuyến đi");
      queryClient.invalidateQueries({ queryKey: ["hdv-booking-posts", id] });
    },
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

  const posts = Array.isArray(postsData) ? postsData : [];

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
      key: "posts",
      label: (
        <span>
          <ProfileOutlined /> Bài viết chuyến đi
        </span>
      ),
      children: (
        <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
          <Card
            title="Thêm bài viết mới"
            style={{ flex: 1, minWidth: 320, maxWidth: 420 }}
          >
            <Form
              layout="vertical"
              onFinish={(values: any) => {
                const images =
                  typeof values.imageUrls === "string" && values.imageUrls.trim()
                    ? values.imageUrls
                        .split(",")
                        .map((s: string) => s.trim())
                        .filter(Boolean)
                    : [];
                createPostMutation.mutate({
                  title: values.title,
                  content: values.content,
                  type: values.type,
                  images,
                });
              }}
            >
              <Form.Item
                label="Loại bài viết"
                name="type"
                initialValue="activity"
                rules={[{ required: true, message: "Chọn loại bài viết" }]}
              >
                <Select>
                  <Select.Option value="activity">Hoạt động tour</Select.Option>
                  <Select.Option value="photo">Hình ảnh thực tế</Select.Option>
                  <Select.Option value="update">Cập nhật từ HDV</Select.Option>
                  <Select.Option value="note">Ghi chú khác</Select.Option>
                </Select>
              </Form.Item>
              <Form.Item
                label="Tiêu đề"
                name="title"
                rules={[{ required: true, message: "Nhập tiêu đề bài viết" }]}
              >
                <Input placeholder="Ví dụ: Check-in tại điểm tham quan đầu tiên" />
              </Form.Item>
              <Form.Item
                label="Nội dung"
                name="content"
                rules={[{ required: true, message: "Nhập nội dung bài viết" }]}
              >
                <Input.TextArea
                  rows={4}
                  placeholder="Mô tả hoạt động, cảm nhận của đoàn, lưu ý cho khách..."
                />
              </Form.Item>
              <Form.Item
                label="Link ảnh (tùy chọn)"
                name="imageUrls"
                extra="Nhập nhiều link, ngăn cách nhau bằng dấu phẩy (,)"
              >
                <Input.TextArea rows={2} placeholder="https://example.com/image1.jpg, https://example.com/image2.png" />
              </Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={createPostMutation.isPending}
                block
              >
                Đăng bài viết
              </Button>
            </Form>
          </Card>

          <div style={{ flex: 2, minWidth: 320 }}>
            <Title level={5} style={{ marginBottom: 16 }}>
              Nhật ký chuyến đi
            </Title>
            {isPostsLoading ? (
              <div style={{ textAlign: "center", padding: 40 }}>
                <Spin />
              </div>
            ) : posts.length === 0 ? (
              <Empty description="Chưa có bài viết nào cho chuyến đi" />
            ) : (
              <List
                dataSource={posts}
                renderItem={(post: any) => (
                  <List.Item>
                    <Card
                      style={{ width: "100%" }}
                      title={
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>{post.title}</span>
                          <Tag
                            color={
                              post.type === "photo"
                                ? "purple"
                                : post.type === "update"
                                ? "blue"
                                : post.type === "note"
                                ? "default"
                                : "green"
                            }
                          >
                            {post.type === "activity"
                              ? "Hoạt động"
                              : post.type === "photo"
                              ? "Hình ảnh"
                              : post.type === "update"
                              ? "Cập nhật"
                              : "Ghi chú"}
                          </Tag>
                        </div>
                      }
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 12, color: "#6b7280" }}>
                        <span>
                          Đăng bởi: <strong>{post.author_id?.name || 'Không rõ'}</strong>
                          {post.author_id?.role === 'admin' && <Tag color="purple" style={{ marginLeft: 4 }}>Admin</Tag>}
                          {post.author_id?.role === 'guide' && <Tag color="cyan" style={{ marginLeft: 4 }}>HDV</Tag>}
                        </span>
                        <span>
                          {post.created_at &&
                            new Date(post.created_at).toLocaleString("vi-VN", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                        </span>
                      </div>

                      <div
                        style={{
                          whiteSpace: "pre-wrap",
                          marginBottom: post.images?.length ? 12 : 0,
                        }}
                      >
                        {post.content}
                      </div>
                      {post.images && post.images.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, }}>
                          {post.images.map((url: string, index: number) => (
                            <div key={index} style={{ width: 100, height: 80, borderRadius: 8, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                              <img src={url} alt={`post-${index}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  </List.Item>
                )}
              />
            )}
          </div>
        </div>
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
