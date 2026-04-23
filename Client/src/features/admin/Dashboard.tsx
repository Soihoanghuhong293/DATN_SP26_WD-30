import React, { useMemo, useState } from "react";
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
  ResponsiveContainer,
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
      <Text type="secondary" className="text-xs">
        0{suffix} so với kỳ trước
      </Text>
    );
  }
  const up = value > 0;
  return (
    <span
      className={`text-xs inline-flex items-center gap-0.5 ${up ? "text-emerald-600" : "text-rose-600"}`}
    >
      {up ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
      {up ? "+" : ""}
      {value}
      {suffix} so với kỳ trước
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
        title: "Tổng số tour",
        value: kpi.totalTours,
        icon: <GlobalOutlined className="text-xl text-cyan-600" />,
        delta: null as React.ReactNode,
        sub: `${kpi.activeTours} đang hoạt động`,
        bg: "bg-cyan-50",
      },
      {
        title: "Tour đang hoạt động",
        value: kpi.activeTours,
        icon: <CalendarOutlined className="text-xl text-blue-600" />,
        delta: null,
        sub: "Trạng thái active",
        bg: "bg-blue-50",
      },
      {
        title: "Tổng booking",
        value: kpi.totalBookings,
        icon: <ShoppingOutlined className="text-xl text-violet-600" />,
        delta: <Delta value={kpi.totalBookingsDelta} />,
        sub: "Trong kỳ (theo ngày tạo đơn)",
        bg: "bg-violet-50",
      },
      {
        title: "Doanh thu",
        value: `${kpi.revenue.toLocaleString("vi-VN")} đ`,
        icon: <DollarOutlined className="text-xl text-rose-600" />,
        delta: <Delta value={kpi.revenueDelta} />,
        sub: "Đã cọc / đã thanh toán",
        bg: "bg-rose-50",
      },
      {
        title: "Khách (vé)",
        value: kpi.passengersServed,
        icon: <TeamOutlined className="text-xl text-emerald-600" />,
        delta: <Delta value={kpi.passengersDelta} />,
        sub: "Tổng chỗ trong kỳ",
        bg: "bg-emerald-50",
      },
      {
        title: "Tỉ lệ lấp đầy",
        value:
          kpi.occupancyPct != null ? `${kpi.occupancyPct}%` : "—",
        icon: <PieChartOutlined className="text-xl text-amber-600" />,
        delta:
          kpi.occupancyDelta != null ? (
            <Text
              type="secondary"
              className="text-xs"
            >{`${kpi.occupancyDelta >= 0 ? "+" : ""}${kpi.occupancyDelta} điểm % so với kỳ trước`}</Text>
          ) : (
            <Text type="secondary" className="text-xs">
              Cần lịch khởi hành có slots
            </Text>
          ),
        sub: "Theo booking trong kỳ",
        bg: "bg-amber-50",
      },
    ];
  }, [data]);

  const chartData = data?.charts.revenueAndBookings ?? [];

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
          <Row gutter={[16, 16]}>
            {kpiCards.map((c) => (
              <Col xs={24} sm={12} xl={8} key={c.title}>
                <Card
                  bordered={false}
                  className="h-full rounded-2xl shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between gap-3">
                    <div className="min-w-0">
                      <Text type="secondary" className="text-xs uppercase tracking-wide">
                        {c.title}
                      </Text>
                      <div className="text-2xl font-semibold mt-1 truncate">{c.value}</div>
                      <div className="mt-1">{c.delta}</div>
                      <Text type="secondary" className="text-xs block mt-1">
                        {c.sub}
                      </Text>
                    </div>
                    <div
                      className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center ${c.bg}`}
                    >
                      {c.icon}
                    </div>
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
              >
                <Text type="secondary" className="text-xs block mb-2">
                  Chu kỳ hiển thị:{" "}
                  {period === "day"
                    ? "14 ngày quanh ngày chọn"
                    : period === "month"
                      ? "12 tháng"
                      : "5 năm"}
                </Text>
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis
                        yAxisId="left"
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}tr`}
                      />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(value: any, name: any) => {
                          const n = String(name ?? '');
                          const vNum = typeof value === 'number' ? value : Number(value ?? 0);
                          if (n === 'revenue') {
                            return [`${Number.isFinite(vNum) ? vNum.toLocaleString('vi-VN') : '0'} đ`, 'Doanh thu'];
                          }
                          return [Number.isFinite(vNum) ? vNum : 0, 'Booking'];
                        }}
                      />
                      <Legend />
                      <Bar
                        yAxisId="right"
                        dataKey="bookings"
                        name="Số booking"
                        fill="#94a3b8"
                        radius={[4, 4, 0, 0]}
                      />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="revenue"
                        name="Doanh thu"
                        stroke="#0ea5e9"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </Col>
            <Col xs={24} lg={8}>
              <Card
                title="Top tour bán chạy (90 ngày)"
                bordered={false}
                className="rounded-2xl shadow-sm h-full"
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
