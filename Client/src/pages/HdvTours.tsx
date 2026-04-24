import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Card, DatePicker, Empty, Input, Select, Space, Table, Tag, Typography, Button } from "antd";
import { CarOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import "./HdvTours.css";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const API_V1 = (import.meta as any)?.env?.VITE_API_URL || "http://localhost:5000/api/v1";

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
  type FilterState = {
    search: string;
    dateRange: [dayjs.Dayjs | null, dayjs.Dayjs | null];
    status?: string;
  };

  const emptyFilters = (): FilterState => ({
    search: "",
    dateRange: [null, null],
    status: undefined,
  });

  const [draft, setDraft] = useState<FilterState>(() => emptyFilters());
  const [applied, setApplied] = useState<FilterState>(() => emptyFilters());

  const { data, isLoading } = useQuery({
    queryKey: ["hdv-bookings", applied],
    queryFn: async () => {
      const res = await axios.get(
        `${API_V1}/bookings/guide/me`,
        getAuthHeader()
      );
      return res.data?.data || [];
    },
  });

  const bookings: IBooking[] = data || [];

  const filteredBookings = useMemo(() => {
    const q = applied.search.trim().toLowerCase();
    const [from, to] = applied.dateRange ?? [null, null];
    return bookings.filter((b) => {
      if (applied.status && b.status !== applied.status) return false;
      if (q) {
        const tourName = (b.tour_id?.name || "").toLowerCase();
        const customer = (b.customer_name || "").toLowerCase();
        const phone = (b.customer_phone || "").toLowerCase();
        const id = (b._id || "").toLowerCase();
        if (!tourName.includes(q) && !customer.includes(q) && !phone.includes(q) && !id.includes(q)) return false;
      }
      if (from || to) {
        const d = dayjs(b.startDate);
        if (from && d.isBefore(from.startOf("day"))) return false;
        if (to && d.isAfter(to.endOf("day"))) return false;
      }
      return true;
    });
  }, [bookings, applied]);

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
        <div className="hdv-bookings-filterbar">
          <div className="hdv-bookings-filterbar-grid">
            <div className="hdv-bookings-filterbar-item">
              <div className="hdv-bookings-filterbar-label">Tìm kiếm</div>
              <Input
                allowClear
                placeholder="Tìm theo tour, khách, SĐT hoặc mã..."
                value={draft.search}
                onChange={(e) => setDraft((p: FilterState) => ({ ...p, search: e.target.value }))}
              />
            </div>

            <div className="hdv-bookings-filterbar-item">
              <div className="hdv-bookings-filterbar-label">Ngày khởi hành</div>
              <RangePicker
                style={{ width: "100%" }}
                value={draft.dateRange}
                onChange={(v) => setDraft((p: FilterState) => ({ ...p, dateRange: (v as any) || [null, null] }))}
                format="DD/MM/YYYY"
              />
            </div>

            <div className="hdv-bookings-filterbar-item">
              <div className="hdv-bookings-filterbar-label">Trạng thái</div>
              <Select
                allowClear
                placeholder="Tất cả"
                value={draft.status}
                onChange={(v) => setDraft((p: FilterState) => ({ ...p, status: v }))}
                options={[
                  { value: "pending", label: "Chờ duyệt" },
                  { value: "confirmed", label: "Đã xác nhận" },
                  { value: "paid", label: "Đã thanh toán" },
                  { value: "cancelled", label: "Đã hủy" },
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
              {filteredBookings.length} tour
            </Text>
          </div>
        </div>

        {filteredBookings.length === 0 && !isLoading ? (
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
            className="hdv-bookings-table"
            dataSource={filteredBookings}
            columns={columns}
            rowKey="_id"
            loading={isLoading}
            pagination={{
              pageSize: 10,
              showSizeChanger: false,
              showTotal: (total) => `Tổng ${total} tour`,
            }}
            scroll={{ x: 1000 }}
            onRow={(record) => ({
              onClick: () => navigate(`/hdv/tours/${record._id}`),
            })}
          />
        )}
      </Card>
    </div>
  );
};

export default HdvTours;
