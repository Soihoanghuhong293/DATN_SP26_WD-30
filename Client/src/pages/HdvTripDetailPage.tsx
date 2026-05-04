import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  Alert,
  Button,
  Card,
  Empty,
  Form,
  Image,
  Input,
  List,
  message,
  Modal,
  Popconfirm,
  Segmented,
  Select,
  Space,
  Spin,
  Steps,
  Switch,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  Upload,
} from "antd";
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CheckOutlined,
  PhoneOutlined,
  RightOutlined,
  RocketOutlined,
  SwapOutlined,
  SyncOutlined,
  UserOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { ADMIN_PENDING_HDV_LEAVE_COUNT_KEY } from "../components/layout/AdminSidebar";

const { Title, Text } = Typography;
const { TextArea } = Input;

const API_V1 = (import.meta as any)?.env?.VITE_API_URL || "http://localhost:5000/api/v1";
const BOOKINGS_API = `${API_V1}/bookings`;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
});

/** Tránh url/thumbUrl "" → img src="" (React cảnh báo). */
const sanitizeUploadFileList = (fileList: any[]) =>
  fileList.map((f: any) => {
    const next = { ...f };
    if (typeof next.url === "string" && !next.url.trim()) delete next.url;
    if (typeof next.thumbUrl === "string" && !next.thumbUrl.trim()) delete next.thumbUrl;
    return next;
  });

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
  return canvas.toDataURL("image/jpeg", quality);
};

type DisplayRow = {
  key: string;
  bookingId: string;
  name: string;
  phone?: string;
  role: string;
  type: "leader" | "passenger";
  passengerIndex?: number;
  /** Người đặt / đại diện đơn — không điểm danh checkpoint */
  skipCheckin?: boolean;
};

type AbsentPayload = {
  bookingId: string;
  name: string;
  type: "leader" | "passenger";
  passengerIndex?: number;
  day: number;
  checkpointIndex: number;
};

type HdvLeaveTripResolution = {
  outcome: "replaced" | "rejected";
  message: string;
  replacement_user_name?: string;
  rejection_note?: string;
  admin_note?: string;
  processed_at?: string;
};

type HdvLeaveTripState = {
  pending: Record<string, unknown> | null;
  resolution: HdvLeaveTripResolution | null;
};

