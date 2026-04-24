import { Button, Descriptions, Image, Modal, Segmented, Space, Table, Tag, Typography, message, Input } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import AdminListCard from '../../components/admin/AdminListCard';
import AdminPageHeader from '../../components/admin/AdminPageHeader';

const { Text, Paragraph, Title } = Typography;

const API_V1 =
  (import.meta.env?.VITE_API_URL as string | undefined) || 'http://localhost:5000/api/v1';

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

type CancelStatus = 'pending' | 'approved' | 'rejected' | 'refunded';

type CancelRow = {
  _id: string;
  tour_id?: { name?: string };
  user_id?: { name?: string; email?: string };
  startDate?: string;
  payment_status?: string;
  total_price?: number;
  deposit_amount?: number;
  cancel_request?: any;
  _computed?: { paid_amount?: number; total?: number; payment_status?: string };
};

const statusTag = (s: CancelStatus) => {
  if (s === 'pending') return <Tag color="gold">Chờ xử lý</Tag>;
  if (s === 'approved') return <Tag color="blue">Đã duyệt</Tag>;
  if (s === 'rejected') return <Tag color="red">Từ chối</Tag>;
  return <Tag color="green">Đã hoàn tiền</Tag>;
};

export default function BookingCancelledList() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<CancelRow[]>([]);
  const [filter, setFilter] = useState<CancelStatus>('pending');

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_V1}/bookings/cancel-requests`, {
        ...getAuthHeader(),
        params: { status: filter },
      });
      setRows(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Không tải được danh sách yêu cầu hủy');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const openDetail = async (id: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const res = await axios.get(`${API_V1}/bookings/cancel-requests/${id}`, getAuthHeader());
      setDetail(res.data?.data || null);
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Không tải được chi tiết yêu cầu');
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const currentStatus: CancelStatus = useMemo(() => {
    const s = String(detail?.cancel_request?.status || 'pending');
    if (s === 'approved' || s === 'rejected' || s === 'refunded') return s;
    return 'pending';
  }, [detail]);

  const paidAmount = Number(detail?._computed?.paid_amount || 0);
  const refundAmount = Number(detail?.cancel_request?.refund_amount || 0);
  const refundPercent = Number(detail?.cancel_request?.refund_percent || 0);

  const columns: ColumnsType<CancelRow> = [
    {
      title: 'Tour',
      key: 'tour',
      render: (_, r) => <Text strong>{r?.tour_id?.name || 'Tour'}</Text>,
    },
    {
      title: 'Khởi hành',
      key: 'startDate',
      width: 130,
      render: (_, r) => (r?.startDate ? dayjs(r.startDate).format('DD/MM/YYYY') : '---'),
    },
    {
      title: 'Khách',
      key: 'user',
      render: (_, r) => (
        <div>
          <div><Text strong>{r?.user_id?.name || '—'}</Text></div>
          <div><Text type="secondary">{r?.user_id?.email || '—'}</Text></div>
        </div>
      ),
    },
    {
      title: 'Hoàn tiền',
      key: 'refund',
      width: 160,
      render: (_, r) => {
        const amt = Number(r?.cancel_request?.refund_amount || 0);
        const pct = Number(r?.cancel_request?.refund_percent || 0);
        return (
          <div>
            <Text strong style={{ color: '#d90429' }}>{amt.toLocaleString('vi-VN')}đ</Text>
            <div><Text type="secondary">({pct}%)</Text></div>
          </div>
        );
      },
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 140,
      render: (_, r) => statusTag((r?.cancel_request?.status || 'pending') as CancelStatus),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 120,
      render: (_, r) => (
        <Button type="primary" onClick={() => openDetail(String(r._id))}>
          Xem
        </Button>
      ),
    },
  ];

  const bank = detail?.cancel_request?.bank || {};

  return (
    <div>
      <AdminPageHeader
        title="Quản lý tour hủy"
        subtitle="Xử lý yêu cầu hủy tour và hoàn tiền thủ công."
        breadcrumbItems={[
          { title: 'Admin', href: '/admin/dashboard' },
          { title: 'Quản lý đặt chỗ', href: '/admin/bookings' },
          { title: 'Quản lý tour hủy' },
        ]}
        extra={
          <Space wrap>
            <Button onClick={fetchList} disabled={loading}>Tải lại</Button>
          </Space>
        }
      />

      <AdminListCard
        toolbar={
          <Space wrap>
            <Segmented
              value={filter}
              onChange={(v) => setFilter(v as CancelStatus)}
              options={[
                { label: 'Chờ xử lý', value: 'pending' },
                { label: 'Đã duyệt', value: 'approved' },
                { label: 'Từ chối', value: 'rejected' },
                { label: 'Đã hoàn tiền', value: 'refunded' },
              ]}
            />
          </Space>
        }
      >
        <Table
          rowKey="_id"
          columns={columns}
          dataSource={rows}
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </AdminListCard>

      <Modal
        open={detailOpen}
        title="Chi tiết yêu cầu hủy"
        onCancel={() => {
          if (detailLoading || actionLoading) return;
          setDetailOpen(false);
          setDetail(null);
        }}
        footer={
          <Space wrap>
            <Button
              onClick={() => {
                setDetailOpen(false);
                setDetail(null);
              }}
              disabled={detailLoading || actionLoading}
            >
              Đóng
            </Button>
            {currentStatus === 'pending' ? (
              <>
                <Button
                  danger
                  onClick={() => {
                    setRejectReason('');
                    setRejectOpen(true);
                  }}
                  loading={actionLoading}
                  disabled={!detail?._id}
                >
                  Từ chối
                </Button>
                <Button
                  type="primary"
                  loading={actionLoading}
                  disabled={!detail?._id}
                  onClick={async () => {
                    if (!detail?._id) return;
                    setActionLoading(true);
                    try {
                      const res = await axios.patch(
                        `${API_V1}/bookings/cancel-requests/${detail._id}/approve`,
                        {},
                        getAuthHeader()
                      );
                      const cr = res.data?.data?.cancel_request;
                      setDetail((prev: any) => (prev ? { ...prev, cancel_request: cr } : prev));
                      message.success('Đã duyệt yêu cầu');
                      fetchList();
                    } catch (e: any) {
                      message.error(e?.response?.data?.message || 'Không thể duyệt');
                    } finally {
                      setActionLoading(false);
                    }
                  }}
                >
                  Duyệt
                </Button>
              </>
            ) : null}
            {currentStatus === 'approved' ? (
              <Button
                type="primary"
                loading={actionLoading}
                disabled={!detail?._id}
                onClick={async () => {
                  if (!detail?._id) return;
                  setActionLoading(true);
                  try {
                    const res = await axios.patch(
                      `${API_V1}/bookings/cancel-requests/${detail._id}/refunded`,
                      {},
                      getAuthHeader()
                    );
                    const cr = res.data?.data?.cancel_request;
                    setDetail((prev: any) => (prev ? { ...prev, cancel_request: cr, status: 'cancelled', payment_status: 'refunded' } : prev));
                    message.success('Đã xác nhận hoàn tiền');
                    fetchList();
                  } catch (e: any) {
                    message.error(e?.response?.data?.message || 'Không thể xác nhận hoàn tiền');
                  } finally {
                    setActionLoading(false);
                  }
                }}
              >
                Đã hoàn tiền
              </Button>
            ) : null}
          </Space>
        }
        width={820}
        confirmLoading={detailLoading}
      >
        {detailLoading ? (
          <div style={{ padding: 24 }}>Đang tải...</div>
        ) : !detail ? (
          <div style={{ padding: 24 }}>Không có dữ liệu.</div>
        ) : (
          <Space direction="vertical" size={14} style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <Title level={5} style={{ margin: 0 }}>{detail?.tour_id?.name || 'Tour'}</Title>
                <Text type="secondary">Mã booking: <Text copyable>{detail?._id}</Text></Text>
              </div>
              <div>{statusTag(currentStatus)}</div>
            </div>

            <Descriptions bordered column={1} styles={{ label: { width: 220, fontWeight: 700 } }}>
              <Descriptions.Item label="Ngày khởi hành">
                {detail?.startDate ? dayjs(detail.startDate).format('DD/MM/YYYY') : '---'}
              </Descriptions.Item>
              <Descriptions.Item label="Số tiền đã thanh toán">
                <Text strong>{paidAmount.toLocaleString('vi-VN')}đ</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Số tiền cần hoàn">
                <Text strong style={{ color: '#d90429' }}>
                  {refundAmount.toLocaleString('vi-VN')}đ
                </Text>{' '}
                <Text type="secondary">({refundPercent}%)</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Lý do hủy">
                <Paragraph style={{ marginBottom: 0 }}>{detail?.cancel_request?.reason || '—'}</Paragraph>
              </Descriptions.Item>
            </Descriptions>

            <AdminListCard style={{ marginTop: 0 }}>
              <Title level={5} style={{ marginTop: 0 }}>Thông tin nhận tiền</Title>
              <Descriptions bordered column={1} styles={{ label: { width: 220, fontWeight: 700 } }}>
                <Descriptions.Item label="Ngân hàng">{bank?.name || '—'}</Descriptions.Item>
                <Descriptions.Item label="Số tài khoản">{bank?.account_number || '—'}</Descriptions.Item>
                <Descriptions.Item label="Chủ tài khoản">{bank?.account_name || '—'}</Descriptions.Item>
                <Descriptions.Item label="Mã QR">
                  {detail?.cancel_request?.qr_image_data_url ? (
                    <Image
                      width={160}
                      src={String(detail.cancel_request.qr_image_data_url)}
                      alt="QR"
                    />
                  ) : (
                    '—'
                  )}
                </Descriptions.Item>
              </Descriptions>
              {currentStatus === 'rejected' ? (
                <div style={{ marginTop: 12 }}>
                  <Text type="danger">Lý do từ chối: {String(detail?.cancel_request?.reject_reason || '')}</Text>
                </div>
              ) : null}
            </AdminListCard>

            {currentStatus === 'approved' ? (
              <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                Admin thực hiện chuyển tiền thủ công (chuyển khoản/quét QR). Sau đó bấm <b>“Đã hoàn tiền”</b> để hệ thống cập nhật booking = đã hủy.
              </Paragraph>
            ) : null}
          </Space>
        )}
      </Modal>

      <Modal
        open={rejectOpen}
        title="Từ chối yêu cầu hủy"
        okText="Xác nhận từ chối"
        cancelText="Đóng"
        okButtonProps={{ danger: true, loading: actionLoading, disabled: !rejectReason.trim() || !detail?._id }}
        onCancel={() => {
          if (actionLoading) return;
          setRejectOpen(false);
          setRejectReason('');
        }}
        onOk={async () => {
          if (!detail?._id) return;
          const reason = rejectReason.trim();
          if (!reason) {
            message.error('Vui lòng nhập lý do từ chối');
            return;
          }
          setActionLoading(true);
          try {
            const res = await axios.patch(
              `${API_V1}/bookings/cancel-requests/${detail._id}/reject`,
              { reason },
              getAuthHeader()
            );
            const cr = res.data?.data?.cancel_request;
            setDetail((prev: any) => (prev ? { ...prev, cancel_request: cr } : prev));
            message.success('Đã từ chối yêu cầu');
            setRejectOpen(false);
            setRejectReason('');
            fetchList();
          } catch (e: any) {
            message.error(e?.response?.data?.message || 'Không thể từ chối');
          } finally {
            setActionLoading(false);
          }
        }}
      >
        <Input.TextArea
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Nhập lý do từ chối"
          autoSize={{ minRows: 3, maxRows: 6 }}
          maxLength={500}
          showCount
        />
      </Modal>
    </div>
  );
}

