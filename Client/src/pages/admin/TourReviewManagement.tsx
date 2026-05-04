import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Descriptions, Empty, Image, Input, Modal, Popconfirm, Rate, Select, Space, Table, Tag, Tooltip, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, EyeOutlined, ReloadOutlined, SearchOutlined, StarOutlined } from '@ant-design/icons';
import { adminDeleteTourReview, adminGetTourReviews, adminUpdateTourReviewStatus } from '../../services/api';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminListCard from '../../components/admin/AdminListCard';
import { ADMIN_PENDING_TOUR_REVIEW_COUNT_KEY } from '../../components/layout/AdminSidebar';
import './GuideReviewManagement.css';

const { Text } = Typography;

/** Chuẩn hóa URL ảnh review (full URL hoặc đường dẫn /uploads/...) */
const resolveReviewImageUrl = (raw: string) => {
  const u = String(raw || "").trim();
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  const api = String((import.meta as any)?.env?.VITE_API_URL || "http://localhost:5000/api/v1").replace(/\/api\/v1\/?$/i, "");
  return `${api}${u.startsWith("/") ? u : `/${u}`}`;
};

export default function TourReviewManagement() {
  const queryClient = useQueryClient();
  type FilterState = {
    rating: string; // all | 1..5
    guideUserId: string; // all | id
    tourId: string; // all | id
    customerName: string;
  };

  const emptyFilters = (): FilterState => ({
    rating: 'all',
    guideUserId: 'all',
    tourId: 'all',
    customerName: '',
  });

  const [draft, setDraft] = useState<FilterState>(() => emptyFilters());
  const [applied, setApplied] = useState<FilterState>(() => emptyFilters());
  const [selected, setSelected] = useState<any>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ['admin-tour-reviews', applied],
    queryFn: async () => {
      const params: any = {};
      if (applied.rating !== 'all') params.rating = Number(applied.rating);
      if (applied.guideUserId !== 'all') params.guide_user_id = applied.guideUserId;
      if (applied.tourId !== 'all') params.tour_id = applied.tourId;
      if (applied.customerName.trim()) params.q = applied.customerName.trim();
      const res = await adminGetTourReviews(params);
      return res?.data || [];
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, nextStatus }: { id: string; nextStatus: 'pending' | 'approved' | 'hidden' }) => {
      await adminUpdateTourReviewStatus(id, nextStatus);
    },
    onSuccess: () => {
      message.success('Đã cập nhật trạng thái đánh giá');
      queryClient.invalidateQueries({ queryKey: ['admin-tour-reviews'] });
      queryClient.invalidateQueries({ queryKey: ADMIN_PENDING_TOUR_REVIEW_COUNT_KEY });
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Cập nhật trạng thái thất bại'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await adminDeleteTourReview(id);
    },
    onSuccess: () => {
      message.success('Đã xóa đánh giá');
      queryClient.invalidateQueries({ queryKey: ['admin-tour-reviews'] });
      queryClient.invalidateQueries({ queryKey: ADMIN_PENDING_TOUR_REVIEW_COUNT_KEY });
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

  const tourOptions = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rows) {
      const id = String(r?.tour_id?._id || r?.tour_id || '');
      const name = String(r?.tour_id?.name || '').trim();
      if (id && name) m.set(id, name);
    }
    return [{ value: 'all', label: 'Tất cả tour' }, ...Array.from(m.entries()).map(([value, label]) => ({ value, label }))];
  }, [rows]);

  const guideOptions = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rows) {
      const id = String(r?.guide_user_id?._id || r?.guide_user_id || '');
      const name = String(r?.guide_user_id?.name || '').trim();
      if (id && name) m.set(id, name);
    }
    return [{ value: 'all', label: 'Tất cả HDV' }, ...Array.from(m.entries()).map(([value, label]) => ({ value, label }))];
  }, [rows]);

  const statusTag = (s: string) => {
    if (s === 'approved') return <Tag color="green">Đã duyệt</Tag>;
    if (s === 'hidden') return <Tag color="red">Đã ẩn</Tag>;
    return <Tag color="gold">Chờ duyệt</Tag>;
  };

  const appliedTags = useMemo(() => {
    const tags: Array<{ key: keyof FilterState; label: string }> = [];
    if (applied.rating !== 'all') tags.push({ key: 'rating', label: `${applied.rating} sao` });
    if (applied.guideUserId !== 'all') {
      const g = guideOptions.find((o) => o.value === applied.guideUserId);
      tags.push({ key: 'guideUserId', label: g ? `HDV: ${g.label}` : 'HDV' });
    }
    if (applied.tourId !== 'all') {
      const t = tourOptions.find((o) => o.value === applied.tourId);
      tags.push({ key: 'tourId', label: t ? `Tour: ${t.label}` : 'Tour' });
    }
    if (applied.customerName.trim()) tags.push({ key: 'customerName', label: `Khách: ${applied.customerName.trim()}` });
    return tags;
  }, [applied, guideOptions, tourOptions]);

  const columns: ColumnsType<any> = useMemo(
    () => [
      {
        title: 'Hướng dẫn viên',
        key: 'guide',
        width: 220,
        render: (_: any, r: any) => (
          <div>
            <div style={{ fontWeight: 600, color: '#0f172a' }}>{r?.guide_user_id?.name || '—'}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {r?.guide_user_id?.email || '—'}
            </Text>
          </div>
        ),
      },
      {
        title: 'Tour',
        key: 'tour',
        width: 260,
        render: (_: any, r: any) => (
          <Tooltip title={r?.tour_id?.name || '—'}>
            <div className="review-list-tour">{r?.tour_id?.name || '—'}</div>
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
        dataIndex: 'rating',
        key: 'rating',
        width: 150,
        render: (v: any) => (
          <div style={{ whiteSpace: 'nowrap' }}>
            <Rate disabled value={Number(v || 0)} />
          </div>
        ),
      },
      {
        title: 'Sao HDV',
        dataIndex: 'guide_rating',
        key: 'guide_rating',
        width: 150,
        render: (v: any) =>
          Number(v || 0) > 0 ? (
            <div style={{ whiteSpace: 'nowrap' }}>
              <Rate disabled value={Number(v || 0)} />
            </div>
          ) : (
            <Text type="secondary">—</Text>
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
        subtitle="Xem và quản lý đánh giá của khách hàng về tour."
        extra={
          <Space wrap>
            <Button icon={<ReloadOutlined />} loading={isLoading} onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-tour-reviews'] })}>
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
                  value={draft.rating}
                  onChange={(v) => setDraft((p) => ({ ...p, rating: v }))}
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
                <div className="review-filterbar-label">Tour</div>
                <Select
                  value={draft.tourId}
                  onChange={(v) => setDraft((p) => ({ ...p, tourId: v }))}
                  options={tourOptions}
                  showSearch
                  optionFilterProp="label"
                />
              </div>

              <div className="review-filterbar-item">
                <div className="review-filterbar-label">Hướng dẫn viên</div>
                <Select
                  value={draft.guideUserId}
                  onChange={(v) => setDraft((p) => ({ ...p, guideUserId: v }))}
                  options={guideOptions}
                  showSearch
                  optionFilterProp="label"
                />
              </div>

              <div className="review-filterbar-item">
                <div className="review-filterbar-label">Khách hàng</div>
                <Input
                  allowClear
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
                  <Button type="primary" onClick={() => setApplied(draft)}>
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
                        if (t.key === 'rating') {
                          nextDraft.rating = 'all';
                          nextApplied.rating = 'all';
                        } else if (t.key === 'guideUserId') {
                          nextDraft.guideUserId = 'all';
                          nextApplied.guideUserId = 'all';
                        } else if (t.key === 'tourId') {
                          nextDraft.tourId = 'all';
                          nextApplied.tourId = 'all';
                        } else if (t.key === 'customerName') {
                          nextDraft.customerName = '';
                          nextApplied.customerName = '';
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
          scroll={{ x: 980 }}
          onRow={(r: any) => ({
            onClick: () => setSelected(r),
          })}
        />
      </AdminListCard>

      <Modal
        open={Boolean(selected)}
        onCancel={() => setSelected(null)}
        title="Chi tiết đánh giá tour"
        footer={
          selected ? (
            <Space>
              <Button onClick={() => setSelected(null)}>Đóng</Button>
              <Button
                onClick={() => statusMutation.mutate({ id: String(selected?._id), nextStatus: 'approved' })}
                loading={statusMutation.isPending}
              >
                Duyệt
              </Button>
              <Button
                danger
                onClick={() => statusMutation.mutate({ id: String(selected?._id), nextStatus: 'hidden' })}
                loading={statusMutation.isPending}
              >
                Ẩn
              </Button>
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
            <Descriptions bordered column={1} styles={{ label: { width: 170, fontWeight: 700 } }}>
              <Descriptions.Item label="Tour">{selected?.tour_id?.name || '—'}</Descriptions.Item>
              <Descriptions.Item label="Hướng dẫn viên">{selected?.guide_user_id?.name || '—'}</Descriptions.Item>
              <Descriptions.Item label="Khách hàng">{selected?.user_id?.name || selected?.user_id?.email || '—'}</Descriptions.Item>
              <Descriptions.Item label="Trạng thái">{statusTag(String(selected?.status || 'pending'))}</Descriptions.Item>
              <Descriptions.Item label="Điểm tour">
                <Rate disabled value={Number(selected?.rating || 0)} />
              </Descriptions.Item>
              <Descriptions.Item label="Điểm HDV">
                {Number(selected?.guide_rating || 0) > 0 ? <Rate disabled value={Number(selected?.guide_rating || 0)} /> : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Nội dung">{selected?.comment || '—'}</Descriptions.Item>
              <Descriptions.Item label="Ảnh">
                {Array.isArray(selected?.images) && selected.images.length > 0 ? (
                  <Image.PreviewGroup>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                      {selected.images.map((src: string, i: number) => {
                        const href = resolveReviewImageUrl(src);
                        if (!href) return null;
                        return (
                          <Image
                            key={`${i}-${href.slice(-32)}`}
                            width={112}
                            height={112}
                            src={href}
                            alt={`Ảnh ${i + 1}`}
                            style={{ objectFit: "cover", borderRadius: 8 }}
                          />
                        );
                      })}
                    </div>
                  </Image.PreviewGroup>
                ) : (
                  "Không có"
                )}
              </Descriptions.Item>
            </Descriptions>
            <Space>
              <Button
                onClick={() => statusMutation.mutate({ id: String(selected?._id), nextStatus: 'approved' })}
                loading={statusMutation.isPending}
              >
                Duyệt
              </Button>
              <Button
                danger
                onClick={() => statusMutation.mutate({ id: String(selected?._id), nextStatus: 'hidden' })}
                loading={statusMutation.isPending}
              >
                Ẩn
              </Button>
            </Space>
          </Space>
        ) : null}
      </Modal>
    </>
  );
}

