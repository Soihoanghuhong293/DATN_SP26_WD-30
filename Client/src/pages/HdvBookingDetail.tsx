import { useMemo, useState } from "react";
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
  Divider,
  Form,
  Input,
  Segmented,
  Upload,
  Image,
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
const { TextArea } = Input;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
});

const API = "http://localhost:5000/api/v1/bookings";

const HdvBookingDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [diaryForm] = Form.useForm();
  const [diaryFileList, setDiaryFileList] = useState<any[]>([]);
  const [selectedDiaryDayIndex, setSelectedDiaryDayIndex] = useState<number>(0);

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

  const addDiaryMutation = useMutation({
    mutationFn: async (payload: {
      date: string;
      day_no?: number;
      title?: string;
      content?: string;
      highlight?: string;
      images?: Array<{ name?: string; url: string }>;
    }) => {
      await axios.patch(`${API}/guide/${id}/diary`, payload, getAuthHeader());
    },
    onSuccess: () => {
      message.success("Đã lưu nhật kí");
      diaryForm.resetFields();
      setDiaryFileList([]);
      queryClient.invalidateQueries({ queryKey: ["hdv-booking", id] });
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || "Lưu nhật kí thất bại");
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

  const diaryDays = useMemo(() => {
    const start = dayjs(booking.startDate).startOf("day");
    const end = dayjs(booking.endDate || booking.startDate).startOf("day");
    const days = Math.max(0, end.diff(start, "day"));
    return Array.from({ length: days + 1 }, (_, i) => start.add(i, "day"));
  }, [booking.startDate, booking.endDate]);

  const selectedDiaryDate = diaryDays[Math.min(selectedDiaryDayIndex, diaryDays.length - 1)] || dayjs(booking.startDate);

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
    {
      key: "logs",
      label: (
        <span>
          <SyncOutlined /> Nhật kí tour
        </span>
      ),
      children: (
        <Card>
          <Form
            form={diaryForm}
            layout="vertical"
            onFinish={(values) => {
              const date = selectedDiaryDate ? selectedDiaryDate.toISOString() : dayjs(booking.startDate).toISOString();
              const images = (diaryFileList || [])
                .map((f: any) => ({ name: f.name, url: f.url || f.thumbUrl }))
                .filter((x: any) => typeof x.url === "string" && x.url.length > 0);
              addDiaryMutation.mutate({
                date,
                day_no: selectedDiaryDayIndex + 1,
                title: values.title || "",
                content: values.content || "",
                highlight: values.highlight || "",
                images,
              });
            }}
          >
            <div style={{ maxWidth: 720 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 12 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <Text type="secondary">Ngày:</Text>
                  <Segmented
                    value={selectedDiaryDayIndex}
                    onChange={(v) => {
                      setSelectedDiaryDayIndex(Number(v));
                      diaryForm.resetFields();
                      setDiaryFileList([]);
                    }}
                    options={diaryDays.map((d, idx) => ({
                      label: `Ngày ${idx + 1} (${d.format("DD/MM")})`,
                      value: idx,
                    }))}
                  />
                </div>
                <Form.Item name="title" label="Tiêu đề" style={{ marginBottom: 0 }}>
                  <Input />
                </Form.Item>
              </div>

              <Form.Item
                name="content"
                label="Nội dung"
                rules={[{ required: true, message: "Vui lòng nhập nội dung" }]}
              >
                <TextArea rows={8} placeholder="Nhập nội dung..." />
              </Form.Item>

              <Form.Item label="Ảnh">
                <Upload
                  listType="picture-card"
                  fileList={diaryFileList}
                  onChange={({ fileList }) => setDiaryFileList(fileList)}
                  beforeUpload={async (file) => {
                    const toBase64 = (f: File) =>
                      new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(String(reader.result || ""));
                        reader.onerror = reject;
                        reader.readAsDataURL(f);
                      });
                    const url = await toBase64(file as any);
                    setDiaryFileList((prev) => [
                      ...prev,
                      { uid: (file as any).uid, name: file.name, status: "done", url },
                    ]);
                    return false; // không upload lên server file thô
                  }}
                  onRemove={(file) => {
                    setDiaryFileList((prev) => prev.filter((x: any) => x.uid !== file.uid));
                  }}
                >
                  + Upload
                </Upload>
              </Form.Item>

              <Form.Item name="highlight" label="Highlight">
                <TextArea rows={3} placeholder="- ..." />
              </Form.Item>

              <Button type="primary" htmlType="submit" loading={addDiaryMutation.isPending}>
                Lưu
              </Button>
            </div>
          </Form>

          <Divider style={{ margin: "16px 0" }} />

          {Array.isArray(booking.diary_entries) && booking.diary_entries.length > 0 ? (
            <List
              itemLayout="vertical"
              dataSource={[...booking.diary_entries].sort(
                (a: any, b: any) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf()
              )}
              renderItem={(entry: any) => (
                <List.Item>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <Tag color="blue">{`Ngày ${entry.day_no || 1}`}</Tag>
                      <Tag color="default">
                        {entry.date ? dayjs(entry.date).format("DD/MM/YYYY") : "—"}
                      </Tag>
                      {entry.title ? (
                        <Text style={{ fontWeight: 600, color: "#111827" }}>{entry.title}</Text>
                      ) : (
                        <Text style={{ fontWeight: 600, color: "#111827" }}>Nhật kí</Text>
                      )}
                    </div>

                    {entry.content ? (
                      <div>
                        <Text strong>Nội dung:</Text>
                        <div style={{ whiteSpace: "pre-wrap", marginTop: 4 }}>{entry.content}</div>
                      </div>
                    ) : null}

                    {entry.highlight ? (
                      <div>
                        <Text strong>Highlight:</Text>
                        <div style={{ whiteSpace: "pre-wrap", marginTop: 4 }}>{entry.highlight}</div>
                      </div>
                    ) : null}

                    {entry.note ? (
                      <div>
                        <Text strong>Ghi chú:</Text> <Text>{entry.note}</Text>
                      </div>
                    ) : null}

                    {Array.isArray(entry.images) && entry.images.length > 0 ? (
                      <Image.PreviewGroup>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {entry.images.slice(0, 8).map((img: any, i: number) => (
                            <Image
                              key={i}
                              width={96}
                              height={96}
                              style={{ objectFit: "cover", borderRadius: 8 }}
                              src={img.url}
                            />
                          ))}
                        </div>
                      </Image.PreviewGroup>
                    ) : null}

                    {entry.created_by ? (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Người ghi: {entry.created_by}
                      </Text>
                    ) : null}
                  </div>
                </List.Item>
              )}
            />
          ) : (
            <Empty description="Chưa có nhật kí theo ngày" />
          )}
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
