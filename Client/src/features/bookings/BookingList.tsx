import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Button, DatePicker, Empty, Input, Popconfirm, Select, Space, Table, Tag, Tooltip, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminListCard from '../../components/admin/AdminListCard';
import { resolveEffectivePayment, canAdminDeleteBookingRecord } from './bookingPaymentResolve';
import './BookingList.css';

const { Text } = Typography;
const { RangePicker } = DatePicker;

const API_V1 = (import.meta as any)?.env?.VITE_API_URL || 'http://localhost:5000/api/v1';

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

interface IBooking {
  _id: string;
  tour_id?: { _id: string; name: string };
  user_id?: { _id: string; name: string; email: string };
  created_by_type?: 'admin' | 'customer';

  customer_name?: string;
  customer_phone?: string;

  total_price?: number;
  price?: number;

  startDate: string;
  endDate?: string;
  groupSize: number;

  // Trạng thái đơn (booking_status)
  status: 'pending' | 'confirmed' | 'cancelled';
  // Trạng thái thanh toán (payment_status)
  payment_status?: 'unpaid' | 'deposit' | 'paid' | 'refunded';

  // Giai đoạn tour do HDV cập nhật
  tour_stage?: 'scheduled' | 'in_progress' | 'completed';

  created_at: string;
}

type FilterState = {
  search: string;
  dateRange: [dayjs.Dayjs | null, dayjs.Dayjs | null];
  status?: IBooking['status'];
  payment_status?: NonNullable<IBooking['payment_status']>;
  tour_stage?: NonNullable<IBooking['tour_stage']>;
  created_by_type?: NonNullable<IBooking['created_by_type']>;
};

const emptyFilters = (): FilterState => ({
  search: '',
  dateRange: [null, null],
  status: undefined,
  payment_status: undefined,
  tour_stage: undefined,
  created_by_type: undefined,
});

