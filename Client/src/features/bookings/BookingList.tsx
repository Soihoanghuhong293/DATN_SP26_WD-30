import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Table, Button, Space, Tag, Popconfirm, message, Typography, Tooltip, Input } from 'antd';
import { DeleteOutlined, PlusOutlined, EyeOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

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
  const [searchText, setSearchText] = useState('');

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const res = await axios.get('http://localhost:5000/api/v1/bookings', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      return res.data?.data || res.data || [];
    },
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

  const filteredBookings = useMemo(() => {
    if (!bookings) return [];
    if (!searchText) return bookings;
    
    const lowerText = searchText.toLowerCase();
    return bookings.filter((b: IBooking) => {
      const customerName = (b.customer_name || b.user_id?.name || '').toLowerCase();
      const customerPhone = (b.customer_phone || b.user_id?.email || '').toLowerCase();
      const tourName = (b.tour_id?.name || '').toLowerCase();
      const id = (b._id || '').toLowerCase();
      
      return customerName.includes(lowerText) || customerPhone.includes(lowerText) || tourName.includes(lowerText) || id.includes(lowerText);
    });
  }, [bookings, searchText]);

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
        let color = 'default';
        let text = 'Chưa rõ';
        if (record.status === 'pending') { color = 'warning'; text = 'Chờ duyệt'; }
        if (record.status === 'confirmed') { color = 'processing'; text = 'Đã xác nhận'; }
        if (record.status === 'paid') { color = 'success'; text = 'Đã thanh toán'; }
        if (record.status === 'cancelled') { color = 'error'; text = 'Đã hủy'; }
        if (record.status === 'deposit') { color = 'purple'; text = 'Đã cọc'; }
        if (record.status === 'refunded') { color = 'default'; text = 'Hoàn tiền'; }

        return <Tag color={color} bordered={false} className="px-2 py-1 text-sm font-medium">{text}</Tag>;
      },
    },
    {
      title: 'Hành động',
      key: 'action',
      align: 'center' as const,
      render: (_: any, record: IBooking) => (
        <Space size="small">
         
          <Tooltip title="Xem chi tiết">
            <Button 
            type="primary" 
            ghost 
            icon={<EyeOutlined />} 
            onClick={() => navigate(`/admin/bookings/${record._id}`)}
          >
           
          </Button>
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
         
        </div>
        
      </div>
    <div className="mb-4">
        <Input 
          prefix={<SearchOutlined className="text-gray-400" />}
          placeholder="Tìm theo mã đơn, tên khách, SĐT, tên tour..."
          allowClear
          size="large"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="max-w-md shadow-sm"
        />
    </div>

      <Table 
        columns={columns} 
        dataSource={filteredBookings} 
        rowKey="_id" 
        loading={isLoading}
        pagination={{ pageSize: 10 }}
        className="shadow-sm bg-white rounded-lg overflow-hidden"
      />
    </div>
  );
};

export default BookingList;