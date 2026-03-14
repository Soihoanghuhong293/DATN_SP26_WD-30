import { useMemo, useState } from 'react';
import { Button, Input, Select, Space, Table, Tag, Typography, Popconfirm, message, Card } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteCategory, getCategories } from '../../../services/api';
import type { ICategory } from '../../../types/tour.types';

const { Title, Text } = Typography;

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(d);
};

const statusColor = (status?: string) => {
  if (status === 'active') return 'green';
  return 'red';
};

const statusLabel = (status?: string) => {
  if (status === 'active') return 'Hoạt động';
  return 'Không hoạt động';
};

const CategoryList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string | undefined>(undefined);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['categories', { search, status }],
    queryFn: () => getCategories({ search: search || undefined, status }),
  });

  const { mutate: mutateDelete, isPending: isDeleting } = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: async () => {
      message.success('Đã xoá danh mục');
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: () => message.error('Xoá danh mục thất bại'),
  });

  const categories = data?.data?.categories ?? [];

  const columns: ColumnsType<ICategory> = useMemo(
    () => [
      {
        title: 'Tên',
        dataIndex: 'name',
        key: 'name',
        render: (value: string, record) => (
          <div>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>{value}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              ID: {record.id || record._id}
            </Text>
          </div>
        ),
      },
      {
        title: 'Mô tả',
        dataIndex: 'description',
        key: 'description',
        ellipsis: true,
        render: (value: string) => (
          <Text type="secondary">{value?.trim() ? value : '-'}</Text>
        ),
      },
      {
        title: 'Trạng thái',
        dataIndex: 'status',
        key: 'status',
        width: 140,
        render: (value: string) => <Tag color={statusColor(value)}>{statusLabel(value)}</Tag>,
      },
      {
        title: 'Cập nhật',
        dataIndex: 'update_at',
        key: 'update_at',
        width: 180,
        render: (value: string) => formatDateTime(value),
      },
      {
        title: 'Thao tác',
        key: 'actions',
        width: 220,
        render: (_, record) => (
          <Space size="small">
            <Button
              type="primary"
              size="small"
              onClick={() =>
                navigate(`/admin/categories/edit/${record.id || record._id}`)
              }
            >
              Sửa
            </Button>
            <Popconfirm
              title="Xoá danh mục này?"
              okText="Xoá"
              cancelText="Huỷ"
              onConfirm={() => mutateDelete(record.id || record._id || '')}
            >
              <Button type="primary" danger size="small" loading={isDeleting} disabled={!record.id && !record._id}>
                Xoá
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [isDeleting, mutateDelete, navigate]
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8, color: '#1f2937' }}>
            Quản lý danh mục
          </h1>
          <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
            Quản lý các danh mục tour trong hệ thống
          </p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/admin/categories/create')}>
          Thêm danh mục
        </Button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input.Search
            allowClear
            placeholder="Tìm theo tên hoặc mô tả..."
            style={{ width: 320 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onSearch={() => {}}
          />
          <Select
            allowClear
            placeholder="Trạng thái"
            style={{ width: 180 }}
            value={status}
            onChange={(v) => setStatus(v)}
            options={[
              { value: 'active', label: 'Hoạt động' },
              { value: 'inactive', label: 'Không hoạt động' },
            ]}
          />
          <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['categories'] })}>
            Tải lại
          </Button>
        </Space>
      </div>

      <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        {isError ? (
          <div style={{ padding: 24 }}>
            <Text type="danger">
              Lỗi tải danh sách: {(error as any)?.message || 'Unknown error'}
            </Text>
          </div>
        ) : (
          <Table<ICategory>
            loading={isLoading}
            rowKey={(r) => r.id || r._id || Math.random().toString(16)}
            dataSource={categories}
            columns={columns}
            pagination={{
              pageSize: 10,
              showSizeChanger: false,
              showTotal: (total) => `Tổng ${total} danh mục`,
            }}
          />
        )}
      </Card>
    </div>
  );
};

export default CategoryList;
