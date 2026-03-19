import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Button, Card, Empty, Select, Space, Spin, Table, Tag, Typography } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'paid' | 'deposit' | 'refunded';

interface MyBooking {
  _id: string;
  tour_id?: { _id: string; name: string };
  startDate: string;
  groupSize: number;
  total_price: number;
  status: BookingStatus;
}

const API = 'http://localhost:5000/api/v1/bookings';

const statusOptions = [
  { value: 'all', label: 'Tất cả' },
  { value: 'pending', label: 'Chờ duyệt' },
  { value: 'confirmed', label: 'Đã xác nhận' },
  { value: 'canceled', label: 'Đã hủy' }
];

const statusTagMap: Record<string, { color: string; text: string }> = {
  pending: { color: 'warning', text: 'Chờ duyệt' },
  confirmed: { color: 'processing', text: 'Đã xác nhận' },
  cancelled: { color: 'error', text: 'Đã hủy' },
  paid: { color: 'success', text: 'Đã thanh toán' },
  deposit: { color: 'purple', text: 'Đã cọc' },
  refunded: { color: 'default', text: 'Hoàn tiền' }
};

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

const MyBookingsPage = () => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['my-bookings', statusFilter],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return [];
      }

      const query = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const res = await axios.get(`${API}/me${query}`, getAuthHeader());
      return res.data?.data || [];
    },
    retry: false
  });

  const bookings: MyBooking[] = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  const columns = [
    {
      title: 'Tour đã đặt',
      key: 'tour',
      render: (_: unknown, record: MyBooking) => <Text strong>{record.tour_id?.name || 'Tour không xác định'}</Text>
    },
    {
      title: 'Ngày đi',
      dataIndex: 'startDate',
      key: 'startDate',
      render: (date: string) => dayjs(date).format('DD/MM/YYYY')
    },
    {
      title: 'Số người',
      dataIndex: 'groupSize',
      key: 'groupSize',
      align: 'center' as const,
      render: (groupSize: number) => <Tag color="geekblue">{groupSize} người</Tag>
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'total_price',
      key: 'total_price',
      align: 'right' as const,
      render: (value: number) => <Text strong type="danger">{(value || 0).toLocaleString()} đ</Text>
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      align: 'center' as const,
      render: (status: BookingStatus) => {
        const mapped = statusTagMap[status] || { color: 'default', text: status };
        return <Tag color={mapped.color}>{mapped.text}</Tag>;
      }
    },
    {
      title: 'Hành động',
      key: 'actions',
      align: 'center' as const,
      render: (_: unknown, record: MyBooking) => (
        <Button icon={<EyeOutlined />} onClick={() => navigate(`/my-bookings/${record._id}`)}>
          Xem chi tiết
        </Button>
      )
    }
  ];

  return (
    <div style={{ maxWidth: 1100, margin: '24px auto', padding: '0 16px' }}>
      <Card>
        <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
          <Title level={3} style={{ margin: 0 }}>Booking của tôi</Title>
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            options={statusOptions}
            style={{ minWidth: 180 }}
          />
        </Space>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <Spin size="large" />
          </div>
        ) : bookings.length === 0 ? (
          <Empty description="Bạn chưa có booking nào" />
        ) : (
          <Table
            rowKey="_id"
            columns={columns}
            dataSource={bookings}
            pagination={{ pageSize: 8 }}
          />
        )}
      </Card>
    </div>
  );
};

export default MyBookingsPage;
