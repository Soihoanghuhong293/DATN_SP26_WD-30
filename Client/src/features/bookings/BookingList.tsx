import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Table, Button, Space, Tag, Popconfirm, message, Typography, Select, Tooltip } from 'antd';
import { DeleteOutlined, PlusOutlined, EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

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
  status: 'pending' | 'confirmed' | 'paid' | 'cancelled';
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
      title: 'Mã Đơn',
      dataIndex: '_id',
      key: 'id',
      render: (id: string) => <Text strong className="text-gray-500">#{id.slice(-6).toUpperCase()}</Text>,
    },
    {
      title: 'Khách hàng',
      key: 'customer',
      render: (_: any, record: IBooking) => {
        const name = record.customer_name || record.user_id?.name || 'Khách vãng lai';
        const contact = record.customer_phone || record.user_id?.email || 'Chưa cập nhật LH';
        return (
          <div>
            <div className="font-bold text-blue-600">{name}</div>
            <div className="text-xs text-gray-500"><i className="bi bi-telephone"></i> {contact}</div>
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
            <div className="font-bold text-gray-800 truncate max-w-[200px]">
              {record.tour_id?.name || 'Tour đã bị xóa'}
            </div>
          </Tooltip>
          <div className="text-xs mt-1 text-gray-500">
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
        return <Text type="danger" strong>{money.toLocaleString()} đ</Text>;
      },
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 150,
      render: (_: any, record: IBooking) => {
        let bgColor = 'bg-gray-50';
        if (record.status === 'pending') bgColor = 'bg-orange-50';
        if (record.status === 'confirmed') bgColor = 'bg-blue-50';
        if (record.status === 'paid') bgColor = 'bg-green-50';
        if (record.status === 'cancelled') bgColor = 'bg-red-50';

        return (
          <Select
            value={record.status}
            style={{ width: '100%' }}
            onChange={(val) => handleStatusChange(record._id, val)}
            className={`status-select ${bgColor} rounded border-none font-medium`}
            loading={updateStatusMutation.isPending}
          >
            <Option value="pending"><span className="text-orange-500">Chờ duyệt</span></Option>
            <Option value="confirmed"><span className="text-blue-500">Đã xác nhận</span></Option>
            <Option value="paid"><span className="text-green-600">Đã thanh toán</span></Option>
            <Option value="cancelled"><span className="text-red-500">Đã hủy</span></Option>
          </Select>
        );
      },
    },
    {
      title: 'Hành động',
      key: 'action',
      align: 'center' as const,
      render: (_: any, record: IBooking) => (
        <Space size="small">
          {/* Nút Xem chi tiết */}
          <Tooltip title="Xem chi tiết">
            <Button 
              icon={<EyeOutlined />} 
              type="text" 
              className="text-blue-500"
              onClick={() => message.info('Trang chi tiết booking đang phát triển!')} 
            />
          </Tooltip>

          <Tooltip title="Xóa đơn">
            <Popconfirm
              title="Xóa đơn đặt tour này?"
              description="Dữ liệu sẽ bị mất vĩnh viễn!"
              onConfirm={() => deleteMutation.mutate(record._id)}
              okText="Xóa luôn"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Button danger icon={<DeleteOutlined />} type="text" />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-lg shadow-sm">
        <div>
          <Title level={3} className="m-0 text-gray-800">Quản lý Đơn Hàng</Title>
          <Text type="secondary">Theo dõi và cập nhật trạng thái các booking đặt tour</Text>
        </div>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          size="large"
          className="bg-blue-600 shadow-md"
          onClick={() => navigate('/admin/bookings/create')}
        >
          TẠO ĐƠN MỚI
        </Button>
      </div>

      <Table 
        columns={columns} 
        dataSource={bookings} 
        rowKey="_id" 
        loading={isLoading}
        pagination={{ pageSize: 10 }}
        className="shadow-sm bg-white rounded-lg overflow-hidden"
      />
    </div>
  );
};

export default BookingList;