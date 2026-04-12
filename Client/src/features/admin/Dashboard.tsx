import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Card,
  Row,
  Col,
  Typography,
  DatePicker,
  Radio,
  Table,
  Space,
  Button,
  Skeleton,
  Alert,
  Progress,
  Divider,
  FloatButton,
  Tooltip,
  Tag,
} from "antd";
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  GlobalOutlined,
  CalendarOutlined,
  ShoppingOutlined,
  DollarOutlined,
  TeamOutlined,
  PieChartOutlined,
  ThunderboltOutlined,
  PlusOutlined,
  WarningOutlined,
  InboxOutlined,
  QuestionCircleOutlined,
  LineChartOutlined,
  BarChartOutlined,
  TrophyOutlined,
  ScheduleOutlined,
  BankOutlined,
  HomeOutlined,
  CarOutlined,
  IdcardOutlined,
} from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";

const { Title, Text } = Typography;

const SEVERE_PERCENT_DROP = 90;

function isSeverePercentDrop(delta: number) {
  return delta < 0 && Math.abs(delta) >= SEVERE_PERCENT_DROP;
}

function HintTip({ text }: { text: string }) {
  return (
    <Tooltip title={text} placement="topLeft">
      <QuestionCircleOutlined
        style={{ marginLeft: 5, fontSize: 13, color: "#94a3b8", cursor: "help" }}
        aria-label="Giải thích"
      />
    </Tooltip>
  );
}

const API_V1 =
  (import.meta as any)?.env?.VITE_API_URL || "http://localhost:5000/api/v1";

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
});

type Period = "day" | "month" | "year";

interface OverviewPayload {
  period: Period;
  anchor: string;
  kpi: {
    totalTours: number;
    activeTours: number;
    totalBookings: number;
    totalBookingsDelta: number;
    revenue: number;
    revenueDelta: number;
    passengersServed: number;
    passengersDelta: number;
    occupancyPct: number | null;
    occupancyDelta: number | null;
  };
  charts: {
    revenueAndBookings: { label: string; revenue: number; bookings: number }[];
  };
  topTours: { name: string; bookings: number; revenue: number }[];
  alerts: {
    departuresSoon: {
      _id: string;
      startDate: string;
      customer_name?: string;
      tourName?: string;
    }[];
    pendingBookings: {
      _id: string;
      customer_name?: string;
      tourName?: string;
      startDate: string;
    }[];
    unassignedGuide: {
      _id: string;
      customer_name?: string;
      tourName?: string;
      startDate: string;
    }[];
    resourceFlags: {
      roomsTight: boolean;
      vehiclesTight: boolean;
      ticketsBusy: boolean;
      roomAllocationsNextWeek: number;
    };
  };
  customers: {
    newInPeriod: number;
    returningInPeriod: number;
    top: { phone: string; name: string; count: number }[];
  };
  resources: {
    rooms: {
      total: number;
      usedTodayDistinct: number;
      freeApprox: number;
      usagePct: number;
    };
    vehicles: {
      total: number;
      usedTodayDistinct: number;
      freeApprox: number;
      usagePct: number;
    };
    tickets: {
      activeProducts: number;
      bookingsWithOptionalTickets: number;
    };
  };
}

function DeltaInline({
  value,
  suffix = "%",
}: {
  value: number;
  suffix?: string;
}) {
  if (value === 0) {
    return (
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, paddingTop: 4 }}>
        <span style={{
          display: "inline-flex", alignItems: "center",
          background: "#f1f5f9", color: "#475569",
          borderRadius: 999, padding: "3px 10px",
          fontSize: 12, fontWeight: 600,
        }}>
          0{suffix}
        </span>
        <Tooltip title="Không đổi so với kỳ liền trước (cùng độ dài kỳ).">
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "#94a3b8", cursor: "default" }}>
            Bằng kỳ trước
            <QuestionCircleOutlined style={{ fontSize: 11 }} />
          </span>
        </Tooltip>
      </div>
    );
  }
  const up = value > 0;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, paddingTop: 4 }}>
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        borderRadius: 999, padding: "3px 10px",
        fontSize: 12, fontWeight: 600,
        background: up ? "#dcfce7" : "#fee2e2",
        color: up ? "#15803d" : "#991b1b",
      }}>
        {up ? <ArrowUpOutlined style={{ fontSize: 10 }} /> : <ArrowDownOutlined style={{ fontSize: 10 }} />}
        {up ? "+" : ""}{value}{suffix}
      </span>
      <Tooltip title="So sánh với kỳ liền trước (cùng độ dài: ngày/tháng/năm tương ứng).">
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "#94a3b8", cursor: "default" }}>
          So với kỳ trước
          <QuestionCircleOutlined style={{ fontSize: 11 }} />
        </span>
      </Tooltip>
    </div>
  );
}

