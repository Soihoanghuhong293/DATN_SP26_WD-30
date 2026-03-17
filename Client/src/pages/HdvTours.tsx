import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Card, Table, Tag, Typography, Empty, Button } from "antd";
import { CarOutlined, EyeOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const { Title, Text } = Typography;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
});

interface IBooking {
  _id: string;
  tour_id?: { _id: string; name: string; duration_days?: number };
  customer_name?: string;
  customer_phone?: string;
  total_price?: number;
  startDate: string;
  endDate?: string;
  groupSize: number;
  status: "pending" | "confirmed" | "paid" | "cancelled";
}

const statusMap: Record<string, { color: string; label: string }> = {
  pending: { color: "orange", label: "Chờ duyệt" },
  confirmed: { color: "blue", label: "Đã xác nhận" },
  paid: { color: "green", label: "Đã thanh toán" },
  deposit: { color: "purple", label: "Đã cọc" },
  cancelled: { color: "red", label: "Đã hủy" },
  refunded: { color: "gray", label: "Hoàn tiền" },
};

const HdvTours = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["hdv-bookings"],
    queryFn: async () => {
      const res = await axios.get(
        "http://localhost:5000/api/v1/bookings/guide/me",
        getAuthHeader()
      );
      return res.data?.data || [];
    },
  });

  const bookings: IBooking[] = data || [];

  const columns = [
    {
      title: "Tour",
      key: "tour",
      render: (_: unknown, record: IBooking) => (
        <div>
          <div style={{ fontWeight: 600, color: "#1f2937" }}>
            {record.tour_id?.name || "—"}
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.tour_id?.duration_days ? `${record.tour_id.duration_days} ngày` : ""}
          </Text>
        </div>
      ),
    },
    {
      title: "Thời gian",
      key: "dates",
      render: (_: unknown, record: IBooking) => (
        <div>
          <div>{dayjs(record.startDate).format("DD/MM/YYYY")}</div>
          {record.endDate && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              → {dayjs(record.endDate).format("DD/MM/YYYY")}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: "Khách hàng",
      key: "customer",
      render: (_: unknown, record: IBooking) => (
        <div>
          <div>{record.customer_name || "—"}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.customer_phone || ""}
          </Text>
        </div>
      ),
    },
    {
      title: "Số khách",
      dataIndex: "groupSize",
      key: "groupSize",
      render: (val: number) => `${val || 0} người`,
    },
    {
      title: "Tổng tiền",
      key: "total_price",
      render: (_: unknown, record: IBooking) =>
        record.total_price
          ? `${(record.total_price as number).toLocaleString("vi-VN")} đ`
          : "—",
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
        const s = statusMap[status] || { color: "default", label: status };
        return <Tag color={s.color}>{s.label}</Tag>;
      },
    },
    {
      title: "Hành động",
      key: "actions",
      render: (_: unknown, record: IBooking) => (
        <Button
          type="primary"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/hdv/tours/${record._id}`)}
        >
          Xem chi tiết
        </Button>
      ),
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
        Tour của tôi
      </h1>
      <p
        style={{
          fontSize: 14,
          color: "#6b7280",
          marginBottom: 24,
        }}
      >
        Danh sách các tour bạn được phân công hướng dẫn
      </p>

      <Card
        bordered={false}
        style={{
          borderRadius: 12,
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        }}
      >
        {bookings.length === 0 && !isLoading ? (
          <Empty
            image={<CarOutlined style={{ fontSize: 64, color: "#d9d9d9" }} />}
            description="Chưa có tour nào được phân công cho bạn"
            style={{ padding: 48 }}
          >
            <Text type="secondary">
              Khi Admin tạo booking và gán bạn làm HDV, tour sẽ hiển thị ở đây.
            </Text>
          </Empty>
        ) : (
          <Table
            dataSource={bookings}
            columns={columns}
            rowKey="_id"
            loading={isLoading}
            pagination={{
              pageSize: 10,
              showSizeChanger: false,
              showTotal: (total) => `Tổng ${total} tour`,
            }}
          />
        )}
      </Card>
    </div>
  );
};

export default HdvTours;
