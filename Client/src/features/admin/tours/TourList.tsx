import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  App as AntdApp,
  Button,
  DatePicker,
  Empty,
  Input,
  InputNumber,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined, SearchOutlined, TagsOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AdminPageHeader from '../../../components/admin/AdminPageHeader';
import AdminListCard from '../../../components/admin/AdminListCard';
import dayjs from 'dayjs';
import { deleteTour, getCategories, getGuides, getTours } from '../../../services/api';
import type { IGuide } from '../../../types/guide.types';
import type { ICategory, ITour } from '../../../types/tour.types';
import './TourList.css';

const { Text } = Typography;
const { RangePicker } = DatePicker;

const getTourId = (t: ITour) => t._id || t.id;

type TripStatus = 'DRAFT' | 'OPENING' | 'CLOSED' | 'COMPLETED';

const getAuthHeaders = () => ({
  Authorization: `Bearer ${
    localStorage.getItem('token') || localStorage.getItem('admin_token') || ''
  }`,
});

const normalizeDate = (dateVal?: string) => {
  if (!dateVal) return '';
  const raw = String(dateVal).trim();
  if (!raw) return '';
  if (raw.includes('T')) return raw.split('T')[0];
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

const nearestTripDateOfTour = (t: ITour): string => {
  const ds = Array.isArray((t as any)?.departure_schedule) ? ((t as any).departure_schedule as any[]) : [];
  const dates = ds.map((row: any) => normalizeDate(row?.date)).filter((d: string) => !!d);
  if (dates.length === 0) return '';
  const today = dayjs().format('YYYY-MM-DD');
  const sorted = [...new Set(dates)].sort();
  const upcoming = sorted.find((d) => d >= today);
  return upcoming || sorted[0];
};

const formatDateTime = (value?: string) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(d);
};

type TourAdminStatusFilter = 'departed' | 'full';
type SeatFilter = 'available' | 'near_full' | 'full';

type FilterState = {
  search: string;
  departureRange: [dayjs.Dayjs | null, dayjs.Dayjs | null];
  categoryId?: string;
  status?: TourAdminStatusFilter;
  tripStatus?: TripStatus;
  priceMin?: number;
  priceMax?: number;
  seats?: SeatFilter;
  guideId?: string;
};

const emptyFilters = (): FilterState => ({
  search: '',
  departureRange: [null, null],
  categoryId: undefined,
  status: undefined,
  tripStatus: undefined,
  priceMin: undefined,
  priceMax: undefined,
  seats: undefined,
  guideId: undefined,
});

