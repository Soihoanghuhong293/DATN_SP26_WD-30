import { useMemo, useState } from 'react';
import { Button, Input, Select, Space, Table, Tag, Typography, Popconfirm, message } from 'antd';
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
          <Space>
            <Button
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
              <Button danger loading={isDeleting} disabled={!record.id && !record._id}>
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Danh sách Danh mục Tour
          </Title>
        </div>
       
      </div>

      <div style={{ marginTop: 16, marginBottom: 16 }}>
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

      {isError ? (
        <div style={{ background: '#fff', padding: 16, border: '1px solid #eee' }}>
          <Text type="danger">
            Lỗi tải danh sách danh mục: {(error as any)?.message || 'Unknown error'}
          </Text>
          <div style={{ marginTop: 8 }}>
            <Text type="secondary">
              Gợi ý: hãy chắc chắn server chạy và `VITE_API_URL` trỏ tới `http://localhost:5000/api/v1`.
            </Text>
          </div>
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
          }}
          style={{ background: '#fff', borderRadius: 8 }}
        />
      )}
    </div>
  );
};

export default CategoryList;
