import { useState } from "react";
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
  Modal,
  Popconfirm,
} from "antd";
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  UserOutlined,
  RocketOutlined,
  SyncOutlined,
  CheckOutlined,
  RightOutlined,
  PhoneOutlined,
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
  const [openPoint, setOpenPoint] = useState<{
    day: number;
    checkpointIndex: number;
    title: string;
  } | null>(null);

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
      const res = await axios.patch(`${API}/guide/${id}/stage`, { tour_stage }, getAuthHeader());
      return res.data;
    },
    onSuccess: (_, stage) => {
      const label = stage === "scheduled" ? "Sắp khởi hành" : stage === "in_progress" ? "Đang diễn ra" : "Đã kết thúc";
      message.success(`Đã cập nhật: ${label}`);
      queryClient.invalidateQueries({ queryKey: ["hdv-booking", id] });
      queryClient.invalidateQueries({ queryKey: ["hdv-bookings"] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || "Cập nhật trạng thái thất bại.";
      message.error(msg);
    },
  });

  const checkInMutation = useMutation({
    mutationFn: async (payload: { type: string; passengerIndex?: number; day?: number; checkpointIndex?: number }) => {
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
  const canCheckin = tourStage === "in_progress";

  const checkpointDays =
    Array.isArray(schedule) && schedule.length > 0
      ? schedule
          .map((d: any, idx: number) => ({
            day: Number(d?.day ?? idx + 1),
            title: d?.title || `Ngày ${idx + 1}`,
            checkpoints: Array.isArray(d?.activities)
              ? d.activities.filter((x: any) => typeof x === "string" && x.trim().length > 0)
              : [],
          }))
          .sort((a: any, b: any) => a.day - b.day)
      : [];

  const STAGES = [
    { key: "scheduled", label: "Sắp khởi hành", icon: <RocketOutlined /> },
    { key: "in_progress", label: "Đang diễn ra", icon: <SyncOutlined spin /> },
    { key: "completed", label: "Đã kết thúc", icon: <CheckOutlined /> },
  ];
  const currentStageIndex = STAGES.findIndex((s) => s.key === tourStage);

  const validateNextStage = (nextStageKey: string) => {
    const nextStage = STAGES.find((s) => s.key === nextStageKey);
    if (!nextStage) return { ok: false, reason: "Trạng thái không hợp lệ." as const };
    const nextIndex = STAGES.findIndex((s) => s.key === nextStageKey);

    if (nextIndex < currentStageIndex) {
      return { ok: false, reason: "Không thể chuyển trạng thái ngược lại." as const };
    }
    if (nextIndex === currentStageIndex) {
      return { ok: false, reason: "Tour đang ở trạng thái này." as const };
    }
    if (nextIndex !== currentStageIndex + 1) {
      return { ok: false, reason: "Chỉ được chuyển sang trạng thái tiếp theo." as const };
    }

    return { ok: true, label: nextStage.label as string };
  };

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

  const checkpointCheckins = (booking as any)?.checkpoint_checkins || {};

  const getCheckpointChecked = (day: number, cpIndex: number, type: "leader" | "passenger", passengerIdx?: number) => {
    const d = checkpointCheckins?.[String(day)];
    const cp = d?.[String(cpIndex)];
    if (!cp) return false;
    if (type === "leader") return Boolean(cp.leader);
    if (typeof passengerIdx !== "number") return false;
    return Boolean(cp.passengers?.[passengerIdx]);
  };

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
      key: "checkpoint",
      label: (
        <span>
          <CheckCircleOutlined /> Điểm danh khách
        </span>
      ),
      children: (
        <Card>
          {checkpointDays.length === 0 ? (
            <Empty description="Chưa có checkpoint (lịch trình chưa có hoạt động)" />
          ) : (
            <Tabs
              type="card"
              items={checkpointDays.map((d: any) => ({
                key: String(d.day),
                label: `NGÀY ${d.day}`,
                children: (
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: 12, color: "#111827" }}>
                      {d.title}
                    </div>
                    {d.checkpoints.length === 0 ? (
                      <Empty description="Chưa có điểm tập trung cho ngày này" />
                    ) : (
                      <List
                        dataSource={d.checkpoints.map((cp: string, cpIndex: number) => {
                          const totalChecked =
                            (getCheckpointChecked(d.day, cpIndex, "leader") ? 1 : 0) +
                            passengers.filter((_: any, i: number) => getCheckpointChecked(d.day, cpIndex, "passenger", i)).length;
                          return {
                            cp,
                            cpIndex,
                            totalChecked,
                            totalPeople: displayList.length,
                          };
                        })}
                        renderItem={(item: any) => (
                          <List.Item
                            style={{
                              background: "#fff",
                              border: "1px solid #eef2f7",
                              borderRadius: 12,
                              padding: "12px 14px",
                              marginBottom: 10,
                              boxShadow: "0 6px 16px rgba(0,0,0,0.06)",
                              cursor: canCheckin ? "pointer" : "not-allowed",
                              opacity: canCheckin ? 1 : 0.7,
                            }}
                            onClick={() =>
                              canCheckin
                                ? setOpenPoint({
                                    day: d.day,
                                    checkpointIndex: item.cpIndex,
                                    title: item.cp,
                                  })
                                : message.warning(
                                    tourStage === "completed"
                                      ? "Tour đã kết thúc nên không thể điểm danh."
                                      : "Tour đang ở trạng thái sắp khởi hành nên chưa thể điểm danh."
                                  )
                            }
                            actions={[
                              <Tag key="count" color={item.totalChecked === item.totalPeople ? "green" : "blue"} style={{ margin: 0 }}>
                                {item.totalChecked}/{item.totalPeople} có mặt
                              </Tag>,
                              <RightOutlined key="go" style={{ color: "#9ca3af" }} />,
                            ]}
                          >
                            <div style={{ fontWeight: 700, color: "#111827" }}>{item.cp}</div>
                          </List.Item>
                        )}
                      />
                    )}
                  </div>
                ),
              }))}
            />
          )}

          <Modal
            open={!!openPoint}
            onCancel={() => setOpenPoint(null)}
            footer={null}
            title={
              openPoint ? (
                <div>
                  <div style={{ fontWeight: 800 }}>NGÀY {openPoint.day}</div>
                  <div style={{ color: "#6b7280", fontWeight: 600 }}>{openPoint.title}</div>
                </div>
              ) : null
            }
            width={720}
            destroyOnClose
          >
            {openPoint && (
              <div>
                <div style={{ marginBottom: 12 }}>
                  <Tag color="blue">
                    {(getCheckpointChecked(openPoint.day, openPoint.checkpointIndex, "leader") ? 1 : 0) +
                      passengers.filter((_: any, i: number) =>
                        getCheckpointChecked(openPoint.day, openPoint.checkpointIndex, "passenger", i)
                      ).length}
                    /{displayList.length} có mặt
                  </Tag>
                </div>
                <List
                  dataSource={displayList}
                  renderItem={(p) => {
                    const checked =
                      p.type === "leader"
                        ? getCheckpointChecked(openPoint.day, openPoint.checkpointIndex, "leader")
                        : getCheckpointChecked(openPoint.day, openPoint.checkpointIndex, "passenger", p.passengerIndex);

                    const phone =
                      p.type === "leader"
                        ? booking.customer_phone
                        : passengers?.[p.passengerIndex]?.phone;

                    return (
                      <List.Item
                        actions={[
                          !checked ? (
                            <Button
                              key="call"
                              size="small"
                              icon={<PhoneOutlined />}
                              disabled={!phone}
                              href={phone ? `tel:${phone}` : undefined}
                            >
                              Gọi
                            </Button>
                          ) : null,
                          <Switch
                            key="checkin"
                            checked={checked}
                            disabled={!canCheckin}
                            onChange={() =>
                              checkInMutation.mutate({
                                type: p.type,
                                passengerIndex: p.passengerIndex,
                                day: openPoint.day,
                                checkpointIndex: openPoint.checkpointIndex,
                              })
                            }
                            loading={checkInMutation.isPending}
                            checkedChildren="Có mặt"
                            unCheckedChildren="Vắng mặt"
                          />,
                        ].filter(Boolean)}
                      >
                        <List.Item.Meta
                          avatar={
                            <div
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: "50%",
                                background: checked ? "#10b981" : "#e5e7eb",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              {checked ? (
                                <CheckCircleOutlined style={{ color: "white", fontSize: 18 }} />
                              ) : (
                                <UserOutlined style={{ color: "#6b7280" }} />
                              )}
                            </div>
                          }
                          title={
                            <span>
                              {p.name}
                              {p.role && (
                                <Tag color="blue" style={{ marginLeft: 8 }}>
                                  {p.role}
                                </Tag>
                              )}
                              {checked ? (
                                <Tag color="green" style={{ marginLeft: 8 }}>
                                  Có mặt
                                </Tag>
                              ) : (
                                <Tag color="default" style={{ marginLeft: 8 }}>
                                  Vắng mặt
                                </Tag>
                              )}
                            </span>
                          }
                          description={phone}
                        />
                      </List.Item>
                    );
                  }}
                />
              </div>
            )}
          </Modal>
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
                (() => {
                  const v = validateNextStage(s.key);
                  const isCurrent = tourStage === s.key;
                  const isNext = v.ok;
                  const disabled = updateStageMutation.isPending || !isNext;

                  const btn = (
                    <Button
                      type={isCurrent ? "primary" : "default"}
                      size="small"
                      disabled={disabled}
                      loading={updateStageMutation.isPending}
                    >
                      {isCurrent ? "Đang ở giai đoạn này" : `Xác nhận ${s.label}`}
                    </Button>
                  );

                  if (isCurrent) return btn;
                  if (!isNext) return btn;

                  return (
                    <Popconfirm
                      title="Xác nhận chuyển trạng thái?"
                      description={`Chuyển tour sang "${v.label}"?`}
                      okText="Xác nhận"
                      cancelText="Hủy"
                      onConfirm={() => updateStageMutation.mutateAsync(s.key)}
                    >
                      {btn}
                    </Popconfirm>
                  );
                })()
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
