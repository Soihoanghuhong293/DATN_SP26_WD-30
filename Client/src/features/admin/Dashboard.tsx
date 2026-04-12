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
  Tooltip,
  Legend,
} from "recharts";

const { Title, Text } = Typography;

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

function Delta({
  value,
  suffix = "%",
}: {
  value: number;
  suffix?: string;
}) {
  if (value === 0) {
    return (
      <span className="text-sm text-slate-500 inline-flex items-center gap-1">
        <span className="font-medium text-slate-600">Bằng kỳ trước</span>
        <span className="text-slate-400">(0{suffix})</span>
      </span>
    );
  }
  const up = value > 0;
  return (
    <span
      className={`text-sm font-medium inline-flex items-center gap-1 ${up ? "text-emerald-600" : "text-rose-600"}`}
    >
      {up ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
      {up ? "+" : ""}
      {value}
      {suffix} <span className="font-normal text-slate-500">so với kỳ trước</span>
    </span>
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
          <Tooltip
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
      <Text type="secondary" className="text-sm">
        Cần lịch khởi hành có slots
      </Text>
    );
  }
  if (value === 0) {
    return (
      <span className="text-sm text-slate-500">
        <span className="font-medium text-slate-600">Bằng kỳ trước</span>
      </span>
    );
  }
  const up = value > 0;
  return (
    <span
      className={`text-sm font-medium inline-flex items-center gap-1 ${up ? "text-emerald-600" : "text-rose-600"}`}
    >
      {up ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
      {up ? "+" : ""}
      {value} điểm %{" "}
      <span className="font-normal text-slate-500">so với kỳ trước</span>
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
        hint: "Theo ngày tạo đơn, không tính đã hủy",
        value: kpi.totalBookings,
        icon: <ShoppingOutlined className="text-2xl text-violet-600" />,
        delta: <Delta value={kpi.totalBookingsDelta} />,
        accent: "border-l-violet-500",
        iconBg: "bg-violet-50",
      },
      {
        title: "Doanh thu",
        hint: "Đã cọc / đã thanh toán",
        value: `${kpi.revenue.toLocaleString("vi-VN")} đ`,
        icon: <DollarOutlined className="text-2xl text-rose-600" />,
        delta: <Delta value={kpi.revenueDelta} />,
        accent: "border-l-rose-500",
        iconBg: "bg-rose-50",
      },
      {
        title: "Khách (chỗ)",
        hint: "Tổng chỗ đặt trong kỳ",
        value: kpi.passengersServed,
        icon: <TeamOutlined className="text-2xl text-emerald-600" />,
        delta: <Delta value={kpi.passengersDelta} />,
        accent: "border-l-emerald-500",
        iconBg: "bg-emerald-50",
      },
      {
        title: "Tỉ lệ lấp đầy",
        hint: "Ước tính theo slot tour & chỗ đặt",
        value: kpi.occupancyPct != null ? `${kpi.occupancyPct}%` : "—",
        icon: <PieChartOutlined className="text-2xl text-amber-600" />,
        delta: <OccupancyDelta value={kpi.occupancyDelta} />,
        accent: "border-l-amber-500",
        iconBg: "bg-amber-50",
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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 pb-24">
      <Card
        bordered={false}
        className="mb-4 shadow-sm rounded-2xl border-0 bg-gradient-to-r from-sky-600 via-sky-500 to-cyan-500 text-white"
        styles={{ body: { padding: "20px 24px" } }}
      >
        <Row gutter={[16, 16]} align="middle" justify="space-between">
          <Col flex="auto">
            <div className="inline-flex items-center gap-2 bg-white/15 px-3 py-1 rounded-full mb-2">
              <ThunderboltOutlined />
              <span className="text-xs font-semibold uppercase tracking-wide">
                Khu vực quản trị
              </span>
            </div>
            <Title level={3} style={{ color: "#fff", margin: "0 0 4px" }}>
              Tổng quan vận hành
            </Title>
            <Text style={{ color: "rgba(255,255,255,0.9)" }}>
              KPI, xu hướng, cảnh báo và tài nguyên — theo kỳ bạn chọn
            </Text>
          </Col>
          <Col>
            <Space wrap className="bg-white/10 p-2 rounded-xl backdrop-blur-sm">
              <Radio.Group
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                buttonStyle="solid"
              >
                <Radio.Button value="day">Ngày</Radio.Button>
                <Radio.Button value="month">Tháng</Radio.Button>
                <Radio.Button value="year">Năm</Radio.Button>
              </Radio.Group>
              {period === "day" && (
                <DatePicker
                  value={anchor}
                  onChange={(v) => v && setAnchor(v)}
                  allowClear={false}
                  format="DD/MM/YYYY"
                />
              )}
              {period === "month" && (
                <DatePicker
                  picker="month"
                  value={anchor}
                  onChange={(v) => v && setAnchor(v)}
                  allowClear={false}
                  format="MM/YYYY"
                />
              )}
              {period === "year" && (
                <DatePicker
                  picker="year"
                  value={anchor}
                  onChange={(v) => v && setAnchor(v)}
                  allowClear={false}
                  format="YYYY"
                />
              )}
              <Divider type="vertical" className="border-white/30 h-8 m-0 hidden md:inline-block" />
              <Space wrap className="hidden lg:flex">
                <Link to="/admin/tours/create">
                  <Button size="small" icon={<PlusOutlined />}>
                    Tour mới
                  </Button>
                </Link>
                <Link to="/admin/bookings/create">
                  <Button size="small" icon={<PlusOutlined />}>
                    Booking
                  </Button>
                </Link>
                <Link to="/admin/providers/create">
                  <Button size="small" icon={<PlusOutlined />}>
                    Nhà cung cấp
                  </Button>
                </Link>
                <Link to="/admin/bookings">
                  <Button size="small" type="primary" ghost>
                    Phân bổ xe/phòng
                  </Button>
                </Link>
              </Space>
            </Space>
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
          <Card
            bordered={false}
            className="mb-4 rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4 min-w-0">
                <div className="shrink-0 w-14 h-14 rounded-2xl bg-sky-50 flex items-center justify-center border border-sky-100">
                  <GlobalOutlined className="text-2xl text-sky-600" />
                </div>
                <div className="min-w-0">
                  <Text className="text-xs uppercase tracking-wider text-slate-500 font-semibold block">
                    Tour trong hệ thống
                  </Text>
                  <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-3xl font-bold text-slate-900 tabular-nums">
                      {data.kpi.totalTours}
                    </span>
                    <span className="text-slate-400 text-lg">·</span>
                    <span className="text-lg text-slate-700">
                      <span className="font-semibold text-emerald-600 tabular-nums">
                        {data.kpi.activeTours}
                      </span>{" "}
                      <span className="text-slate-500 font-normal text-base">đang hoạt động</span>
                    </span>
                  </div>
                  <Text type="secondary" className="text-sm block mt-1">
                    Tổng số tour và tour trạng thái active — gọn một dòng để dễ quét.
                  </Text>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 pl-0 sm:pl-4 sm:border-l sm:border-slate-100">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100">
                  <CalendarOutlined className="text-xl text-blue-600" />
                </div>
                <div>
                  <Text className="text-xs text-slate-500 block">Trạng thái</Text>
                  <Text strong className="text-base text-slate-800">
                    {data.kpi.activeTours === data.kpi.totalTours && data.kpi.totalTours > 0
                      ? "Toàn bộ đang mở bán"
                      : data.kpi.activeTours > 0
                        ? "Có tour đang mở bán"
                        : "Chưa có tour active"}
                  </Text>
                </div>
              </div>
            </div>
          </Card>

          <Row gutter={[16, 16]}>
            {kpiCards.map((c) => (
              <Col xs={24} sm={12} xl={6} key={c.title}>
                <Card
                  bordered={false}
                  className={`h-full rounded-2xl shadow-sm hover:shadow-md transition-shadow border-0 border-l-4 ${c.accent} bg-white`}
                  styles={{ body: { padding: "20px 20px 18px" } }}
                >
                  <div className="relative pl-0">
                    <div
                      className={`absolute top-0 right-0 w-11 h-11 rounded-xl flex items-center justify-center ${c.iconBg}`}
                    >
                      {c.icon}
                    </div>
                    <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500 pr-14">
                      {c.title}
                    </Text>
                    <div className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2 truncate tabular-nums pr-2">
                      {c.value}
                    </div>
                    <div className="mt-3 min-h-[1.5rem] flex items-start">{c.delta}</div>
                    <Text type="secondary" className="text-xs block mt-2 leading-relaxed">
                      {c.hint}
                    </Text>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>

          <Row gutter={[16, 16]} className="mt-4">
            <Col xs={24} lg={16}>
              <Card
                title="Doanh thu & số booking theo thời gian"
                bordered={false}
                className="rounded-2xl shadow-sm"
                styles={{ body: { paddingTop: 12 } }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <Text type="secondary" className="text-sm">
                    {period === "day"
                      ? "14 ngày quanh ngày chọn"
                      : period === "month"
                        ? "12 tháng gần nhất (theo tháng)"
                        : "5 năm gần nhất"}
                  </Text>
                  {!chartHasValues && (
                    <Text className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded-md border border-amber-100">
                      Chưa có dữ liệu booking/doanh thu trong các mốc này
                    </Text>
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
                title="Top tour bán chạy (90 ngày)"
                bordered={false}
                className="rounded-2xl shadow-sm h-full lg:mr-2"
                styles={{ body: { paddingBottom: 16 } }}
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

          <Row gutter={[16, 16]} className="mt-4">
            <Col xs={24}>
              <Card
                title={
                  <span>
                    <WarningOutlined className="text-amber-500 mr-2" />
                    Cảnh báo nhanh
                  </span>
                }
                bordered={false}
                className="rounded-2xl shadow-sm"
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

          <Row gutter={[16, 16]} className="mt-4">
            <Col xs={24} md={12} lg={8}>
              <Card title="Khách hàng (kỳ hiện tại)" bordered={false} className="rounded-2xl shadow-sm">
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
                  <span>
                    <InboxOutlined className="mr-2" />
                    Trạng thái tài nguyên (hôm nay)
                  </span>
                }
                bordered={false}
                className="rounded-2xl shadow-sm"
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
