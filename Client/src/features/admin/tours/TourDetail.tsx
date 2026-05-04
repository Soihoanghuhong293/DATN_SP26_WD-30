import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { 
  Button, Card, Descriptions, Spin, Tabs, Tag, 
  Image, Table, Typography, Space, Popconfirm, message, 
  Breadcrumb, Row, Col, ConfigProvider, Divider, Modal, Select,
  Form, DatePicker, InputNumber, Empty, List, Collapse
} from 'antd';
import { 
  EditOutlined, 
  DeleteOutlined, 
  CalendarOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  UsergroupAddOutlined,
  HomeOutlined,
  PhoneOutlined,
  MailOutlined,
  PlusOutlined,
  MinusCircleOutlined,
  FileTextOutlined,
  BookOutlined,
  PictureOutlined,
  TagsOutlined,
  CoffeeOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

type TripStatus = 'DRAFT' | 'OPENING' | 'CLOSED' | 'COMPLETED';

const getAuthHeaders = () => ({
  Authorization: `Bearer ${
    localStorage.getItem('token') || localStorage.getItem('admin_token') || ''
  }`,
});

const normalizeDate = (dateVal: string) => {
  if (!dateVal) return '';
  const raw = String(dateVal).trim();
  if (!raw) return '';

  // ISO date-time
  if (raw.includes('T')) return raw.split('T')[0];

  // DD/MM/YYYY
  const slash = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    const dd = slash[1].padStart(2, '0');
    const mm = slash[2].padStart(2, '0');
    const yyyy = slash[3];
    return `${yyyy}-${mm}-${dd}`;
  }

  const d = dayjs(raw);
  return d.isValid() ? d.format('YYYY-MM-DD') : '';
};

const tripStatusLabel = (st?: TripStatus | string) => {
  const s = String(st || '').toUpperCase();
  if (s === 'DRAFT') return 'Bản nháp';
  if (s === 'OPENING') return 'Mở bán';
  if (s === 'CLOSED') return 'Đang chạy';
  if (s === 'COMPLETED') return 'Hoàn thành';
  return '—';
};

const tripStatusColor = (st?: TripStatus | string) => {
  const s = String(st || '').toUpperCase();
  if (s === 'OPENING') return 'green';
  if (s === 'CLOSED') return 'gold';
  if (s === 'COMPLETED') return 'default';
  return 'blue'; // DRAFT
};

const UI_COLORS = {
  label: '#475569', // slate-600
  muted: '#64748b', // slate-500
  body: '#0f172a', // slate-900
};

const cardTitleStyle: React.CSSProperties = {
  fontWeight: 700,
  fontSize: 16,
  color: UI_COLORS.body,
};

function priceTierAmount(p: any): number {
  const v = p?.price ?? p?.amount ?? p?.value;
  return typeof v === 'number' && !Number.isNaN(v) ? v : Number(v || 0);
}

function formatMoney(n: number) {
  return `${Number(n || 0).toLocaleString('vi-VN')} đ`;
}

/** Chỗ tối đa mỗi đợt = `departure_schedule[].slots` (model Tour không có maxGroupSize). */
function maxGuestsFromDepartureSchedule(
  departureSchedule: unknown
): { compact: string; detail: string } | null {
  if (!Array.isArray(departureSchedule) || departureSchedule.length === 0) return null;
  const slots = departureSchedule
    .map((row: any) => Number(row?.slots))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (slots.length === 0) return null;
  const lo = Math.min(...slots);
  const hi = Math.max(...slots);
  if (lo === hi) {
    return { compact: `${lo} người`, detail: `${lo} người / đợt khởi hành` };
  }
  return {
    compact: `${lo}–${hi} người`,
    detail: `${lo}–${hi} người / đợt (khác nhau theo ngày)`,
  };
}

