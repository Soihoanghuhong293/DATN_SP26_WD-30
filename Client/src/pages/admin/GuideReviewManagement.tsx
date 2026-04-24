import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Button, Descriptions, Empty, Input, Modal, Popconfirm, Rate, Select, Space, Table, Tag, Tooltip, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, EyeOutlined, ReloadOutlined, SearchOutlined, StarOutlined, TeamOutlined } from '@ant-design/icons';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminListCard from '../../components/admin/AdminListCard';
import './GuideReviewManagement.css';

const { Text } = Typography;

const API_URL = (import.meta as any)?.env?.VITE_API_URL || 'http://localhost:5000/api/v1';

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token') || localStorage.getItem('admin_token')}` },
});

export default function GuideReviewManagement() {
  const queryClient = useQueryClient();
  type FilterState = {
    score: string; // 'all' | '1'..'5'
    customerName: string;
    guideUserId: string; // 'all' or id
    tourId: string; // 'all' or id
  };

  const emptyFilters = (): FilterState => ({
    score: 'all',
    customerName: '',
    guideUserId: 'all',
    tourId: 'all',
  });

  const [draft, setDraft] = useState<FilterState>(() => emptyFilters());
  const [applied, setApplied] = useState<FilterState>(() => emptyFilters());
  const [selected, setSelected] = useState<any>(null);

  const { data = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-guide-reviews', applied],
    queryFn: async () => {
      const params: any = {};
      if (applied.score !== 'all') params.score = applied.score;
      if (applied.customerName.trim()) params.customer_name = applied.customerName.trim();
      if (applied.guideUserId !== 'all') params.guide_user_id = applied.guideUserId;
      if (applied.tourId !== 'all') params.tour_id = applied.tourId;
      const res = await axios.get(`${API_URL}/guide-reviews`, { ...getAuthHeader(), params });
      return res.data?.data || [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`${API_URL}/guide-reviews/${id}`, getAuthHeader());
    },
    onSuccess: () => {
      message.success('Đã xóa đánh giá');
      queryClient.invalidateQueries({ queryKey: ['admin-guide-reviews'] });
      setSelected(null);
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Xóa thất bại'),
  });

  const rows = useMemo(() => {
    return (Array.isArray(data) ? data : []).map((r: any) => ({
      key: r?._id,
      ...r,
    }));
  }, [data]);

  const guideOptions = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rows) {
      const id = String(r?.guide_user_id?._id || '');
      const name = String(r?.guide_user_id?.name || '').trim();
      if (id && name) m.set(id, name);
    }
    return [{ value: 'all', label: 'Tất cả HDV' }, ...Array.from(m.entries()).map(([value, label]) => ({ value, label }))];
  }, [rows]);

  const tourOptions = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rows) {
      const tid = String(r?.booking_id?.tour_id?._id || r?.booking_id?.tour_id || '');
      const tname = String(r?.booking_id?.tour_id?.name || '').trim();
      if (tid && tname) m.set(tid, tname);
    }
    return [{ value: 'all', label: 'Tất cả tour' }, ...Array.from(m.entries()).map(([value, label]) => ({ value, label }))];
  }, [rows]);

  const appliedTags = useMemo(() => {
    const tags: { key: keyof FilterState; label: string }[] = [];
    if (applied.score !== 'all') tags.push({ key: 'score', label: `${applied.score} sao` });
    if (applied.customerName.trim()) tags.push({ key: 'customerName', label: `Khách: ${applied.customerName.trim()}` });
    if (applied.guideUserId !== 'all') {
      const g = guideOptions.find((o) => o.value === applied.guideUserId);
      tags.push({ key: 'guideUserId', label: g ? `HDV: ${g.label}` : 'HDV' });
    }
    if (applied.tourId !== 'all') {
      const t = tourOptions.find((o) => o.value === applied.tourId);
      tags.push({ key: 'tourId', label: t ? `Tour: ${t.label}` : 'Tour' });
    }
    return tags;
  }, [applied, guideOptions, tourOptions]);

  const columns: ColumnsType<any> = useMemo(
    () => [
      {
        title: 'Hướng dẫn viên',
        key: 'guide',
        width: 220,
        render: (_: any, r: any) => (
          <div className="review-list-name-cell">
            <div className="review-list-name-icon" aria-hidden>
              <TeamOutlined />
            </div>
            <div className="review-list-name-text">
              <div className="review-list-name-title">{r?.guide_user_id?.name || '—'}</div>
              <Text type="secondary" className="review-list-sub">
                ID: <span className="review-list-id-mono">{String(r?.guide_user_id?._id || '').slice(-6).toUpperCase() || '—'}</span>
              </Text>
            </div>
          </div>
        ),
      },
      {
        title: 'Tour',
        key: 'tour',
        width: 280,
        render: (_: any, r: any) => (
          <Tooltip title={r?.booking_id?.tour_id?.name || '—'}>
            <div className="review-list-tour">{r?.booking_id?.tour_id?.name || '—'}</div>
          </Tooltip>
        ),
      },
      {
        title: 'Khách hàng',
        key: 'customer',
        width: 220,
        render: (_: any, r: any) => (
          <div>
            <div style={{ fontWeight: 600, color: '#0f172a' }}>{r?.user_id?.name || '—'}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {r?.user_id?.email || '—'}
            </Text>
          </div>
        ),
      },
      {
        title: 'Sao',
        dataIndex: 'score',
        key: 'score',
        width: 180,
        render: (v: any) => (
          <div style={{ whiteSpace: 'nowrap' }}>
            <Rate disabled value={Number(v || 0)} />
          </div>
        ),
      },
      {
        title: 'Nội dung',
        dataIndex: 'comment',
        key: 'comment',
        render: (v: any) => (
          <Tooltip title={String(v || '').trim() || undefined}>
            <div className="review-list-comment">{String(v || '').slice(0, 140) || '—'}</div>
          </Tooltip>
        ),
      },
      {
        title: 'Thao tác',
        key: 'actions',
        width: 112,
        align: 'right',
        fixed: 'right',
        render: (_: any, r: any) => {
          const id = String(r?._id || '');
          const rowDeleting = deleteMutation.isPending && deleteMutation.variables === id;
          return (
            <Space size={6} className="review-list-actions">
              <Tooltip title="Xem">
                <Button
                  type="text"
                  icon={<EyeOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelected(r);
                  }}
                />
              </Tooltip>
              <Popconfirm
                title="Xóa đánh giá này?"
                description="Thao tác không thể hoàn tác."
                okText="Xóa"
                cancelText="Hủy"
                okButtonProps={{ danger: true }}
                onConfirm={() => deleteMutation.mutate(id)}
              >
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  loading={rowDeleting}
                  onClick={(e) => e.stopPropagation()}
                />
              </Popconfirm>
            </Space>
          );
        },
      },
    ],
    [deleteMutation]
  );

  return (
    <>
      <AdminPageHeader
        title="Quản lý đánh giá"
        subtitle="Xem và quản lý đánh giá của khách hàng về hướng dẫn viên."
        extra={
          <Space wrap>
            <Button icon={<ReloadOutlined />} loading={isFetching && !isLoading} onClick={() => refetch()}>
              Tải lại
            </Button>
          </Space>
        }
      />
      <AdminListCard
        style={{
          borderRadius: 14,
          border: '1px solid #e2e8f0',
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
        }}
        toolbar={
          <div className="review-filterbar">
            <div className="review-filterbar-grid" onClick={(e) => e.stopPropagation()}>
              <div className="review-filterbar-item">
                <div className="review-filterbar-label">Số sao</div>
                <Select
                  allowClear={false}
                  size="middle"
                  value={draft.score}
                  onChange={(v) => setDraft((p) => ({ ...p, score: v }))}
                  options={[
                    { value: 'all', label: 'Tất cả sao' },
                    { value: '5', label: '5 sao' },
                    { value: '4', label: '4 sao' },
                    { value: '3', label: '3 sao' },
                    { value: '2', label: '2 sao' },
                    { value: '1', label: '1 sao' },
                  ]}
                />
              </div>

              <div className="review-filterbar-item">
                <div className="review-filterbar-label">Hướng dẫn viên</div>
                <Select
                  size="middle"
                  value={draft.guideUserId}
                  onChange={(v) => setDraft((p) => ({ ...p, guideUserId: v }))}
                  options={guideOptions}
                  showSearch
                  optionFilterProp="label"
                />
              </div>

              <div className="review-filterbar-item">
                <div className="review-filterbar-label">Tour</div>
                <Select
                  size="middle"
                  value={draft.tourId}
                  onChange={(v) => setDraft((p) => ({ ...p, tourId: v }))}
                  options={tourOptions}
                  showSearch
                  optionFilterProp="label"
                />
              </div>

              <div className="review-filterbar-item">
                <div className="review-filterbar-label">Khách hàng</div>
                <Input
                  allowClear
                  size="middle"
                  prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                  placeholder="Tìm theo tên khách..."
                  value={draft.customerName}
                  onChange={(e) => setDraft((p) => ({ ...p, customerName: e.target.value }))}
                />
              </div>

              <div className="review-filterbar-item review-filterbar-actions">
                <div className="review-filterbar-label">&nbsp;</div>
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

            <div className="review-filterbar-footer">
              <div className="review-filterbar-tags">
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
                        if (t.key === 'customerName') {
                          nextDraft.customerName = '';
                          nextApplied.customerName = '';
                        } else if (t.key === 'score') {
                          nextDraft.score = 'all';
                          nextApplied.score = 'all';
                        } else if (t.key === 'guideUserId') {
                          nextDraft.guideUserId = 'all';
                          nextApplied.guideUserId = 'all';
                        } else if (t.key === 'tourId') {
                          nextDraft.tourId = 'all';
                          nextApplied.tourId = 'all';
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
                {rows.length} mục
              </Text>
            </div>
          </div>
        }
      >
        <Table
          className="review-list-table"
          rowKey="_id"
          loading={isLoading}
          dataSource={rows}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          columns={columns}
          locale={{ emptyText: <Empty description="Chưa có đánh giá" /> }}
          scroll={{ x: 1100 }}
          onRow={(r: any) => ({
            onClick: () => setSelected(r),
          })}
        />
      </AdminListCard>

      <Modal
        open={Boolean(selected)}
        onCancel={() => setSelected(null)}
        title="Chi tiết đánh giá"
        footer={
          selected ? (
            <Space>
              <Button onClick={() => setSelected(null)}>Đóng</Button>
              <Popconfirm
                title="Xóa đánh giá này?"
                okText="Xóa"
                cancelText="Hủy"
                onConfirm={() => deleteMutation.mutate(String(selected?._id))}
              >
                <Button danger loading={deleteMutation.isPending}>
                  Xóa
                </Button>
              </Popconfirm>
            </Space>
          ) : null
        }
      >
        {selected ? (
          <Space direction="vertical" style={{ width: '100%' }} size={10}>
            <Descriptions bordered column={1} styles={{ label: { width: 160, fontWeight: 700 } }}>
              <Descriptions.Item label="Hướng dẫn viên">{selected?.guide_user_id?.name || '—'}</Descriptions.Item>
              <Descriptions.Item label="Tour">{selected?.booking_id?.tour_id?.name || '—'}</Descriptions.Item>
              <Descriptions.Item label="Khách hàng">
                {selected?.user_id?.name || selected?.user_id?.email || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Số sao">
                <div style={{ whiteSpace: 'nowrap' }}>
                  <Rate disabled value={Number(selected?.score || 0)} />
                </div>
              </Descriptions.Item>
              <Descriptions.Item label="Nội dung">{selected?.comment || '—'}</Descriptions.Item>
            </Descriptions>
          </Space>
        ) : null}
      </Modal>
    </>
  );
}
