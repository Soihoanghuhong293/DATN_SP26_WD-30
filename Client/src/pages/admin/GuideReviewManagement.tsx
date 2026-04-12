import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Button, Descriptions, Input, Modal, Popconfirm, Rate, Select, Space, Table, Typography, message } from 'antd';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminListCard from '../../components/admin/AdminListCard';

const { Text } = Typography;

const API_URL = (import.meta as any)?.env?.VITE_API_URL || 'http://localhost:5000/api/v1';

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token') || localStorage.getItem('admin_token')}` },
});

export default function GuideReviewManagement() {
  const queryClient = useQueryClient();
  const [score, setScore] = useState<string>('all');
  const [customerName, setCustomerName] = useState<string>(''); // tên khách
  const [guideUserId, setGuideUserId] = useState<string>('all');
  const [tourId, setTourId] = useState<string>('all');
  const [selected, setSelected] = useState<any>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ['admin-guide-reviews', score, customerName, guideUserId, tourId],
    queryFn: async () => {
      const params: any = {};
      if (score !== 'all') params.score = score;
      if (customerName.trim()) params.customer_name = customerName.trim();
      if (guideUserId !== 'all') params.guide_user_id = guideUserId;
      if (tourId !== 'all') params.tour_id = tourId;
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

  return (
    <>
      <AdminPageHeader
        title="Quản lý đánh giá"
        subtitle="Xem và quản lý đánh giá của khách hàng về hướng dẫn viên."
      />
      <AdminListCard>
        <Space style={{ width: '100%', justifyContent: 'space-between', flexWrap: 'wrap' }} size={12}>
          <Space wrap size={12}>
            <Select
              value={score}
              style={{ width: 140 }}
              onChange={setScore}
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
              value={guideUserId}
              style={{ width: 220, maxWidth: '100%' }}
              onChange={setGuideUserId}
              options={guideOptions}
              showSearch
              optionFilterProp="label"
            />
            <Select
              value={tourId}
              style={{ width: 260, maxWidth: '100%' }}
              onChange={setTourId}
              options={tourOptions}
              showSearch
              optionFilterProp="label"
            />
            <Input.Search
              allowClear
              placeholder="Tìm theo tên khách..."
              style={{ width: 240, maxWidth: '100%' }}
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              onSearch={(v) => setCustomerName(v)}
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
                title: 'Hướng dẫn viên',
                render: (_: any, r: any) => <Text strong>{r?.guide_user_id?.name || '—'}</Text>,
              },
              {
                title: 'Tour',
                render: (_: any, r: any) => <span>{r?.booking_id?.tour_id?.name || '—'}</span>,
              },
              {
                title: 'Khách hàng',
                render: (_: any, r: any) => <span>{r?.user_id?.name || r?.user_id?.email || '—'}</span>,
              },
              {
                title: 'Sao',
                dataIndex: 'score',
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
                render: (v: any) => <span style={{ color: '#334155' }}>{String(v || '').slice(0, 120) || '—'}</span>,
              },
              {
                title: 'Thao tác',
                width: 220,
                render: (_: any, r: any) => (
                  <Space>
                    <Button size="small" onClick={() => setSelected(r)}>
                      Xem
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
