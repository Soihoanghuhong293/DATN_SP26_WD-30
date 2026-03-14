import { useMemo, useState } from 'react';
import { Button, Input, Select, Space, Table, Tag, Typography, Card } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getProviders } from '../../../services/api';
import { useNavigate } from 'react-router-dom';
import type { IProvider } from '../../../types/provider.types';

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

const ProviderList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string | undefined>(undefined);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['providers', { search, status }],
    queryFn: () => getProviders({ search: search || undefined, status }),
  });

  const providers = data?.data?.providers ?? [];

  const columns: ColumnsType<IProvider> = useMemo(
    () => [
      {
        title: 'Tên nhà cung cấp',
        dataIndex: 'name',
        key: 'name',
        render: (value: string, record) => (
          <a onClick={() => navigate(`/admin/providers/${record.id || record._id}`)} style={{ fontWeight: 600 }}>
            {value}
          </a>
        ),
      },
      {
        title: 'Liên hệ',
        key: 'contact',
        render: (_, record) => (
          <div>
            <div>{record.phone || '-'}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.email || '-'}
            </Text>
          </div>
        ),
      },
      {
        title: 'Liên hệ khẩn cấp',
        dataIndex: 'emergency_contact',
        key: 'emergency_contact',
        ellipsis: true,
        render: (value: string) => <Text type="secondary">{value?.trim() ? value : '-'}</Text>,
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
        width: 120,
        render: (_, record) => (
          <Button type="primary" size="small" onClick={() => navigate(`/admin/providers/${record.id || record._id}`)}>
            Chi tiết
          </Button>
        ),
      },
    ],
    [navigate]
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8, color: '#1f2937' }}>
            Quản lý nhà cung cấp
          </h1>
          <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
            Danh sách nhà cung cấp trong hệ thống
          </p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/admin/providers/create')}>
          Thêm nhà cung cấp
        </Button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input.Search
            allowClear
            placeholder="Tìm theo tên, email, SĐT..."
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
          <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['providers'] })}>
            Tải lại
          </Button>
        </Space>
      </div>

      <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        {isError ? (
          <div style={{ padding: 24 }}>
            <Text type="danger">Lỗi tải danh sách: {(error as any)?.message || 'Unknown error'}</Text>
          </div>
        ) : (
          <Table<IProvider>
            loading={isLoading}
            rowKey={(r) => r.id || r._id || Math.random().toString(16)}
            dataSource={providers}
            columns={columns}
            pagination={{
              pageSize: 10,
              showSizeChanger: false,
              showTotal: (total) => `Tổng ${total} nhà cung cấp`,
            }}
          />
        )}
      </Card>
    </div>
  );
};

export default ProviderList;
