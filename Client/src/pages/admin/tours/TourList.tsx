import { useMemo, useState } from 'react';
import { Button, Input, Select, Space, Table, Tag, Typography, Popconfirm, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteTour, getTours } from '../../../services/api';
import type { ITour } from '../../../types/tour.types';

const { Title, Text } = Typography;

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(d);
};

const statusColor = (status: string) => {
  if (status === 'active') return 'green';
  if (status === 'inactive') return 'red';
  return 'gold';
};

const statusLabel = (status?: string) => {
  if (status === 'active') return 'Hoạt động';
  if (status === 'inactive') return 'Không hoạt động';
  return 'Bản nháp';
};

const TourList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['tours', { search, status, page, limit }],
    queryFn: () => getTours({ search: search || undefined, status, page, limit }),
  });

  const { mutate: mutateDelete, isPending: isDeleting } = useMutation({
    mutationFn: (id: string) => deleteTour(id),
    onSuccess: async () => {
      message.success('Đã xoá tour');
      await queryClient.invalidateQueries({ queryKey: ['tours'] });
    },
    onError: () => message.error('Xoá tour thất bại'),
  });

  const tours = data?.data?.tours ?? [];
  const total = data?.total ?? tours.length;

  const columns: ColumnsType<ITour> = useMemo(
    () => [
      {
        title: 'Mô tả',
        dataIndex: 'description',
        key: 'description',
        render: (value: string, record) => (
          <div>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>
              {value?.trim() ? value : <Text type="secondary">(Chưa có mô tả)</Text>}
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              ID: {record.id || record._id}
            </Text>
          </div>
        ),
      },
      {
        title: 'Giá',
        dataIndex: 'price',
        key: 'price',
        width: 140,
        render: (value: number) => (
          <Text strong>{typeof value === 'number' ? value.toLocaleString('vi-VN') : '-'}</Text>
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
        title: 'Thời lượng',
        dataIndex: 'duration_',
        key: 'duration_',
        width: 120,
        render: (value: number) => (value ? `${value} ngày` : '-'),
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
        width: 260,
        render: (_, record) => (
          <Space>
            <Button onClick={() => navigate(`/admin/tours/edit/${record.id || record._id}`)}>
              Sửa
            </Button>
            <Button type="link" onClick={() => navigate(`/admin/tours/${record.id || record._id}`)}>
              Chi tiết
            </Button>
            <Popconfirm
              title="Xoá tour này?"
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
            Danh sách Tour
          </Title>
        </div>
        <Button type="primary" onClick={() => navigate('/admin/tours/create')}>
          Thêm tour mới
        </Button>
      </div>

      <div style={{ marginTop: 16, marginBottom: 16 }}>
        <Space wrap>
          <Input.Search
            allowClear
            placeholder="Tìm theo mô tả..."
            style={{ width: 320 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onSearch={() => {
              setPage(1);
            }}
          />
          <Select
            allowClear
            placeholder="Trạng thái"
            style={{ width: 180 }}
            value={status}
            onChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
            options={[
              { value: 'draft', label: 'Bản nháp' },
              { value: 'active', label: 'Hoạt động' },
              { value: 'inactive', label: 'Không hoạt động' },
            ]}
          />
          <Select
            style={{ width: 160 }}
            value={limit}
            onChange={(v) => {
              setLimit(v);
              setPage(1);
            }}
            options={[
              { value: 10, label: '10 / trang' },
              { value: 20, label: '20 / trang' },
              { value: 50, label: '50 / trang' },
            ]}
          />
          <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['tours'] })}>
            Tải lại
          </Button>
          <Link to="/admin/tours/create">Tạo tour</Link>
        </Space>
      </div>

      {isError ? (
        <div style={{ background: '#fff', padding: 16, border: '1px solid #eee' }}>
          <Text type="danger">Lỗi tải danh sách tour: {(error as any)?.message || 'Unknown error'}</Text>
          <div style={{ marginTop: 8 }}>
            <Text type="secondary">
              Gợi ý: hãy chắc chắn server chạy và `VITE_API_URL` trỏ tới `http://localhost:5000/api/v1`.
            </Text>
          </div>
        </div>
      ) : (
        <Table<ITour>
          loading={isLoading}
          rowKey={(r) => r.id || r._id || Math.random().toString(16)}
          dataSource={tours}
          columns={columns}
          pagination={{
            current: page,
            pageSize: limit,
            total,
            onChange: (p) => setPage(p),
            showSizeChanger: false,
          }}
          style={{ background: '#fff', borderRadius: 8 }}
        />
      )}
    </div>
  );
};

export default TourList;
