import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Table, Button, Space, Tag, Popconfirm, message, Typography, Input, Card } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, SearchOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';

const { Text } = Typography;

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
      message.success('Moved to trash successfully');
      queryClient.invalidateQueries({ queryKey: ['tours'] });
    },
  });

  const columns: ColumnsType<ITour> = [
    {
      title: 'Tour',
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
                    src={imgLink || 'https://placehold.co/100x100?text=No+Img'} 
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
      title: 'Giá',
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
      title: 'Thời lượng',
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
      title: 'Trạng thái',
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
                {isActive ? 'Hoạt động' : 'Nháp'}
            </Text>
          </div>
        );
      },
    },
    {
      title: 'Hành động',
      key: 'action',
      width: 140,
      align: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Button type="primary" size="small" icon={<EyeOutlined />} onClick={() => navigate(`/admin/tours/${record._id}`)}>
            Chi tiết
          </Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => navigate(`/admin/tours/${record._id}/edit`)}>
            Sửa
          </Button>
          <Popconfirm
            title="Xóa tour này?"
            onConfirm={() => deleteMutation.mutate(record._id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button danger size="small" icon={<DeleteOutlined />} />
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
            Quản lý Tour
          </h1>
          <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
            Quản lý các tour du lịch trong hệ thống
          </p>
        </div>
        <Space>
          <Input
            prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
            placeholder="Tìm theo tên tour..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 240 }}
            allowClear
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/admin/tours/create')}>
            Thêm Tour
          </Button>
        </Space>
      </div>

      <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <Table
          columns={columns}
          dataSource={filteredData || []}
          rowKey="_id"
          loading={isLoading}
          pagination={{
            pageSize: 10,
            showSizeChanger: false,
            showTotal: (total) => `Tổng ${total} tour`,
          }}
        />
      </Card>
    </div>
  );
};

export default TourList;