function OccupancyDeltaInline({ value }: { value: number | null }) {
  if (value === null) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6, paddingTop: 4, fontSize: 12, color: "#94a3b8" }}>
        <span>Chưa so sánh được</span>
        <Tooltip title="Cần lịch khởi hành có slot để ước tính và so sánh tỉ lệ lấp đầy giữa hai kỳ.">
          <QuestionCircleOutlined style={{ fontSize: 11, cursor: "help" }} />
        </Tooltip>
      </div>
    );
  }
  if (value === 0) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 4 }}>
        <span style={{
          background: "#f1f5f9", color: "#475569",
          borderRadius: 999, padding: "3px 10px",
          fontSize: 12, fontWeight: 600,
        }}>0 điểm %</span>
        <span style={{ fontSize: 12, color: "#94a3b8" }}>Bằng kỳ trước</span>
      </div>
    );
  }
  const up = value > 0;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, paddingTop: 4 }}>
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        borderRadius: 999, padding: "3px 10px",
        fontSize: 12, fontWeight: 600,
        background: up ? "#dcfce7" : "#fee2e2",
        color: up ? "#15803d" : "#991b1b",
      }}>
        {up ? <ArrowUpOutlined style={{ fontSize: 10 }} /> : <ArrowDownOutlined style={{ fontSize: 10 }} />}
        {up ? "+" : ""}{value} điểm %
      </span>
      <Tooltip title="Chênh lệch điểm phần trăm lấp đầy so với kỳ liền trước.">
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "#94a3b8", cursor: "default" }}>
          So với kỳ trước
          <QuestionCircleOutlined style={{ fontSize: 11 }} />
        </span>
      </Tooltip>
    </div>
  );
}

const CHART_FIXED_HEIGHT = 360;

type RevBookPoint = { label: string; revenue: number; bookings: number };

