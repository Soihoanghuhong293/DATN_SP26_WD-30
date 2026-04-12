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

/** Cảnh báo khi biến động % so với kỳ trước rất mạnh (ví dụ &gt; 90%) */
const SEVERE_PERCENT_DROP = 90;

function isSeverePercentDrop(delta: number) {
  return delta < 0 && Math.abs(delta) >= SEVERE_PERCENT_DROP;
}

function HintTip({ text }: { text: string }) {
  return (
    <Tooltip title={text} placement="topLeft">
      <QuestionCircleOutlined
        className="cursor-help text-slate-400 hover:text-slate-500"
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

const DELTA_UP = "#16a34a";
const DELTA_DOWN = "#ef4444";

function Delta({
  value,
  suffix = "%",
}: {
  value: number;
  suffix?: string;
}) {
  if (value === 0) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-sm font-semibold tabular-nums text-slate-600">
          0{suffix}
        </span>
        <Tooltip title="Không đổi so với kỳ liền trước (cùng độ dài kỳ).">
          <span className="inline-flex w-fit cursor-default items-center gap-1 text-xs text-slate-400">
            Bằng kỳ trước
            <QuestionCircleOutlined className="text-[11px]" />
          </span>
        </Tooltip>
      </div>
    );
  }
  const up = value > 0;
  const color = up ? DELTA_UP : DELTA_DOWN;
  return (
    <div className="flex flex-col gap-1">
      <span
        className="inline-flex items-center gap-1.5 text-base font-bold tabular-nums leading-tight"
        style={{ color }}
      >
        {up ? <ArrowUpOutlined className="text-sm" /> : <ArrowDownOutlined className="text-sm" />}
        <span>
          {up ? "+" : ""}
          {value}
          {suffix}
        </span>
      </span>
      <Tooltip title="So sánh với kỳ liền trước (cùng độ dài): ngày/tháng/năm tương ứng.">
        <span className="inline-flex w-fit cursor-default items-center gap-1 text-xs text-slate-500">
          So với kỳ trước
          <QuestionCircleOutlined className="text-[11px] text-slate-400" />
        </span>
      </Tooltip>
    </div>
  );
}

const CHART_FIXED_HEIGHT = 360;

type RevBookPoint = { label: string; revenue: number; bookings: number };

/**
 * Recharts 3: ResponsiveContainer returns null when ResizeObserver reports
 * non-positive width/height (common inside Ant Design Card / flex). Measuring
 * the wrapper and passing numeric width + height avoids a blank chart.
 */
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
      className="w-full"
      style={{
        height: CHART_FIXED_HEIGHT,
        minHeight: CHART_FIXED_HEIGHT,
        position: "relative",
      }}
    >
      {width <= 0 ? (
        <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm border border-dashed border-slate-200 rounded-xl bg-slate-50/80">
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
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
            }}
            formatter={(val, _name, item) => {
              const n = typeof val === "number" ? val : Number(val);
              const safe = Number.isFinite(n) ? n : 0;
              const key = String(item?.dataKey ?? "");
              if (key === "revenue") {
                return [`${safe.toLocaleString("vi-VN")} đ`, "Doanh thu"];
              }
              if (key === "bookings") {
                return [safe, "Số booking"];
              }
              return [safe, ""];
            }}
          />
          <Legend
            wrapperStyle={{ paddingTop: 8 }}
            formatter={(value) => <span className="text-slate-600 text-sm">{value}</span>}
          />
          <Bar
            yAxisId="right"
            dataKey="bookings"
            name="Số booking"
            fill="#94a3b8"
            maxBarSize={32}
            radius={[6, 6, 0, 0]}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="revenue"
            name="Doanh thu"
            stroke="#0284c7"
            strokeWidth={2.5}
            dot={{ r: 4, fill: "#0284c7", strokeWidth: 0 }}
            activeDot={{ r: 6 }}
          />
        </ComposedChart>
      )}
    </div>
  );
}

