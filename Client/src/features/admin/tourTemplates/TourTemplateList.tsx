import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Button, Empty, Input, InputNumber, Popconfirm, Select, Space, Table, Tag, Tooltip, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import AdminPageHeader from '../../../components/admin/AdminPageHeader';
import AdminListCard from '../../../components/admin/AdminListCard';
import { getCategories } from '../../../services/api';
import type { ICategory } from '../../../types/tour.types';
import './TourTemplateList.css';

const { Text } = Typography;

type ITourTemplate = {
  _id: string;
  name: string;
  duration_days: number;
  image?: string;
  images?: string[];
  category_id?: { _id: string; name: string } | string;
  updated_at?: string;
  created_at?: string;
};

const API_V1 = (import.meta as any)?.env?.VITE_API_URL || 'http://localhost:5000/api/v1';

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

const getTemplateId = (t: ITourTemplate) => t._id;

type FilterState = {
  search: string;
  categoryId?: string;
  durationMin?: number;
  durationMax?: number;
};

const emptyFilters = (): FilterState => ({
  search: '',
  categoryId: undefined,
  durationMin: undefined,
  durationMax: undefined,
});

export default function TourTemplateList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<FilterState>(() => emptyFilters());
  const [applied, setApplied] = useState<FilterState>(() => emptyFilters());

  const { data: categoriesResp, isLoading: isLoadingCategories } = useQuery({
    queryKey: ['categories', { status: 'active' }],
    queryFn: () => getCategories({ status: 'active' }),
  });

  const categoryOptions = useMemo(() => {
    const categories = ((categoriesResp as any)?.data?.categories ?? []) as ICategory[];
    return categories.map((c) => ({ value: c._id || c.id, label: c.name }));
  }, [categoriesResp]);

  const { data: templates = [], isLoading, isFetching } = useQuery({
    queryKey: ['tour-templates', applied],
    queryFn: async () => {
      const res = await axios.get(`${API_V1}/tour-templates`, getAuthHeader());
      return res.data?.data || res.data || [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`${API_V1}/tour-templates/${id}`, getAuthHeader());
    },
    onSuccess: () => {
      message.success('Đã xoá template');
      queryClient.invalidateQueries({ queryKey: ['tour-templates'] });
    },
    onError: () => message.error('Xoá template thất bại'),
  });

  const filtered = useMemo(() => {
    const items = templates as ITourTemplate[];
    const q = applied.search.trim().toLowerCase();
    return items.filter((t) => {
      if (q) {
        const id = String(getTemplateId(t) || '').toLowerCase();
        const name = String(t.name || '').toLowerCase();
        if (!name.includes(q) && !id.includes(q)) return false;
      }
      if (applied.categoryId) {
        const v: any = t.category_id;
        const cid = typeof v === 'object' ? String(v?._id || '') : String(v || '');
        if (cid !== applied.categoryId) return false;
      }
      if (applied.durationMin != null && (t.duration_days ?? 0) < applied.durationMin) return false;
      if (applied.durationMax != null && (t.duration_days ?? 0) > applied.durationMax) return false;
      return true;
    });
  }, [templates, applied]);

  const appliedTags = useMemo(() => {
    const tags: { key: keyof FilterState; label: string }[] = [];
    if (applied.search?.trim()) tags.push({ key: 'search', label: `Từ khóa: ${applied.search.trim()}` });
    if (applied.categoryId) {
      const cat = categoryOptions.find((o) => o.value === applied.categoryId);
      tags.push({ key: 'categoryId', label: cat ? `Danh mục: ${cat.label}` : 'Danh mục' });
    }
    if (applied.durationMin != null || applied.durationMax != null) {
      const min = applied.durationMin != null ? `${applied.durationMin} ngày` : '—';
      const max = applied.durationMax != null ? `${applied.durationMax} ngày` : '—';
      tags.push({ key: 'durationMin', label: `Thời lượng: ${min} - ${max}` });
    }
    return tags;
  }, [applied, categoryOptions]);

  const columns: ColumnsType<ITourTemplate> = [
    {
      title: 'TEMPLATE',
      key: 'name',
      render: (_: any, record) => {
        const imgLink = record.image || record.images?.[0];
        const shortId = record._id ? String(record._id).slice(-6).toUpperCase() : '—';
        return (
          <div className="template-list-name-cell">
            <div className="template-list-name-avatar" aria-hidden>
              <img
                src={imgLink || 'https://placehold.co/100x100?text=Template'}
                alt={record.name}
              />
            </div>
            <div className="template-list-name-text">
              <Tooltip title={`ID: ${record._id}`}>
                <div className="template-list-name-title">{record.name}</div>
              </Tooltip>
              <Text type="secondary" className="template-list-id">
                ID: <span className="template-list-id-mono">{shortId}</span>
              </Text>
            </div>
          </div>
        );
      },
    },
    {
      title: 'THỜI LƯỢNG',
      dataIndex: 'duration_days',
      key: 'duration_days',
      width: 120,
      render: (v: number) => (
        <span className="template-list-duration">{v} ngày</span>
      ),
    },
    {
      title: 'DANH MỤC',
      dataIndex: 'category_id',
      key: 'category_id',
      width: 220,
      render: (value: unknown) => {
        if (!value) return <Text type="secondary">—</Text>;
        const v: any = value;
        const label = typeof v === 'object' ? String(v?.name || v?._id || '') : String(v);
        return (
          <span className="template-list-category">
            <span className="template-list-category-icon" aria-hidden>🏷️</span>
            <Tooltip title={label}>
              <span className="template-list-category-text">{label}</span>
            </Tooltip>
          </span>
        );
      },
    },
    {
      title: '',
      key: 'action',
      width: 140,
      align: 'right',
      render: (_: any, record) => (
        <Space size={6} className="template-list-actions">
          <Tooltip title="Chỉnh sửa">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/admin/tour-templates/${record._id}/edit`);
              }}
            />
          </Tooltip>
          <Popconfirm
            title="Xoá template này?"
            description="Thao tác này không thể hoàn tác."
            onConfirm={() => deleteMutation.mutate(record._id)}
            okText="Xoá"
            cancelText="Huỷ"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Xoá">
              <Button type="text" danger icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <AdminPageHeader
        title="Tour Templates"
        subtitle="Tạo mẫu tour để tái sử dụng nhanh khi tạo tour mới."
        extra={
          <Space wrap>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/admin/tour-templates/create')}>
              Thêm template
            </Button>
            <Button icon={<ReloadOutlined />} loading={isFetching && !isLoading} onClick={() => queryClient.invalidateQueries({ queryKey: ['tour-templates'] })}>
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
          <div className="template-filterbar">
            <div className="template-filterbar-grid" onClick={(e) => e.stopPropagation()}>
              <div className="template-filterbar-item">
                <div className="template-filterbar-label">Tìm kiếm</div>
                <Input
                  allowClear
                  size="middle"
                  prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                  placeholder="Tìm theo tên hoặc mã template..."
                  value={draft.search}
                  onChange={(e) => setDraft((p) => ({ ...p, search: e.target.value }))}
                />
              </div>

              <div className="template-filterbar-item">
                <div className="template-filterbar-label">Danh mục</div>
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

              <div className="template-filterbar-item">
                <div className="template-filterbar-label">Thời lượng (min – max)</div>
                <div className="template-filterbar-range2">
                  <InputNumber
                    min={0}
                    style={{ width: '100%' }}
                    placeholder="Min"
                    value={draft.durationMin}
                    onChange={(v) => setDraft((p) => ({ ...p, durationMin: typeof v === 'number' ? v : undefined }))}
                  />
                  <InputNumber
                    min={0}
                    style={{ width: '100%' }}
                    placeholder="Max"
                    value={draft.durationMax}
                    onChange={(v) => setDraft((p) => ({ ...p, durationMax: typeof v === 'number' ? v : undefined }))}
                  />
                </div>
              </div>

              <div className="template-filterbar-item template-filterbar-actions">
                <div className="template-filterbar-label">&nbsp;</div>
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

            <div className="template-filterbar-footer">
              <div className="template-filterbar-tags">
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
                        if (t.key === 'durationMin') {
                          nextDraft.durationMin = undefined;
                          nextDraft.durationMax = undefined;
                          nextApplied.durationMin = undefined;
                          nextApplied.durationMax = undefined;
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
                {filtered.length} mục
              </Text>
            </div>
          </div>
        }
      >
        <Table
          className="template-list-table"
          columns={columns}
          dataSource={filtered}
          rowKey="_id"
          loading={isLoading}
          locale={{ emptyText: <Empty description="Chưa có template" /> }}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          onRow={(record) => ({
            onClick: () => navigate(`/admin/tour-templates/${record._id}/edit`),
          })}
          scroll={{ x: 980 }}
        />
      </AdminListCard>
    </div>
  );
}

