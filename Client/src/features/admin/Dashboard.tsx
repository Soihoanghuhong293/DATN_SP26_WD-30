import React, { useMemo, useState } from "react";
import { Card, Row, Col, Typography, DatePicker, Radio, Tag, Table, Skeleton } from "antd";
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  UserOutlined,
  ShoppingCartOutlined,
  DollarCircleOutlined,
  FireOutlined,
} from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

type DashboardMode = "date" | "month" | "year";

interface IBookingDashboard {
  _id: string;
  tour_id?: { _id: string; name: string };
  user_id?: { _id: string; name: string; email: string };
  customer_name?: string;
  customer_phone?: string;
  total_price?: number;
  price?: number;
  startDate: string;
  groupSize: number;
  status: "pending" | "confirmed" | "paid" | "cancelled" | "deposit" | "refunded";
  created_at: string;
}

const Dashboard: React.FC = () => {
  const [mode, setMode] = useState<DashboardMode>("date");
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(dayjs());

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["bookings-dashboard"],
    queryFn: async () => {
      const res = await axios.get("http://localhost:5000/api/v1/bookings", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      return (res.data?.data || res.data || []) as IBookingDashboard[];
    },
  });

  const [range, rangeLabel] = useMemo(() => {
    if (!selectedDate) {
      return [null, "" as string];
    }

    if (mode === "date") {
      const start = selectedDate.startOf("day");
      const end = selectedDate.endOf("day");
      return [[start, end], `Ngày ${start.format("DD/MM/YYYY")}`] as const;
    }

    if (mode === "month") {
      const start = selectedDate.startOf("month");
      const end = selectedDate.endOf("month");
      return [[start, end], `Tháng ${start.format("MM/YYYY")}`] as const;
    }

    const start = selectedDate.startOf("year");
    const end = selectedDate.endOf("year");
    return [[start, end], `Năm ${start.format("YYYY")}`] as const;
  }, [mode, selectedDate]);

  const {
    filteredBookings,
    totalRevenue,
    totalBookings,
    totalCustomers,
    totalPassengers,
    statusStats,
    popularTours,
  } = useMemo(() => {
    if (!bookings || !range) {
      return {
        filteredBookings: [] as IBookingDashboard[],
        totalRevenue: 0,
        totalBookings: 0,
        totalCustomers: 0,
        totalPassengers: 0,
        statusStats: {} as Record<string, number>,
        popularTours: [] as { tourName: string; count: number; revenue: number }[],
      };
    }

    const [start, end] = range;

    const filtered = bookings.filter((b) => {
      const date = dayjs(b.startDate || b.created_at);
      return date.isAfter(start) && date.isBefore(end) || date.isSame(start) || date.isSame(end);
    });

    const revenue = filtered.reduce((sum, b) => {
      const money = b.total_price || b.price || 0;
      // chỉ tính doanh thu cho booking đã thanh toán / cọc / xác nhận
      if (["paid", "deposit", "confirmed"].includes(b.status)) {
        return sum + money;
      }
      return sum;
    }, 0);

    const bookingCount = filtered.length;
    const passengers = filtered.reduce((sum, b) => sum + (b.groupSize || 0), 0);

    const customerSet = new Set<string>();
    filtered.forEach((b) => {
      if (b.customer_phone) {
        customerSet.add(b.customer_phone);
      } else if (b.user_id?._id) {
        customerSet.add(b.user_id._id);
      }
    });

    const statusCounter: Record<string, number> = {};
    filtered.forEach((b) => {
      statusCounter[b.status] = (statusCounter[b.status] || 0) + 1;
    });

    const tourMap = new Map<string, { count: number; revenue: number }>();
    filtered.forEach((b) => {
      const tourName = b.tour_id?.name || "Không rõ tour";
      const current = tourMap.get(tourName) || { count: 0, revenue: 0 };
      const money = b.total_price || b.price || 0;
      tourMap.set(tourName, {
        count: current.count + 1,
        revenue: current.revenue + money,
      });
    });

    const popularToursArr = Array.from(tourMap.entries())
      .map(([tourName, value]) => ({ tourName, ...value }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      filteredBookings: filtered,
      totalRevenue: revenue,
      totalBookings: bookingCount,
      totalCustomers: customerSet.size,
      totalPassengers: passengers,
      statusStats: statusCounter,
      popularTours: popularToursArr,
    };
  }, [bookings, range]);

  const statusColorMap: Record<string, { color: string; text: string }> = {
    pending: { color: "default", text: "Chờ duyệt" },
    confirmed: { color: "processing", text: "Đã xác nhận" },
    paid: { color: "success", text: "Đã thanh toán" },
    cancelled: { color: "error", text: "Đã hủy" },
    deposit: { color: "purple", text: "Đã cọc" },
    refunded: { color: "default", text: "Hoàn tiền" },
  };

  const popularColumns = [
    {
      title: "Tour",
      dataIndex: "tourName",
      key: "tourName",
      render: (value: string) => <Text strong>{value}</Text>,
    },
    {
      title: "Số booking",
      dataIndex: "count",
      key: "count",
      align: "center" as const,
    },
    {
      title: "Doanh thu ước tính",
      dataIndex: "revenue",
      key: "revenue",
      align: "right" as const,
      render: (value: number) => <Text>{value.toLocaleString()} đ</Text>,
    },
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex flex-wrap justify-between items-center mb-6">
        <div>
          <Title level={3} className="m-0">
            Tổng quan hệ thống
          </Title>
          <Text type="secondary">Theo dõi doanh thu, booking, khách hàng và tour</Text>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <Radio.Group
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            buttonStyle="solid"
          >
            <Radio.Button value="date">Ngày</Radio.Button>
            <Radio.Button value="month">Tháng</Radio.Button>
            <Radio.Button value="year">Năm</Radio.Button>
          </Radio.Group>

          {mode === "date" && (
            <DatePicker
              value={selectedDate}
              onChange={(value) => setSelectedDate(value)}
              allowClear={false}
              format="DD/MM/YYYY"
            />
          )}

          {mode === "month" && (
            <DatePicker
              picker="month"
              value={selectedDate}
              onChange={(value) => setSelectedDate(value)}
              allowClear={false}
              format="MM/YYYY"
            />
          )}

          {mode === "year" && (
            <DatePicker
              picker="year"
              value={selectedDate}
              onChange={(value) => setSelectedDate(value)}
              allowClear={false}
              format="YYYY"
            />
          )}
        </div>
      </div>

      <Card className="mb-4" bordered={false}>
        <Text type="secondary">Dữ liệu hiển thị theo {rangeLabel.toLowerCase()}</Text>
      </Card>

      <Row gutter={[24, 24]}>
        <Col xs={24} md={12} lg={6}>
          <Card bordered={false} className="shadow-sm rounded-xl">
            <div className="flex justify-between items-center">
              <div>
                <Text type="secondary">Doanh thu</Text>
                <div className="text-2xl font-semibold mt-1 text-red-500">
                  {totalRevenue.toLocaleString()} đ
                </div>
                <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  <ArrowUpOutlined className="text-green-500" /> So với kỳ trước
                </div>
              </div>
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                <DollarCircleOutlined className="text-red-500 text-xl" />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} md={12} lg={6}>
          <Card bordered={false} className="shadow-sm rounded-xl">
            <div className="flex justify-between items-center">
              <div>
                <Text type="secondary">Số booking</Text>
                <div className="text-2xl font-semibold mt-1">{totalBookings}</div>
                <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  <ArrowUpOutlined className="text-green-500" /> So với kỳ trước
                </div>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                <ShoppingCartOutlined className="text-blue-500 text-xl" />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} md={12} lg={6}>
          <Card bordered={false} className="shadow-sm rounded-xl">
            <div className="flex justify-between items-center">
              <div>
                <Text type="secondary">Số khách hàng</Text>
                <div className="text-2xl font-semibold mt-1">{totalCustomers}</div>
                <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  <ArrowDownOutlined className="text-red-500" /> So với kỳ trước
                </div>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
                <UserOutlined className="text-green-500 text-xl" />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} md={12} lg={6}>
          <Card bordered={false} className="shadow-sm rounded-xl">
            <div className="flex justify-between items-center">
              <div>
                <Text type="secondary">Số khách (passengers)</Text>
                <div className="text-2xl font-semibold mt-1">{totalPassengers}</div>
                <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  <FireOutlined className="text-orange-500" /> Tour nhộn nhịp
                </div>
              </div>
              <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center">
                <FireOutlined className="text-orange-500 text-xl" />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]} className="mt-6">
        <Col xs={24} lg={12}>
          <Card
            title="Tình trạng booking"
            bordered={false}
            className="shadow-sm rounded-xl"
          >
            {isLoading ? (
              <Skeleton active />
            ) : (
              <div className="space-y-3">
                {Object.keys(statusStats).length === 0 && (
                  <Text type="secondary">Không có dữ liệu trong khoảng thời gian này.</Text>
                )}

                {Object.entries(statusStats).map(([status, count]) => {
                  const info = statusColorMap[status] || {
                    color: "default",
                    text: status,
                  };

                  const percent =
                    filteredBookings.length > 0
                      ? Math.round((count * 100) / filteredBookings.length)
                      : 0;

                  return (
                    <div
                      key={status}
                      className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <Tag color={info.color} bordered={false}>
                          {info.text}
                        </Tag>
                        <Text type="secondary">{percent}%</Text>
                      </div>
                      <Text strong>{count}</Text>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title="Tour phổ biến"
            bordered={false}
            className="shadow-sm rounded-xl"
          >
            {isLoading ? (
              <Skeleton active />
            ) : (
              <Table
                size="small"
                rowKey="tourName"
                columns={popularColumns}
                dataSource={popularTours}
                pagination={false}
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
