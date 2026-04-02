import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Button, Input, message, Popconfirm, Space, Table, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, EditOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import AdminPageHeader from '../../../components/admin/AdminPageHeader';
import AdminListCard from '../../../components/admin/AdminListCard';

const { Text } = Typography;

type ITourTemplate = {
  _id: string;
  name: string;
  duration_days: number;
  price?: number;
  category_id?: { _id: string; name: string } | string;
  updated_at?: string;
  created_at?: string;
};

export default function TourTemplateList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState('');

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['tour-templates'],
    queryFn: async () => {
      const res = await axios.get('http://localhost:5000/api/v1/tour-templates', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      return res.data?.data || res.data || [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`http://localhost:5000/api/v1/tour-templates/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
    },
    onSuccess: () => {
      message.success('Đã xoá template');
      queryClient.invalidateQueries({ queryKey: ['tour-templates'] });
    },
  });

  const filtered = useMemo(() => {
    if (!searchText) return templates as ITourTemplate[];
    const q = searchText.toLowerCase();
    return (templates as ITourTemplate[]).filter((t) => t.name.toLowerCase().includes(q));
  }, [templates, searchText]);

  const columns: ColumnsType<ITourTemplate> = [
    {
      title: 'TEMPLATE',
      key: 'name',
      render: (_: any, record) => (
        <div>
          <Text strong style={{ color: '#111827' }}>
            {record.name}
          </Text>
          <div style={{ fontSize: 12, color: '#6b7280' }}>
            ID: <span style={{ fontFamily: 'monospace' }}>{record._id.slice(-6).toUpperCase()}</span>
          </div>
        </div>
      ),
    },
    {
      title: 'THỜI LƯỢNG',
      dataIndex: 'duration_days',
      key: 'duration_days',
      width: 120,
      render: (v: number) => (
        <span
          style={{
            padding: '4px 10px',
            backgroundColor: '#f3f4f6',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            color: '#374151',
          }}
        >
          {v} ngày
        </span>
      ),
    },
    {
      title: 'GIÁ GỢI Ý',
      dataIndex: 'price',
      key: 'price',
      width: 140,
      align: 'right',
      render: (v?: number) => <Text>{(v || 0).toLocaleString('vi-VN')} ₫</Text>,
    },
    {
      title: '',
      key: 'action',
      width: 140,
      align: 'right',
      render: (_: any, record) => (
        <Space size={6}>
          <Tooltip title="Chỉnh sửa">
            <Button type="text" icon={<EditOutlined />} onClick={() => navigate(`/admin/tour-templates/${record._id}/edit`)} />
          </Tooltip>
          <Popconfirm
            title="Xoá template này?"
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
        title="Tour Templates"
        subtitle="Tạo mẫu tour để tái sử dụng nhanh khi tạo tour mới."
        extra={
          <Space wrap>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/admin/tour-templates/create')}>
              Thêm template
            </Button>
            <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['tour-templates'] })}>
              Tải lại
            </Button>
          </Space>
        }
      />

      <AdminListCard
        toolbar={
          <Input
            prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
            placeholder="Tìm theo tên template..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ maxWidth: 360 }}
            allowClear
          />
        }
      >
        <Table
          columns={columns}
          dataSource={filtered}
          rowKey="_id"
          loading={isLoading}
          pagination={{ pageSize: 10, showSizeChanger: false }}
        />
      </AdminListCard>
    </div>
  );
}