function RevenueBookingComposedChart({ data }: { data: RevBookPoint[] }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const read = () => {
      const w = Math.floor(el.getBoundingClientRect().width);
      if (w > 0) setWidth((prev) => (prev === w ? prev : w));
    };
    read();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={hostRef}
      style={{ width: "100%", height: CHART_FIXED_HEIGHT, minHeight: CHART_FIXED_HEIGHT, position: "relative" }}
    >
      {width <= 0 ? (
        <div style={{
          position: "absolute", inset: 0, display: "flex",
          alignItems: "center", justifyContent: "center",
          fontSize: 13, color: "#94a3b8",
          border: "1px dashed #e2e8f0", borderRadius: 12,
          background: "#f8fafc",
        }}>
          Đang chuẩn bị khung biểu đồ…
        </div>
      ) : (
        <ComposedChart
          width={width}
          height={CHART_FIXED_HEIGHT}
          data={data}
          margin={{ top: 12, right: 12, left: 4, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#64748b" }}
            axisLine={{ stroke: "#e2e8f0" }}
            tickLine={false}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) =>
              v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}tr` : `${v}`
            }
            width={52}
            domain={[0, "auto"]}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 11, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
            width={40}
            allowDecimals={false}
            domain={[0, "auto"]}
          />
          <RechartsTooltip
            contentStyle={{
              borderRadius: 10,
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 16px rgba(15,23,42,0.08)",
              fontSize: 13,
            }}
            formatter={(val, _name, item) => {
              const n = typeof val === "number" ? val : Number(val);
              const safe = Number.isFinite(n) ? n : 0;
              const key = String(item?.dataKey ?? "");
              if (key === "revenue") return [`${safe.toLocaleString("vi-VN")} đ`, "Doanh thu"];
              if (key === "bookings") return [safe, "Số booking"];
              return [safe, ""];
            }}
          />
          <Legend
            wrapperStyle={{ paddingTop: 8, fontSize: 13, color: "#64748b" }}
            formatter={(value) => <span style={{ color: "#64748b", fontSize: 13 }}>{value}</span>}
          />
          <Bar
            yAxisId="right"
            dataKey="bookings"
            name="Số booking"
            fill="#bfdbfe"
            maxBarSize={32}
            radius={[4, 4, 0, 0]}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="revenue"
            name="Doanh thu"
            stroke="#185FA5"
            strokeWidth={2.5}
            dot={{ r: 4, fill: "#185FA5", strokeWidth: 0 }}
            activeDot={{ r: 6 }}
          />
        </ComposedChart>
      )}
    </div>
  );
}

/* ─── Rank badge helper ─── */
function RankBadge({ index }: { index: number }) {
  const styles: React.CSSProperties[] = [
    { background: "#fef3c7", color: "#92400e" },
    { background: "#e0f2fe", color: "#0369a1" },
    { background: "#dcfce7", color: "#166534" },
  ];
  const s = styles[index] ?? { background: "#f1f5f9", color: "#475569" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 24, height: 24, borderRadius: "50%",
      fontSize: 12, fontWeight: 600,
      marginRight: 8,
      ...s,
    }}>
      {index + 1}
    </span>
  );
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>("month");
  const [anchor, setAnchor] = useState<Dayjs>(dayjs());

  const anchorParam = useMemo(() => {
    if (period === "day") return anchor.startOf("day").toISOString();
    if (period === "month") return anchor.startOf("month").toISOString();
    return anchor.startOf("year").toISOString();
  }, [period, anchor]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard-overview", period, anchorParam],
    queryFn: async () => {
      const res = await axios.get<{ success: boolean; data: OverviewPayload }>(
        `${API_V1}/dashboard/overview`,
        { ...getAuthHeader(), params: { period, anchor: anchorParam } },
      );
      return res.data.data;
    },
  });

  const kpiCards = useMemo(() => {
    if (!data) return [];
    const { kpi } = data;
    return [
      {
        title: "Booking trong kỳ",
        hintTooltip: "Số booking được tạo trong kỳ đang chọn, theo ngày tạo đơn. Không tính các đơn đã hủy.",
        value: kpi.totalBookings,
        icon: <ShoppingOutlined style={{ fontSize: 16 }} />,
        delta: <DeltaInline value={kpi.totalBookingsDelta} />,
        deltaRaw: kpi.totalBookingsDelta,
        deltaType: "percent" as const,
        iconBg: "#e0f2fe", iconColor: "#0369a1",
      },
      {
        title: "Doanh thu",
        hintTooltip: "Tổng tiền đã cọc và đã thanh toán trong kỳ (theo quy tắc tính doanh thu trên server).",
        value: `${kpi.revenue.toLocaleString("vi-VN")} đ`,
        icon: <DollarOutlined style={{ fontSize: 16 }} />,
        delta: <DeltaInline value={kpi.revenueDelta} />,
        deltaRaw: kpi.revenueDelta,
        deltaType: "percent" as const,
        iconBg: "#dcfce7", iconColor: "#15803d",
      },
      {
        title: "Khách (chỗ)",
        hintTooltip: "Tổng số chỗ (group size) trên các booking trong kỳ.",
        value: kpi.passengersServed,
        icon: <TeamOutlined style={{ fontSize: 16 }} />,
        delta: <DeltaInline value={kpi.passengersDelta} />,
        deltaRaw: kpi.passengersDelta,
        deltaType: "percent" as const,
        iconBg: "#ede9fe", iconColor: "#6d28d9",
      },
      {
        title: "Tỉ lệ lấp đầy",
        hintTooltip: "Ước tính theo slot lịch khởi hành của tour và số chỗ đã đặt trong kỳ. Không hiển thị nếu thiếu dữ liệu slot.",
        value: kpi.occupancyPct != null ? `${kpi.occupancyPct}%` : "—",
        icon: <PieChartOutlined style={{ fontSize: 16 }} />,
        delta: <OccupancyDeltaInline value={kpi.occupancyDelta} />,
        deltaRaw: kpi.occupancyDelta,
        deltaType: "occupancy" as const,
        iconBg: "#fef3c7", iconColor: "#92400e",
      },
    ];
  }, [data]);

  const chartData = data?.charts.revenueAndBookings ?? [];
  const chartHasPoints = chartData.length > 0;
  const chartHasValues =
    chartHasPoints &&
    chartData.some((p) => (p.revenue ?? 0) > 0 || (p.bookings ?? 0) > 0);

  const [topTourMode, setTopTourMode] = useState<"90days" | "period">("90days");

  const topTourColumns = [
    {
      title: "Tour",
      dataIndex: "name",
      key: "name",
      render: (name: string, _record: any, index: number) => (
        <div style={{ display: "flex", alignItems: "center" }}>
          <RankBadge index={index} />
          <span style={{ fontSize: 13 }}>{name}</span>
        </div>
      ),
    },
    {
      title: "Số booking",
      dataIndex: "bookings",
      key: "bookings",
      align: "center" as const,
      width: 100,
      render: (v: number) => <span style={{ fontWeight: 500 }}>{v}</span>,
    },
    {
      title: "Doanh thu",
      dataIndex: "revenue",
      key: "revenue",
      align: "right" as const,
      render: (v: number) => (
        <span style={{ fontSize: 12, color: "#475569" }}>{v.toLocaleString("vi-VN")} đ</span>
      ),
    },
  ];

  const topCustomerColumns = [
    {
      title: "Khách",
      dataIndex: "name",
      key: "name",
      render: (v: string) => <span style={{ fontSize: 13, fontWeight: 500 }}>{v}</span>,
    },
    {
      title: "SĐT",
      dataIndex: "phone",
      key: "phone",
      width: 120,
      render: (v: string) => <span style={{ fontSize: 12, color: "#64748b" }}>{v}</span>,
    },
    {
      title: "Đơn",
      dataIndex: "count",
      key: "count",
      width: 70,
      align: "center" as const,
      render: (v: number) => (
        <span style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 28, height: 28, borderRadius: "50%",
          background: "#f0fdf4", color: "#15803d",
          fontSize: 12, fontWeight: 600,
        }}>{v}</span>
      ),
    },
  ];

  /* ─── shared card style ─── */
  const baseCard: React.CSSProperties = {
    borderRadius: 14,
    border: "1px solid #e2e8f0",
    boxShadow: "0 1px 4px rgba(15,23,42,0.06)",
    overflow: "hidden",
  };

  return (
    <div style={{ position: "relative", maxWidth: 1600, margin: "0 auto", minHeight: "100vh", paddingBottom: 96, overflowX: "hidden" }}>

      {/* ══ HEADER CARD ══ */}
      <Card
        bordered={false}
        style={{ ...baseCard, marginBottom: 24, background: "#f8fafc" }}
        styles={{ body: { padding: 24 } }}
      >
        {/* Title row */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <Title level={2} style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#0f172a" }}>
              Tổng quan vận hành
            </Title>
            <Text style={{ display: "block", marginTop: 6, fontSize: 13, color: "#64748b", maxWidth: 600 }}>
              Theo dõi booking, doanh thu và trạng thái tour — màu sắc từng khối giúp phân biệt chỉ số trong một lần nhìn.
            </Text>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { icon: <ScheduleOutlined />, label: "Theo kỳ thời gian" },
              { icon: <LineChartOutlined />, label: "KPI & biểu đồ" },
            ].map(({ icon, label }) => (
              <span key={label} style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                border: "1px solid #e2e8f0", background: "#fff",
                borderRadius: 10, padding: "6px 12px",
                fontSize: 13, color: "#475569",
              }}>
                <span style={{ color: "#94a3b8" }}>{icon}</span>
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Filter box */}
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
            <CalendarOutlined />
            Bộ lọc thời gian
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 16 }}>
            <Radio.Group
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              buttonStyle="solid"
            >
              <Radio.Button value="day" style={{ paddingInline: 16 }}>Ngày</Radio.Button>
              <Radio.Button value="month" style={{ paddingInline: 16 }}>Tháng</Radio.Button>
              <Radio.Button value="year" style={{ paddingInline: 16 }}>Năm</Radio.Button>
            </Radio.Group>
            <span style={{ fontSize: 13, color: "#94a3b8", display: "flex", alignItems: "center", gap: 4 }}>
              <BankOutlined />
              {period === "day" ? "Chọn ngày" : period === "month" ? "Chọn tháng" : "Chọn năm"}
            </span>
          </div>
          <div style={{ width: "100%" }}>
            {period === "day" && (
              <DatePicker value={anchor} onChange={(v) => v && setAnchor(v)} allowClear={false} format="DD/MM/YYYY" style={{ width: "100%" }} />
            )}
            {period === "month" && (
              <DatePicker picker="month" value={anchor} onChange={(v) => v && setAnchor(v)} allowClear={false} format="MM/YYYY" style={{ width: "100%" }} />
            )}
            {period === "year" && (
              <DatePicker picker="year" value={anchor} onChange={(v) => v && setAnchor(v)} allowClear={false} format="YYYY" style={{ width: "100%" }} />
            )}
          </div>

          <Divider style={{ margin: "16px 0", borderColor: "#f1f5f9" }} />

          <Text style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
            Thao tác nhanh
          </Text>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <Link to="/admin/tours/create">
              <Button icon={<PlusOutlined />} style={{ borderColor: "#e2e8f0", background: "#fff", color: "#1e293b" }}>
                Tour mới
              </Button>
            </Link>
            <Link to="/admin/bookings/create">
              <Button icon={<ShoppingOutlined />} style={{ borderColor: "#e2e8f0", background: "#fff", color: "#1e293b" }}>
                Booking
              </Button>
            </Link>
            <Link to="/admin/providers/create">
              <Button icon={<GlobalOutlined />} style={{ borderColor: "#e2e8f0", background: "#fff", color: "#1e293b" }}>
                Nhà cung cấp
              </Button>
            </Link>
            <Link to="/admin/bookings">
              <Button
                icon={<ThunderboltOutlined />}
                style={{ borderColor: "#fbbf24", background: "#fffbeb", color: "#78350f", fontWeight: 500 }}
              >
                Phân bổ xe/phòng
              </Button>
            </Link>
          </div>
        </div>

        {/* Tour overview */}
        <div style={{ marginTop: 24 }}>
          <Text style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>Tổng quan tour</Text>
          <Text style={{ display: "block", marginTop: 4, fontSize: 12, color: "#64748b" }}>
            Chi tiết số liệu và badge trạng thái (đồng bộ với khối tóm tắt phía trên).
          </Text>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 14 }}>
            {[
              {
                icon: <GlobalOutlined style={{ fontSize: 18 }} />,
                iconBg: "#e0f2fe", iconColor: "#0369a1",
                value: data ? data.kpi.totalTours : 0,
                label: "Tổng tour trong hệ thống",
                extra: data ? (
                  <div style={{ marginTop: 10 }}>
                    <Tag color="blue" style={{ borderRadius: 20, border: 0, padding: "2px 10px", fontSize: 12 }}>
                      {data.kpi.activeTours} đang mở bán
                    </Tag>
                  </div>
                ) : null,
              },
              {
                icon: <CalendarOutlined style={{ fontSize: 18 }} />,
                iconBg: "#dcfce7", iconColor: "#15803d",
                value: data?.kpi.activeTours ?? 0,
                label: "Tour sẵn sàng phục vụ khách",
                extra: null,
              },
              {
                icon: <PieChartOutlined style={{ fontSize: 18 }} />,
                iconBg: "#ede9fe", iconColor: "#6d28d9",
                value: null,
                label: "Trạng thái",
                extra: data ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                    <Tag color="blue" style={{ borderRadius: 20, border: 0, padding: "2px 10px", fontSize: 12, margin: 0 }}>
                      {(data.kpi.activeTours ?? 0) === (data.kpi.totalTours ?? 0) && (data.kpi.totalTours ?? 0) > 0
                        ? "Mở bán · toàn bộ"
                        : (data.kpi.activeTours ?? 0) > 0
                          ? "Mở bán · một phần"
                          : "Chưa mở bán"}
                    </Tag>
                    <Tag color="success" style={{ borderRadius: 20, border: 0, padding: "2px 10px", fontSize: 12, margin: 0 }}>
                      Hoạt động · {data.kpi.activeTours ?? 0}
                    </Tag>
                    {(data.kpi.totalTours ?? 0) > (data.kpi.activeTours ?? 0) && (
                      <Tag style={{ borderRadius: 20, border: "1px solid #e2e8f0", background: "#f8fafc", padding: "2px 10px", fontSize: 12, margin: 0, color: "#64748b" }}>
                        Không hoạt động · {(data.kpi.totalTours ?? 0) - (data.kpi.activeTours ?? 0)}
                      </Tag>
                    )}
                  </div>
                ) : null,
              },
            ].map((item, i) => (
              <div key={i} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 18 }}>
                <div style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 38, height: 38, borderRadius: 10,
                  background: item.iconBg, color: item.iconColor,
                }}>
                  {item.icon}
                </div>
                {item.value !== null && (
                  <div style={{ fontSize: 28, fontWeight: 700, color: "#0f172a", marginTop: 12, lineHeight: 1 }}>
                    {item.value}
                  </div>
                )}
                <div style={{ fontSize: 12, color: "#64748b", marginTop: item.value !== null ? 6 : 12 }}>
                  {item.label}
                </div>
                {item.extra}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {isError && (
        <Alert
          type="error"
          showIcon
          message="Không tải được dashboard"
          description="Kiểm tra server và quyền admin."
          style={{ marginBottom: 16 }}
        />
      )}

      {isLoading || !data ? (
        <Skeleton active paragraph={{ rows: 12 }} />
      ) : (
        <>
          {/* ══ KPI SECTION ══ */}
          <div style={{ marginBottom: 32, paddingBottom: 32, borderBottom: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 12, marginBottom: 20 }}>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 42, height: 42, borderRadius: 12,
                background: "#1e293b", color: "#fff", flexShrink: 0,
              }}>
                <PieChartOutlined style={{ fontSize: 18 }} />
              </div>
              <div style={{ flex: 1 }}>
                <Text style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>
                  Hiệu suất kỳ chọn
                </Text>
                <Title level={4} style={{ margin: 0, fontSize: 17, fontWeight: 600, color: "#0f172a" }}>
                  Chỉ số chính
                </Title>
                <Text style={{ fontSize: 13, color: "#64748b" }}>
                  Booking và doanh thu trong kỳ — xem chi tiết và so sánh ở bảng bên dưới.
                </Text>
              </div>
              <HintTip text="Các chỉ số so sánh với kỳ liền trước (cùng độ dài: ngày / tháng / năm). Giảm mạnh được tô đỏ để dễ quét." />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
              {kpiCards.map((c) => {
                const severe =
                  c.deltaType === "percent"
                    ? isSeverePercentDrop(c.deltaRaw as number)
                    : c.deltaRaw != null && c.deltaRaw < 0 && Math.abs(c.deltaRaw) >= 40;
                return (
                  <div
                    key={c.title}
                    style={{
                      background: severe ? "#fff5f5" : "#fff",
                      border: `1px solid ${severe ? "#fecaca" : "#e2e8f0"}`,
                      borderRadius: 14,
                      padding: "20px 22px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      minHeight: 180,
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          width: 36, height: 36, borderRadius: 10,
                          background: c.iconBg, color: c.iconColor, flexShrink: 0,
                        }}>
                          {c.icon}
                        </span>
                        <span style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}>{c.title}</span>
                        <HintTip text={c.hintTooltip} />
                      </div>
                      <div style={{ marginTop: 16, fontSize: 30, fontWeight: 700, color: "#0f172a", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                        {c.value}
                      </div>
                    </div>
                    <div style={{ marginTop: 20, borderTop: "1px solid #f1f5f9", paddingTop: 14 }}>
                      {c.delta}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Trend hint */}
            <div style={{
              marginTop: 16,
              display: "flex", alignItems: "center", gap: 10,
              background: "#fffbeb", border: "1px solid #fef3c7",
              borderRadius: 10, padding: "10px 16px",
              fontSize: 13, color: "#78350f",
            }}>
              <LineChartOutlined style={{ fontSize: 16, color: "#d97706", flexShrink: 0 }} />
              <span>
                Xu hướng — xem biểu đồ chi tiết trong mục{" "}
                <strong style={{ fontWeight: 600, color: "#0f172a" }}>Biểu đồ & top tour</strong> phía dưới.
              </span>
            </div>
          </div>

          {/* ══ CHART SECTION ══ */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 12, marginBottom: 20 }}>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 42, height: 42, borderRadius: 12,
                background: "#0ea5e9", color: "#fff", flexShrink: 0,
              }}>
                <LineChartOutlined style={{ fontSize: 18 }} />
              </div>
              <div>
                <Text style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#0369a1", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>
                  Xu hướng
                </Text>
                <Title level={4} style={{ margin: 0, fontSize: 17, fontWeight: 600, color: "#0f172a" }}>
                  Biểu đồ & top tour
                </Title>
                <Text style={{ fontSize: 13, color: "#64748b" }}>
                  Đường doanh thu + cột booking theo mốc thời gian; bảng bên phải là top hiệu suất.
                </Text>
              </div>
            </div>
          </div>

          <Row gutter={[20, 20]} style={{ marginTop: 0 }}>
            <Col xs={24} lg={16}>
              <Card
                title={
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div style={{
                      display: "flex", alignItems: "center", justifyContent: "center",
                      width: 38, height: 38, borderRadius: 10,
                      background: "#e0f2fe", color: "#0369a1", flexShrink: 0,
                    }}>
                      <BarChartOutlined style={{ fontSize: 16 }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>
                        Doanh thu & số booking theo thời gian
                      </div>
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                        So sánh xu hướng theo kỳ đang chọn.
                      </div>
                    </div>
                  </div>
                }
                bordered={false}
                style={baseCard}
                styles={{
                  header: { borderBottom: "1px solid #f1f5f9", padding: "16px 22px" },
                  body: { padding: "14px 22px 22px" },
                }}
              >
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 14 }}>
                  <Text style={{ fontSize: 12, color: "#64748b" }}>
                    {period === "day" ? "14 ngày quanh ngày chọn" : period === "month" ? "12 tháng gần nhất (theo tháng)" : "5 năm gần nhất"}
                  </Text>
                  {!chartHasValues && (
                    <span style={{
                      display: "inline-flex", alignItems: "center",
                      background: "#fffbeb", border: "1px solid #fef3c7",
                      borderRadius: 999, padding: "3px 12px",
                      fontSize: 12, color: "#92400e",
                    }}>
                      Chưa có dữ liệu trong các mốc thời gian này
                    </span>
                  )}
                </div>
                <div style={{ width: "100%", minHeight: CHART_FIXED_HEIGHT }}>
                  {chartHasPoints ? (
                    <RevenueBookingComposedChart data={chartData} />
                  ) : (
                    <div style={{
                      display: "flex", alignItems: "center", justifyContent: "center",
                      height: CHART_FIXED_HEIGHT, fontSize: 13, color: "#94a3b8",
                      border: "1px dashed #e2e8f0", borderRadius: 10, background: "#f8fafc",
                    }}>
                      Không có dữ liệu biểu đồ
                    </div>
                  )}
                </div>
              </Card>
            </Col>

            <Col xs={24} lg={8}>
              <Card
                title={
                  <div>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
                      <div style={{
                        display: "flex", alignItems: "center", justifyContent: "center",
                        width: 38, height: 38, borderRadius: 10,
                        background: "#fef3c7", color: "#92400e", flexShrink: 0,
                      }}>
                        <TrophyOutlined style={{ fontSize: 16 }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>Top tour bán chạy</div>
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Tour hiệu suất cao nhất.</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <Button
                        size="small"
                        type={topTourMode === "90days" ? "primary" : "default"}
                        onClick={() => setTopTourMode("90days")}
                        style={{ borderRadius: 6 }}
                      >
                        90 ngày
                      </Button>
                      <Button
                        size="small"
                        type={topTourMode === "period" ? "primary" : "default"}
                        onClick={() => setTopTourMode("period")}
                        style={{ borderRadius: 6 }}
                      >
                        Theo kỳ
                      </Button>
                    </div>
                  </div>
                }
                bordered={false}
                style={{ ...baseCard, border: "1px solid #fef3c7", height: "100%" }}
                styles={{
                  header: { borderBottom: "1px solid #fef3c7", padding: "16px 22px", background: "#fffdf5" },
                  body: { padding: "14px 22px 20px" },
                }}
              >
                <Table
                  size="middle"
                  rowKey="name"
                  columns={topTourColumns}
                  dataSource={data.topTours}
                  pagination={false}
                  locale={{ emptyText: "Không có tour bán chạy" }}
                  rowClassName={(_, i) => i % 2 === 0 ? "" : ""}
                  style={{ fontSize: 13 }}
                />
              </Card>
            </Col>
          </Row>

          {/* ══ ALERTS ══ */}
          <Row gutter={[20, 20]} style={{ marginTop: 28 }}>
            <Col xs={24}>
              <Card
                title={
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      display: "flex", alignItems: "center", justifyContent: "center",
                      width: 42, height: 42, borderRadius: 12,
                      background: "#f59e0b", color: "#fff", flexShrink: 0,
                    }}>
                      <WarningOutlined style={{ fontSize: 18 }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>Cảnh báo nhanh</div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>Tour sắp đi, booking chờ, HDV, tài nguyên</div>
                    </div>
                  </div>
                }
                bordered={false}
                style={{ ...baseCard, border: "1px solid #fef3c7" }}
                styles={{
                  header: { borderBottom: "1px solid #fef3c7", padding: "16px 22px", background: "#fffdf5" },
                  body: { padding: 22 },
                }}
              >
                <Space direction="vertical" style={{ width: "100%" }} size="middle">
                  {data.alerts.departuresSoon.length > 0 && (
                    <Alert
                      type="warning"
                      showIcon
                      message="Tour sắp khởi hành (1–3 ngày)"
                      description={
                        <ul style={{ paddingLeft: 16, margin: 0 }}>
                          {data.alerts.departuresSoon.map((d) => (
                            <li key={d._id}>
                              <Link to={`/admin/bookings/${d._id}`}>
                                {d.tourName || "Tour"} — {d.customer_name} — {dayjs(d.startDate).format("DD/MM/YYYY")}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      }
                    />
                  )}
                  {data.alerts.pendingBookings.length > 0 && (
                    <Alert
                      type="info"
                      showIcon
                      message="Booking chưa xác nhận"
                      description={
                        <ul style={{ paddingLeft: 16, margin: 0 }}>
                          {data.alerts.pendingBookings.map((d) => (
                            <li key={d._id}>
                              <Link to={`/admin/bookings/${d._id}`}>{d.customer_name} · {d.tourName}</Link>
                            </li>
                          ))}
                        </ul>
                      }
                    />
                  )}
                  {data.alerts.unassignedGuide.length > 0 && (
                    <Alert
                      type="error"
                      showIcon
                      message="Chưa phân công HDV"
                      description={
                        <ul style={{ paddingLeft: 16, margin: 0 }}>
                          {data.alerts.unassignedGuide.map((d) => (
                            <li key={d._id}>
                              <Link to={`/admin/bookings/${d._id}`}>
                                {d.tourName} — {d.customer_name} ({dayjs(d.startDate).format("DD/MM/YYYY")})
                              </Link>
                            </li>
                          ))}
                        </ul>
                      }
                    />
                  )}
                  {(data.alerts.resourceFlags.roomsTight || data.alerts.resourceFlags.vehiclesTight || data.alerts.resourceFlags.ticketsBusy) && (
                    <Alert
                      type="warning"
                      showIcon
                      message="Tài nguyên"
                      description={
                        <ul style={{ margin: 0, paddingLeft: 16 }}>
                          {data.alerts.resourceFlags.roomsTight && <li>Phòng khách sạn: tỷ lệ sử dụng cao hôm nay (≥85%).</li>}
                          {data.alerts.resourceFlags.vehiclesTight && <li>Xe: tỷ lệ phân bổ cao hôm nay (≥85%).</li>}
                          {data.alerts.resourceFlags.ticketsBusy && <li>Vé/dịch vụ: có đơn dùng vé add-on nhưng chưa có loại vé trong hệ thống.</li>}
                          <li style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>
                            Phân bổ 7 ngày tới: {data.alerts.resourceFlags.roomAllocationsNextWeek} lượt phòng (ước lượng).
                          </li>
                        </ul>
                      }
                    />
                  )}
                  {data.alerts.departuresSoon.length === 0 &&
                    data.alerts.pendingBookings.length === 0 &&
                    data.alerts.unassignedGuide.length === 0 &&
                    !data.alerts.resourceFlags.roomsTight &&
                    !data.alerts.resourceFlags.vehiclesTight &&
                    !data.alerts.resourceFlags.ticketsBusy && (
                      <div style={{
                        display: "flex", alignItems: "center", gap: 8,
                        background: "#f8fafc", borderRadius: 8,
                        padding: "10px 14px", fontSize: 13, color: "#64748b",
                      }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#94a3b8", flexShrink: 0 }} />
                        Không có cảnh báo hiện tại.
                      </div>
                    )}
                </Space>
              </Card>
            </Col>
          </Row>

          {/* ══ CUSTOMERS + RESOURCES ══ */}
          <Row gutter={[20, 20]} style={{ marginTop: 8 }}>
            {/* Khách hàng */}
            <Col xs={24} md={12} lg={8}>
              <Card
                title={
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      display: "flex", alignItems: "center", justifyContent: "center",
                      width: 38, height: 38, borderRadius: 10,
                      background: "#dcfce7", color: "#15803d", flexShrink: 0,
                    }}>
                      <TeamOutlined style={{ fontSize: 16 }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>Khách hàng (kỳ hiện tại)</div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>Mới vs quay lại trong kỳ lọc</div>
                    </div>
                  </div>
                }
                bordered={false}
                style={{ ...baseCard, border: "1px solid #d1fae5", height: "100%" }}
                styles={{
                  header: { borderBottom: "1px solid #d1fae5", padding: "16px 20px", background: "#f0fdf4" },
                  body: { padding: 20 },
                }}
              >
                <Row gutter={[10, 10]} style={{ marginBottom: 16 }}>
                  <Col span={12}>
                    <div style={{ background: "#f0fdf4", border: "1px solid #d1fae5", borderRadius: 10, padding: "12px 14px" }}>
                      <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>Khách mới (SĐT)</div>
                      <div style={{ fontSize: 22, fontWeight: 600, color: "#0f172a" }}>{data.customers.newInPeriod}</div>
                    </div>
                  </Col>
                  <Col span={12}>
                    <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 10, padding: "12px 14px" }}>
                      <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>Khách quay lại</div>
                      <div style={{ fontSize: 22, fontWeight: 600, color: "#0f172a" }}>{data.customers.returningInPeriod}</div>
                    </div>
                  </Col>
                </Row>
                <Divider style={{ margin: "0 0 12px", borderColor: "#f1f5f9" }} />
                <Text style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 8 }}>
                  Top khách (mọi thời điểm)
                </Text>
                <Table
                  size="small"
                  rowKey="phone"
                  columns={topCustomerColumns}
                  dataSource={data.customers.top}
                  pagination={false}
                  style={{ fontSize: 13 }}
                />
              </Card>
            </Col>

            {/* Tài nguyên */}
            <Col xs={24} md={12} lg={16}>
              <Card
                title={
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      display: "flex", alignItems: "center", justifyContent: "center",
                      width: 38, height: 38, borderRadius: 10,
                      background: "#f1f5f9", color: "#334155", flexShrink: 0,
                    }}>
                      <InboxOutlined style={{ fontSize: 16 }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>Trạng thái tài nguyên (hôm nay)</div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>Phòng, xe, vé — mức sử dụng ước lượng</div>
                    </div>
                  </div>
                }
                bordered={false}
                style={{ ...baseCard, height: "100%" }}
                styles={{
                  header: { borderBottom: "1px solid #e2e8f0", padding: "16px 20px", background: "#f8fafc" },
                  body: { padding: 20 },
                }}
              >
                <Row gutter={[16, 16]}>
                  {/* Phòng */}
                  <Col xs={24} md={8}>
                    <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 10, padding: "14px 16px", height: "100%" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          width: 30, height: 30, borderRadius: 8,
                          background: "#e0f2fe", color: "#0369a1",
                        }}>
                          <HomeOutlined style={{ fontSize: 14 }} />
                        </span>
                        <Text strong style={{ fontSize: 13 }}>Khách sạn — phòng</Text>
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>
                        {data.resources.rooms.usagePct}%
                      </div>
                      <Progress
                        percent={data.resources.rooms.usagePct}
                        status={data.resources.rooms.usagePct >= 85 ? "exception" : "active"}
                        strokeColor="#0ea5e9"
                        showInfo={false}
                        size="small"
                        style={{ marginBottom: 8 }}
                      />
                      <Text style={{ display: "block", fontSize: 11, color: "#64748b" }}>
                        Đã dùng {data.resources.rooms.usedTodayDistinct} / {data.resources.rooms.total} phòng
                      </Text>
                      <Text style={{ fontSize: 12, color: "#0f172a" }}>Còn trống ~{data.resources.rooms.freeApprox}</Text>
                    </div>
                  </Col>

                  {/* Xe */}
                  <Col xs={24} md={8}>
                    <div style={{ background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: 10, padding: "14px 16px", height: "100%" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          width: 30, height: 30, borderRadius: 8,
                          background: "#ede9fe", color: "#6d28d9",
                        }}>
                          <CarOutlined style={{ fontSize: 14 }} />
                        </span>
                        <Text strong style={{ fontSize: 13 }}>Xe</Text>
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>
                        {data.resources.vehicles.usagePct}%
                      </div>
                      <Progress
                        percent={data.resources.vehicles.usagePct}
                        status={data.resources.vehicles.usagePct >= 85 ? "exception" : "active"}
                        strokeColor="#8b5cf6"
                        showInfo={false}
                        size="small"
                        style={{ marginBottom: 8 }}
                      />
                      <Text style={{ display: "block", fontSize: 11, color: "#64748b" }}>
                        Đã phân bổ {data.resources.vehicles.usedTodayDistinct} / {data.resources.vehicles.total} xe
                      </Text>
                      <Text style={{ fontSize: 12, color: "#0f172a" }}>Còn trống ~{data.resources.vehicles.freeApprox}</Text>
                    </div>
                  </Col>

                  {/* Vé */}
                  <Col xs={24} md={8}>
                    <div style={{ background: "#fffbeb", border: "1px solid #fef3c7", borderRadius: 10, padding: "14px 16px", height: "100%" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          width: 30, height: 30, borderRadius: 8,
                          background: "#fef3c7", color: "#92400e",
                        }}>
                          <IdcardOutlined style={{ fontSize: 14 }} />
                        </span>
                        <Text strong style={{ fontSize: 13 }}>Vé tham quan</Text>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                        <Tag style={{ borderRadius: 20, border: "1px solid #fef3c7", background: "#fef9ec", color: "#92400e", fontSize: 12, margin: 0, padding: "2px 10px" }}>
                          Active: {data.resources.tickets.activeProducts} loại
                        </Tag>
                      </div>
                      <Text style={{ display: "block", fontSize: 12, color: "#0f172a", marginBottom: 4 }}>
                        Đơn có vé add-on: <strong>{data.resources.tickets.bookingsWithOptionalTickets}</strong>
                      </Text>
                      <Text style={{ fontSize: 11, color: "#94a3b8" }}>
                        Hệ thống không quản lý tồn vé chi tiết
                      </Text>
                    </div>
                  </Col>
                </Row>
              </Card>
            </Col>
          </Row>
        </>
      )}

      <FloatButton.Group shape="circle" style={{ right: 24, bottom: 24 }}>
        <FloatButton icon={<PlusOutlined />} tooltip="Tạo tour" onClick={() => navigate("/admin/tours/create")} />
        <FloatButton icon={<ShoppingOutlined />} tooltip="Tạo booking" onClick={() => navigate("/admin/bookings/create")} />
        <FloatButton icon={<GlobalOutlined />} tooltip="Nhà cung cấp" onClick={() => navigate("/admin/providers/create")} />
        <FloatButton icon={<ThunderboltOutlined />} tooltip="Phân bổ (danh sách booking)" onClick={() => navigate("/admin/bookings")} />
      </FloatButton.Group>
    </div>
  );
};

function StatisticMini({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <Text type="secondary" style={{ fontSize: 12 }}>{label}</Text>
      <div style={{ fontSize: 20, fontWeight: 600 }}>{value}</div>
    </div>
  );
}

export default Dashboard;