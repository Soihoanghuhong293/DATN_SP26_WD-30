import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Descriptions, Input, Modal, Popconfirm, Rate, Select, Space, Table, Tag, Typography, message } from 'antd';
import { adminDeleteTourReview, adminGetTourReviews, adminUpdateTourReviewStatus } from '../../services/api';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminListCard from '../../components/admin/AdminListCard';

const { Text } = Typography;

export default function TourReviewManagement() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<string>('all');
  const [rating, setRating] = useState<string>('all');
  const [tourId, setTourId] = useState<string>('all');
  const [q, setQ] = useState<string>('');
  const [selected, setSelected] = useState<any>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ['admin-tour-reviews', status, rating, tourId, q],
    queryFn: async () => {
      const params: any = {};
      if (status !== 'all') params.status = status;
      if (rating !== 'all') params.rating = Number(rating);
      if (tourId !== 'all') params.tour_id = tourId;
      if (q.trim()) params.q = q.trim();
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

  const statusTag = (s: string) => {
    if (s === 'approved') return <Tag color="green">Đã duyệt</Tag>;
    if (s === 'hidden') return <Tag color="red">Đã ẩn</Tag>;
    return <Tag color="gold">Chờ duyệt</Tag>;
  };

  return (
    <>
      <AdminPageHeader
        title="Quản lý đánh giá tour"
        subtitle="Duyệt, ẩn hoặc xóa đánh giá tour của khách hàng."
      />
      <AdminListCard>
        <Space style={{ width: '100%', justifyContent: 'space-between', flexWrap: 'wrap' }} size={12}>
          <Space wrap size={12}>
            <Select
              value={status}
              style={{ width: 160 }}
              onChange={setStatus}
              options={[
                { value: 'all', label: 'Tất cả trạng thái' },
                { value: 'pending', label: 'Chờ duyệt' },
                { value: 'approved', label: 'Đã duyệt' },
                { value: 'hidden', label: 'Đã ẩn' },
              ]}
            />
            <Select
              value={rating}
              style={{ width: 140 }}
              onChange={setRating}
              options={[
                { value: 'all', label: 'Tất cả sao' },
                { value: '5', label: '5 sao' },
                { value: '4', label: '4 sao' },
                { value: '3', label: '3 sao' },
                { value: '2', label: '2 sao' },
                { value: '1', label: '1 sao' },
              ]}
            />
            <Select
              value={tourId}
              style={{ width: 280, maxWidth: '100%' }}
              onChange={setTourId}
              options={tourOptions}
              showSearch
              optionFilterProp="label"
            />
            <Input.Search
              allowClear
              placeholder="Tìm theo nội dung đánh giá..."
              style={{ width: 260, maxWidth: '100%' }}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onSearch={(v) => setQ(v)}
            />
          </Space>
          <Text type="secondary">Tổng: {rows.length}</Text>
        </Space>

        <div style={{ marginTop: 12 }}>
          <Table
            rowKey="_id"
            loading={isLoading}
            dataSource={rows}
            pagination={{ pageSize: 10 }}
            columns={[
              {
                title: 'Tour',
                render: (_: any, r: any) => <Text strong>{r?.tour_id?.name || '—'}</Text>,
              },
              {
                title: 'Khách hàng',
                render: (_: any, r: any) => <span>{r?.user_id?.name || r?.user_id?.email || '—'}</span>,
              },
              {
                title: 'Điểm tour',
                dataIndex: 'rating',
                width: 180,
                render: (v: any) => <Rate disabled value={Number(v || 0)} />,
              },
              {
                title: 'Điểm HDV',
                dataIndex: 'guide_rating',
                width: 150,
                render: (v: any) => (Number(v || 0) > 0 ? <Rate disabled value={Number(v || 0)} /> : <Text type="secondary">—</Text>),
              },
              {
                title: 'Trạng thái',
                dataIndex: 'status',
                width: 130,
                render: (v: string) => statusTag(String(v || 'pending')),
              },
              {
                title: 'Nội dung',
                dataIndex: 'comment',
                render: (v: any) => <span style={{ color: '#334155' }}>{String(v || '').slice(0, 120) || '—'}</span>,
              },
              {
                title: 'Thao tác',
                width: 310,
                render: (_: any, r: any) => (
                  <Space wrap>
                    <Button size="small" onClick={() => setSelected(r)}>
                      Xem
                    </Button>
                    <Button
                      size="small"
                      onClick={() => statusMutation.mutate({ id: String(r?._id), nextStatus: 'approved' })}
                      loading={statusMutation.isPending}
                    >
                      Duyệt
                    </Button>
                    <Button
                      size="small"
                      danger
                      onClick={() => statusMutation.mutate({ id: String(r?._id), nextStatus: 'hidden' })}
                      loading={statusMutation.isPending}
                    >
                      Ẩn
                    </Button>
                    <Popconfirm
                      title="Xóa đánh giá này?"
                      okText="Xóa"
                      cancelText="Hủy"
                      onConfirm={() => deleteMutation.mutate(String(r?._id))}
                    >
                      <Button danger size="small" loading={deleteMutation.isPending}>
                        Xóa
                      </Button>
                    </Popconfirm>
                  </Space>
                ),
              },
            ]}
          />
        </div>
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
                {Array.isArray(selected?.images) && selected.images.length > 0
                  ? `${selected.images.length} ảnh`
                  : 'Không có'}
              </Descriptions.Item>
            </Descriptions>
          </Space>
        ) : null}
      </Modal>
    </>
  );
}

