import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Table, Button, Space, Tag, Popconfirm, message, Typography, Tooltip, Input } from 'antd';
import { DeleteOutlined, EyeOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminListCard from '../../components/admin/AdminListCard';

const { Text } = Typography;

interface IBooking {
  _id: string;
  tour_id?: { _id: string; name: string };
  user_id?: { _id: string; name: string; email: string };

  customer_name?: string;
  customer_phone?: string;

  total_price?: number;
  price?: number;

  startDate: string;
  endDate?: string;
  groupSize: number;

  // Trạng thái đơn (booking_status)
  status: 'pending' | 'confirmed' | 'cancelled';
  // Trạng thái thanh toán (payment_status)
  payment_status?: 'unpaid' | 'deposit' | 'paid' | 'refunded';

  created_at: string;
}

const BookingList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState('');

  // ✅ GET LIST
  const { data: bookings, isLoading } = useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const res = await axios.get('http://localhost:5000/api/v1/bookings', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      return res.data?.data || res.data || [];
    },
  });

  // ✅ DELETE
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`http://localhost:5000/api/v1/bookings/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
    },
    onSuccess: () => {
      message.success('Đã xóa đơn đặt tour!');
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });

  // ✅ SEARCH
  const filteredBookings = useMemo(() => {
    if (!bookings) return [];
    if (!searchText) return bookings;

    const lowerText = searchText.toLowerCase();

    return bookings.filter((b: IBooking) => {
      const customerName = (b.customer_name || b.user_id?.name || '').toLowerCase();
      const contact = (b.customer_phone || b.user_id?.email || '').toLowerCase();
      const tourName = (b.tour_id?.name || '').toLowerCase();
      const id = (b._id || '').toLowerCase();

      return (
        customerName.includes(lowerText) ||
        contact.includes(lowerText) ||
        tourName.includes(lowerText) ||
        id.includes(lowerText)
      );
    });
  }, [bookings, searchText]);

  const paymentStatusMap = {
    unpaid: { color: 'warning', text: 'Chưa thanh toán' },
    deposit: { color: 'purple', text: 'Đã đặt cọc' },
    paid: { color: 'success', text: 'Đã thanh toán đủ' },
    refunded: { color: 'default', text: 'Đã hoàn tiền' },
  } as const;

  const resolvePaymentStatus = (record: IBooking) => {
    if (record.status === 'cancelled') return 'unpaid' as const;
    if (record.payment_status) return record.payment_status;

    // Tương thích dữ liệu cũ (nếu từng lưu paid/deposit/refunded trong status)
    const legacy = record.status as any;
    if (legacy === 'paid') return 'paid' as const;
    if (legacy === 'deposit') return 'deposit' as const;
    if (legacy === 'refunded') return 'refunded' as const;

    return 'unpaid' as const;
  };

  const columns = [
    {
      title: 'Mã Đơn',
      dataIndex: '_id',
      key: 'id',
      render: (id: string) => (
        <Text strong className="text-gray-500">
          #{id.slice(-6).toUpperCase()}
        </Text>
      ),
    },
    {
      title: 'Khách hàng',
      key: 'customer',
      render: (_: any, record: IBooking) => {
        const name = record.customer_name || record.user_id?.name || 'Khách vãng lai';
        const contact = record.customer_phone || record.user_id?.email || 'Chưa có';

        return (
          <div>
            <div className="font-bold text-blue-600">{name}</div>
            <div className="text-xs text-gray-500">{contact}</div>
          </div>
        );
      },
    },
    {
      title: 'Tour & Thời gian',
      key: 'tour',
      render: (_: any, record: IBooking) => (
        <div>
          <Tooltip title={record.tour_id?.name}>
            <div className="font-bold truncate max-w-[200px]">
              {record.tour_id?.name || 'Tour đã bị xóa'}
            </div>
          </Tooltip>
          <div className="text-xs text-gray-500 mt-1">
            {dayjs(record.startDate).format('DD/MM/YYYY')}
            {record.endDate && ` - ${dayjs(record.endDate).format('DD/MM/YYYY')}`}
          </div>
        </div>
      ),
    },
    {
      title: 'Khách',
      dataIndex: 'groupSize',
      key: 'groupSize',
      align: 'center' as const,
      render: (size: number) => <Tag color="geekblue">{size} người</Tag>,
    },
    {
      title: 'Tổng tiền',
      key: 'totalPrice',
      align: 'right' as const,
      render: (_: any, record: IBooking) => {
        const money = record.total_price || record.price || 0;
        return (
          <Text type="danger" strong>
            {money.toLocaleString()} đ
          </Text>
        );
      },
    },
    {
      title: 'Trạng thái',
      key: 'status',
      render: (_: any, record: IBooking) => {
        if (record.status === 'cancelled') {
          return <Tag color="error" bordered={false}>Đã hủy</Tag>;
        }

        const resolved = resolvePaymentStatus(record);
        const current = paymentStatusMap[resolved] || paymentStatusMap.unpaid;

        return <Tag color={current.color} bordered={false}>{current.text}</Tag>;
      },
    },
    {
      title: 'Hành động',
      key: 'action',
      align: 'center' as const,
      render: (_: any, record: IBooking) => (
        <Space>
          <Tooltip title="Xem chi tiết">
            <Button
              type="primary"
              ghost
              icon={<EyeOutlined />}
              onClick={() => navigate(`/admin/bookings/${record._id}`)}
            />
          </Tooltip>

          <Tooltip title="Xóa">
            <Popconfirm
              title="Xóa đơn này?"
              onConfirm={() => deleteMutation.mutate(record._id)}
              okText="Xóa"
              cancelText="Hủy"
            >
              <Button danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <AdminPageHeader
        title="Đơn đặt tour"
        subtitle="Quản lý booking và thao tác cơ bản."
        extra={
          <Space wrap>
            <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['bookings'] })}>
              Tải lại
            </Button>
          </Space>
        }
      />

      <AdminListCard
        toolbar={
          <Input
            prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
            placeholder="Tìm theo khách, tour hoặc mã..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            style={{ maxWidth: 420 }}
          />
        }
      >
        <Table
          columns={columns}
          dataSource={filteredBookings}
          rowKey="_id"
          loading={isLoading}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          scroll={{ x: 1100 }}
        />
      </AdminListCard>
    </div>
  );
};

export default BookingList;