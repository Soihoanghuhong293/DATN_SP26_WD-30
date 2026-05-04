import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Button,
  Card,
  DatePicker,
  Empty,
  Input,
  message,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { CarOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import "./HdvTours.css";

const { Text } = Typography;
const { RangePicker } = DatePicker;

const API_V1 =
  (import.meta as any)?.env?.VITE_API_URL || "http://localhost:5000/api/v1";
const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
});

function tripEndMs(startYmd: string, durationDays?: number, endDate?: string): number {
  if (!startYmd) return 0;
  const end = endDate
    ? dayjs(endDate).endOf("day")
    : durationDays != null && Number.isFinite(Number(durationDays))
      ? dayjs(startYmd).add(Math.max(1, Math.floor(Number(durationDays))) - 1, "day").endOf("day")
      : dayjs(startYmd).endOf("day");
  return end.valueOf();
}

function effectiveTripStage(
  startYmd: string,
  durationDays: number | undefined,
  stages: string[],
  endMs: number
): "scheduled" | "in_progress" | "completed" {
  const now = Date.now();
  const startMs = dayjs(startYmd).startOf("day").valueOf();
  const safeEnd =
    Number.isFinite(endMs) && endMs > 0 ? endMs : tripEndMs(startYmd, durationDays, undefined);
  const normalized = stages.map((s) => String(s || "").toLowerCase());
  if (now > safeEnd) return "completed";
  if (now < startMs) return "scheduled";
  if (normalized.length > 0 && normalized.every((s) => s === "completed")) return "completed";
  if (normalized.some((s) => s === "in_progress")) return "in_progress";
  return "in_progress";
}

type TripRow = {
  key: string;
  tourId: string;
  date: string;
  tourName: string;
  duration_days?: number;
  bookings: number;
  passengers: number;
  stage: string;
  /** Mọi booking trong trip đều đã nhập đủ DS khách */
  guestListComplete: boolean;
};

const stageMap: Record<string, { color: string; label: string }> = {
  scheduled: { color: "blue", label: "Sắp khởi hành" },
  in_progress: { color: "gold", label: "Đang diễn ra" },
  completed: { color: "default", label: "Kết thúc" },
};

type TripAgg = TripRow & { _stages: string[]; _endMs: number };