function RestaurantLine({ label, r }: { label: string; r: any }) {
  if (!r || typeof r !== 'object') {
    return (
      <div style={{ marginBottom: 6 }}>
        <Text type="secondary">{label}: </Text>
        <Text>Chưa gán</Text>
      </div>
    );
  }
  return (
    <div style={{ marginBottom: 8, padding: 8, background: '#fafafa', borderRadius: 8 }}>
      <Text strong>{label}: </Text>
      <Text>{r.name || '—'}</Text>
      {(r.phone || r.location) && (
        <div style={{ marginTop: 4, fontSize: 13 }}>
          {r.phone && (
            <div>
              <PhoneOutlined style={{ marginRight: 6 }} />
              {r.phone}
            </div>
          )}
          {r.location && (
            <div style={{ marginTop: 2 }}>
              <EnvironmentOutlined style={{ marginRight: 6 }} />
              {r.location}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TicketRow({ t }: { t: any }) {
  if (!t || typeof t !== 'object') return null;
  const mode = t.application_mode === 'included_in_tour' ? 'included_in_tour' : 'optional_addon';
  const pa = Number(t.price_adult ?? 0);
  const pc = Number(t.price_child ?? 0);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
      <TagsOutlined style={{ marginTop: 4, color: '#6366f1' }} />
      <div style={{ flex: 1, minWidth: 200 }}>
        <Text strong>{t.name || 'Vé'}</Text>
        {t.ticket_type ? (
          <Text type="secondary" style={{ marginLeft: 6 }}>
            ({t.ticket_type})
          </Text>
        ) : null}
        <div style={{ marginTop: 4, fontSize: 13 }}>
          <Tag color={mode === 'included_in_tour' ? 'green' : 'blue'} style={{ marginRight: 0 }}>
            {mode === 'included_in_tour' ? 'Đã bao gồm' : 'Mua thêm'}
          </Tag>
          <Text type="secondary" style={{ marginLeft: 8 }}>
            NL {formatMoney(pa)} · TE {formatMoney(pc)}
          </Text>
        </div>
      </div>
    </div>
  );
}

const TourDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleForm] = Form.useForm();
  const [bookedSlotsByDate, setBookedSlotsByDate] = useState<Record<string, number>>({});
  const [loadingBookedSlots, setLoadingBookedSlots] = useState(false);
  const [tripStatusByDate, setTripStatusByDate] = useState<Record<string, TripStatus>>({});
  const [headerTripStatus, setHeaderTripStatus] = useState<TripStatus>('DRAFT');
  const [nearestTripDate, setNearestTripDate] = useState<string>('');
  const [loadingTripStatus, setLoadingTripStatus] = useState(false);
  const [tripOpsDate, setTripOpsDate] = useState<string>('');

  // 1. API GET DATA
  const { data: tour, isLoading } = useQuery({
    queryKey: ['tour', id],
    queryFn: async () => {
      const res = await axios.get(`http://localhost:5000/api/v1/tours/${id}`, {
        headers: getAuthHeaders(),
      });
      const raw = res.data?.data;
      if (raw && typeof raw === 'object' && 'tour' in raw && (raw as any).tour) {
        return (raw as any).tour;
      }
      return raw ?? null;
    },
    enabled: !!id,
  });

  const { data: allHolidayPricings = [], isLoading: loadingHolidayPricings } = useQuery({
    queryKey: ['holiday-pricings'],
    queryFn: async () => {
      const res = await axios.get('http://localhost:5000/api/v1/holiday-pricings', {
        headers: getAuthHeaders(),
      });
      return Array.isArray(res.data?.data) ? res.data.data : [];
    },
    enabled: !!tour?._id,
  });

  const holidayPricingsForTour = useMemo(() => {
    if (!tour?._id) return [];
    const tid = String(tour._id);
    const list = Array.isArray(allHolidayPricings) ? allHolidayPricings : [];
    return list
      .filter((r: any) => {
        const raw = r?.tour_id;
        if (raw == null || raw === '') return true;
        const oid = typeof raw === 'object' && raw?._id != null ? String(raw._id) : String(raw);
        return oid === tid;
      })
      .sort((a: any, b: any) => {
        const pa = Number(a?.priority ?? 0);
        const pb = Number(b?.priority ?? 0);
        if (pb !== pa) return pb - pa;
        return new Date(b?.start_date || 0).getTime() - new Date(a?.start_date || 0).getTime();
      });
  }, [allHolidayPricings, tour?._id]);

  const guidePrimary = (tour as any)?.primary_guide_id;
  const guideSecondaries = Array.isArray((tour as any)?.secondary_guide_ids) ? (tour as any).secondary_guide_ids : [];

  const updateScheduleMutation = useMutation({
    mutationFn: async (schedule: any[]) => {
      const payload = schedule.map(item => ({
        ...item,
        date: item.date ? dayjs(item.date).format('YYYY-MM-DD') : null
      })).filter(item => item.date);
      
      await axios.put(`http://localhost:5000/api/v1/tours/${id}`, {
        departure_schedule: payload,
      }, { headers: getAuthHeaders() });
    },
    onSuccess: () => {
      message.success('Đã cập nhật lịch khởi hành');
      queryClient.invalidateQueries({ queryKey: ['tour', id] });
      setIsScheduleModalOpen(false);
    },
    onError: () => message.error('Cập nhật lịch khởi hành thất bại'),
  });

  const handleOpenScheduleModal = () => {
    const schedule = tour.departure_schedule?.map((item: any) => ({
      ...item,
      date: item.date ? dayjs(item.date) : null
    })) || [];
    scheduleForm.setFieldsValue({ departure_schedule: schedule });
    setIsScheduleModalOpen(true);
  };

  const handleUpdateSchedule = () => {
    scheduleForm.validateFields().then(values => {
      updateScheduleMutation.mutate(values.departure_schedule || []);
    }).catch(info => {
      console.log('Validate Failed:', info);
    });
  };

  // 2. API DELETE
  const deleteMutation = useMutation({
    mutationFn: async () => {
      await axios.delete(`http://localhost:5000/api/v1/tours/${id}`, { headers: getAuthHeaders() });
    },
    onSuccess: () => {
      message.success('Đã xóa tour thành công');
      queryClient.invalidateQueries({ queryKey: ['tours'] });
      navigate('/admin/tours');
    },
    onError: () => message.error('Xóa thất bại')
  });

  // Compute remaining slots for this tour/trip from bookings
  useEffect(() => {
    let cancelled = false;
    const fetchBooked = async () => {
      try {
        setLoadingBookedSlots(true);
        const tourId = String((tour as any)?._id || (tour as any)?.id || id || '');
        if (!tourId) return;

        const res = await axios.get(`http://localhost:5000/api/v1/bookings`, {
          headers: getAuthHeaders(),
          params: { _t: Date.now() },
        });
        const list = Array.isArray(res.data?.data) ? res.data.data : [];
        const grouped: Record<string, number> = {};

        for (const b of list) {
          if (!b) continue;
          const bookingTourId = b?.tour_id?._id || b?.tour_id;
          if (String(bookingTourId) !== String(tourId)) continue;
          if (String(b?.status || '').toLowerCase() === 'cancelled') continue;

          const dateStr = normalizeDate(String(b?.startDate || ''));
          if (!dateStr) continue;
          const size = Number(b?.groupSize || 0);
          grouped[dateStr] = (grouped[dateStr] || 0) + (Number.isFinite(size) ? size : 0);
        }

        if (!cancelled) setBookedSlotsByDate(grouped);
      } catch {
        if (!cancelled) setBookedSlotsByDate({});
      } finally {
        if (!cancelled) setLoadingBookedSlots(false);
      }
    };

    if (tour) fetchBooked();
    return () => {
      cancelled = true;
    };
  }, [tour, id]);

  const departureScheduleWithRemaining = useMemo(() => {
    const ds = Array.isArray((tour as any)?.departure_schedule) ? ((tour as any).departure_schedule as any[]) : [];
    return ds.map((row: any) => {
      const dateStr = normalizeDate(String(row?.date || ''));
      const slots = Number(row?.slots ?? 0);
      const booked = Number(bookedSlotsByDate[dateStr] || 0);
      const remaining = Number.isFinite(slots) ? Math.max(slots - booked, 0) : 0;
      const st = tripStatusByDate[dateStr];
      return { ...row, _dateKey: dateStr, _booked: booked, _remaining: remaining, _tripStatus: st };
    });
  }, [tour, bookedSlotsByDate, tripStatusByDate]);

  useEffect(() => {
    const ds = Array.isArray((tour as any)?.departure_schedule) ? ((tour as any).departure_schedule as any[]) : [];
    const dates = ds.map((row: any) => normalizeDate(String(row?.date || ''))).filter((d: string) => !!d);
    if (dates.length === 0) {
      setNearestTripDate('');
      setHeaderTripStatus('DRAFT');
      return;
    }
    const today = dayjs().format('YYYY-MM-DD');
    const sorted = [...new Set(dates)].sort();
    const upcoming = sorted.find((d) => d >= today);
    setNearestTripDate(upcoming || sorted[0]);
  }, [tour]);

  useEffect(() => {
    let cancelled = false;
    const tourId = String((tour as any)?._id || (tour as any)?.id || id || '');
    const ds = Array.isArray((tour as any)?.departure_schedule) ? ((tour as any).departure_schedule as any[]) : [];
    const dates = ds.map((row: any) => normalizeDate(String(row?.date || ''))).filter((d: string) => !!d);

    const run = async () => {
      if (!tourId || dates.length === 0) return;
      try {
        setLoadingTripStatus(true);
        const unique = [...new Set(dates)];
        const pairs = await Promise.all(
          unique.map(async (d) => {
            const r = await axios.get(`http://localhost:5000/api/v1/tours/${tourId}/trips/${d}/status`, {
              headers: getAuthHeaders(),
              params: { _t: Date.now() },
            });
            const st = String(r.data?.data?.status || '').toUpperCase() as TripStatus;
            return [d, st] as const;
          })
        );
        const map: Record<string, TripStatus> = {};
        for (const [d, st] of pairs) map[d] = st;
        if (!cancelled) setTripStatusByDate(map);
      } catch {
        if (!cancelled) setTripStatusByDate({});
      } finally {
        if (!cancelled) setLoadingTripStatus(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [tour, id]);

  useEffect(() => {
    if (!nearestTripDate) return;
    const st = tripStatusByDate[nearestTripDate];
    if (st) setHeaderTripStatus(st);
  }, [nearestTripDate, tripStatusByDate]);

  useEffect(() => {
    if (!nearestTripDate) return;
    setTripOpsDate((prev) => prev || nearestTripDate);
  }, [nearestTripDate]);

  const { data: tripBookingsForOps = [], isLoading: loadingTripBookingsForOps } = useQuery({
    queryKey: ['trip-ops-bookings', id, tripOpsDate],
    queryFn: async () => {
      const res = await axios.get(`http://localhost:5000/api/v1/bookings`, {
        headers: getAuthHeaders(),
        params: { _t: Date.now() },
      });
      const list = Array.isArray(res.data?.data) ? res.data.data : [];
      const tid = String(id || '');
      return list.filter((b: any) => {
        const bookingTourId = String(b?.tour_id?._id || b?.tour_id || '');
        const ds = normalizeDate(String(b?.startDate || ''));
        return bookingTourId === tid && ds === tripOpsDate && String(b?.status || '').toLowerCase() !== 'cancelled';
      });
    },
    enabled: !!id && !!tripOpsDate,
  });

  const updateHeaderTripStatus = async (nextRaw: string) => {
    const tourId = String((tour as any)?._id || (tour as any)?.id || id || '');
    const d = String(nearestTripDate || '');
    if (!tourId || !d) return;
    const next = String(nextRaw || '').toUpperCase() as TripStatus;
    try {
      await axios.patch(
        `http://localhost:5000/api/v1/tours/${tourId}/trips/${d}/status`,
        { status: next },
        { headers: getAuthHeaders() }
      );
      message.success('Đã cập nhật trạng thái chuyến đi');
      setTripStatusByDate((prev) => ({ ...prev, [d]: next }));
      setHeaderTripStatus(next);
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Cập nhật trạng thái thất bại');
    }
  };

  if (isLoading) return (
    <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Spin size="large" />
    </div>
  );

  if (!tour) return <div style={{ padding: 40, textAlign: 'center' }}>Không tìm thấy dữ liệu!</div>;

  // --- RENDER CONTENT COMPONENTS ---

  const coverSrc = (tour as any).image || tour.images?.[0] || 'https://placehold.co/100x100';

  const OverviewTab = () => (
    <>
      <Card title={<span style={cardTitleStyle}>Mô tả & giới thiệu tour</span>} bordered className="saas-card" style={{ marginBottom: 24 }}>
        <div style={{ whiteSpace: 'pre-line', lineHeight: 1.75, color: '#374151', fontSize: 15 }}>
          {tour.description?.trim() ? tour.description : 'Chưa có mô tả cho tour này.'}
        </div>
      </Card>

      <Card title={<span style={cardTitleStyle}>Thư viện ảnh</span>} bordered className="saas-card" style={{ marginBottom: 24 }}>
        {tour.images?.length ? (
          <Image.PreviewGroup>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: 12,
              }}
            >
              {tour.images.map((img: string, idx: number) => (
                <Image
                  key={idx}
                  src={img}
                  alt={`${tour.name} ${idx + 1}`}
                  style={{ borderRadius: 8, height: 120, objectFit: 'cover', width: '100%' }}
                />
              ))}
            </div>
          </Image.PreviewGroup>
        ) : (
          <Empty description="Chưa có ảnh trong thư viện" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </Card>

      <Card title={<span style={cardTitleStyle}>Thông tin nhanh</span>} bordered className="saas-card" style={{ marginBottom: 24 }}>
        <Descriptions
          column={{ xs: 1, sm: 2, md: 3 }}
          size="small"
          bordered
          styles={{ label: { color: UI_COLORS.label, fontWeight: 600 } }}
        >
          <Descriptions.Item label="Giá niêm yết">{formatMoney(Number(tour.price || 0))}</Descriptions.Item>
          <Descriptions.Item label="Thời lượng">{tour.duration_days ?? '—'} ngày</Descriptions.Item>
          <Descriptions.Item label="Danh mục">{tour.category_id?.name || '—'}</Descriptions.Item>
          <Descriptions.Item label="Ngày tạo">
            {tour.created_at ? dayjs(tour.created_at).format('DD/MM/YYYY HH:mm') : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Cập nhật">
            {(tour as any).updated_at ? dayjs((tour as any).updated_at).format('DD/MM/YYYY HH:mm') : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Tour template">
            {(tour as any).template_id ? (
              <Link
                to={`/admin/tour-templates/${(tour as any).template_id?._id || (tour as any).template_id}/edit`}
              >
                Mở template
              </Link>
            ) : (
              '—'
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Số khách / đoàn tối đa">
            {maxGuestsFromDepartureSchedule(tour.departure_schedule)?.detail ?? '—'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={16}>
          <Card 
          title={
            <Space>
              <CalendarOutlined />
              <span>Lịch khởi hành</span>
            </Space>
          }
          extra={<Button size="small" icon={<EditOutlined />} onClick={handleOpenScheduleModal}>Chỉnh sửa</Button>}
          bordered={true} 
          className="saas-card"
          style={{ height: '100%' }}
        >
          <Table
            loading={loadingBookedSlots}
            dataSource={departureScheduleWithRemaining}
            rowKey={(r: any, i) => String(r?.date ?? i)}
            pagination={false}
            size="small"
            locale={{ emptyText: 'Chưa có lịch khởi hành cụ thể.' }}
            columns={[
                { title: 'Ngày', dataIndex: 'date', key: 'date', render: (date: string) => <Text strong>{date ? dayjs(date).format('DD/MM/YYYY') : '—'}</Text> },
                {
                  title: 'Trạng thái chuyến',
                  dataIndex: '_tripStatus',
                  key: '_tripStatus',
                  render: (st: TripStatus) => <Tag color={tripStatusColor(st)}>{tripStatusLabel(st)}</Tag>,
                },
                { title: 'Số chỗ', dataIndex: 'slots', key: 'slots', align: 'right', render: (slots: number) => <Tag color="blue">{slots}</Tag> },
                { title: 'Đã đặt', dataIndex: '_booked', key: '_booked', align: 'right', render: (v: number) => <Tag color="gold">{Number(v || 0)}</Tag> },
                {
                  title: 'Còn trống',
                  dataIndex: '_remaining',
                  key: '_remaining',
                  align: 'right',
                  render: (v: number) => {
                    const n = Number(v || 0);
                    return <Tag color={n <= 0 ? 'red' : n <= 5 ? 'orange' : 'green'}>{n}</Tag>;
                  }
                },
                {
                  title: 'Điều hành',
                  key: 'ops',
                  align: 'right',
                  render: (_: unknown, row: any) => {
                    const d = normalizeDate(String(row?.date || ''));
                    const st = String(row?._tripStatus || '').toUpperCase();
                    /** Cho phép xếp xe/phòng từ nháp → mở bán → đang chạy → hoàn thành (trước đây chỉ CLOSED/COMPLETED nên khóa nhầm OPENING). */
                    const canOperate =
                      st === 'DRAFT' ||
                      st === 'OPENING' ||
                      st === 'CLOSED' ||
                      st === 'COMPLETED';
                    return (
                      <Space size="small" wrap>
                        <Button
                          size="small"
                          type="primary"
                          disabled={!canOperate}
                          onClick={() => navigate(`/admin/tours/${id}/trips/${d}/seating`)}
                        >
                          Điều hành xe
                        </Button>
                        <Button
                          size="small"
                          disabled={!canOperate}
                          onClick={() => navigate(`/admin/tours/${id}/trips/${d}/rooming`)}
                        >
                          Xếp phòng
                        </Button>
                      </Space>
                    );
                  },
                },
            ]}
          />
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card
          title={
            <Space>
              <UsergroupAddOutlined />
              <span>Hướng dẫn viên</span>
            </Space>
          }
          size="small"
          bordered
          className="saas-card"
          style={{ height: '100%' }}
        >
          <Space direction="vertical" size={10} style={{ width: '100%' }}>
            <div>
              <Text style={{ color: UI_COLORS.label, fontWeight: 600 }}>HDV chính</Text>
              <div style={{ marginTop: 4 }}>
                {guidePrimary?.name ? (
                  <Space direction="vertical" size={2}>
                    <Text strong>{guidePrimary.name}</Text>
                    <Text type="secondary" style={{ fontSize: 12, color: UI_COLORS.muted }}>
                      {guidePrimary.phone ? `SĐT: ${guidePrimary.phone}` : guidePrimary.email ? `Email: ${guidePrimary.email}` : '—'}
                    </Text>
                  </Space>
                ) : (
                  <Text type="secondary" style={{ fontStyle: 'italic', color: UI_COLORS.muted }}>
                    Chưa gán
                  </Text>
                )}
              </div>
            </div>

            <div>
              <Text style={{ color: UI_COLORS.label, fontWeight: 600 }}>HDV phụ</Text>
              <div style={{ marginTop: 6 }}>
                {guideSecondaries.length ? (
                  <Space direction="vertical" size={6}>
                    {guideSecondaries.map((g: any) => (
                      <div key={String(g?._id || g?.id || g?.email || Math.random())}>
                        <Text strong>{g?.name || '—'}</Text>
                        <Text type="secondary" style={{ marginLeft: 8, fontSize: 12, color: UI_COLORS.muted }}>
                          {g?.phone ? g.phone : g?.email ? g.email : '—'}
                        </Text>
                      </div>
                    ))}
                  </Space>
                ) : (
                  <Text type="secondary" style={{ fontStyle: 'italic', color: UI_COLORS.muted }}>
                    Không có
                  </Text>
                )}
              </div>
            </div>
          </Space>
          </Card>
        </Col>
      </Row>
    </>
  );

  const ScheduleTab = () => {
    const days = Array.isArray(tour.schedule) ? tour.schedule : [];
    if (!days.length) {
      return (
        <Card bordered className="saas-card">
          <Empty description="Chưa có lịch trình chi tiết theo ngày" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </Card>
      );
    }
    const [activeIndex, setActiveIndex] = useState(0);
    const active = days[Math.min(Math.max(activeIndex, 0), days.length - 1)] || days[0];

    const DayTitle = ({ d }: { d: any }) => (
      <Space size={6} wrap>
        <Tag color="geekblue" style={{ marginInlineEnd: 0 }}>
          Ngày {d?.day ?? '—'}
        </Tag>
        <Text strong style={{ color: '#111827' }}>
          {d?.title?.trim?.() ? d.title : 'Chưa đặt tiêu đề'}
        </Text>
      </Space>
    );

    return (
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Card
            bordered
            className="saas-card"
            title={
              <Space>
                <FileTextOutlined />
                <span>Danh sách ngày</span>
                <Tag color="default" style={{ marginInlineStart: 6 }}>
                  {days.length} ngày
                </Tag>
              </Space>
            }
            bodyStyle={{ padding: 0 }}
          >
            <List
              dataSource={days}
              split
              renderItem={(d: any, idx: number) => (
                <List.Item
                  onClick={() => setActiveIndex(idx)}
                  style={{
                    cursor: 'pointer',
                    padding: '12px 16px',
                    background: idx === activeIndex ? '#eff6ff' : '#fff',
                    borderLeft: idx === activeIndex ? '3px solid #2563eb' : '3px solid transparent',
                  }}
                >
                  <div style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <Text strong style={{ color: '#111827' }}>
                        Ngày {d?.day ?? idx + 1}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {(Array.isArray(d?.activities) ? d.activities.length : 0)} hoạt động
                      </Text>
                    </div>
                    <div style={{ marginTop: 2 }}>
                      <Text type="secondary" ellipsis style={{ maxWidth: '100%', display: 'block' }}>
                        {d?.title?.trim?.() ? d.title : 'Chưa đặt tiêu đề'}
                      </Text>
                    </div>
                  </div>
                </List.Item>
              )}
            />
          </Card>
        </Col>

        <Col xs={24} lg={16}>
          <Card
            bordered
            className="saas-card"
            title={<DayTitle d={active} />}
            extra={
              <Space size="small">
                <Text type="secondary">
                  {Array.isArray(active?.activities) ? active.activities.length : 0} hoạt động
                </Text>
              </Space>
            }
          >
            <Divider orientation="left" plain style={{ margin: '4px 0 12px' }}>
              <Space>
                <ClockCircleOutlined />
                Hoạt động trong ngày
              </Space>
            </Divider>

            {Array.isArray(active?.activities) && active.activities.length > 0 ? (
              <ul style={{ paddingLeft: 20, margin: 0, color: '#4b5563', lineHeight: 1.7 }}>
                {active.activities.map((act: string, i: number) => (
                  <li key={i} style={{ marginBottom: 6 }}>
                    {act}
                  </li>
                ))}
              </ul>
            ) : (
              <Empty
                description="Chưa có hoạt động cho ngày này"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}

            <Divider orientation="left" plain style={{ margin: '16px 0 8px' }}>
              <Space>
                <CoffeeOutlined />
                Nhà hàng
              </Space>
            </Divider>
            <Row gutter={[12, 12]}>
              <Col xs={24} md={12}>
                <RestaurantLine label="Trưa" r={active?.lunch_restaurant_id} />
              </Col>
              <Col xs={24} md={12}>
                <RestaurantLine label="Tối" r={active?.dinner_restaurant_id} />
              </Col>
            </Row>

            <Divider orientation="left" plain style={{ margin: '16px 0 8px' }}>
              <Space>
                <TagsOutlined />
                Vé
              </Space>
            </Divider>
            {Array.isArray(active?.ticket_ids) && active.ticket_ids.length > 0 ? (
              active.ticket_ids.map((tk: any, idx: number) => (
                <TicketRow key={tk?._id || tk?.id || idx} t={typeof tk === 'object' ? tk : null} />
              ))
            ) : (
              <Text type="secondary">Chưa gán vé cho ngày này.</Text>
            )}

          </Card>
        </Col>
      </Row>
    );
  };

  const PolicyTab = () => {
    return (
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          <Card title="Giá niêm yết & bậc giá" bordered className="saas-card">
            <Descriptions column={1} size="small" bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Giá tour (cơ sở)">{formatMoney(Number(tour.price || 0))}</Descriptions.Item>
            </Descriptions>
            <Table
              dataSource={tour.prices || []}
              pagination={false}
              rowKey={(row: any, i) => String(row?.name ?? i)}
              size="small"
              locale={{ emptyText: 'Chưa có bậc giá chi tiết' }}
              columns={[
                { title: 'Đối tượng', dataIndex: 'name', key: 'name', render: (t: string) => <Text strong>{t || '—'}</Text> },
                {
                  title: 'Giá',
                  key: 'amount',
                  align: 'right',
                  render: (_: unknown, row: any) => formatMoney(priceTierAmount(row)),
                },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Điều khoản & chính sách" bordered className="saas-card">
            {Array.isArray(tour.policies) && tour.policies.length > 0 ? (
              <ul style={{ paddingLeft: 20, color: '#374151', margin: 0 }}>
                {tour.policies.map((pol: string, i: number) => (
                  <li key={i} style={{ marginBottom: 8 }}>
                    {pol}
                  </li>
                ))}
              </ul>
            ) : (
              <Empty description="Chưa có chính sách" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
        </Col>
        <Col span={24}>
          <Card
            title="Giá ngày lễ (holiday-pricings)"
            bordered
            className="saas-card"
            extra={
              <Link to="/admin/holiday-pricing">
                <Button type="link" size="small" style={{ padding: 0 }}>
                  Quản lý giá ngày lễ
                </Button>
              </Link>
            }
          >
            {loadingHolidayPricings ? (
              <div style={{ padding: 24, textAlign: 'center' }}>
                <Spin />
              </div>
            ) : holidayPricingsForTour.length > 0 ? (
              <Table
                dataSource={holidayPricingsForTour}
                pagination={false}
                size="small"
                rowKey={(r: any) => String(r?._id ?? r?.id)}
                columns={[
                  { title: 'Tên kỳ / đợt', dataIndex: 'name', key: 'name', render: (t: string) => <Text strong>{t || '—'}</Text> },
                  {
                    title: 'Từ — đến',
                    key: 'range',
                    render: (_: unknown, r: any) => (
                      <Text type="secondary">
                        {r.start_date ? dayjs(r.start_date).format('DD/MM/YYYY') : '—'} —{' '}
                        {r.end_date ? dayjs(r.end_date).format('DD/MM/YYYY') : '—'}
                      </Text>
                    ),
                  },
                  {
                    title: 'Phạm vi',
                    key: 'scope',
                    width: 140,
                    render: (_: unknown, r: any) =>
                      r.tour_id ? (
                        <Tag color="blue">Riêng tour này</Tag>
                      ) : (
                        <Tag>Toàn hệ thống</Tag>
                      ),
                  },
                  {
                    title: 'Cách tính',
                    key: 'calc',
                    render: (_: unknown, r: any) => {
                      const fp = r.fixed_price;
                      if (fp !== undefined && fp !== null && fp !== '' && Number.isFinite(Number(fp))) {
                        return <Text>Giá cố định: {formatMoney(Number(fp))}</Text>;
                      }
                      return (
                        <Text>
                          Hệ số ×{Number(r.price_multiplier ?? 1)} <Text type="secondary">(nhân giá cơ sở)</Text>
                        </Text>
                      );
                    },
                  },
                  {
                    title: 'Ưu tiên',
                    dataIndex: 'priority',
                    key: 'priority',
                    width: 88,
                    align: 'center',
                  },
                ]}
              />
            ) : (
              <Empty
                description="Chưa có cấu hình giá ngày lễ áp dụng cho tour này (hoặc chung toàn hệ thống)."
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Link to="/admin/holiday-pricing/create">
                  <Button type="primary" size="small">
                    Thêm giá ngày lễ
                  </Button>
                </Link>
              </Empty>
            )}
          </Card>
        </Col>
      </Row>
    );
  };

  const TripOpsTab = () => {
    const scheduleRows = Array.isArray((tour as any)?.schedule) ? (tour as any).schedule : [];
    const departureRows = Array.isArray((tour as any)?.departure_schedule) ? (tour as any).departure_schedule : [];
    const dateOptions = [...new Set(departureRows.map((r: any) => normalizeDate(String(r?.date || ''))).filter(Boolean))]
      .sort()
      .map((d) => ({ value: d, label: dayjs(d).format('DD/MM/YYYY') }));

    const checkpointDays =
      scheduleRows.length > 0
        ? scheduleRows
            .map((d: any, idx: number) => ({
              day: Number(d?.day ?? idx + 1),
              title: d?.title || `Ngày ${idx + 1}`,
              checkpoints: Array.isArray(d?.activities)
                ? d.activities.filter((x: any) => typeof x === 'string' && x.trim().length > 0)
                : [],
            }))
            .sort((a: any, b: any) => a.day - b.day)
        : [];

    if (dateOptions.length === 0) {
      return (
        <Card bordered className="saas-card">
          <Empty description="Tour chưa có đợt khởi hành để xem điểm danh/nhật ký." />
        </Card>
      );
    }

    const renderStatus = (status: any) => {
      if (status === true) return <Tag color="green" style={{ margin: 0 }}>Có mặt</Tag>;
      if (status === false) return <Tag color="red" style={{ margin: 0 }}>Vắng</Tag>;
      return <Tag style={{ margin: 0 }}>Chưa điểm danh</Tag>;
    };

    return (
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card bordered className="saas-card">
            <Space wrap>
              <Text strong>Đợt khởi hành</Text>
              <Select
                value={tripOpsDate || dateOptions[0].value}
                style={{ minWidth: 200 }}
                onChange={(v) => setTripOpsDate(String(v))}
                options={dateOptions}
              />
              <Tag color={tripStatusColor(tripStatusByDate[tripOpsDate])}>{tripStatusLabel(tripStatusByDate[tripOpsDate])}</Tag>
            </Space>
          </Card>
        </Col>

        <Col span={24}>
          {loadingTripBookingsForOps ? (
            <Card bordered className="saas-card" style={{ textAlign: 'center', padding: 24 }}>
              <Spin />
            </Card>
          ) : tripBookingsForOps.length === 0 ? (
            <Card bordered className="saas-card">
              <Empty description="Không có booking cho đợt này." />
            </Card>
          ) : (
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              {tripBookingsForOps.map((booking: any) => {
                const checkpointCheckins = (booking as any)?.checkpoint_checkins || {};
                const passengers = Array.isArray((booking as any)?.passengers) ? (booking as any).passengers : [];
                const people = passengers.map((p: any, i: number) => ({
                  passengerIndex: i,
                  name: p?.name || p?.full_name || `Khách ${i + 1}`,
                }));
                const diaryEntries: any[] = Array.isArray((booking as any)?.diary_entries) ? (booking as any).diary_entries : [];
                const getDiaryForDay = (dayNum: number) =>
                  diaryEntries.find((e: any) => Number(e?.day_no ?? 1) === Number(dayNum));

                return (
                  <Card
                    key={String(booking._id)}
                    bordered
                    className="saas-card"
                    title={
                      <Space wrap>
                        <Text strong>{booking.customer_name || 'Booking'}</Text>
                        <Tag>{booking.customer_phone || '—'}</Tag>
                        <Tag color="blue">{Number(booking.groupSize || 0)} khách</Tag>
                      </Space>
                    }
                    extra={<Link to={`/admin/bookings/${booking._id}`}>Mở booking</Link>}
                  >
                    {checkpointDays.length === 0 ? (
                      <Empty description="Tour chưa có checkpoint trong lịch trình." />
                    ) : (
                      <Collapse
                        accordion
                        items={checkpointDays.map((d: any) => ({
                          key: `${booking._id}-${d.day}`,
                          label: (
                            <Space>
                              <Tag color="blue" style={{ margin: 0 }}>Ngày {d.day}</Tag>
                              <span style={{ fontWeight: 700 }}>{d.title}</span>
                            </Space>
                          ),
                          children: (
                            <div>
                              {d.checkpoints.length === 0 ? (
                                <Empty description="Ngày này chưa có checkpoint/hoạt động." />
                              ) : (
                                <List
                                  dataSource={d.checkpoints.map((cp: string, cpIndex: number) => ({ cp, cpIndex }))}
                                  renderItem={(cpItem: any) => {
                                    const cpData = checkpointCheckins?.[String(d.day)]?.[String(cpItem.cpIndex)] || {};
                                    const passengerStatuses: any[] = Array.isArray(cpData?.passengers) ? cpData.passengers : [];
                                    const passengerReasons: any[] = Array.isArray(cpData?.reasons?.passengers) ? cpData.reasons.passengers : [];
                                    return (
                                      <List.Item style={{ paddingLeft: 0, paddingRight: 0 }}>
                                        <Card size="small" style={{ width: '100%', borderRadius: 10 }}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                                            <div>{cpItem.cp}</div>
                                            <Text type="secondary">Checkpoint #{cpItem.cpIndex + 1}</Text>
                                          </div>
                                          <Divider style={{ margin: '12px 0' }} />
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                            {people.map((p: any, idx: number) => {
                                              const status = passengerStatuses[p.passengerIndex];
                                              const reason = passengerReasons[p.passengerIndex];
                                              return (
                                                <div
                                                  key={`p-${p.passengerIndex}-${idx}`}
                                                  style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'flex-start',
                                                    gap: 12,
                                                    padding: '8px 10px',
                                                    background: '#fafafa',
                                                    borderRadius: 10,
                                                    border: '1px solid #f0f0f0',
                                                  }}
                                                >
                                                  <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 700 }}>{p.name}</div>
                                                    {status === false && reason ? (
                                                      <div style={{ marginTop: 4, color: '#6b7280', fontStyle: 'italic' }}>Lý do: {String(reason)}</div>
                                                    ) : null}
                                                  </div>
                                                  <div>{renderStatus(status)}</div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </Card>
                                      </List.Item>
                                    );
                                  }}
                                />
                              )}

                              {(() => {
                                const entry = getDiaryForDay(d.day);
                                if (!entry) {
                                  return (
                                    <div style={{ marginTop: 16, padding: '12px 14px', background: '#f9fafb', borderRadius: 10, border: '1px dashed #e5e7eb' }}>
                                      <Space size={8}>
                                        <BookOutlined style={{ color: '#94a3b8' }} />
                                        <Text type="secondary" italic>Chưa có nhật ký hành trình từ HDV cho ngày này.</Text>
                                      </Space>
                                    </div>
                                  );
                                }
                                const imgs = Array.isArray(entry.images) ? entry.images.filter((x: any) => x?.url) : [];
                                return (
                                  <Card
                                    size="small"
                                    title={
                                      <Space>
                                        <BookOutlined style={{ color: '#2563eb' }} />
                                        <span>Nhật ký hành trình (HDV)</span>
                                        {entry.created_by ? <Tag color="blue">{String(entry.created_by)}</Tag> : null}
                                      </Space>
                                    }
                                    style={{ marginTop: 16, background: '#f8fafc', borderColor: '#e2e8f0' }}
                                  >
                                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                                      {entry.date ? (
                                        <Text type="secondary" style={{ fontSize: 13 }}>
                                          {dayjs(entry.date).format('DD/MM/YYYY')}
                                          {entry.title ? ` · ${entry.title}` : ''}
                                        </Text>
                                      ) : entry.title ? (
                                        <Text strong>{entry.title}</Text>
                                      ) : null}
                                      {entry.highlight ? (
                                        <div style={{ padding: '8px 10px', background: '#fffbeb', borderLeft: '3px solid #f59e0b', borderRadius: 4, fontWeight: 600, color: '#92400e' }}>
                                          {entry.highlight}
                                        </div>
                                      ) : null}
                                      {entry.content ? (
                                        <div style={{ whiteSpace: 'pre-wrap', color: '#334155', lineHeight: 1.65 }}>{entry.content}</div>
                                      ) : null}
                                      {imgs.length > 0 ? (
                                        <div>
                                          <Divider orientation="left" plain style={{ margin: '12px 0 8px', fontSize: 12 }}>
                                            <PictureOutlined /> Hình ảnh ({imgs.length})
                                          </Divider>
                                          <Space wrap size={[8, 8]}>
                                            {imgs.map((img: any, ii: number) => (
                                              <a key={ii} href={img.url} target="_blank" rel="noopener noreferrer">
                                                <img
                                                  src={img.url}
                                                  alt={img.name || `Ảnh ${ii + 1}`}
                                                  style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 8, border: '1px solid #e2e8f0' }}
                                                />
                                              </a>
                                            ))}
                                          </Space>
                                        </div>
                                      ) : null}
                                    </Space>
                                  </Card>
                                );
                              })()}
                            </div>
                          ),
                        }))}
                      />
                    )}
                  </Card>
                );
              })}
            </Space>
          )}
        </Col>
      </Row>
    );
  };

  // --- MAIN RENDER ---
  return (
    <ConfigProvider
      theme={{
        token: {
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          colorPrimary: '#0f172a',
          borderRadius: 6,
        },
        components: {
          Card: {
            headerBg: 'transparent',
            headerFontSize: 16,
          },
          Tabs: {
            itemSelectedColor: '#2563eb',
            inkBarColor: '#2563eb',
            itemHoverColor: '#2563eb',
            titleFontSize: 14
          }
        }
      }}
    >
      <div style={{ padding: '24px 40px', backgroundColor: '#fff', minHeight: '100vh' }}>
        
        {/* 1. Breadcrumb & Navigation */}
        <div style={{ marginBottom: 24 }}>
            <Breadcrumb 
                items={[
                    { title: <Link to="/admin"><HomeOutlined /></Link> },
                    { title: <Link to="/admin/tours">Tour</Link> },
                    { title: 'Chi tiết tour' },
                ]} 
            />
        </div>

        {/* 2. Header Area */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
            <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ 
                    width: 64, height: 64, borderRadius: 8, overflow: 'hidden', 
                    border: '1px solid #e5e7eb', flexShrink: 0 
                }}>
                    <img 
                        src={coverSrc} 
                        alt="Thumbnail" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                </div>
                <div>
                    <Title level={3} style={{ margin: '0 0 4px 0' }}>{tour.name}</Title>
                    <Space size="small">
                        <Text type="secondary">ID: {tour._id}</Text>
                        <Divider type="vertical" />
                        <Tag color={tripStatusColor(headerTripStatus)} bordered={false}>
                          Trip: {tripStatusLabel(headerTripStatus)}
                        </Tag>
                        <Select
                          size="small"
                          style={{ minWidth: 140 }}
                          value={headerTripStatus}
                          onChange={updateHeaderTripStatus}
                          loading={loadingTripStatus}
                          disabled={!nearestTripDate || headerTripStatus !== 'DRAFT'}
                          options={[
                            { value: 'DRAFT', label: 'DRAFT (Bản nháp)' },
                            { value: 'OPENING', label: 'OPENING (Mở bán)' },
                          ]}
                        />
                        {nearestTripDate ? (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            Áp dụng cho đợt: {dayjs(nearestTripDate).format('DD/MM/YYYY')}
                          </Text>
                        ) : null}
                    </Space>
                </div>
            </div>

            <Space>
                <Button icon={<EditOutlined />} onClick={() => navigate(`/admin/tours/${tour._id}/edit`)}>
                    Chỉnh sửa
                </Button>
                <Popconfirm
                    title="Xóa tour này?"
                    description="Hành động này không thể hoàn tác."
                    onConfirm={() => deleteMutation.mutate()}
                    okText="Xóa ngay"
                    okButtonProps={{ danger: true }}
                >
                    <Button danger icon={<DeleteOutlined />}>Xóa</Button>
                </Popconfirm>
            </Space>
        </div>

        {/* 3. Tabs Content */}
        <Tabs 
            defaultActiveKey="1" 
            size="large"
            items={[
                { 
                    key: '1', 
                    label: 'Tổng quan', 
                    children: <OverviewTab /> 
                },
                { 
                    key: '2', 
                    label: 'Lịch trình chi tiết', 
                    children: <ScheduleTab /> 
                },
                { 
                    key: '3', 
                    label: 'Giá & Chính sách', 
                    children: <PolicyTab /> 
                },
                {
                    key: '4',
                    label: 'Điểm danh & nhật ký (Trip)',
                    children: <TripOpsTab />
                }
            ]} 
        />

        <Modal
            title="Chỉnh sửa Lịch khởi hành"
            open={isScheduleModalOpen}
            onOk={handleUpdateSchedule}
            onCancel={() => setIsScheduleModalOpen(false)}
            confirmLoading={updateScheduleMutation.isPending}
            width={600}
            okText="Cập nhật"
            cancelText="Hủy"
            destroyOnClose
        >
            <Form form={scheduleForm} layout="vertical" autoComplete="off">
                <Form.List name="departure_schedule">
                    {(fields, { add, remove }) => (
                        <div style={{maxHeight: '60vh', overflowY: 'auto', padding: '8px 16px 8px 0'}}>
                            {fields.map(({ key, name, ...restField }) => (
                                <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                                    <Form.Item {...restField} name={[name, 'date']} rules={[{ required: true, message: 'Chọn ngày!' }]} style={{ flex: 1 }}>
                                        <DatePicker format="DD/MM/YYYY" placeholder="Ngày khởi hành" style={{ width: '100%' }} />
                                    </Form.Item>
                                    <Form.Item {...restField} name={[name, 'slots']} rules={[{ required: true, message: 'Nhập số chỗ!' }]}>
                                        <InputNumber min={1} placeholder="Số chỗ" />
                                    </Form.Item>
                                    <MinusCircleOutlined className="text-gray-400 hover:text-red-500" onClick={() => remove(name)} />
                                </Space>
                            ))}
                            <Form.Item>
                                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                                    Thêm ngày khởi hành
                                </Button>
                            </Form.Item>
                        </div>
                    )}
                </Form.List>
            </Form>
        </Modal>

        {/* Style Global nhỏ để Card đẹp hơn */}
        <style>{`
            .saas-card .ant-card-body {
                padding: 24px;
            }
            .saas-card {
                box-shadow: none !important;
                border: 1px solid #e5e7eb !important;
            }
        `}</style>

      </div>
    </ConfigProvider>
  );
};

export default TourDetail;