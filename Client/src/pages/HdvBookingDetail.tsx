
import { useEffect, useMemo, useState } from "react";
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
  Tooltip,
  Popconfirm,
  Form,
  Input,
  Segmented,
  Upload,
  Image,
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
const { TextArea } = Input;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
});

const API = "http://localhost:5000/api/v1/bookings";

const resizeImageToDataUrl = async (file: File, maxW = 1280, maxH = 1280, quality = 0.75) => {
  const dataUrl: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new window.Image();
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = dataUrl;
  });

  const { width, height } = img;
  const ratio = Math.min(1, maxW / width, maxH / height);
  const w = Math.max(1, Math.round(width * ratio));
  const h = Math.max(1, Math.round(height * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, w, h);

  // jpeg nhỏ hơn png
  return canvas.toDataURL("image/jpeg", quality);
};

const HdvBookingDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [openPoint, setOpenPoint] = useState<{
    day: number;
    checkpointIndex: number;
    title: string;
  } | null>(null);
  const [diaryForm] = Form.useForm();
  const [diaryFileList, setDiaryFileList] = useState<any[]>([]);
  const [selectedDiaryDayIndex, setSelectedDiaryDayIndex] = useState<number>(0);
  const [isDiaryEditing, setIsDiaryEditing] = useState<boolean>(true);
  const [absentTarget, setAbsentTarget] = useState<any>(null);
  const [reasonForm] = Form.useForm();
  const [activeCheckpointDay, setActiveCheckpointDay] = useState<string>("1");

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
    mutationFn: async (payload: { type: string; passengerIndex?: number; day?: number; checkpointIndex?: number; checked: boolean; reason?: string }) => {
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
      setIsDiaryEditing(false);
      queryClient.invalidateQueries({ queryKey: ["hdv-booking", id] });
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || "Lưu nhật kí thất bại");
    },
  });

  const booking = data ?? null;
  const diaryDays = useMemo(() => {
    if (!booking?.startDate) return [];
    const start = dayjs(booking.startDate).startOf("day");
    const end = dayjs(booking.endDate || booking.startDate).startOf("day");
    const days = Math.max(0, end.diff(start, "day"));
    return Array.from({ length: days + 1 }, (_, i) => start.add(i, "day"));
  }, [booking?.startDate, booking?.endDate]);

  const selectedDiaryDate =
    diaryDays[Math.min(selectedDiaryDayIndex, Math.max(0, diaryDays.length - 1))] ||
    (booking?.startDate ? dayjs(booking.startDate).startOf("day") : dayjs());

  const selectedDiaryDayNo = selectedDiaryDayIndex + 1;
  const selectedDiaryEntry = useMemo(() => {
    const entries = Array.isArray(booking?.diary_entries) ? booking.diary_entries : [];
    // nếu dữ liệu cũ bị trùng, lấy bản mới nhất theo created_at/date
    const sameDay = entries.filter((e: any) => Number(e?.day_no || 1) === Number(selectedDiaryDayNo));
    sameDay.sort(
      (a: any, b: any) =>
        dayjs(b.updated_at || b.created_at || b.date).valueOf() - dayjs(a.updated_at || a.created_at || a.date).valueOf()
    );
    return sameDay[0] || null;
  }, [booking?.diary_entries, selectedDiaryDayNo]);

  useEffect(() => {
    // Có nhật kí thì mặc định chỉ xem (ẩn form). Không có nhật kí thì mở form để nhập.
    setIsDiaryEditing(!selectedDiaryEntry);
    diaryForm.setFieldsValue({
      title: selectedDiaryEntry?.title || "",
      content: selectedDiaryEntry?.content || "",
      highlight: selectedDiaryEntry?.highlight || "",
    });

    const imgs = Array.isArray(selectedDiaryEntry?.images) ? selectedDiaryEntry.images : [];
    setDiaryFileList(
      imgs.map((img: any, idx: number) => ({
        uid: `${selectedDiaryDayNo}-${idx}`,
        name: img?.name || `image-${idx + 1}`,
        status: "done",
        url: img?.url,
      }))
    );
  }, [diaryForm, selectedDiaryDayNo, selectedDiaryEntry]);

  if (!id) return null;
  if (isLoading)
    return (
      <div style={{ textAlign: "center", padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  if (!data) return <Empty description="Không tìm thấy đơn hàng" />;

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

  const getCheckpointStatus = (day: number, cpIndex: number, type: "leader" | "passenger", passengerIdx?: number) => {
    const d = checkpointCheckins?.[String(day)];
    const cp = d?.[String(cpIndex)];
    if (!cp) return undefined;
    if (type === "leader") return cp.leader;
    if (typeof passengerIdx !== "number") return undefined;
    return cp.passengers?.[passengerIdx];
  };

  const getCheckpointChecked = (day: number, cpIndex: number, type: "leader" | "passenger", passengerIdx?: number) => {
    return getCheckpointStatus(day, cpIndex, type, passengerIdx) === true;
  };

  const isDayFinished = (dayNum: number) => {
    const dayData = checkpointDays.find((d) => d.day === dayNum);
    if (!dayData) return true;

    const checkins = checkpointCheckins[String(dayNum)] || {};
    
    return dayData.checkpoints.every((_: any, cpIdx: number) => {
      const cp = checkins[String(cpIdx)];
      if (!cp || cp.leader === undefined) return false;

      // Leader ok if present OR absent with reason
      const leaderOk = cp.leader === true || (cp.leader === false && cp.reasons?.leader);
      if (!leaderOk) return false;

      // Passengers ok if all accounted for and have reasons if absent
      return passengers.every((_: any, pIdx: number) => {
        const status = cp.passengers?.[pIdx];
        if (status === undefined) return false;
        return status === true || (status === false && cp.reasons?.passengers?.[pIdx]);
      });
    });
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
              activeKey={activeCheckpointDay}
              onChange={setActiveCheckpointDay}
              items={checkpointDays.map((d: any, idx: number) => ({
                key: String(d.day),
                label: `NGÀY ${d.day}`,
                disabled: idx > 0 && !isDayFinished(checkpointDays[idx - 1].day),
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
                    const status = getCheckpointStatus(openPoint.day, openPoint.checkpointIndex, p.type as any, p.passengerIndex);
                    const checked = status === true;
                    const absent = status === false;
                    
                    const cpData = checkpointCheckins?.[String(openPoint.day)]?.[String(openPoint.checkpointIndex)];
                    const reason = p.type === "leader" ? cpData?.reasons?.leader : cpData?.reasons?.passengers?.[p.passengerIndex];
                    
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
                          !checked ? (
                            <Button
                              key="reason"
                              size="small"
                              disabled={!canCheckin}
                              onClick={() => {
                                reasonForm.resetFields();
                                setAbsentTarget({
                                  name: p.name,
                                  type: p.type,
                                  passengerIndex: p.passengerIndex,
                                  day: openPoint.day,
                                  checkpointIndex: openPoint.checkpointIndex,
                                });
                              }}
                            >
                              Nhập lý do
                            </Button>
                          ) : null,
                          <Switch
                            key="checkin"
                            checked={checked}
                            disabled={!canCheckin}
                            onChange={(nextChecked) => {
                              // Nếu chuyển sang "Vắng mặt" thì bắt buộc nhập lý do trước khi submit lên server
                              if (nextChecked === false) {
                                reasonForm.resetFields();
                                setAbsentTarget({
                                  name: p.name,
                                  type: p.type,
                                  passengerIndex: p.passengerIndex,
                                  day: openPoint.day,
                                  checkpointIndex: openPoint.checkpointIndex,
                                });
                                return;
                              }

                              // Có mặt: submit luôn
                              checkInMutation.mutate({
                                type: p.type,
                                passengerIndex: p.passengerIndex,
                                day: openPoint.day,
                                checkpointIndex: openPoint.checkpointIndex,
                                checked: true,
                              });
                            }}
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
                              ) : absent ? (
                                <Tag color="red" style={{ marginLeft: 8 }}>
                                  Vắng mặt
                                </Tag>
                              ) : (
                                <Tag color="default" style={{ marginLeft: 8 }}>
                                  Vắng mặt
                                </Tag>
                              )}
                            </span>
                          }
                          description={
                            <div>
                              {phone ? <div>{phone}</div> : null}
                              {absent && reason ? (
                                <div style={{ marginTop: 6, color: "#6b7280", fontStyle: "italic" }}>
                                  Lý do: {reason}
                                </div>
                              ) : null}
                            </div>
                          }
                        />
                      </List.Item>
                    );
                  }}
                />
              </div>
            )}
          </Modal>

          <Modal
            title={`Lý do vắng mặt: ${absentTarget?.name}`}
            open={!!absentTarget}
            onCancel={() => setAbsentTarget(null)}
            onOk={() => reasonForm.submit()}
            confirmLoading={checkInMutation.isPending}
            okText="Xác nhận vắng mặt"
            cancelText="Hủy"
          >
            <Form
              form={reasonForm}
              layout="vertical"
              onFinish={(values) => {
                checkInMutation.mutate({
                  ...absentTarget,
                  checked: false,
                  reason: values.reason
                });
                setAbsentTarget(null);
              }}
            >
              <Form.Item name="reason" label="Vui lòng nhập lý do vắng mặt" rules={[{ required: true, message: 'Lý do là bắt buộc khi khách vắng mặt!' }]}>
                <Input.TextArea rows={3} placeholder="Ví dụ: Khách bị ốm, khách tự di chuyển..." />
              </Form.Item>
            </Form>
          </Modal>
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
          <div style={{ maxWidth: 720 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
              <Text type="secondary">Ngày:</Text>
              <Segmented
                value={selectedDiaryDayIndex}
                onChange={(v) => setSelectedDiaryDayIndex(Number(v))}
                options={diaryDays.map((d, idx) => ({
                  label: `Ngày ${idx + 1} (${d.format("DD/MM")})`,
                  value: idx,
                }))}
              />
              {selectedDiaryEntry && !isDiaryEditing ? (
                <Button onClick={() => setIsDiaryEditing(true)}>Sửa</Button>
              ) : null}
            </div>

            {isDiaryEditing ? (
              <Form
                form={diaryForm}
                layout="vertical"
                onFinish={(values) => {
                  const date = selectedDiaryDate
                    ? selectedDiaryDate.toISOString()
                    : dayjs(booking.startDate).toISOString();
                  const images = (diaryFileList || [])
                    .map((f: any) => ({ name: f.name, url: f.url || f.thumbUrl }))
                    .filter((x: any) => typeof x.url === "string" && x.url.length > 0);
                  addDiaryMutation.mutate({
                    date,
                    day_no: selectedDiaryDayNo,
                    title: values.title || "",
                    content: values.content || "",
                    highlight: values.highlight || "",
                    images,
                  });
                }}
              >
                <Form.Item name="title" label="Tiêu đề">
                  <Input />
                </Form.Item>

                <Form.Item
                  name="content"
                  label="Nội dung"
                  rules={[{ required: true, message: "Vui lòng nhập nội dung" }]}
                >
                  <TextArea rows={8} placeholder="Nhập nội dung..." />
                </Form.Item>

                <Form.Item name="highlight" label="Highlight">
                  <TextArea rows={3} placeholder="- ..." />
                </Form.Item>

                <Form.Item label="Ảnh">
                  <Upload
                    listType="picture-card"
                    fileList={diaryFileList}
                    maxCount={5}
                    onChange={({ fileList }) => setDiaryFileList(fileList)}
                    beforeUpload={async (file) => {
                      const maxRawMb = 6;
                      if ((file as any).size && (file as any).size > maxRawMb * 1024 * 1024) {
                        message.error(`Ảnh quá lớn (>${maxRawMb}MB). Vui lòng chọn ảnh nhỏ hơn.`);
                        return Upload.LIST_IGNORE as any;
                      }
                      const url = await resizeImageToDataUrl(file as any, 1280, 1280, 0.75);
                      setDiaryFileList((prev) => [
                        ...prev,
                        { uid: (file as any).uid, name: file.name, status: "done", url },
                      ]);
                      return false;
                    }}
                    onRemove={(file) => {
                      setDiaryFileList((prev) => prev.filter((x: any) => x.uid !== file.uid));
                    }}
                  >
                    + Upload
                  </Upload>
                </Form.Item>

                <Button type="primary" htmlType="submit" loading={addDiaryMutation.isPending}>
                  Lưu
                </Button>
              </Form>
            ) : selectedDiaryEntry ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {selectedDiaryEntry.title ? (
                  <Text style={{ fontWeight: 600, color: "#111827" }}>{selectedDiaryEntry.title}</Text>
                ) : null}
                {selectedDiaryEntry.content ? (
                  <div style={{ whiteSpace: "pre-wrap" }}>{selectedDiaryEntry.content}</div>
                ) : null}
                {selectedDiaryEntry.highlight ? (
                  <div style={{ whiteSpace: "pre-wrap", color: "#6b7280" }}>{selectedDiaryEntry.highlight}</div>
                ) : null}
                {Array.isArray(selectedDiaryEntry.images) && selectedDiaryEntry.images.length > 0 ? (
                  <Image.PreviewGroup>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {selectedDiaryEntry.images.slice(0, 8).map((img: any, i: number) => (
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
              </div>
            ) : (
              <Empty description={`Chưa có nhật kí cho Ngày ${selectedDiaryDayNo}`} />
            )}
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