const BookingList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<FilterState>(() => emptyFilters());
  const [applied, setApplied] = useState<FilterState>(() => emptyFilters());

  const paymentStatusMap = {
    unpaid: { color: 'warning', text: 'Chưa thanh toán' },
    deposit: { color: 'purple', text: 'Đã đặt cọc' },
    paid: { color: 'success', text: 'Đã thanh toán đủ' },
    refunded: { color: 'default', text: 'Đã hoàn tiền' },
  } as const;

  const resolvePaymentStatus = (record: IBooking) => resolveEffectivePayment(record);

  const getBookingStatusClass = (record: IBooking) => {
    if (record.status === 'cancelled') return 'cancelled';
    const stage = String(record.tour_stage || 'scheduled').trim().toLowerCase();
    if (stage === 'completed') return 'completed';
    if (stage === 'in_progress') return 'in_progress';
    const resolved = resolvePaymentStatus(record);
    if (resolved !== 'unpaid') return resolved;
    if (record.status === 'confirmed') return 'confirmed';
    return 'pending';
  };

  // ✅ GET LIST
  const { data: bookings, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['bookings', applied],
    queryFn: async () => {
      const res = await axios.get(`${API_V1}/bookings`, getAuthHeader());
      return res.data?.data || res.data || [];
    },
  });

  // ✅ DELETE
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`${API_V1}/bookings/${id}`, getAuthHeader());
    },
    onSuccess: () => {
      message.success('Đã xóa đơn đặt tour!');
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || 'Xóa đơn thất bại');
    },
  });

  // ✅ SEARCH
  const filteredBookings = useMemo(() => {
    const list = (bookings || []) as IBooking[];
    const q = applied.search.trim().toLowerCase();
    const [from, to] = applied.dateRange ?? [null, null];

    return list.filter((b) => {
      if (q) {
        const customerName = (b.customer_name || b.user_id?.name || '').toLowerCase();
        const contact = (b.customer_phone || b.user_id?.email || '').toLowerCase();
        const tourName = (b.tour_id?.name || '').toLowerCase();
        const id = (b._id || '').toLowerCase();
        if (!customerName.includes(q) && !contact.includes(q) && !tourName.includes(q) && !id.includes(q)) return false;
      }

      if (applied.status && b.status !== applied.status) return false;

      const resolvedPayment = resolvePaymentStatus(b);
      if (applied.payment_status && resolvedPayment !== applied.payment_status) return false;

      if (applied.tour_stage && (b.tour_stage || 'scheduled') !== applied.tour_stage) return false;

      if (applied.created_by_type && (b.created_by_type || 'customer') !== applied.created_by_type) return false;

      if (from || to) {
        if (!b.startDate) return false;
        const d = dayjs(b.startDate);
        if (from && d.isBefore(from.startOf('day'))) return false;
        if (to && d.isAfter(to.endOf('day'))) return false;
      }

      return true;
    });
  }, [bookings, applied]);

  const appliedTags = useMemo(() => {
    const tags: { key: keyof FilterState; label: string }[] = [];
    if (applied.search?.trim()) tags.push({ key: 'search', label: `Từ khóa: ${applied.search.trim()}` });
    if (applied.status) {
      const map: Record<IBooking['status'], string> = { pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', cancelled: 'Đã hủy' };
      tags.push({ key: 'status', label: `Trạng thái: ${map[applied.status]}` });
    }
    if (applied.payment_status) {
      tags.push({ key: 'payment_status', label: `Thanh toán: ${paymentStatusMap[applied.payment_status].text}` });
    }
    if (applied.tour_stage) {
      const map: Record<NonNullable<IBooking['tour_stage']>, string> = {
        scheduled: 'Chưa diễn ra',
        in_progress: 'Đang diễn ra',
        completed: 'Đã kết thúc',
      };
      tags.push({ key: 'tour_stage', label: `Giai đoạn: ${map[applied.tour_stage]}` });
    }
    if (applied.created_by_type) {
      const map: Record<NonNullable<IBooking['created_by_type']>, string> = { admin: 'Admin', customer: 'Khách hàng' };
      tags.push({ key: 'created_by_type', label: `Người tạo: ${map[applied.created_by_type]}` });
    }
    if (applied.dateRange?.[0] || applied.dateRange?.[1]) {
      const [f, t] = applied.dateRange;
      tags.push({
        key: 'dateRange',
        label: `Khởi hành: ${f ? f.format('DD/MM/YYYY') : '—'} - ${t ? t.format('DD/MM/YYYY') : '—'}`,
      });
    }
    return tags;
  }, [applied]);

  const columns: ColumnsType<IBooking> = [
    {
      title: 'Mã Đơn',
      dataIndex: '_id',
      key: 'id',
      width: 90,
      render: (id: string) => (
        <Text strong style={{ color: '#64748b' }}>#{id.slice(-6).toUpperCase()}</Text>
      ),
    },
    {
      title: 'Khách hàng',
      key: 'customer',
      width: 200,
      render: (_: any, record: IBooking) => {
        const name = record.customer_name || record.user_id?.name || 'Khách vãng lai';
        const contact = record.customer_phone || record.user_id?.email || 'Chưa có';
        const createdBy = (record.created_by_type || 'customer') === 'admin' ? 'Admin' : 'Khách hàng';

        return (
          <div className="booking-list-customer">
            <div className="booking-list-customer-name">{name}</div>
            <div className="booking-list-customer-sub">
              {contact} · <span style={{ fontWeight: 600 }}>{createdBy}</span>
            </div>
          </div>
        );
      },
    },
    {
      title: 'Tour & Thời gian',
      key: 'tour',
      width: 360,
      render: (_: any, record: IBooking) => {
        const durationDays = Number((record.tour_id as any)?.duration_days ?? 1);
        const displayEndDate = record.endDate
          ? dayjs(record.endDate)
          : dayjs(record.startDate).add(Math.max(0, durationDays - 1), 'day');
        const departureLabel = record.startDate ? dayjs(record.startDate).format('DD/MM/YYYY') : '';
        const adminDisplayName = record.tour_id?.name
          ? `${record.tour_id.name}${departureLabel ? ` (${departureLabel})` : ''}`
          : 'Tour đã bị xóa';
        return (
          <div>
            <Tooltip title={adminDisplayName}>
              <div className="booking-list-tour-title">{adminDisplayName}</div>
            </Tooltip>
            <div className="booking-list-tour-sub">
              {dayjs(record.startDate).format('DD/MM/YYYY')} - {displayEndDate.format('DD/MM/YYYY')}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Khách',
      dataIndex: 'groupSize',
      key: 'groupSize',
      width: 110,
      align: 'center' as const,
      render: (size: number) => <Tag color="geekblue">{size} người</Tag>,
    },
    {
      title: 'Tổng tiền',
      key: 'totalPrice',
      width: 140,
      align: 'right' as const,
      render: (_: any, record: IBooking) => {
        const money = record.total_price || record.price || 0;
        return (
          <Text type="danger" strong>
            {money.toLocaleString()} đ
          </Text>
        );
      },
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 180,
      render: (_: any, record: IBooking) => {
        const statusKey = getBookingStatusClass(record);
        const labelMap: Record<string, string> = {
          cancelled: 'Đã hủy',
          completed: 'Đã kết thúc',
          in_progress: 'Đang diễn ra',
          paid: 'Đã thanh toán đủ',
          deposit: 'Đã đặt cọc',
          confirmed: 'Đã xác nhận',
          pending: 'Chờ xác nhận',
          refunded: 'Đã hoàn tiền',
        };

        return (
          <span className={`booking-list-status booking-list-status--${statusKey}`}>
            <span className="booking-list-dot" />
            {labelMap[statusKey] || 'Không xác định'}
          </span>
        );
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 112,
      align: 'right' as const,
      fixed: 'right',
      render: (_: any, record: IBooking) => {
        const rowDeleting = deleteMutation.isPending && deleteMutation.variables === record._id;
        const stage = String(record.tour_stage || 'scheduled').trim().toLowerCase();
        const deleteBlockedByStage = stage === 'in_progress' || stage === 'completed';
        const deleteBlockedByPayment = !canAdminDeleteBookingRecord(record);
        const deleteDisabled = deleteBlockedByStage || deleteBlockedByPayment;
        return (
          <Space size={6} className="booking-list-actions">
            <Popconfirm
              title="Xóa đơn này?"
              description="Thao tác không thể hoàn tác."
              disabled={deleteDisabled}
              onConfirm={() => deleteMutation.mutate(record._id)}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Tooltip
                title={
                  deleteBlockedByStage
                    ? 'Không thể xóa booking khi tour đang diễn ra hoặc đã kết thúc.'
                    : deleteBlockedByPayment
                      ? 'Không thể xóa đơn đã thanh toán đủ hoặc đã hoàn tiền.'
                      : 'Xóa'
                }
              >
                <span>
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    loading={rowDeleting}
                    disabled={deleteDisabled}
                  />
                </span>
              </Tooltip>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <div className="booking-list-page">
      <AdminPageHeader
        title="Đơn đặt tour"
        subtitle="Quản lý booking và thao tác cơ bản."
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
          <div className="booking-filterbar">
            <div className="booking-filterbar-grid" onClick={(e) => e.stopPropagation()}>
              <div className="booking-filterbar-item">
                <div className="booking-filterbar-label">Tìm kiếm</div>
                <Input
                  allowClear
                  size="middle"
                  prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                  placeholder="Tìm theo khách, tour hoặc mã..."
                  value={draft.search}
                  onChange={(e) => setDraft((p) => ({ ...p, search: e.target.value }))}
                />
              </div>

              <div className="booking-filterbar-item">
                <div className="booking-filterbar-label">Ngày khởi hành</div>
                <RangePicker
                  style={{ width: '100%' }}
                  value={draft.dateRange}
                  onChange={(v) => setDraft((p) => ({ ...p, dateRange: (v as any) || [null, null] }))}
                  format="DD/MM/YYYY"
                />
              </div>

              <div className="booking-filterbar-item">
                <div className="booking-filterbar-label">Trạng thái</div>
                <Select
                  allowClear
                  size="middle"
                  placeholder="Booking"
                  value={draft.status}
                  onChange={(v) => setDraft((p) => ({ ...p, status: v }))}
                  options={[
                    { value: 'pending', label: 'Chờ xác nhận' },
                    { value: 'confirmed', label: 'Đã xác nhận' },
                    { value: 'cancelled', label: 'Đã hủy' },
                  ]}
                />
              </div>

              <div className="booking-filterbar-item">
                <div className="booking-filterbar-label">Thanh toán</div>
                <Select
                  allowClear
                  size="middle"
                  placeholder="Payment"
                  value={draft.payment_status}
                  onChange={(v) => setDraft((p) => ({ ...p, payment_status: v }))}
                  options={[
                    { value: 'unpaid', label: 'Chưa thanh toán' },
                    { value: 'deposit', label: 'Đã đặt cọc' },
                    { value: 'paid', label: 'Đã thanh toán đủ' },
                    { value: 'refunded', label: 'Đã hoàn tiền' },
                  ]}
                />
              </div>

              <div className="booking-filterbar-item">
                <div className="booking-filterbar-label">Giai đoạn tour</div>
                <Select
                  allowClear
                  size="middle"
                  placeholder="Tour stage"
                  value={draft.tour_stage}
                  onChange={(v) => setDraft((p) => ({ ...p, tour_stage: v }))}
                  options={[
                    { value: 'scheduled', label: 'Chưa diễn ra' },
                    { value: 'in_progress', label: 'Đang diễn ra' },
                    { value: 'completed', label: 'Đã kết thúc' },
                  ]}
                />
              </div>

              <div className="booking-filterbar-item">
                <div className="booking-filterbar-label">Người tạo</div>
                <Select
                  allowClear
                  size="middle"
                  placeholder="Admin/Khách"
                  value={draft.created_by_type}
                  onChange={(v) => setDraft((p) => ({ ...p, created_by_type: v }))}
                  options={[
                    { value: 'admin', label: 'Admin' },
                    { value: 'customer', label: 'Khách hàng' },
                  ]}
                />
              </div>

              <div className="booking-filterbar-item booking-filterbar-actions">
                <div className="booking-filterbar-label">&nbsp;</div>
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

            <div className="booking-filterbar-footer">
              <div className="booking-filterbar-tags">
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
                        if (t.key === 'dateRange') {
                          nextDraft.dateRange = [null, null];
                          nextApplied.dateRange = [null, null];
                        } else if (t.key === 'search') {
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
                {filteredBookings.length} mục
              </Text>
            </div>
          </div>
        }
      >
        <Table
          className="booking-list-table"
          columns={columns}
          dataSource={filteredBookings}
          rowKey="_id"
          loading={isLoading}
          locale={{ emptyText: <Empty description="Chưa có booking" /> }}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          scroll={{ x: 1000 }}
          onRow={(record: IBooking) => ({
            onClick: (e) => {
              if ((e.target as HTMLElement).closest('.booking-list-actions, .ant-popover, .ant-popconfirm, .ant-btn, button, input, textarea, select')) {
                return;
              }
              navigate(`/admin/bookings/${record._id}`);
            },
          })}
        />
      </AdminListCard>
    </div>
  );
};

export default BookingList;
   