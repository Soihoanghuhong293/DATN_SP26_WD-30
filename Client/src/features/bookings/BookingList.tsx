import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Table, Button, Space, Tag, Popconfirm, message, Typography, Select, Empty, Card } from 'antd';
import { DeleteOutlined, PlusOutlined, EyeOutlined, BookOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text } = Typography;

interface IBooking {
  _id: string;
  tour_id?: { _id: string; name: string; duration_days?: number }; 
  user_id?: { _id: string; name: string; email: string }; 
  guide_id?: { name: string; email?: string };
  customer_name?: string;
  customer_phone?: string;
  total_price?: number;
  price?: number; 
  startDate: string;
  endDate?: string;
  groupSize: number;
  status: 'pending' | 'confirmed' | 'paid' | 'cancelled';
  tour_stage?: 'scheduled' | 'in_progress' | 'completed';
  checkInCompleted?: boolean;
  created_at: string;
}

const BookingList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const res = await axios.get('http://localhost:5000/api/v1/bookings', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      return res.data?.data || res.data || [];
    },
  });
  // ca[ nhat trang thai tren bang
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await axios.put(`http://localhost:5000/api/v1/bookings/${id}`, { status }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
    },
    onSuccess: () => {
      message.success('Cập nhật trạng thái thành công!');
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
    onError: () => message.error('Cập nhật trạng thái thất bại!')
  });

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

  const handleStatusChange = (id: string, newStatus: string) => {
    updateStatusMutation.mutate({ id, status: newStatus });
  };

  const columns = [
    {
      title: 'Mã đơn',
      key: 'id',
      width: 100,
      render: (_: any, record: IBooking) => (
        <Text type="secondary" style={{ fontWeight: 600 }}>#{record._id?.slice(-6).toUpperCase()}</Text>
      ),
    },
    {
      title: 'Tour',
      key: 'tour',
      render: (_: any, record: IBooking) => (
        <div>
          <div style={{ fontWeight: 600, color: '#1f2937' }}>
            {record.tour_id?.name || '—'}
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.tour_id?.duration_days ? `${record.tour_id.duration_days} ngày` : ''}
          </Text>
        </div>
      ),
    },
    {
      title: 'Thời gian',
      key: 'dates',
      render: (_: any, record: IBooking) => (
        <div>
          <div>{dayjs(record.startDate).format('DD/MM/YYYY')}</div>
          {record.endDate && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              → {dayjs(record.endDate).format('DD/MM/YYYY')}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: 'Khách hàng',
      key: 'customer',
      render: (_: any, record: IBooking) => {
        const name = record.customer_name || record.user_id?.name || '—';
        const contact = record.customer_phone || record.user_id?.email || '';
        return (
          <div>
            <div>{name}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>{contact}</Text>
          </div>
        );
      },
    },
    {
      title: 'Số khách',
      dataIndex: 'groupSize',
      key: 'groupSize',
      render: (val: number) => `${val || 0} người`,
    },
    {
      title: 'Tổng tiền',
      key: 'totalPrice',
      render: (_: any, record: IBooking) => {
        const money = record.total_price || record.price || 0;
        return money ? `${money.toLocaleString('vi-VN')} đ` : '—';
      },
    },
    {
      title: 'Giai đoạn',
      key: 'tourStage',
      render: (_: any, record: IBooking) => (
        <div>
          <Tag color={record.tour_stage === 'completed' ? 'green' : record.tour_stage === 'in_progress' ? 'blue' : 'default'}>
            {record.tour_stage === 'scheduled' ? 'Sắp đi' : record.tour_stage === 'in_progress' ? 'Đang đi' : record.tour_stage === 'completed' ? 'Hoàn thành' : '—'}
          </Tag>
          {record.checkInCompleted && (
            <div style={{ fontSize: 12, color: '#10b981', marginTop: 2 }}>✓ Đã check-in</div>
          )}
        </div>
      ),
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 140,
      render: (_: any, record: IBooking) => (
        <Select
          value={record.status}
          size="small"
          style={{ width: '100%' }}
          onChange={(val) => handleStatusChange(record._id, val)}
          loading={updateStatusMutation.isPending}
          options={[
            { value: 'pending', label: 'Chờ duyệt' },
            { value: 'confirmed', label: 'Đã xác nhận' },
            { value: 'paid', label: 'Đã thanh toán' },
            { value: 'cancelled', label: 'Đã hủy' },
          ]}
        />
      ),
    },
    {
      title: 'Hành động',
      key: 'action',
      render: (_: any, record: IBooking) => (
        <Space size="small">
          <Button
            type="primary"
            icon={<EyeOutlined />}
            size="small"
            onClick={() => navigate(`/admin/bookings/${record._id}`)}
          >
            Xem chi tiết
          </Button>
          <Popconfirm
            title="Xóa đơn đặt tour này?"
            description="Dữ liệu sẽ bị mất vĩnh viễn!"
            onConfirm={() => deleteMutation.mutate(record._id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button danger icon={<DeleteOutlined />} size="small" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8, color: '#1f2937' }}>
            Quản lý đơn hàng
          </h1>
          <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
            Theo dõi và cập nhật trạng thái các booking đặt tour
          </p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/admin/bookings/create')}>
          Tạo đơn mới
        </Button>
      </div>

      <Card
        bordered={false}
        style={{
          borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}
      >
        {(!bookings || bookings.length === 0) && !isLoading ? (
          <Empty
            image={<BookOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />}
            description="Chưa có đơn đặt tour nào"
            style={{ padding: 48 }}
          >
            <Text type="secondary">Tạo đơn mới để bắt đầu quản lý booking</Text>
          </Empty>
        ) : (
          <Table
            columns={columns}
            dataSource={bookings || []}
            rowKey="_id"
            loading={isLoading}
            pagination={{
              pageSize: 10,
              showSizeChanger: false,
              showTotal: (total) => `Tổng ${total} đơn`,
            }}
          />
        )}
      </Card>
    </div>
  );
};

export default BookingList;