import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { Button, DatePicker, Empty, Input, Popconfirm, Select, Space, Table, Tag, Tooltip, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, PlusOutlined, ReloadOutlined, SearchOutlined, TagsOutlined } from '@ant-design/icons';
import AdminPageHeader from '../admin/AdminPageHeader';
import AdminListCard from '../admin/AdminListCard';
import { getTours } from '../../services/api';
import type { ITour } from '../../types/tour.types';
import './HolidayPricingList.css';

const { Text } = Typography;
const { RangePicker } = DatePicker;

const HolidayPricingList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const API_URL = (import.meta as any)?.env?.VITE_API_URL || 'http://localhost:5000/api/v1';
  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token') || localStorage.getItem('admin_token')}` },
  });

  type HolidayRow = {
    _id: string;
    name: string;
    tour_id?: { _id: string; name: string } | string | null;
    start_date: string;
    end_date: string;
    price_multiplier?: number;
    fixed_price?: number;
    priority?: number;
  };

  type FilterState = {
    search: string;
    dateRange: [dayjs.Dayjs | null, dayjs.Dayjs | null];
    tourId?: string; // undefined => all
    pricingType?: 'fixed' | 'multiplier';
  };

  const emptyFilters = (): FilterState => ({
    search: '',
    dateRange: [null, null],
    tourId: undefined,
    pricingType: undefined,
  });

  const [draft, setDraft] = useState<FilterState>(() => emptyFilters());
  const [applied, setApplied] = useState<FilterState>(() => emptyFilters());

  //  danh sách 
  const { data, isLoading, isFetching, refetch, isError, error } = useQuery({
    queryKey: ['holiday-pricings'],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/holiday-pricings`, getAuthHeader());
      return response.data.data;
    },
  });

  const { data: toursResp } = useQuery({
    queryKey: ['tours', { limit: 200 }],
    queryFn: () => getTours({ limit: 200 }),
  });

  const tourOptions = useMemo(() => {
    const tours = (toursResp?.data ?? []) as ITour[];
    return tours
      .map((t) => ({ value: t._id || t.id, label: t.name || String(t._id || t.id) }))
      .filter((o) => Boolean(o.value));
  }, [toursResp]);

  // xóa 
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`${API_URL}/holiday-pricings/${id}`, getAuthHeader());
    },
    onSuccess: () => {
      message.success('Xóa thành công cấu hình ngày lễ!');
      queryClient.invalidateQueries({ queryKey: ['holiday-pricings'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Lỗi khi xóa cấu hình!');
    },
  });

  const rows: HolidayRow[] = Array.isArray(data) ? data : [];

  const filtered = useMemo(() => {
    const q = applied.search.trim().toLowerCase();
    const [from, to] = applied.dateRange ?? [null, null];
    return rows.filter((r) => {
      if (q) {
        const name = String(r.name || '').toLowerCase();
        const id = String(r._id || '').toLowerCase();
        if (!name.includes(q) && !id.includes(q)) return false;
      }
      if (applied.tourId) {
        const v: any = r.tour_id;
        const tid = typeof v === 'object' ? String(v?._id || '') : String(v || '');
        if (tid !== applied.tourId) return false;
      }
      if (applied.pricingType) {
        const isFixed = Boolean(r.fixed_price);
        if (applied.pricingType === 'fixed' && !isFixed) return false;
        if (applied.pricingType === 'multiplier' && isFixed) return false;
      }
      if (from || to) {
        const start = dayjs(r.start_date);
        if (from && start.isBefore(from.startOf('day'))) return false;
        if (to && start.isAfter(to.endOf('day'))) return false;
      }
      return true;
    });
  }, [rows, applied]);

  const appliedTags = useMemo(() => {
    const tags: { key: keyof FilterState; label: string }[] = [];
    if (applied.search.trim()) tags.push({ key: 'search', label: `Từ khóa: ${applied.search.trim()}` });
    if (applied.tourId) {
      const t = tourOptions.find((o) => o.value === applied.tourId);
      tags.push({ key: 'tourId', label: t ? `Tour: ${t.label}` : 'Tour' });
    }
    if (applied.pricingType) {
      tags.push({ key: 'pricingType', label: applied.pricingType === 'fixed' ? 'Giá: cố định' : 'Giá: hệ số' });
    }
    if (applied.dateRange?.[0] || applied.dateRange?.[1]) {
      const [f, t] = applied.dateRange;
      tags.push({
        key: 'dateRange',
        label: `Thời gian: ${f ? f.format('DD/MM/YYYY') : '—'} - ${t ? t.format('DD/MM/YYYY') : '—'}`,
      });
    }
    return tags;
  }, [applied, tourOptions]);

  const columns: ColumnsType<HolidayRow> = [
    {
      title: 'Tên Dịp Lễ',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record) => (
        <div className="holiday-list-name-cell">
          <div className="holiday-list-name-icon" aria-hidden>
            <TagsOutlined />
          </div>
          <div className="holiday-list-name-text">
            <Tooltip title={`ID: ${record._id}`}>
              <div className="holiday-list-name-title">{text}</div>
            </Tooltip>
            <Text type="secondary" className="holiday-list-id">
              ID: <span className="holiday-list-id-mono">{String(record._id).slice(-6).toUpperCase()}</span>
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Áp dụng cho Tour',
      dataIndex: 'tour_id',
      key: 'tour_id',
      width: 240,
      render: (tour: any) => {
        const name = tour && typeof tour === 'object' ? tour.name : '';
        return name ? <Tag color="geekblue">{name}</Tag> : <Tag color="green">Tất cả tour</Tag>;
      },
    },
    {
      title: 'Thời gian áp dụng',
      key: 'time',
      width: 200,
      render: (_: any, record: any) => (
        <span className="holiday-list-time">
          {dayjs(record.start_date).format('DD/MM/YYYY')} - {dayjs(record.end_date).format('DD/MM/YYYY')}
        </span>
      ),
    },
    {
      title: 'Mức Giá (Thay đổi)',
      key: 'pricing',
      width: 220,
      render: (_: any, record: any) => {
        if (record.fixed_price) {
          return (
            <Tag color="magenta">
              Cố định: {record.fixed_price.toLocaleString('vi-VN')} đ
            </Tag>
          );
        }
        return <Tag color="cyan">Hệ Số Nhân: x{record.price_multiplier}</Tag>;
      },
    },
    {
      title: 'Độ Ưu Tiên',
      dataIndex: 'priority',
      key: 'priority',
      width: 120,
      render: (priority: number) => <Tag color={priority > 0 ? "orange" : "default"}>{priority}</Tag>
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 112,
      align: 'right',
      fixed: 'right',
      render: (_: any, record: any) => (
          <Popconfirm
            title="Bạn có chắc chắn muốn xóa cấu hình này?"
            onConfirm={() => deleteMutation.mutate(record._id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Xóa">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                loading={deleteMutation.isPending && deleteMutation.variables === record._id}
                onClick={(e) => e.stopPropagation()}
              />
            </Tooltip>
          </Popconfirm>
      ),
    },
  ];

  return (
    <div className="holiday-list-page">
      <AdminPageHeader
        title="Quản lý Ngày lễ"
        subtitle="Cấu hình điều chỉnh giá theo khoảng thời gian và tour."
        extra={
          <Space wrap>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/admin/holiday-pricing/create')}>
              Thêm Ngày lễ
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
          <div className="holiday-filterbar">
            <div className="holiday-filterbar-grid" onClick={(e) => e.stopPropagation()}>
              <div className="holiday-filterbar-item">
                <div className="holiday-filterbar-label">Tìm kiếm</div>
                <Input
                  allowClear
                  size="middle"
                  prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                  placeholder="Tìm theo tên hoặc mã..."
                  value={draft.search}
                  onChange={(e) => setDraft((p) => ({ ...p, search: e.target.value }))}
                />
              </div>

              <div className="holiday-filterbar-item">
                <div className="holiday-filterbar-label">Thời gian</div>
                <RangePicker
                  style={{ width: '100%' }}
                  value={draft.dateRange}
                  onChange={(v) => setDraft((p) => ({ ...p, dateRange: (v as any) || [null, null] }))}
                  format="DD/MM/YYYY"
                />
              </div>

              <div className="holiday-filterbar-item">
                <div className="holiday-filterbar-label">Tour</div>
                <Select
                  allowClear
                  size="middle"
                  placeholder="Tất cả tour"
                  value={draft.tourId}
                  onChange={(v) => setDraft((p) => ({ ...p, tourId: v }))}
                  options={tourOptions}
                  showSearch
                  optionFilterProp="label"
                />
              </div>

              <div className="holiday-filterbar-item">
                <div className="holiday-filterbar-label">Kiểu giá</div>
                <Select
                  allowClear
                  size="middle"
                  placeholder="Tất cả"
                  value={draft.pricingType}
                  onChange={(v) => setDraft((p) => ({ ...p, pricingType: v }))}
                  options={[
                    { value: 'fixed', label: 'Giá cố định' },
                    { value: 'multiplier', label: 'Hệ số nhân' },
                  ]}
                />
              </div>

              <div className="holiday-filterbar-item holiday-filterbar-actions">
                <div className="holiday-filterbar-label">&nbsp;</div>
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

            <div className="holiday-filterbar-footer">
              <div className="holiday-filterbar-tags">
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
                        } else if (t.key === 'dateRange') {
                          nextDraft.dateRange = [null, null];
                          nextApplied.dateRange = [null, null];
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
                {filtered.length} mục
              </Text>
            </div>
          </div>
        }
      >
        {isError ? (
          <div style={{ padding: 16 }}>
            <Text type="secondary">{(error as any)?.message || 'Không tải được dữ liệu'}</Text>
          </div>
        ) : (
          <Table<HolidayRow>
            className="holiday-list-table"
            columns={columns}
            dataSource={filtered}
            rowKey="_id"
            loading={isLoading}
            pagination={{ pageSize: 10, showSizeChanger: false }}
            locale={{ emptyText: <Empty description="Chưa có cấu hình" /> }}
            scroll={{ x: 1100 }}
          />
        )}
      </AdminListCard>
    </div>
  );
};

export default HolidayPricingList;