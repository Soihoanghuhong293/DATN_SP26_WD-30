import { useMemo, useState } from 'react';
import { Button, Empty, Input, Popconfirm, Select, Space, Table, Tag, Tooltip, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteProvider, getProviders } from '../../../services/api';
import { useNavigate } from 'react-router-dom';
import type { IProvider } from '../../../types/provider.types';
import AdminPageHeader from '../../../components/admin/AdminPageHeader';
import AdminListCard from '../../../components/admin/AdminListCard';
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import './ProviderList.css';

const { Text } = Typography;

type FilterState = {
  search: string;
  status?: 'active' | 'inactive';
};

const emptyFilters = (): FilterState => ({
  search: '',
  status: undefined,
});

const getProviderId = (p: IProvider) => (p as any)._id || (p as any).id;

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(d);
};

const statusLabel = (status?: string) => {
  if (status === 'active') return 'Hoạt động';
  return 'Không hoạt động';
};

const ProviderList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<FilterState>(() => emptyFilters());
  const [applied, setApplied] = useState<FilterState>(() => emptyFilters());

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['providers', applied],
    queryFn: () => getProviders({ search: applied.search || undefined, status: applied.status }),
  });

  const providers = data?.data?.providers ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProvider(id),
    onSuccess: async () => {
      message.success('Đã xoá nhà cung cấp');
      await queryClient.invalidateQueries({ queryKey: ['providers'] });
    },
    onError: () => message.error('Xoá nhà cung cấp thất bại'),
  });

  const appliedTags = useMemo(() => {
    const tags: { key: keyof FilterState; label: string }[] = [];
    if (applied.search?.trim()) tags.push({ key: 'search', label: `Từ khóa: ${applied.search.trim()}` });
    if (applied.status) tags.push({ key: 'status', label: `Trạng thái: ${applied.status === 'active' ? 'Hoạt động' : 'Không hoạt động'}` });
    return tags;
  }, [applied]);

  const columns: ColumnsType<IProvider> = useMemo(
    () => [
      {
        title: 'Nhà cung cấp',
        dataIndex: 'name',
        key: 'name',
        render: (value: string, record) => {
          const id = getProviderId(record);
          const shortId = id ? String(id).slice(-6).toUpperCase() : '—';
          return (
            <div className="provider-list-name-cell">
              <div className="provider-list-name-icon" aria-hidden>
                <span style={{ fontSize: 16 }}>🏢</span>
              </div>
              <div className="provider-list-name-text">
                <Tooltip title={id ? `ID: ${id}` : undefined}>
                  <div className="provider-list-name-title">{value}</div>
                </Tooltip>
                <Text type="secondary" className="provider-list-id">
                  ID: <span className="provider-list-id-mono">{shortId}</span>
                </Text>
              </div>
            </div>
          );
        },
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
        render: (value: string) => {
          const active = value === 'active';
          return (
            <span className={`provider-list-status ${active ? 'provider-list-status--active' : 'provider-list-status--inactive'}`}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: active ? '#10b981' : '#94a3b8' }} />
              {statusLabel(value)}
            </span>
          );
        },
      },
      {
        title: 'Cập nhật',
        dataIndex: 'update_at',
        key: 'update_at',
        width: 180,
        render: (value: string) => <span className="provider-list-updated">{formatDateTime(value)}</span>,
      },
      {
        title: 'Thao tác',
        key: 'actions',
        width: 112,
        align: 'right',
        fixed: 'right',
        render: (_, record) => {
          const id = getProviderId(record);
          const rowDeleting = deleteMutation.isPending && deleteMutation.variables === id;
          return (
            <Space size={6} className="provider-list-actions">
              <Tooltip title="Sửa">
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  aria-label="Sửa nhà cung cấp"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/admin/providers/${id}/edit`);
                  }}
                  disabled={!id}
                />
              </Tooltip>
              <Popconfirm
                title="Xoá nhà cung cấp này?"
                description="Thao tác không thể hoàn tác."
                okText="Xoá"
                cancelText="Huỷ"
                okButtonProps={{ danger: true }}
                onConfirm={() => id && deleteMutation.mutate(id)}
              >
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  aria-label="Xoá nhà cung cấp"
                  loading={rowDeleting}
                  disabled={!id}
                  onClick={(e) => e.stopPropagation()}
                />
              </Popconfirm>
            </Space>
          );
        },
      },
    ],
    [deleteMutation, navigate]
  );

  return (
    <div className="provider-list-page">
      <AdminPageHeader
        title="Nhà cung cấp"
        subtitle="Quản lý danh sách nhà cung cấp dịch vụ."
        extra={
          <Space wrap>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/admin/providers/create')}>
              Thêm nhà cung cấp
            </Button>
            <Button icon={<ReloadOutlined />} loading={isFetching && !isLoading} onClick={() => refetch()}>
              Tải lại
            </Button>
          </Space>
        }
      />

      {isError ? (
        <div style={{ background: '#fff', padding: 16, border: '1px solid #eee' }}>
          <Text type="danger">
            Lỗi tải danh sách nhà cung cấp: {(error as any)?.message || 'Unknown error'}
          </Text>
          <div style={{ marginTop: 8 }}>
            <Text type="secondary">
              Gợi ý: hãy chắc chắn server chạy và `VITE_API_URL` trỏ tới `http://localhost:5000/api/v1`.
            </Text>
          </div>
        </div>
      ) : (
        <AdminListCard
          style={{
            borderRadius: 14,
            border: '1px solid #e2e8f0',
            boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
          }}
          toolbar={
            <div className="provider-filterbar">
              <div className="provider-filterbar-grid" onClick={(e) => e.stopPropagation()}>
                <div className="provider-filterbar-item">
                  <div className="provider-filterbar-label">Tìm kiếm</div>
                  <Input
                    allowClear
                    size="middle"
                    prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                    placeholder="Tìm theo tên, email, SĐT..."
                    value={draft.search}
                    onChange={(e) => setDraft((p) => ({ ...p, search: e.target.value }))}
                  />
                </div>

                <div className="provider-filterbar-item">
                  <div className="provider-filterbar-label">Trạng thái</div>
                  <Select
                    allowClear
                    size="middle"
                    placeholder="Trạng thái"
                    value={draft.status}
                    onChange={(v) => setDraft((p) => ({ ...p, status: v }))}
                    options={[
                      { value: 'active', label: 'Hoạt động' },
                      { value: 'inactive', label: 'Không hoạt động' },
                    ]}
                  />
                </div>

                <div className="provider-filterbar-item provider-filterbar-actions">
                  <div className="provider-filterbar-label">&nbsp;</div>
                  <Space wrap>
                    <Button
                      onClick={() => {
                        const cleared = emptyFilters();
                        setDraft(cleared);
                        setApplied(cleared);
                      }}
                    >
                      Xóa bộ lọc
                    </Button>
                    <Button type="primary" loading={isFetching} onClick={() => setApplied(draft)}>
                      Áp dụng
                    </Button>
                  </Space>
                </div>
              </div>

              <div className="provider-filterbar-footer">
                <div className="provider-filterbar-tags">
                  {appliedTags.length > 0 ? (
                    appliedTags.map((t) => (
                      <Tag
                        key={String(t.key) + t.label}
                        closable
                        onClose={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const nextDraft = { ...draft };
                          const nextApplied = { ...applied };
                          if (t.key === 'search') {
                            nextDraft.search = '';
                            nextApplied.search = '';
                          } else {
                            (nextDraft as any)[t.key] = undefined;
                            (nextApplied as any)[t.key] = undefined;
                          }
                          setDraft(nextDraft);
                          setApplied(nextApplied);
                        }}
                      >
                        {t.label}
                      </Tag>
                    ))
                  ) : (
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      Chưa chọn bộ lọc
                    </Text>
                  )}
                </div>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  {providers.length} mục
                </Text>
              </div>
            </div>
          }
        >
          <Table<IProvider>
            loading={isLoading}
            className="provider-list-table"
            rowKey={(r) => getProviderId(r) || Math.random().toString(16)}
            dataSource={providers}
            columns={columns}
            locale={{ emptyText: <Empty description="Chưa có nhà cung cấp" /> }}
            pagination={{
              pageSize: 10,
              showSizeChanger: false,
            }}
            onRow={(record) => {
              const id = getProviderId(record);
              return {
                onClick: () => id && navigate(`/admin/providers/${id}`),
              };
            }}
            scroll={{ x: 980 }}
          />
        </AdminListCard>
      )}
    </div>
  );
};

export default ProviderList;
