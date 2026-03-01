import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { 
  Table, Button, Space, Avatar, Tag, Popconfirm, message, 
  Typography, Input, Breadcrumb, Tooltip, ConfigProvider, theme 
} from 'antd';
import { 
  DeleteOutlined, EditOutlined, PlusOutlined, 
  SearchOutlined, EyeOutlined, HomeOutlined 
} from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';

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
  
  const { token } = theme.useToken();

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
      title: 'TOUR DETAILS',
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
      title: 'PRICE',
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
      title: 'DURATION',
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
            {days} Days
        </span>
      ),
    },
    {
      title: 'STATUS',
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
                {isActive ? 'Active' : 'Draft'}
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
          <Tooltip title="View Details">
            <Link to={`/admin/tours/${record._id}`}>
                <Button 
                  type="text" 
                  style={{ color: '#2563eb', backgroundColor: '#eff6ff' }} // Xanh dương nhẹ
                  icon={<EyeOutlined />} 
                />
            </Link>
          </Tooltip>

          <Tooltip title="Edit">
            <Button 
              type="text" 
              icon={<EditOutlined style={{ color: '#6b7280' }} />} 
              onClick={() => navigate(`/admin/tours/${record._id}/edit`)}
            />
          </Tooltip>
          
          <Popconfirm
            title="Delete this tour?"
            description="This action cannot be undone."
            onConfirm={() => deleteMutation.mutate(record._id)}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Delete">
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <ConfigProvider
      theme={{
        token: {
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          colorPrimary: '#0f172a', // Màu Slate-900 (SaaS Dark)
          borderRadius: 6,         // Bo góc vừa phải (Modern)
        },
        components: {
          Table: {
            headerBg: '#f9fafb',   // Header màu xám rất nhạt
            headerColor: '#6b7280', // Text header màu xám trung tính
            headerSplitColor: 'transparent', // Bỏ vạch ngăn cách header
            rowHoverBg: '#f8fafc',
            borderColor: '#e5e7eb', // Border màu xám nhạt tinh tế
          },
          Button: {
             fontWeight: 500,
          }
        }
      }}
    >
      <div style={{ padding: '32px 40px', backgroundColor: '#fff', minHeight: '100vh' }}>
        
        {/* Breadcrumb Navigation */}
        <Breadcrumb 
            items={[
                { href: '/admin', title: <HomeOutlined /> },
                { title: 'Tours Management' },
            ]}
            style={{ marginBottom: 16 }}
        />

        {/* Page Header */}
        <div style={{ 
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
            marginBottom: 32 
        }}>
          <div>
            <Title level={2} style={{ margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>Tours</Title>
            <Text type="secondary">Manage your travel packages and inventory.</Text>
          </div>
          
          <div style={{ display: 'flex', gap: 12 }}>
            <Button icon={<SearchOutlined />} style={{ minWidth: 40 }} /> 
            {/* Nút chính nổi bật */}
            <Button 
                type="primary" 
                size="large"
                icon={<PlusOutlined />} 
                onClick={() => navigate('/admin/tours/create')}
                style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}
            >
                Add Product
            </Button>
          </div>
        </div>

        {/* Search Bar & Filters Area */}
        <div style={{ marginBottom: 20 }}>
            <Input 
                prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
                placeholder="Filter by tour name..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ 
                    maxWidth: 320, 
                    height: 40,
                    backgroundColor: '#fff',
                    borderColor: '#e5e7eb'
                }}
            />
        </div>

        {/* Main Table Container */}
        <div style={{ 
            border: '1px solid #e5e7eb', 
            borderRadius: 8, 
            overflow: 'hidden' 
        }}>
            <Table 
                columns={columns} 
                dataSource={filteredData} 
                rowKey="_id"
                loading={isLoading}
                pagination={{ 
                    pageSize: 8, 
                    position: ['bottomRight'],
                    showSizeChanger: false,
                    itemRender: (_, type, originalElement) => {
                        if (type === 'prev') return <Button type="text" size="small">Previous</Button>;
                        if (type === 'next') return <Button type="text" size="small">Next</Button>;
                        return originalElement;
                    }
                }}
            />
        </div>
      </div>
    </ConfigProvider>
  );
};

export default TourList;