export default function HdvTripDetailPage() {
  const { tourId, date } = useParams<{ tourId: string; date: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const dateStr = date ? dayjs(date).format("YYYY-MM-DD") : "";

  const [openPoint, setOpenPoint] = useState<{
    day: number;
    checkpointIndex: number;
    title: string;
  } | null>(null);
  const [diaryForm] = Form.useForm();
  const [diaryFileList, setDiaryFileList] = useState<any[]>([]);
  const [selectedDiaryDayIndex, setSelectedDiaryDayIndex] = useState(0);
  const [isDiaryEditing, setIsDiaryEditing] = useState(true);
  const [absentTarget, setAbsentTarget] = useState<AbsentPayload | null>(null);
  const [reasonForm] = Form.useForm();
  const [leaveForm] = Form.useForm();
  const [activeCheckpointDay, setActiveCheckpointDay] = useState("1");
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);

  const { data: guideBookings = [], isLoading: listLoading } = useQuery({
    queryKey: ["hdv-guide-me-bookings"],
    queryFn: async () =>
      (await axios.get(`${BOOKINGS_API}/guide/me`, getAuthHeader())).data?.data || [],
  });

  const tripBookings = useMemo(() => {
    return (guideBookings as any[]).filter((b) => {
      const tid = String(b?.tour_id?._id || b?.tour_id || "");
      const ds = b?.startDate ? dayjs(b.startDate).format("YYYY-MM-DD") : "";
      return tid === String(tourId || "") && ds === dateStr;
    });
  }, [guideBookings, tourId, dateStr]);

  const primaryId = useMemo(() => {
    if (!tripBookings.length) return undefined as string | undefined;
    const sorted = [...tripBookings].sort((a, b) => String(a._id).localeCompare(String(b._id)));
    return String(sorted[0]._id);
  }, [tripBookings]);

  const { data: assignmentGuardData, isPending: assignmentGuardLoading } = useQuery({
    queryKey: ["hdv-trip-allocation-guard", tourId, dateStr],
    queryFn: async () =>
      (await axios.get(`${API_V1}/tours/${tourId}/trips/${dateStr}/assignment`, getAuthHeader())).data
        ?.data,
    enabled: !!tourId && !!dateStr,
  });

  const { data: myGuideProfile } = useQuery({
    queryKey: ["hdv-guide-profile"],
    queryFn: async () =>
      (await axios.get(`${API_V1}/guides/me`, getAuthHeader())).data?.data?.guide || null,
  });

  const myUserId = String((myGuideProfile as any)?.user_id?._id || (myGuideProfile as any)?.user_id || "");

  const { data: guidesForReplacement = [], isPending: guidesReplacementLoading } = useQuery({
    queryKey: ["hdv-guides-for-replacement", myUserId],
    queryFn: async () => {
      const res = await axios.get(`${API_V1}/guides`, { ...getAuthHeader(), params: { limit: 100, page: 1 } });
      const list = res.data?.data?.guides || res.data?.guides || [];
      return Array.isArray(list) ? list : [];
    },
    enabled: leaveModalOpen,
  });

  const replacementGuideOptions = useMemo(() => {
    return (guidesForReplacement as any[])
      .filter((g) => {
        const uid = String(g?.user_id?._id || g?.user_id || "");
        if (myUserId && uid === myUserId) return false;
        const st = g?.user_id?.status;
        if (st === "inactive") return false;
        return true;
      })
      .map((g) => ({
        value: String(g._id),
        label: String(g.name || g.email || "HDV"),
      }));
  }, [guidesForReplacement, myUserId]);

  const { data: leaveTripState } = useQuery({
    queryKey: ["hdv-leave-request-trip", tourId, dateStr],
    queryFn: async (): Promise<HdvLeaveTripState> => {
      const res = await axios.get(`${API_V1}/guide-leave-requests/me/for-trip`, {
        ...getAuthHeader(),
        params: { tour_id: tourId, trip_date: dateStr },
      });
      const raw = res.data?.data;
      if (raw && typeof raw === "object" && ("pending" in raw || "resolution" in raw)) {
        return {
          pending: ((raw as HdvLeaveTripState).pending as Record<string, unknown>) ?? null,
          resolution: ((raw as HdvLeaveTripState).resolution as HdvLeaveTripResolution) ?? null,
        };
      }
      if (raw && typeof raw === "object" && (raw as { status?: string }).status === "pending") {
        return { pending: raw as Record<string, unknown>, resolution: null };
      }
      return { pending: null, resolution: null };
    },
    enabled: Boolean(tourId && dateStr),
  });

  const pendingLeaveRequest = leaveTripState?.pending ?? null;
  const leaveResolution = leaveTripState?.resolution ?? null;
  const leaveReplaced = leaveResolution?.outcome === "replaced";

  const submitLeaveRequestMutation = useMutation({
    mutationFn: async (payload: { reason: string; proposedGuideId?: string }) => {
      await axios.post(
        `${API_V1}/guide-leave-requests`,
        {
          tour_id: tourId,
          trip_date: dateStr,
          reason: payload.reason,
          proposed_replacement_guide_id: payload.proposedGuideId || undefined,
        },
        getAuthHeader()
      );
    },
    onSuccess: () => {
      message.success("Đã gửi yêu cầu. Trạng thái: Pending — chờ admin xử lý.");
      queryClient.invalidateQueries({ queryKey: ["hdv-leave-request-trip", tourId, dateStr] });
      queryClient.invalidateQueries({ queryKey: ["hdv-guide-me-bookings"] });
      queryClient.invalidateQueries({ queryKey: ADMIN_PENDING_HDV_LEAVE_COUNT_KEY });
      setLeaveModalOpen(false);
      leaveForm.resetFields();
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || "Gửi yêu cầu thất bại.");
    },
  });

  const tripAllocationIncomplete = useMemo(() => {
    const ps = Array.isArray(assignmentGuardData?.passengers) ? assignmentGuardData.passengers : [];
    if (ps.length === 0) return false;
    return ps.some((p: any) => !p?.seat || !p?.room);
  }, [assignmentGuardData]);

  const { data: primaryBooking, isLoading: detailLoading } = useQuery({
    queryKey: ["hdv-trip-primary", primaryId],
    queryFn: async () =>
      (await axios.get(`${BOOKINGS_API}/guide/${primaryId}`, getAuthHeader())).data?.data,
    enabled: !!primaryId,
  });

  const booking = primaryBooking as any;
  const tour = booking?.tour_id || (tripBookings[0] as any)?.tour_id;
  const schedule = Array.isArray(tour?.schedule) ? tour.schedule : [];
  const scheduleDetail = booking?.schedule_detail || "";

  const bookingById = useMemo(() => {
    const m = new Map<string, any>();
    (tripBookings as any[]).forEach((b) => m.set(String(b._id), b));
    return m;
  }, [tripBookings]);

  const displayList: DisplayRow[] = useMemo(() => {
    const rows: DisplayRow[] = [];
    (tripBookings as any[]).forEach((bk: any) => {
      const plist = Array.isArray(bk.passengers) ? bk.passengers : [];
      if (!plist.length) {
        rows.push({
          key: `leader-${bk._id}`,
          bookingId: String(bk._id),
          name: bk.customer_name,
          phone: bk.customer_phone,
          role: "",
          type: "leader",
          skipCheckin: true,
        });
        return;
      }
      const leaderIdx = plist.findIndex(
        (p: any) =>
          p?.is_leader === true || p?.isLeader === true || p?.is_representative === true
      );
      plist.forEach((p: any, i: number) => {
        const skipCheckin =
          (leaderIdx >= 0 && i === leaderIdx) || (leaderIdx < 0 && i === 0);
        rows.push({
          key: `p-${bk._id}-${i}`,
          bookingId: String(bk._id),
          name: p.name || p.full_name || `Khách ${i + 1}`,
          phone: p.phone || p.phoneNumber,
          role: "",
          type: "passenger",
          passengerIndex: i,
          skipCheckin,
        });
      });
    });
    return rows;
  }, [tripBookings]);

  const checkinEligibleList = useMemo(
    () => displayList.filter((r) => !r.skipCheckin),
    [displayList]
  );

  const totalPax = useMemo(
    () => (tripBookings as any[]).reduce((s, b) => s + Number(b?.groupSize || 0), 0),
    [tripBookings]
  );

  const updateStageMutation = useMutation({
    mutationFn: async (tour_stage: string) => {
      const res = await axios.patch(
        `${BOOKINGS_API}/guide/${primaryId}/stage`,
        { tour_stage },
        getAuthHeader()
      );
      return res.data;
    },
    onSuccess: (_, stage) => {
      const label =
        stage === "scheduled"
          ? "Sắp khởi hành"
          : stage === "in_progress"
            ? "Đang diễn ra"
            : "Đã kết thúc";
      message.success(`Đã cập nhật: ${label}`);
      queryClient.invalidateQueries({ queryKey: ["hdv-trip-primary", primaryId] });
      queryClient.invalidateQueries({ queryKey: ["hdv-guide-me-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["hdv-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["hdv-bookings-for-trip-list"] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || "Cập nhật trạng thái thất bại.");
    },
  });

  const checkInMutation = useMutation({
    mutationFn: async (
      payload: {
        bookingId: string;
        type: string;
        passengerIndex?: number;
        day?: number;
        checkpointIndex?: number;
        checked: boolean;
        reason?: string;
      }
    ) => {
      const { bookingId, ...body } = payload;
      await axios.patch(`${BOOKINGS_API}/guide/${bookingId}/checkin`, body, getAuthHeader());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hdv-guide-me-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["hdv-trip-primary", primaryId] });
      queryClient.invalidateQueries({ queryKey: ["hdv-bookings"] });
    },
    onError: (err: any) => {
      const code = err?.code;
      const msg = String(err?.message || "");
      const noResponse = !err?.response;
      if (code === "ERR_NETWORK" || msg.includes("Network Error") || msg.includes("CONNECTION_REFUSED")) {
        message.error(
          "Không kết nối được máy chủ API. Hãy chạy backend (ví dụ cổng 5000) hoặc kiểm tra biến VITE_API_URL."
        );
        return;
      }
      message.error(err?.response?.data?.message || "Điểm danh thất bại.");
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
      await axios.patch(`${BOOKINGS_API}/guide/${primaryId}/diary`, payload, getAuthHeader());
    },
    onSuccess: () => {
      message.success("Đã lưu nhật kí");
      setIsDiaryEditing(false);
      queryClient.invalidateQueries({ queryKey: ["hdv-trip-primary", primaryId] });
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || "Lưu nhật kí thất bại");
    },
  });

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
    const sameDay = entries.filter((e: any) => Number(e?.day_no || 1) === Number(selectedDiaryDayNo));
    sameDay.sort(
      (a: any, b: any) =>
        dayjs(b.updated_at || b.created_at || b.date).valueOf() -
        dayjs(a.updated_at || a.created_at || a.date).valueOf()
    );
    return sameDay[0] || null;
  }, [booking?.diary_entries, selectedDiaryDayNo]);

  useEffect(() => {
    setIsDiaryEditing(!selectedDiaryEntry);
    const imgs = Array.isArray(selectedDiaryEntry?.images) ? selectedDiaryEntry.images : [];
    setDiaryFileList(
      imgs
        .filter((img: any) => typeof img?.url === "string" && String(img.url).trim().length > 0)
        .map((img: any, idx: number) => ({
          uid: `${selectedDiaryDayNo}-${idx}`,
          name: img?.name || `image-${idx + 1}`,
          status: "done",
          url: img.url,
        }))
    );
  }, [selectedDiaryDayNo, selectedDiaryEntry]);

  useEffect(() => {
    if (!isDiaryEditing) return;
    diaryForm.setFieldsValue({
      title: selectedDiaryEntry?.title || "",
      content: selectedDiaryEntry?.content || "",
      highlight: selectedDiaryEntry?.highlight || "",
    });
  }, [isDiaryEditing, diaryForm, selectedDiaryDayNo, selectedDiaryEntry]);

  const tourStage = booking?.tour_stage || "scheduled";
  const canCheckin = tourStage === "in_progress";

  const checkpointDays = useMemo(() => {
    if (!Array.isArray(schedule) || schedule.length === 0) return [];
    return schedule
      .map((d: any, idx: number) => ({
        day: Number(d?.day ?? idx + 1),
        title: d?.title || `Ngày ${idx + 1}`,
        checkpoints: Array.isArray(d?.activities)
          ? d.activities.filter((x: any) => typeof x === "string" && x.trim().length > 0)
          : [],
      }))
      .sort((a: any, b: any) => a.day - b.day);
  }, [schedule]);

  const getCheckpointStatus = (
    bk: any,
    day: number,
    cpIndex: number,
    type: "leader" | "passenger",
    passengerIdx?: number
  ) => {
    const checkpointCheckins = bk?.checkpoint_checkins || {};
    const d = checkpointCheckins[String(day)];
    const cp = d?.[String(cpIndex)];
    if (!cp) return undefined;
    if (type === "leader") return cp.leader;
    if (typeof passengerIdx !== "number") return undefined;
    return cp.passengers?.[passengerIdx];
  };

  const getRowCheckpointStatus = (row: DisplayRow, day: number, cpIndex: number) => {
    const bk = bookingById.get(row.bookingId);
    if (!bk) return undefined;
    return getCheckpointStatus(bk, day, cpIndex, row.type, row.passengerIndex);
  };

  const isCheckpointFinishedForBooking = (bk: any, dayNum: number, cpIdx: number) => {
    const dayData = checkpointDays.find((d) => d.day === dayNum);
    if (!dayData) return true;
    if (cpIdx < 0 || cpIdx >= (dayData.checkpoints?.length || 0)) return true;
    const plist = bk.passengers || [];
    const checkpointCheckins = bk.checkpoint_checkins || {};
    const cp = checkpointCheckins?.[String(dayNum)]?.[String(cpIdx)];
    if (!cp) return false;
    if (!plist.length) {
      // Chỉ có người đặt tour, không có danh sách khách đi kèm — không bắt buộc điểm danh người đặt
      return true;
    }
    const leaderIdx = plist.findIndex(
      (p: any) =>
        p?.is_leader === true || p?.isLeader === true || p?.is_representative === true
    );
    return plist.every((_: any, pIdx: number) => {
      const skip =
        (leaderIdx >= 0 && pIdx === leaderIdx) || (leaderIdx < 0 && pIdx === 0);
      if (skip) return true;
      const status = cp.passengers?.[pIdx];
      if (status === undefined) return false;
      return status === true || (status === false && cp.reasons?.passengers?.[pIdx]);
    });
  };

  const isCheckpointFinished = (dayNum: number, cpIdx: number) =>
    (tripBookings as any[]).every((bk) => isCheckpointFinishedForBooking(bk, dayNum, cpIdx));

  const isDayFinished = (dayNum: number) => {
    const dayData = checkpointDays.find((d) => d.day === dayNum);
    if (!dayData) return true;
    return dayData.checkpoints.every((_: any, cpIdx: number) =>
      isCheckpointFinished(dayNum, cpIdx)
    );
  };

  const allCheckpointDaysFinished = checkpointDays.every((d: any) => isDayFinished(d.day));

  const LEGACY_PAYMENT_MAP: Record<string, string> = {
    pending: "unpaid",
    confirmed: "unpaid",
    deposit: "deposit",
    paid: "paid",
    refunded: "unpaid",
    cancelled: "unpaid",
  };
  const effectivePaymentStatus = (b: any) =>
    b?.payment_status || LEGACY_PAYMENT_MAP[String(b?.status)] || "unpaid";

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

    if (nextStageKey === "in_progress") {
      for (const bk of tripBookings as any[]) {
        if (effectivePaymentStatus(bk) !== "paid") {
          const label = bk.customer_name ? ` (${bk.customer_name})` : "";
          return {
            ok: false,
            reason: `Không thể bắt đầu chuyến: có đơn${label} chưa thanh toán đủ (yêu cầu: Đã thanh toán).`,
          } as const;
        }
        if (String(bk.customer_info_status || "") !== "COMPLETED") {
          const label = bk.customer_name ? ` (${bk.customer_name})` : "";
          return {
            ok: false,
            reason: `Không thể bắt đầu chuyến: có đơn${label} chưa nhập đủ danh sách khách.`,
          } as const;
        }
      }
      if (assignmentGuardLoading) {
        return {
          ok: false,
          reason: "Đang kiểm tra xếp xe và phòng khách sạn…",
        } as const;
      }
      if (tripAllocationIncomplete) {
        return {
          ok: false,
          reason:
            "Chưa xếp đủ ghế xe hoặc phòng khách sạn cho mọi khách. Vui lòng hoàn tất trên trang lệnh điều động.",
        } as const;
      }
    }

    if (nextStageKey === "completed" && checkpointDays.length > 0 && !allCheckpointDaysFinished) {
      return {
        ok: false,
        reason:
          "Bắt buộc điểm danh đủ tất cả các ngày và lịch trình (mọi đơn trong trip) trước khi kết thúc tour.",
      } as const;
    }

    return { ok: true, label: nextStage.label as string };
  };

  if (!tourId || !dateStr) return null;

  const loading = listLoading || (!!primaryId && detailLoading);

  if (loading && !tripBookings.length) {
    return (
      <div style={{ textAlign: "center", padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!tripBookings.length) {
    return (
      <div>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate("/hdv/assigned-trips")}
          style={{ marginBottom: 24 }}
        >
          Quay lại
        </Button>
        <Empty description="Không có booking nào cho trip này" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div style={{ textAlign: "center", padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

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
      forceRender: true,
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
                          const totalChecked = checkinEligibleList.filter(
                            (row) => getRowCheckpointStatus(row, d.day, cpIndex) === true
                          ).length;
                          return {
                            cp,
                            cpIndex,
                            totalChecked,
                            totalPeople: checkinEligibleList.length,
                          };
                        })}
                        renderItem={(item: any) => {
                          const isLockedByPrevCheckpoint =
                            item.cpIndex > 0 && !isCheckpointFinished(d.day, item.cpIndex - 1);
                          const disabled = !canCheckin || isLockedByPrevCheckpoint;
                          return (
                            <List.Item
                              style={{
                                background: "#fff",
                                border: "1px solid #eef2f7",
                                borderRadius: 12,
                                padding: "12px 14px",
                                marginBottom: 10,
                                boxShadow: "0 6px 16px rgba(0,0,0,0.06)",
                                cursor: disabled ? "not-allowed" : "pointer",
                                opacity: disabled ? 0.6 : 1,
                              }}
                              onClick={() =>
                                !disabled
                                  ? setOpenPoint({
                                      day: d.day,
                                      checkpointIndex: item.cpIndex,
                                      title: item.cp,
                                    })
                                  : isLockedByPrevCheckpoint
                                    ? message.warning(
                                        `Bạn cần điểm danh xong lịch trình ${item.cpIndex} trước khi điểm danh lịch trình ${item.cpIndex + 1}.`
                                      )
                                    : message.warning(
                                        tourStage === "completed"
                                          ? "Tour đã kết thúc nên không thể điểm danh."
                                          : "Tour đang ở trạng thái sắp khởi hành nên chưa thể điểm danh."
                                      )
                              }
                              actions={[
                                <Tag
                                  key="count"
                                  color={item.totalChecked === item.totalPeople ? "green" : "blue"}
                                  style={{ margin: 0 }}
                                >
                                  {item.totalChecked}/{item.totalPeople} có mặt
                                </Tag>,
                                <RightOutlined key="go" style={{ color: "#9ca3af" }} />,
                              ]}
                            >
                              <div style={{ fontWeight: 700, color: "#111827" }}>{item.cp}</div>
                            </List.Item>
                          );
                        }}
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
                    {
                      checkinEligibleList.filter(
                        (row) => getRowCheckpointStatus(row, openPoint.day, openPoint.checkpointIndex) === true
                      ).length
                    }
                    /{checkinEligibleList.length} có mặt
                  </Tag>
                </div>
                <List
                  dataSource={displayList}
                  renderItem={(row) => {
                    const skip = !!row.skipCheckin;
                    const status = getRowCheckpointStatus(row, openPoint.day, openPoint.checkpointIndex);
                    const checked = status === true;
                    const absent = status === false;
                    const bk = bookingById.get(row.bookingId);
                    const cpData = bk?.checkpoint_checkins?.[String(openPoint.day)]?.[
                      String(openPoint.checkpointIndex)
                    ];
                    const reason =
                      row.type === "leader"
                        ? cpData?.reasons?.leader
                        : cpData?.reasons?.passengers?.[row.passengerIndex!];
                    const phone =
                      row.type === "leader"
                        ? bk?.customer_phone
                        : bk?.passengers?.[row.passengerIndex!]?.phone;

                    return (
                      <List.Item
                        actions={
                          skip
                            ? phone
                              ? [
                                  <Button
                                    key="call"
                                    size="small"
                                    icon={<PhoneOutlined />}
                                    href={`tel:${phone}`}
                                  >
                                    Gọi
                                  </Button>,
                                ]
                              : []
                            : [
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
                                      setAbsentTarget({
                                        bookingId: row.bookingId,
                                        name: row.name,
                                        type: row.type,
                                        passengerIndex: row.passengerIndex,
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
                                    if (nextChecked === false) {
                                      setAbsentTarget({
                                        bookingId: row.bookingId,
                                        name: row.name,
                                        type: row.type,
                                        passengerIndex: row.passengerIndex,
                                        day: openPoint.day,
                                        checkpointIndex: openPoint.checkpointIndex,
                                      });
                                      return;
                                    }
                                    checkInMutation.mutate({
                                      bookingId: row.bookingId,
                                      type: row.type,
                                      passengerIndex: row.passengerIndex,
                                      day: openPoint.day,
                                      checkpointIndex: openPoint.checkpointIndex,
                                      checked: true,
                                    });
                                  }}
                                  loading={checkInMutation.isPending}
                                  checkedChildren="Có mặt"
                                  unCheckedChildren="Vắng mặt"
                                />,
                              ].filter(Boolean)
                        }
                      >
                        <List.Item.Meta
                          avatar={
                            <div
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: "50%",
                                background: !skip && checked ? "#10b981" : "#e5e7eb",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              {!skip && checked ? (
                                <CheckCircleOutlined style={{ color: "white", fontSize: 18 }} />
                              ) : (
                                <UserOutlined style={{ color: "#6b7280" }} />
                              )}
                            </div>
                          }
                          title={
                            <span>
                              {row.name}
                              {row.role ? (
                                <Tag color="blue" style={{ marginLeft: 8 }}>
                                  {row.role}
                                </Tag>
                              ) : null}
                              {skip ? null : checked ? (
                                <Tag color="green" style={{ marginLeft: 8 }}>
                                  Có mặt
                                </Tag>
                              ) : absent ? (
                                <Tag color="red" style={{ marginLeft: 8 }}>
                                  Vắng mặt
                                </Tag>
                              ) : (
                                <Tag color="default" style={{ marginLeft: 8 }}>
                                  Chưa điểm danh
                                </Tag>
                              )}
                            </span>
                          }
                          description={
                            <div>
                              {phone ? <div>{phone}</div> : null}
                              {!skip && absent && reason ? (
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
            zIndex={2000}
            maskClosable={false}
            destroyOnClose
            afterOpenChange={(open) => {
              if (open) reasonForm.resetFields();
            }}
          >
            <Form
              form={reasonForm}
              layout="vertical"
              onFinish={(values) => {
                if (!absentTarget) return;
                checkInMutation.mutate(
                  {
                    ...absentTarget,
                    checked: false,
                    reason: values.reason,
                  },
                  {
                    onSuccess: () => setAbsentTarget(null),
                  }
                );
              }}
            >
              <Form.Item
                name="reason"
                label="Vui lòng nhập lý do vắng mặt"
                rules={[{ required: true, message: "Lý do là bắt buộc khi khách vắng mặt!" }]}
              >
                <Input.TextArea rows={3} placeholder="Ví dụ: Khách bị ốm, khách tự di chuyển..." />
              </Form.Item>
            </Form>
          </Modal>
        </Card>
      ),
    },
    {
      key: "logs",
      forceRender: true,
      label: (
        <span>
          <SyncOutlined /> Nhật kí tour
        </span>
      ),
      children: (
        <Card>
          <div style={{ maxWidth: 720 }}>
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                flexWrap: "wrap",
                marginBottom: 12,
              }}
            >
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
                    onChange={({ fileList }) => setDiaryFileList(sanitizeUploadFileList(fileList as any[]))}
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
                {Array.isArray(selectedDiaryEntry.images) &&
                selectedDiaryEntry.images.some(
                  (img: any) => typeof img?.url === "string" && String(img.url).trim().length > 0
                ) ? (
                  <Image.PreviewGroup>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {selectedDiaryEntry.images
                        .filter(
                          (img: any) => typeof img?.url === "string" && String(img.url).trim().length > 0
                        )
                        .slice(0, 8)
                        .map((img: any, i: number) => (
                          <Image
                            key={`${img.url}-${i}`}
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
        onClick={() => navigate("/hdv/assigned-trips")}
        style={{ marginBottom: 24 }}
      >
        Quay lại
      </Button>

      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ marginBottom: 4 }}>
          {tour?.name || "Chi tiết trip"}
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
                  if (!isNext) {
                    return (v as any)?.reason ? (
                      <Tooltip title={(v as any).reason}>
                        <span>{btn}</span>
                      </Tooltip>
                    ) : (
                      btn
                    );
                  }

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

        <div
          style={{
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Space size={[8, 8]} wrap align="center">
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
            {pendingLeaveRequest ? (
              <Tooltip
                title={`Yêu cầu nghỉ / thay HDV đã gửi — chờ admin xử lý.${
                  (() => {
                    const p = (pendingLeaveRequest as any)?.proposed_replacement_user_id;
                    const name = p && typeof p === "object" ? p.name : "";
                    return name ? ` Đề xuất: ${name}.` : "";
                  })()
                }`}
              >
                <Tag color="gold" style={{ fontWeight: 600 }}>
                  Pending
                </Tag>
              </Tooltip>
            ) : leaveResolution ? (
              leaveResolution.outcome === "replaced" ? (
                <Tooltip
                  title={
                    leaveResolution.replacement_user_name
                      ? `${leaveResolution.message} HDV phụ trách hiện tại: ${leaveResolution.replacement_user_name}.`
                      : leaveResolution.message
                  }
                >
                  <Tag color="green" style={{ fontWeight: 600 }}>
                    Replaced
                  </Tag>
                </Tooltip>
              ) : (
                <Tooltip
                  title={
                    leaveResolution.rejection_note
                      ? `${leaveResolution.message} Lý do: ${leaveResolution.rejection_note}`
                      : leaveResolution.message
                  }
                >
                  <Tag color="red" style={{ fontWeight: 600 }}>
                    Từ chối
                  </Tag>
                </Tooltip>
              )
            ) : null}
            <Text>
              {tripBookings.length} đơn · {totalPax} khách
            </Text>
          </Space>
          <Tooltip
            title={
              tourStage === "completed"
                ? "Tour đã kết thúc, không thể báo nghỉ."
                : pendingLeaveRequest
                  ? "Bạn đã gửi yêu cầu — trạng thái Pending."
                  : leaveReplaced
                    ? "Yêu cầu đã được duyệt (Replaced). Bạn không còn phụ trách trip này."
                    : "Báo không thể dẫn tour và đề xuất HDV thay thế (nếu có)."
            }
          >
            <Button
              icon={<SwapOutlined />}
              onClick={() => {
                leaveForm.resetFields();
                setLeaveModalOpen(true);
              }}
              disabled={tourStage === "completed" || !!pendingLeaveRequest || leaveReplaced}
            >
              Báo nghỉ / Đề xuất thay
            </Button>
          </Tooltip>
        </div>
        {leaveResolution ? (
          <Alert
            style={{ marginTop: 14 }}
            type={leaveResolution.outcome === "replaced" ? "success" : "warning"}
            showIcon
            message={
              leaveResolution.outcome === "replaced"
                ? "Admin đã duyệt — trạng thái Replaced"
                : "Admin đã từ chối yêu cầu"
            }
            description={
              <div style={{ marginTop: 4 }}>
                <div>{leaveResolution.message}</div>
                {leaveResolution.outcome === "replaced" && leaveResolution.replacement_user_name ? (
                  <div style={{ marginTop: 6 }}>
                    <Text strong>HDV phụ trách trip: </Text>
                    {leaveResolution.replacement_user_name}
                  </div>
                ) : null}
                {leaveResolution.outcome === "rejected" && leaveResolution.rejection_note ? (
                  <div style={{ marginTop: 6 }}>
                    <Text strong>Lý do: </Text>
                    {leaveResolution.rejection_note}
                  </div>
                ) : null}
                {leaveResolution.admin_note ? (
                  <div style={{ marginTop: 6 }}>
                    <Text strong>Ghi chú admin: </Text>
                    {leaveResolution.admin_note}
                  </div>
                ) : null}
              </div>
            }
          />
        ) : null}
      </div>

      <Tabs items={tabItems} />

      <Modal
        title="Báo nghỉ / Đề xuất HDV thay thế"
        open={leaveModalOpen}
        okText="Gửi yêu cầu"
        cancelText="Hủy"
        destroyOnClose
        width={520}
        confirmLoading={submitLeaveRequestMutation.isPending}
        onCancel={() => {
          setLeaveModalOpen(false);
          leaveForm.resetFields();
        }}
        onOk={async () => {
          try {
            const v = await leaveForm.validateFields();
            if (!tourId || !dateStr) return;
            const gid = v.proposedGuideId as string | undefined;
            await submitLeaveRequestMutation.mutateAsync({
              reason: String(v.reason || "").trim(),
              proposedGuideId: gid || undefined,
            });
          } catch {
            /* validateFields hoặc mutation */
          }
        }}
      >
        <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
          Vui lòng mô tả rõ lý do (bắt buộc) để admin xem xét và xử lý nhanh. Bạn có thể đề xuất HDV thay thế. Sau khi
          gửi, yêu cầu sẽ ở trạng thái Pending cho đến khi được duyệt.
        </Text>
        <Form form={leaveForm} layout="vertical">
          <Form.Item
            name="reason"
            label="Lý do"
            rules={[{ required: true, message: "Vui lòng nhập lý do" }]}
          >
            <TextArea
              rows={4}
              maxLength={2000}
              showCount
              placeholder="Ví dụ: ốm đột xuất, trùng lịch cá nhân…"
            />
          </Form.Item>
          <Form.Item name="proposedGuideId" label="HDV thay thế (tuỳ chọn)">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Chọn HDV đề xuất (có thể bỏ trống)"
              options={replacementGuideOptions}
              loading={guidesReplacementLoading}
              notFoundContent={guidesReplacementLoading ? <Spin size="small" /> : "Không có HDV khác trong danh sách"}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