export default function HdvTripListPage() {
  const navigate = useNavigate();

  type FilterState = {
    search: string;
    dateRange: [dayjs.Dayjs | null, dayjs.Dayjs | null];
    tour_stage?: string;
  };

  const emptyFilters = (): FilterState => ({
    search: "",
    dateRange: [null, null],
    tour_stage: undefined,
  });

  const [draft, setDraft] = useState<FilterState>(() => emptyFilters());
  const [applied, setApplied] = useState<FilterState>(() => emptyFilters());

  const { data = [], isLoading } = useQuery({
    queryKey: ["hdv-bookings-for-trip-list"],
    queryFn: async () =>
      (await axios.get(`${API_V1}/bookings/guide/me`, getAuthHeader())).data
        ?.data || [],
  });

  const trips = useMemo(() => {
    const map = new Map<string, TripAgg>();
    (data as any[]).forEach((b) => {
      if (String(b?.status || "").toLowerCase() === "cancelled") return;
      const tid = String(b?.tour_id?._id || b?.tour_id || "");
      const date = b?.startDate ? dayjs(b.startDate).format("YYYY-MM-DD") : "";
      if (!tid || !date) return;
      const key = `${tid}:${date}`;
      const dur = b?.tour_id?.duration_days != null ? Number(b.tour_id.duration_days) : undefined;
      const endMs = tripEndMs(date, dur, b?.endDate);

      const cur =
        map.get(key) ||
        ({
          key,
          tourId: tid,
          date,
          tourName: b?.tour_id?.name || "Tour",
          duration_days: dur,
          bookings: 0,
          passengers: 0,
          stage: "scheduled",
          guestListComplete: true,
          _stages: [],
          _endMs: endMs,
        } as TripAgg);

      if (b?.tour_id?.duration_days != null) cur.duration_days = b.tour_id.duration_days;
      cur._stages.push(b?.tour_stage || "scheduled");
      cur._endMs = Math.max(cur._endMs, endMs);

      if (String(b?.customer_info_status || "") !== "COMPLETED") {
        cur.guestListComplete = false;
      }
      cur.bookings += 1;
      cur.passengers += Number(b?.groupSize || 0);
      map.set(key, cur);
    });

    return Array.from(map.values())
      .map((row) => {
        const { _stages, _endMs, ...rest } = row;
        const stage = effectiveTripStage(row.date, row.duration_days, _stages, _endMs);
        return { ...rest, stage } as TripRow;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [data]);

  const filteredTrips = useMemo(() => {
    const q = applied.search.trim().toLowerCase();
    const [from, to] = applied.dateRange ?? [null, null];
    return trips.filter((t) => {
      if (applied.tour_stage && (t.stage || "scheduled") !== applied.tour_stage)
        return false;
      if (q) {
        const name = (t.tourName || "").toLowerCase();
        const id = (t.tourId || "").toLowerCase();
        if (!name.includes(q) && !id.includes(q)) return false;
      }
      if (from || to) {
        const d = dayjs(t.date);
        if (from && d.isBefore(from.startOf("day"))) return false;
        if (to && d.isAfter(to.endOf("day"))) return false;
      }
      return true;
    });
  }, [trips, applied]);

  const columns = [
    {
      title: "Tour",
      key: "tour",
      render: (_: unknown, record: TripRow) => (
        <div>
          <div style={{ fontWeight: 600, color: "#1f2937" }}>
            {record.tourName}
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.duration_days ? `${record.duration_days} ngày` : ""}
          </Text>
        </div>
      ),
    },
    {
      title: "Ngày khởi hành",
      key: "date",
      render: (_: unknown, record: TripRow) => (
        <div>{dayjs(record.date).format("DD/MM/YYYY")}</div>
      ),
    },
    {
      title: "Số booking",
      dataIndex: "bookings",
      key: "bookings",
    },
    {
      title: "Hành khách",
      dataIndex: "passengers",
      key: "passengers",
      render: (val: number) => `${val || 0} người`,
    },
    {
      title: "Giai đoạn",
      dataIndex: "stage",
      key: "stage",
      render: (_s: string, record: TripRow) => {
        const stage = record.stage || "scheduled";
        const sm = stageMap[stage] || { color: "default", label: stage };
        return <Tag color={sm.color}>{sm.label}</Tag>;
      },
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
        Trip được phân công
      </h1>
      <p
        style={{
          fontSize: 14,
          color: "#6b7280",
          marginBottom: 24,
        }}
      >
        Các chuyến đi gom theo tour và ngày khởi hành — bấm một dòng để mở chi
        tiết trip
      </p>

      <Card
        bordered={false}
        style={{
          borderRadius: 12,
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        }}
      >
        <div className="hdv-bookings-filterbar">
          <div className="hdv-bookings-filterbar-grid">
            <div className="hdv-bookings-filterbar-item">
              <div className="hdv-bookings-filterbar-label">Tìm kiếm</div>
              <Input
                allowClear
                placeholder="Tìm theo tên tour hoặc mã tour..."
                value={draft.search}
                onChange={(e) =>
                  setDraft((p: FilterState) => ({ ...p, search: e.target.value }))
                }
              />
            </div>

            <div className="hdv-bookings-filterbar-item">
              <div className="hdv-bookings-filterbar-label">Ngày khởi hành</div>
              <RangePicker
                style={{ width: "100%" }}
                value={draft.dateRange}
                onChange={(v) =>
                  setDraft((p: FilterState) => ({
                    ...p,
                    dateRange: (v as any) || [null, null],
                  }))
                }
                format="DD/MM/YYYY"
              />
            </div>

            <div className="hdv-bookings-filterbar-item">
              <div className="hdv-bookings-filterbar-label">Giai đoạn</div>
              <Select
                allowClear
                placeholder="Tất cả"
                value={draft.tour_stage}
                onChange={(v) =>
                  setDraft((p: FilterState) => ({ ...p, tour_stage: v }))
                }
                options={[
                  { value: "scheduled", label: "Sắp khởi hành" },
                  { value: "in_progress", label: "Đang diễn ra" },
                  { value: "completed", label: "Kết thúc" },
                ]}
              />
            </div>

            <div className="hdv-bookings-filterbar-item hdv-bookings-filterbar-actions">
              <div className="hdv-bookings-filterbar-label">&nbsp;</div>
              <Space wrap>
                <Button
                  onClick={() => {
                    const cleared = emptyFilters();
                    setDraft(cleared);
                    setApplied(cleared);
                  }}
                >
                  Xóa bộ lọc
                </Button>
                <Button type="primary" onClick={() => setApplied(draft)}>
                  Áp dụng
                </Button>
              </Space>
            </div>
          </div>
          <div className="hdv-bookings-filterbar-footer">
            <Text type="secondary" style={{ fontSize: 13 }}>
              {filteredTrips.length} trip
            </Text>
          </div>
        </div>

        {filteredTrips.length === 0 && !isLoading ? (
          <Empty
            image={<CarOutlined style={{ fontSize: 64, color: "#d9d9d9" }} />}
            description="Chưa có trip nào được phân công cho bạn"
            style={{ padding: 48 }}
          >
            <Text type="secondary">
              Khi Admin tạo booking và gán bạn làm HDV, trip sẽ hiển thị ở đây.
            </Text>
          </Empty>
        ) : (
          <Table
            className="hdv-bookings-table"
            dataSource={filteredTrips}
            columns={columns}
            rowKey="key"
            loading={isLoading}
            pagination={{
              pageSize: 10,
              showSizeChanger: false,
              showTotal: (total) => `Tổng ${total} trip`,
            }}
            scroll={{ x: 900 }}
            onRow={(record) => ({
              onClick: () => {
                if (record.guestListComplete === false) {
                  message.warning(
                    "Có booking trong trip chưa nhập đủ danh sách khách. Vui lòng liên hệ để bổ sung trước khi bắt đầu chuyến."
                  );
                }
                navigate(`/hdv/trips/${record.tourId}/${record.date}`);
              },
            })}
          />
        )}
      </Card>
    </div>
  );
}
