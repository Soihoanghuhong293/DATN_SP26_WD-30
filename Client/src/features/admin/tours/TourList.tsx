import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { 
  Table, Button, Space, Popconfirm, message, 
  Typography, Input, Tooltip
} from 'antd';
import { 
  DeleteOutlined, EditOutlined, PlusOutlined, 
  SearchOutlined, EyeOutlined
} from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import AdminPageHeader from '../../../components/admin/AdminPageHeader';
import AdminListCard from '../../../components/admin/AdminListCard';

const { Title, Text } = Typography;

interface ITour {
  _id: string;
  name: string;
  image?: string;
  images?: string[];
  price: number;
  duration_days: number;
  status: string;
  category_id?: { name: string } | string;
}

const TourList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState('');

  const { data: tours = [], isLoading } = useQuery({
    queryKey: ['tours'],
    queryFn: async () => {
      const response = await axios.get('http://localhost:5000/api/v1/tours');
      return response.data.data || [];
    },
  });

  const filteredData = useMemo(() => {
    if (!searchText) return tours;
    const lower = searchText.toLowerCase();
    return tours.filter((t: ITour) => 
      t.name.toLowerCase().includes(lower) || 
      t.price.toString().includes(lower)
    );
  }, [tours, searchText]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => axios.delete(`http://localhost:5000/api/v1/tours/${id}`),
    onSuccess: () => {
      message.success('Đã chuyển tour vào thùng rác');
      queryClient.invalidateQueries({ queryKey: ['tours'] });
    },
  });

  const columns: ColumnsType<ITour> = [
    {
      title: 'TOUR',
      dataIndex: 'name',
      key: 'name',
      width: 350,
      render: (_, record) => {
        const imgLink = record.image || (record.images && record.images[0]);
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ 
                width: 48, height: 48, borderRadius: 8, overflow: 'hidden', 
                border: '1px solid #e5e7eb', flexShrink: 0 
            }}>
                <img 
                    src={imgLink || 'https://placehold.co/100x100?text=Kh%C3%B4ng+%E1%BA%A3nh'} 
                    alt={record.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <Text strong style={{ fontSize: 14, color: '#111827' }}>{record.name}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                ID: <span style={{ fontFamily: 'monospace' }}>{record._id.slice(-6).toUpperCase()}</span>
              </Text>
            </div>
          </div>
        );
      },
    },
    {
      title: 'GIÁ TOUR',
      dataIndex: 'price',
      key: 'price',
      sorter: (a, b) => a.price - b.price,
      render: (price) => (
        <Text style={{ fontWeight: 500, color: '#374151' }}>
          {price ? price.toLocaleString('vi-VN') : 0} ₫
        </Text>
      ),
    },
    {
      title: 'THỜI LƯỢNG',
      dataIndex: 'duration_days',
      key: 'duration_days',
      render: (days) => (
        <span style={{ 
            padding: '4px 10px', 
            backgroundColor: '#f3f4f6', 
            borderRadius: 6, 
            fontSize: 12, 
            fontWeight: 600, 
            color: '#4b5563' 
        }}>
            {days} ngày
        </span>
      ),
    },
    {
      title:'TRẠNG THÁI',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const isActive = status === 'active';
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ 
                width: 8, height: 8, borderRadius: '50%', 
                backgroundColor: isActive ? '#10b981' : '#f59e0b',
                boxShadow: isActive ? '0 0 0 2px rgba(16, 185, 129, 0.2)' : 'none'
            }} />
            <Text style={{ fontSize: 13, color: isActive ? '#065f46' : '#92400e' }}>
              {isActive ? 'Đang hoạt động' : 'Bản nháp'}
            </Text>
          </div>
        );
      },
    },
    {
      title: '',
      key: 'action',
      width: 140,
      align: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Xem chi tiết">
            <Link to={`/admin/tours/${record._id}`}>
                <Button 
                  type="text" 
                  style={{ color: '#2563eb', backgroundColor: '#eff6ff' }} // Xanh dương nhẹ
                  icon={<EyeOutlined />} 
                />
            </Link>
          </Tooltip>

          <Tooltip title="Chỉnh sửa">
            <Button 
              type="text" 
              icon={<EditOutlined style={{ color: '#6b7280' }} />} 
              onClick={() => navigate(`/admin/tours/${record._id}/edit`)}
            />
          </Tooltip>
          
          <Popconfirm
            title="Xoá tour này?"
            description="Thao tác này không thể hoàn tác."
            onConfirm={() => deleteMutation.mutate(record._id)}
            okText="Xoá"
            cancelText="Huỷ"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Xoá">
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <AdminPageHeader
        title="Tour"
        subtitle="Quản lý danh sách tour."
        extra={
          <Space wrap>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/admin/tours/create')}>
              Thêm tour
            </Button>
            <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['tours'] })}>
              Tải lại
            </Button>
          </Space>
        }
      />

      <AdminListCard
        toolbar={
          <Input
            prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
            placeholder="Tìm theo tên tour hoặc giá..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ maxWidth: 360 }}
            allowClear
          />
        }
      >
        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="_id"
          loading={isLoading}
          pagination={{
            pageSize: 8,
            showSizeChanger: false,
          }}
          scroll={{ x: 1100 }}
        />
      </AdminListCard>
    </div>
  );
};

export default TourList;