function OccupancyDelta({ value }: { value: number | null }) {
  if (value === null) {
    return (
      <Tooltip title="Cần lịch khởi hành có slot để ước tính và so sánh tỉ lệ lấp đầy giữa hai kỳ.">
        <span className="inline-flex cursor-default items-center gap-1 text-sm text-slate-500">
          Chưa so sánh được
          <QuestionCircleOutlined className="text-slate-400" />
        </span>
      </Tooltip>
    );
  }
  if (value === 0) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-sm font-semibold tabular-nums text-slate-600">0 điểm %</span>
        <span className="text-xs text-slate-400">Bằng kỳ trước</span>
      </div>
    );
  }
  const up = value > 0;
  const color = up ? DELTA_UP : DELTA_DOWN;
  return (
    <div className="flex flex-col gap-1">
      <span
        className="inline-flex items-center gap-1.5 text-base font-bold tabular-nums leading-tight"
        style={{ color }}
      >
        {up ? <ArrowUpOutlined className="text-sm" /> : <ArrowDownOutlined className="text-sm" />}
        <span>
          {up ? "+" : ""}
          {value} điểm %
        </span>
      </span>
      <Tooltip title="Chênh lệch điểm phần trăm lấp đầy so với kỳ liền trước.">
        <span className="inline-flex w-fit cursor-default items-center gap-1 text-xs text-slate-500">
          So với kỳ trước
          <QuestionCircleOutlined className="text-[11px] text-slate-400" />
        </span>
      </Tooltip>
    </div>
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
        {
          ...getAuthHeader(),
          params: { period, anchor: anchorParam },
        },
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
        hintTooltip:
          "Số booking được tạo trong kỳ đang chọn, theo ngày tạo đơn. Không tính các đơn đã hủy.",
        value: kpi.totalBookings,
        icon: <ShoppingOutlined className="text-lg text-slate-400" />,
        delta: <Delta value={kpi.totalBookingsDelta} />,
        deltaRaw: kpi.totalBookingsDelta,
        deltaType: "percent" as const,
      },
      {
        title: "Doanh thu",
        hintTooltip: "Tổng tiền đã cọc và đã thanh toán trong kỳ (theo quy tắc tính doanh thu trên server).",
        value: `${kpi.revenue.toLocaleString("vi-VN")} đ`,
        icon: <DollarOutlined className="text-lg text-slate-400" />,
        delta: <Delta value={kpi.revenueDelta} />,
        deltaRaw: kpi.revenueDelta,
        deltaType: "percent" as const,
      },
      {
        title: "Khách (chỗ)",
        hintTooltip: "Tổng số chỗ (group size) trên các booking trong kỳ.",
        value: kpi.passengersServed,
        icon: <TeamOutlined className="text-lg text-slate-400" />,
        delta: <Delta value={kpi.passengersDelta} />,
        deltaRaw: kpi.passengersDelta,
        deltaType: "percent" as const,
      },
      {
        title: "Tỉ lệ lấp đầy",
        hintTooltip:
          "Ước tính theo slot lịch khởi hành của tour và số chỗ đã đặt trong kỳ. Không hiển thị nếu thiếu dữ liệu slot.",
        value: kpi.occupancyPct != null ? `${kpi.occupancyPct}%` : "—",
        icon: <PieChartOutlined className="text-lg text-slate-400" />,
        delta: <OccupancyDelta value={kpi.occupancyDelta} />,
        deltaRaw: kpi.occupancyDelta,
        deltaType: "occupancy" as const,
      },
    ];
  }, [data]);

  const chartData = data?.charts.revenueAndBookings ?? [];
  const chartHasPoints = chartData.length > 0;
  const chartHasValues =
    chartHasPoints &&
    chartData.some((p) => (p.revenue ?? 0) > 0 || (p.bookings ?? 0) > 0);

  const topTourColumns = [
    { title: "Tour", dataIndex: "name", key: "name" },
    {
      title: "Số booking",
      dataIndex: "bookings",
      key: "bookings",
      align: "center" as const,
      width: 110,
    },
    {
      title: "Doanh thu",
      dataIndex: "revenue",
      key: "revenue",
      align: "right" as const,
      render: (v: number) => `${v.toLocaleString("vi-VN")} đ`,
    },
  ];

  const topCustomerColumns = [
    { title: "Khách", dataIndex: "name", key: "name" },
    { title: "SĐT", dataIndex: "phone", key: "phone", width: 120 },
    {
      title: "Số đơn",
      dataIndex: "count",
      key: "count",
      width: 90,
      align: "center" as const,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <Card
        bordered={false}
        className="mb-8 rounded-lg border border-slate-200 bg-white shadow-sm"
        styles={{ body: { padding: 24 } }}
      >
        <Row gutter={[24, 24]} align="middle" justify="space-between">
          <Col flex="auto" xs={24} lg={13}>
            <div className="mb-2 flex items-center gap-2 text-slate-500">
              <ThunderboltOutlined className="text-slate-400" />
              <span className="text-xs font-semibold uppercase tracking-wide">Admin</span>
            </div>
            <Title level={2} className="!mb-2 !mt-0 !text-xl !font-bold !text-slate-900 md:!text-2xl">
              Tổng quan vận hành
            </Title>
            <Text className="block max-w-xl text-sm text-slate-500">
              Chọn kỳ thời gian để xem chỉ số, biểu đồ và cảnh báo.
            </Text>
          </Col>
          <Col xs={24} lg={11}>
            <div className="w-full rounded-lg border border-slate-200 bg-slate-50/80 p-4 text-left">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <Radio.Group
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  buttonStyle="solid"
                  className="flex flex-wrap shadow-sm"
                >
                  <Radio.Button value="day" className="!px-3">
                    Ngày
                  </Radio.Button>
                  <Radio.Button value="month" className="!px-3">
                    Tháng
                  </Radio.Button>
                  <Radio.Button value="year" className="!px-3">
                    Năm
                  </Radio.Button>
                </Radio.Group>
                {period === "day" && (
                  <DatePicker
                    value={anchor}
                    onChange={(v) => v && setAnchor(v)}
                    allowClear={false}
                    format="DD/MM/YYYY"
                    className="min-w-[140px] flex-1 sm:flex-initial"
                  />
                )}
                {period === "month" && (
                  <DatePicker
                    picker="month"
                    value={anchor}
                    onChange={(v) => v && setAnchor(v)}
                    allowClear={false}
                    format="MM/YYYY"
                    className="min-w-[120px] flex-1 sm:flex-initial"
                  />
                )}
                {period === "year" && (
                  <DatePicker
                    picker="year"
                    value={anchor}
                    onChange={(v) => v && setAnchor(v)}
                    allowClear={false}
                    format="YYYY"
                    className="min-w-[100px] flex-1 sm:flex-initial"
                  />
                )}
              </div>
              <Divider className="my-0 border-slate-100" />
              <Space wrap size={[8, 8]} className="w-full">
                <Link to="/admin/tours/create">
                  <Button size="middle" icon={<PlusOutlined />}>
                    Tour mới
                  </Button>
                </Link>
                <Link to="/admin/bookings/create">
                  <Button size="middle" icon={<PlusOutlined />}>
                    Booking
                  </Button>
                </Link>
                <Link to="/admin/providers/create">
                  <Button size="middle" icon={<PlusOutlined />}>
                    Nhà cung cấp
                  </Button>
                </Link>
                <Link to="/admin/bookings">
                  <Button size="middle" type="primary">
                    Phân bổ xe/phòng
                  </Button>
                </Link>
              </Space>
            </div>
          </Col>
        </Row>
      </Card>

      {isError && (
        <Alert
          type="error"
          showIcon
          message="Không tải được dashboard"
          description="Kiểm tra server và quyền admin."
          className="mb-4"
        />
      )}

      {isLoading || !data ? (
        <Skeleton active paragraph={{ rows: 12 }} />
      ) : (
        <>
          <div className="mb-8 border-b border-[#f1f5f9] pb-8">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <div>
                <Text className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Tổng quan tour
                </Text>
                <Title level={4} className="!mb-0 !text-lg !font-semibold !text-slate-900">
                  Số lượng & trạng thái
                </Title>
              </div>
            </div>
            <Card
              bordered={false}
              className="rounded-lg border border-slate-200 bg-white shadow-sm"
              styles={{ body: { padding: 24 } }}
            >
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 flex-1 flex-col gap-6 sm:flex-row sm:items-center">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500">
                    <GlobalOutlined className="text-2xl" />
                  </div>
                  <div className="grid min-w-0 flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-6">
                      <div className="text-[28px] font-bold leading-none tabular-nums text-slate-900 md:text-[30px]">
                        {data.kpi.totalTours}
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                        Tổng tour
                        <HintTip text="Tổng số tour trong hệ thống (mọi trạng thái)." />
                      </div>
                    </div>
                    <div className="rounded-lg border border-emerald-200/70 bg-emerald-50/50 p-6">
                      <div className="text-[28px] font-bold leading-none tabular-nums text-emerald-800 md:text-[30px]">
                        {data.kpi.activeTours}
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-sm text-emerald-800/80">
                        Đang hoạt động
                        <HintTip text="Số tour đang ở trạng thái active (mở cho đặt)." />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="shrink-0 border-t border-slate-100 pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
                  <div className="mb-3 flex items-center gap-2 text-slate-500">
                    <CalendarOutlined />
                    <Text className="text-sm font-medium text-slate-600">Trạng thái</Text>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Tag color="blue" className="m-0 inline-flex rounded-full border-0 px-3 py-1 text-sm">
                      {data.kpi.activeTours === data.kpi.totalTours && data.kpi.totalTours > 0
                        ? "Mở bán · toàn bộ"
                        : data.kpi.activeTours > 0
                          ? "Mở bán · một phần"
                          : "Chưa mở bán"}
                    </Tag>
                    <Tag color="success" className="m-0 inline-flex rounded-full border-0 px-3 py-1 text-sm">
                      Hoạt động · {data.kpi.activeTours}
                    </Tag>
                    {Math.max(0, data.kpi.totalTours - data.kpi.activeTours) > 0 && (
                      <Tag className="m-0 inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-sm text-slate-600">
                        Không hoạt động · {data.kpi.totalTours - data.kpi.activeTours}
                      </Tag>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div className="mb-8 border-b border-[#f1f5f9] pb-8">
            <div className="mb-5 flex flex-wrap items-start gap-2">
              <div>
                <Text className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Hiệu suất kỳ chọn
                </Text>
                <Title level={4} className="!mb-0 !text-lg !font-semibold !text-slate-900">
                  Chỉ số chính
                </Title>
              </div>
              <Tooltip title="Các chỉ số so sánh với kỳ liền trước (cùng độ dài: ngày / tháng / năm). Giảm mạnh được tô đỏ để dễ quét.">
                <QuestionCircleOutlined className="mt-1 cursor-help text-slate-400 hover:text-slate-500" />
              </Tooltip>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {kpiCards.map((c) => {
                const severe =
                  c.deltaType === "percent"
                    ? isSeverePercentDrop(c.deltaRaw)
                    : c.deltaRaw != null &&
                      c.deltaRaw < 0 &&
                      Math.abs(c.deltaRaw) >= 40;
                return (
                  <Card
                    key={c.title}
                    bordered={false}
                    className={`flex h-full min-h-0 flex-col rounded-lg border bg-white shadow-sm ${
                      severe
                        ? "border-red-200 bg-[#fef2f2]/80"
                        : "border-slate-200"
                    }`}
                    styles={{
                      body: {
                        padding: 24,
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                      },
                    }}
                  >
                    <div className="mb-4 flex justify-end text-slate-400">{c.icon}</div>
                    <div className="text-[28px] font-bold leading-tight tracking-tight text-slate-900 md:text-[30px]">
                      <span className="tabular-nums">{c.value}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                      <span>{c.title}</span>
                      <HintTip text={c.hintTooltip} />
                    </div>
                    <div
                      className={`mt-5 rounded-md px-3 py-3 ${
                        severe ? "bg-red-100/60 ring-1 ring-red-200/80" : "bg-slate-50 ring-1 ring-slate-100"
                      }`}
                    >
                      {c.delta}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          <div className="mb-4">
            <Text className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Xu hướng
            </Text>
            <Title level={4} className="!mb-0 !text-lg !font-semibold !text-slate-900">
              Biểu đồ & top tour
            </Title>
          </div>
          <Row gutter={[20, 20]} className="mt-0">
            <Col xs={24} lg={16}>
              <Card
                title={
                  <span className="text-base font-semibold text-slate-900">
                    Doanh thu & số booking theo thời gian
                  </span>
                }
                bordered={false}
                className="rounded-lg border border-slate-200 bg-white shadow-sm"
                styles={{
                  header: {
                    borderBottom: "1px solid #f1f5f9",
                    padding: "16px 24px",
                  },
                  body: { paddingTop: 12, paddingLeft: 24, paddingRight: 24, paddingBottom: 20 },
                }}
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <Text type="secondary" className="text-[13px]">
                    {period === "day"
                      ? "14 ngày quanh ngày chọn"
                      : period === "month"
                        ? "12 tháng gần nhất (theo tháng)"
                        : "5 năm gần nhất"}
                  </Text>
                  {!chartHasValues && (
                    <span className="inline-flex items-center rounded-full border border-amber-200/80 bg-amber-50/90 px-3 py-1 text-[12px] text-amber-900/90">
                      Chưa có dữ liệu trong các mốc thời gian này
                    </span>
                  )}
                </div>
                <div className="w-full min-w-0" style={{ minHeight: CHART_FIXED_HEIGHT }}>
                  {chartHasPoints ? (
                    <RevenueBookingComposedChart data={chartData} />
                  ) : (
                    <div
                      className="flex items-center justify-center text-slate-500 text-sm border border-dashed border-slate-200 rounded-xl bg-slate-50/80"
                      style={{ height: CHART_FIXED_HEIGHT }}
                    >
                      Không có dữ liệu biểu đồ
                    </div>
                  )}
                </div>
              </Card>
            </Col>
            <Col xs={24} lg={8}>
              <Card
                title={
                  <span className="text-base font-semibold text-slate-900">
                    Top tour bán chạy (90 ngày)
                  </span>
                }
                bordered={false}
                className="h-full rounded-lg border border-slate-200 bg-white shadow-sm lg:mr-2"
                styles={{
                  header: {
                    borderBottom: "1px solid #f1f5f9",
                    padding: "16px 24px",
                  },
                  body: { paddingBottom: 20, paddingLeft: 24, paddingRight: 24, paddingTop: 12 },
                }}
              >
                <Table
                  size="small"
                  rowKey="name"
                  columns={topTourColumns}
                  dataSource={data.topTours}
                  pagination={false}
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={[20, 20]} className="mt-10">
            <Col xs={24}>
              <Card
                title={
                  <span className="text-base font-semibold text-slate-900">
                    <WarningOutlined className="mr-2 text-amber-500" />
                    Cảnh báo nhanh
                  </span>
                }
                bordered={false}
                className="rounded-lg border border-slate-200 bg-white shadow-sm"
                styles={{
                  header: { borderBottom: "1px solid #f1f5f9", padding: "16px 24px" },
                  body: { padding: 24 },
                }}
              >
                <Space direction="vertical" className="w-full" size="middle">
                  {data.alerts.departuresSoon.length > 0 && (
                    <Alert
                      type="warning"
                      showIcon
                      message="Tour sắp khởi hành (1–3 ngày)"
                      description={
                        <ul className="list-disc pl-4 mb-0">
                          {data.alerts.departuresSoon.map((d) => (
                            <li key={d._id}>
                              <Link to={`/admin/bookings/${d._id}`}>
                                {d.tourName || "Tour"} — {d.customer_name} —{" "}
                                {dayjs(d.startDate).format("DD/MM/YYYY")}
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
                        <ul className="list-disc pl-4 mb-0">
                          {data.alerts.pendingBookings.map((d) => (
                            <li key={d._id}>
                              <Link to={`/admin/bookings/${d._id}`}>
                                {d.customer_name} · {d.tourName}
                              </Link>
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
                        <ul className="list-disc pl-4 mb-0">
                          {data.alerts.unassignedGuide.map((d) => (
                            <li key={d._id}>
                              <Link to={`/admin/bookings/${d._id}`}>
                                {d.tourName} — {d.customer_name} (
                                {dayjs(d.startDate).format("DD/MM/YYYY")})
                              </Link>
                            </li>
                          ))}
                        </ul>
                      }
                    />
                  )}
                  {(data.alerts.resourceFlags.roomsTight ||
                    data.alerts.resourceFlags.vehiclesTight ||
                    data.alerts.resourceFlags.ticketsBusy) && (
                    <Alert
                      type="warning"
                      showIcon
                      message="Tài nguyên"
                      description={
                        <ul className="mb-0 pl-4">
                          {data.alerts.resourceFlags.roomsTight && (
                            <li>Phòng khách sạn: tỷ lệ sử dụng cao hôm nay (≥85%).</li>
                          )}
                          {data.alerts.resourceFlags.vehiclesTight && (
                            <li>Xe: tỷ lệ phân bổ cao hôm nay (≥85%).</li>
                          )}
                          {data.alerts.resourceFlags.ticketsBusy && (
                            <li>
                              Vé/dịch vụ: có đơn dùng vé add-on nhưng chưa có loại vé trong hệ thống.
                            </li>
                          )}
                          <li className="text-slate-600 text-xs mt-1">
                            Phân bổ 7 ngày tới: {data.alerts.resourceFlags.roomAllocationsNextWeek}{" "}
                            lượt phòng (ước lượng).
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
                      <Text type="secondary">Không có cảnh báo hiện tại.</Text>
                    )}
                </Space>
              </Card>
            </Col>
          </Row>

          <Row gutter={[20, 20]} className="mt-2">
            <Col xs={24} md={12} lg={8}>
              <Card
                title={
                  <span className="text-base font-semibold text-slate-900">
                    Khách hàng (kỳ hiện tại)
                  </span>
                }
                bordered={false}
                className="rounded-lg border border-slate-200 bg-white shadow-sm"
                styles={{
                  header: { borderBottom: "1px solid #f1f5f9", padding: "16px 24px" },
                  body: { padding: 24 },
                }}
              >
                <Row gutter={[12, 12]}>
                  <Col span={12}>
                    <Card size="small" className="bg-emerald-50 border-0">
                      <StatisticMini label="Khách mới (SĐT)" value={data.customers.newInPeriod} />
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card size="small" className="bg-sky-50 border-0">
                      <StatisticMini
                        label="Khách quay lại"
                        value={data.customers.returningInPeriod}
                      />
                    </Card>
                  </Col>
                </Row>
                <Divider className="my-3" />
                <Text strong className="text-sm">
                  Top khách (mọi thời điểm)
                </Text>
                <Table
                  className="mt-2"
                  size="small"
                  rowKey="phone"
                  columns={topCustomerColumns}
                  dataSource={data.customers.top}
                  pagination={false}
                />
              </Card>
            </Col>
            <Col xs={24} md={12} lg={16}>
              <Card
                title={
                  <span className="text-base font-semibold text-slate-900">
                    <InboxOutlined className="mr-2 text-slate-500" />
                    Trạng thái tài nguyên (hôm nay)
                  </span>
                }
                bordered={false}
                className="rounded-lg border border-slate-200 bg-white shadow-sm"
                styles={{
                  header: { borderBottom: "1px solid #f1f5f9", padding: "16px 24px" },
                  body: { padding: 24 },
                }}
              >
                <Row gutter={[16, 16]}>
                  <Col xs={24} md={8}>
                    <Text strong>Khách sạn — phòng</Text>
                    <div className="mt-2">
                      <Progress
                        percent={data.resources.rooms.usagePct}
                        status={data.resources.rooms.usagePct >= 85 ? "exception" : "active"}
                        strokeColor="#0ea5e9"
                      />
                      <Text type="secondary" className="text-xs block">
                        Đã dùng {data.resources.rooms.usedTodayDistinct} / {data.resources.rooms.total}{" "}
                        phòng (ước lượng theo phân bổ)
                      </Text>
                      <Text className="text-xs">Còn trống ~{data.resources.rooms.freeApprox}</Text>
                    </div>
                  </Col>
                  <Col xs={24} md={8}>
                    <Text strong>Xe</Text>
                    <div className="mt-2">
                      <Progress
                        percent={data.resources.vehicles.usagePct}
                        status={data.resources.vehicles.usagePct >= 85 ? "exception" : "active"}
                        strokeColor="#8b5cf6"
                      />
                      <Text type="secondary" className="text-xs block">
                        Đã phân bổ {data.resources.vehicles.usedTodayDistinct} /{" "}
                        {data.resources.vehicles.total} xe
                      </Text>
                      <Text className="text-xs">Còn trống ~{data.resources.vehicles.freeApprox}</Text>
                    </div>
                  </Col>
                  <Col xs={24} md={8}>
                    <Text strong>Vé tham quan (sản phẩm)</Text>
                    <div className="mt-2 space-y-1">
                      <Text className="block text-sm">
                        Loại vé đang active:{" "}
                        <b>{data.resources.tickets.activeProducts}</b>
                      </Text>
                      <Text type="secondary" className="text-xs block">
                        Đơn có vé add-on: {data.resources.tickets.bookingsWithOptionalTickets}{" "}
                        (hệ thống không quản tồn vé chi tiết)
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
        <FloatButton
          icon={<PlusOutlined />}
          tooltip="Tạo tour"
          onClick={() => navigate("/admin/tours/create")}
        />
        <FloatButton
          icon={<ShoppingOutlined />}
          tooltip="Tạo booking"
          onClick={() => navigate("/admin/bookings/create")}
        />
        <FloatButton
          icon={<GlobalOutlined />}
          tooltip="Nhà cung cấp"
          onClick={() => navigate("/admin/providers/create")}
        />
        <FloatButton
          icon={<ThunderboltOutlined />}
          tooltip="Phân bổ (danh sách booking)"
          onClick={() => navigate("/admin/bookings")}
        />
      </FloatButton.Group>
    </div>
  );
};

function StatisticMini({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <Text type="secondary" className="text-xs">
        {label}
      </Text>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}

export default Dashboard;