const TourList = () => {
  const { message } = AntdApp.useApp();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<FilterState>(() => emptyFilters());
  const [applied, setApplied] = useState<FilterState>(() => emptyFilters());

  const { data: categoriesResp, isLoading: isLoadingCategories } = useQuery({
    queryKey: ['categories', { status: 'active' }],
    queryFn: () => getCategories({ status: 'active' }),
  });

  const { data: guidesResp, isLoading: isLoadingGuides } = useQuery({
    queryKey: ['guides', { limit: 200 }],
    queryFn: () => getGuides({ limit: 200 }),
  });

  const departureStartISO =
    applied.departureRange?.[0] ? applied.departureRange[0].startOf('day').toISOString() : undefined;

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['tours', applied],
    queryFn: () =>
      getTours({
        search: applied.search || undefined,
        category_id: applied.categoryId,
        minPrice: applied.priceMin,
        maxPrice: applied.priceMax,
        departureDate: departureStartISO,
      }),
  });

  const tours = (data?.data ?? []) as ITour[];
  const [tripStatusByTourId, setTripStatusByTourId] = useState<Record<string, TripStatus>>({});

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const pairs = await Promise.all(
          tours.map(async (t) => {
            const tourId = String(getTourId(t) || '');
            const d = nearestTripDateOfTour(t);
            if (!tourId || !d) return [tourId, 'DRAFT' as TripStatus] as const;
            const r = await axios.get(`http://localhost:5000/api/v1/tours/${tourId}/trips/${d}/status`, {
              headers: getAuthHeaders(),
              params: { _t: Date.now() },
            });
            const st = String(r.data?.data?.status || '').toUpperCase() as TripStatus;
            return [tourId, st] as const;
          })
        );
        const map: Record<string, TripStatus> = {};
        for (const [tid, st] of pairs) if (tid) map[tid] = st;
        if (!cancelled) setTripStatusByTourId(map);
      } catch {
        if (!cancelled) setTripStatusByTourId({});
      }
    };
    if (tours.length > 0) run();
    return () => {
      cancelled = true;
    };
  }, [tours]);

  const categoryOptions = useMemo(() => {
    const categories = ((categoriesResp as any)?.data?.categories ?? []) as ICategory[];
    return categories.map((c) => ({ value: c._id || c.id, label: c.name }));
  }, [categoriesResp]);

  const guideOptions = useMemo(() => {
    const guides = ((guidesResp as any)?.data?.guides ?? []) as IGuide[];
    return guides.map((g) => ({ value: g._id || g.id, label: `${g.name} · ${g.phone}` }));
  }, [guidesResp]);

  const filteredData = useMemo(() => {
    const { search, departureRange, status, tripStatus, seats, guideId } = applied;
    const [from, to] = departureRange ?? [null, null];
    const lower = (search || '').trim().toLowerCase();

    return tours.filter((t) => {
      if (lower) {
        const id = String(getTourId(t) || '').toLowerCase();
        const name = String(t.name || '').toLowerCase();
        if (!name.includes(lower) && !id.includes(lower)) return false;
      }

      const departure = (t as any)?.departure_schedule?.[0]?.date as string | undefined;
      if (from || to) {
        if (!departure) return false;
        const d = dayjs(departure);
        if (from && d.isBefore(from.startOf('day'))) return false;
        if (to && d.isAfter(to.endOf('day'))) return false;
      }

      if (status === 'departed') {
        if (!departure) return false;
        if (!dayjs(departure).isBefore(dayjs(), 'day')) return false;
      }
      if (status === 'full') {
        const slots = Number((t as any)?.slots ?? (t as any)?.totalSlots ?? NaN);
        const remaining = Number((t as any)?.slotsRemaining ?? (t as any)?.remainingSlots ?? NaN);
        if (Number.isFinite(remaining)) {
          if (remaining > 0) return false;
        } else if (Number.isFinite(slots)) {
          const booked = Number((t as any)?.bookedSlots ?? NaN);
          if (Number.isFinite(booked) && booked < slots) return false;
        }
      }

      if (tripStatus) {
        const tourId = String(getTourId(t) || '');
        const st = tripStatusByTourId[tourId];
        if (!st) return false;
        if (String(st).toUpperCase() !== String(tripStatus).toUpperCase()) return false;
      }

      if (seats) {
        const slots = Number((t as any)?.slots ?? (t as any)?.totalSlots ?? NaN);
        const remaining = Number((t as any)?.slotsRemaining ?? (t as any)?.remainingSlots ?? NaN);
        const booked = Number((t as any)?.bookedSlots ?? NaN);
        const rem = Number.isFinite(remaining)
          ? remaining
          : Number.isFinite(slots) && Number.isFinite(booked)
            ? Math.max(slots - booked, 0)
            : NaN;
        if (Number.isFinite(rem) && Number.isFinite(slots)) {
          const ratio = slots > 0 ? rem / slots : 0;
          if (seats === 'full' && rem !== 0) return false;
          if (seats === 'available' && rem <= 0) return false;
          if (seats === 'near_full' && !(rem > 0 && ratio <= 0.2)) return false;
        }
      }

      if (guideId) {
        const g = (t as any)?.primaryGuide || (t as any)?.guide_id || (t as any)?.guide;
        const gid = typeof g === 'object' ? String(g?._id || g?.id || '') : String(g || '');
        if (gid && gid !== guideId) return false;
        if (!gid) return false;
      }

      return true;
    });
  }, [applied, tours, tripStatusByTourId]);

  const appliedTags = useMemo(() => {
    const tags: { key: keyof FilterState; label: string }[] = [];
    if (applied.search?.trim()) tags.push({ key: 'search', label: `Từ khóa: ${applied.search.trim()}` });
    if (applied.categoryId) {
      const cat = categoryOptions.find((o) => o.value === applied.categoryId);
      tags.push({ key: 'categoryId', label: cat ? `Danh mục: ${cat.label}` : 'Danh mục' });
    }
    if (applied.status) {
      const map: Record<TourAdminStatusFilter, string> = {
        departed: 'Đã khởi hành',
        full: 'Hết chỗ',
      };
      tags.push({ key: 'status', label: `Lọc: ${map[applied.status]}` });
    }
    if (applied.tripStatus) {
      const map: Record<TripStatus, string> = {
        DRAFT: 'DRAFT',
        OPENING: 'OPENING',
        CLOSED: 'CLOSED',
        COMPLETED: 'COMPLETED',
      };
      tags.push({ key: 'tripStatus', label: `Trạng thái chuyến: ${map[applied.tripStatus]}` });
    }
    if (applied.priceMin != null || applied.priceMax != null) {
      const min = applied.priceMin != null ? `${applied.priceMin.toLocaleString('vi-VN')}đ` : '—';
      const max = applied.priceMax != null ? `${applied.priceMax.toLocaleString('vi-VN')}đ` : '—';
      tags.push({ key: 'priceMin', label: `Giá: ${min} - ${max}` });
    }
    if (applied.departureRange?.[0] || applied.departureRange?.[1]) {
      const [f, t] = applied.departureRange;
      const fLabel = f ? f.format('DD/MM/YYYY') : '—';
      const tLabel = t ? t.format('DD/MM/YYYY') : '—';
      tags.push({ key: 'departureRange', label: `Khởi hành: ${fLabel} - ${tLabel}` });
    }
    if (applied.seats) {
      const map: Record<SeatFilter, string> = {
        available: 'Còn chỗ',
        near_full: 'Gần đầy',
        full: 'Hết chỗ',
      };
      tags.push({ key: 'seats', label: `Số chỗ: ${map[applied.seats]}` });
    }
    if (applied.guideId) {
      const g = guideOptions.find((o) => o.value === applied.guideId);
      tags.push({ key: 'guideId', label: g ? `HDV: ${g.label}` : 'HDV' });
    }
    return tags;
  }, [applied, categoryOptions, guideOptions]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTour(id),
    onSuccess: () => {
      message.success('Đã xoá tour');
      queryClient.invalidateQueries({ queryKey: ['tours'] });
    },
    onError: () => message.error('Xoá tour thất bại'),
  });

  const columns: ColumnsType<ITour> = useMemo(() => [
    {
      title: 'Tour',
      key: 'tour',
      render: (_, record) => {
        const imgLink = record.images?.[0];
        const id = getTourId(record);
        const shortId = id ? String(id).slice(-6).toUpperCase() : '';
        const departure = (record as any)?.departure_schedule?.[0]?.date as string | undefined;
        const departureLabel = departure ? dayjs(departure).format('DD/MM/YYYY') : undefined;
        const baseName = record.name || '—';
        const displayName = departureLabel ? `${baseName} (${departureLabel})` : baseName;
        return (
          <div className="tour-list-name-cell">
            <div className="tour-list-name-avatar" aria-hidden>
              <img
                src={imgLink || 'https://placehold.co/100x100?text=Tour'}
                alt={displayName}
              />
            </div>
            <div className="tour-list-name-text">
              <Tooltip title={id ? `ID: ${id}` : undefined}>
                <div className="tour-list-name-title">{displayName}</div>
              </Tooltip>
              <Text type="secondary" className="tour-list-id">
                ID: <span className="tour-list-id-mono">{shortId || '—'}</span>
              </Text>
            </div>
          </div>
        );
      },
    },
    {
      title: 'Giá tour',
      dataIndex: 'price',
      key: 'price',
      width: 160,
      sorter: (a, b) => (a.price ?? 0) - (b.price ?? 0),
      render: (price: number) => (
        <Text style={{ fontWeight: 500, color: '#334155' }}>
          {(price ?? 0).toLocaleString('vi-VN')} ₫
        </Text>
      ),
    },
    {
      title: 'Thời lượng',
      dataIndex: 'duration_days',
      key: 'duration_days',
      width: 150,
      render: (_v: unknown, record) => {
        const days = (record.duration_days ?? record.duration_ ?? 0) as number;
        if (!days) return <Text type="secondary">—</Text>;
        return <span className="tour-list-duration">{days} ngày</span>;
      },
    },
    {
      title: 'Trạng thái chuyến',
      key: 'trip_status',
      width: 140,
      render: (_: unknown, record) => {
        const tourId = String(getTourId(record) || '');
        const st = tripStatusByTourId[tourId];
        const code = st ? String(st).toLowerCase() : 'unknown';
        return (
          <span className={`tour-list-trip-status tour-list-trip-status--${code}`}>
            {tripStatusLabel(st)}
          </span>
        );
      },
    },
    {
      title: 'Danh mục',
      dataIndex: 'category_id',
      key: 'category_id',
      width: 220,
      responsive: ['sm'],
      render: (value: unknown) => {
        if (!value) return <Text type="secondary">—</Text>;
        const v: any = value;
        const name = typeof v === 'object' ? (v?.name as string | undefined) : undefined;
        const label = name || String(value);
        return (
          <span className="tour-list-category">
            <TagsOutlined className="tour-list-category-icon" />
            <Tooltip title={label}>
              <span className="tour-list-category-text">{label}</span>
            </Tooltip>
          </span>
        );
      },
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 112,
      align: 'right',
      fixed: 'right',
      render: (_, record) => {
        const id = getTourId(record);
        const rowDeleting = deleteMutation.isPending && deleteMutation.variables === id;
        return (
          <Space size={6} className="tour-list-actions">
            <Tooltip title="Sửa">
              <Button
                type="text"
                icon={<EditOutlined />}
                aria-label="Sửa tour"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/admin/tours/${id}/edit`);
                }}
                disabled={!id}
              />
            </Tooltip>
            <Popconfirm
              title="Xoá tour này?"
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
                aria-label="Xoá tour"
                loading={rowDeleting}
                disabled={!id}
                onClick={(e) => e.stopPropagation()}
              />
            </Popconfirm>
          </Space>
        );
      },
    },
  ], [deleteMutation, navigate, tripStatusByTourId]);

  return (
    <div className="tour-list-page">
      <AdminPageHeader
        title="Tour"
        subtitle="Quản lý danh sách tour."
        extra={
          <Space wrap>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/admin/tours/create')}>
              Thêm tour
            </Button>
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
          <div className="tour-filterbar">
            <div className="tour-filterbar-grid" onClick={(e) => e.stopPropagation()}>
              <div className="tour-filterbar-item">
                <div className="tour-filterbar-label">Tìm kiếm</div>
                <Input
                  allowClear
                  size="middle"
                  prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                  placeholder="Tìm theo tên hoặc mã tour..."
                  value={draft.search}
                  onChange={(e) => setDraft((p) => ({ ...p, search: e.target.value }))}
                />
              </div>

              <div className="tour-filterbar-item">
                <div className="tour-filterbar-label">Ngày khởi hành</div>
                <RangePicker
                  style={{ width: '100%' }}
                  value={draft.departureRange}
                  onChange={(v) => setDraft((p) => ({ ...p, departureRange: (v as any) || [null, null] }))}
                  format="DD/MM/YYYY"
                />
              </div>

              <div className="tour-filterbar-item">
                <div className="tour-filterbar-label">Danh mục</div>
                <Select
                  allowClear
                  size="middle"
                  placeholder="Chọn danh mục"
                  loading={isLoadingCategories}
                  options={categoryOptions}
                  value={draft.categoryId}
                  onChange={(v) => setDraft((p) => ({ ...p, categoryId: v }))}
                />
              </div>

              <div className="tour-filterbar-item">
                <div className="tour-filterbar-label">Khác</div>
                <Select
                  allowClear
                  size="middle"
                  placeholder="Chọn"
                  options={[
                    { value: 'departed', label: 'Đã khởi hành' },
                    { value: 'full', label: 'Hết chỗ' },
                  ]}
                  value={draft.status}
                  onChange={(v) => setDraft((p) => ({ ...p, status: v }))}
                />
              </div>

              <div className="tour-filterbar-item">
                <div className="tour-filterbar-label">Trạng thái chuyến</div>
                <Select
                  allowClear
                  size="middle"
                  placeholder="Chọn trạng thái chuyến"
                  options={[
                    { value: 'DRAFT', label: 'DRAFT (Bản nháp)' },
                    { value: 'OPENING', label: 'OPENING (Mở bán)' },
                    { value: 'CLOSED', label: 'CLOSED (Đang chạy)' },
                    { value: 'COMPLETED', label: 'COMPLETED (Hoàn thành)' },
                  ]}
                  value={draft.tripStatus}
                  onChange={(v) => setDraft((p) => ({ ...p, tripStatus: v }))}
                />
              </div>

              <div className="tour-filterbar-item">
                <div className="tour-filterbar-label">Giá (min – max)</div>
                <div className="tour-filterbar-range2">
                  <InputNumber
                    min={0}
                    style={{ width: '100%' }}
                    placeholder="Min"
                    value={draft.priceMin}
                    onChange={(v) => setDraft((p) => ({ ...p, priceMin: typeof v === 'number' ? v : undefined }))}
                  />
                  <InputNumber
                    min={0}
                    style={{ width: '100%' }}
                    placeholder="Max"
                    value={draft.priceMax}
                    onChange={(v) => setDraft((p) => ({ ...p, priceMax: typeof v === 'number' ? v : undefined }))}
                  />
                </div>
              </div>

              <div className="tour-filterbar-item">
                <div className="tour-filterbar-label">Số chỗ</div>
                <Select
                  allowClear
                  size="middle"
                  placeholder="Chọn"
                  options={[
                    { value: 'available', label: 'Còn chỗ' },
                    { value: 'near_full', label: 'Gần đầy' },
                    { value: 'full', label: 'Hết chỗ' },
                  ]}
                  value={draft.seats}
                  onChange={(v) => setDraft((p) => ({ ...p, seats: v }))}
                />
              </div>

              <div className="tour-filterbar-item">
                <div className="tour-filterbar-label">Hướng dẫn viên</div>
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  size="middle"
                  placeholder="Chọn HDV"
                  loading={isLoadingGuides}
                  options={guideOptions}
                  value={draft.guideId}
                  onChange={(v) => setDraft((p) => ({ ...p, guideId: v }))}
                />
              </div>

              <div className="tour-filterbar-item tour-filterbar-actions">
                <div className="tour-filterbar-label">&nbsp;</div>
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
                  <Button
                    type="primary"
                    loading={isFetching}
                    onClick={() => setApplied(draft)}
                  >
                    Áp dụng
                  </Button>
                </Space>
              </div>
            </div>

            <div className="tour-filterbar-footer">
              <div className="tour-filterbar-tags">
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
                        if (t.key === 'departureRange') {
                          nextDraft.departureRange = [null, null];
                          nextApplied.departureRange = [null, null];
                        } else if (t.key === 'priceMin') {
                          nextDraft.priceMin = undefined;
                          nextDraft.priceMax = undefined;
                          nextApplied.priceMin = undefined;
                          nextApplied.priceMax = undefined;
                        } else {
                          (nextDraft as any)[t.key] = undefined;
                          (nextApplied as any)[t.key] = undefined;
                          if (t.key === 'search') (nextDraft as any)[t.key] = '';
                          if (t.key === 'search') (nextApplied as any)[t.key] = '';
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
                {filteredData.length} mục
              </Text>
            </div>
          </div>
        }
      >
        {isError ? (
          <div style={{ padding: 16 }}>
            <Text type="secondary">
              {(error as Error)?.message || 'Không tải được danh sách tour'}
            </Text>
          </div>
        ) : (
          <Table<ITour>
            className="tour-list-table"
            columns={columns}
            dataSource={filteredData}
            rowKey={(r) => getTourId(r) || `row-${r.name}`}
            loading={isLoading}
            onRow={(record) => {
              const id = getTourId(record);
              return {
                onClick: () => {
                  if (!id) return;
                  navigate(`/admin/tours/${id}`);
                },
              };
            }}
            pagination={{
              pageSize: 8,
              showSizeChanger: false,
            }}
            locale={{ emptyText: <Empty description="Chưa có tour" /> }}
            scroll={{ x: 1040 }}
          />
        )}
      </AdminListCard>
    </div>
  );
};

export default TourList;