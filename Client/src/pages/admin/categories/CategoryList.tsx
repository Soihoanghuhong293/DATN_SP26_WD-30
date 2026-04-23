import { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Empty,
  Input,
  Popconfirm,
  Select,
  Space,
  Table,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  DeleteOutlined,
  EditOutlined,
  FolderOpenOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  TagsOutlined,
} from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteCategory, getCategoryTree } from '../../../services/api';
import type { ICategory } from '../../../types/tour.types';
import AdminPageHeader from '../../../components/admin/AdminPageHeader';
import AdminListCard from '../../../components/admin/AdminListCard';
import { buildCategoryIndex, getCategoryId } from '../../../utils/categoryTree';
import './CategoryList.css';

const { Text } = Typography;

const formatDateTime = (value?: string) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(d);
};

const statusLabel = (status?: string) => {
  if (status === 'active') return 'Hoạt động';
  return 'Không hoạt động';
};

function countCategoryStats(nodes: ICategory[]) {
  let total = 0;
  let active = 0;
  let inactive = 0;

  const walk = (items: ICategory[]) => {
    for (const n of items) {
      total += 1;
      if (n.status === 'active') active += 1;
      else inactive += 1;
      const children = Array.isArray(n.children) ? n.children : [];
      if (children.length) walk(children);
    }
  };

  walk(nodes);
  return { total, active, inactive };
}

const CategoryList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string | undefined>(undefined);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['categories', { search, status }],
    queryFn: () => getCategoryTree({ search: search || undefined, status }),
  });

  const { mutate: mutateDelete, isPending: isDeleting, variables: deletingId } = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: async () => {
      message.success('Đã xoá danh mục');
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: () => message.error('Xoá danh mục thất bại'),
  });

  const categories = (data?.data?.categories ?? []) as ICategory[];
  const categoryIndex = useMemo(() => buildCategoryIndex(categories), [categories]);
  const stats = useMemo(() => countCategoryStats(categories), [categories]);

  const columns: ColumnsType<ICategory> = useMemo(
    () => [
      {
        title: 'Danh mục',
        dataIndex: 'name',
        key: 'name',
        render: (_value: string, record) => {
          const id = getCategoryId(record);
          const level = categoryIndex.levelById.get(id) ?? 0;
          const hasChildren = Array.isArray(record.children) && record.children.length > 0;
          return (
            <div className="category-list-name-cell" style={{ paddingLeft: level * 10 }}>
              <div className="category-list-name-icon" aria-hidden>
                {hasChildren ? <FolderOpenOutlined /> : <TagsOutlined />}
              </div>
              <div className="category-list-name-text">
                <Tooltip title={id ? `ID: ${id}` : undefined}>
                  <div className="category-list-name-title">{record.name}</div>
                </Tooltip>
              </div>
            </div>
          );
        },
      },
      {
        title: 'Mô tả',
        dataIndex: 'description',
        key: 'description',
        responsive: ['md'],
        render: (value: string) => {
          const t = value?.trim();
          if (!t) return <Text type="secondary">—</Text>;
          return (
            <Tooltip title={t}>
              <div className="category-list-desc">{t}</div>
            </Tooltip>
          );
        },
      },
      {
        title: 'Danh mục cha',
        dataIndex: 'parent_id',
        key: 'parent_id',
        width: 240,
        responsive: ['sm'],
        render: (value: unknown) => {
          const parentId = value ? String(value) : '';
          if (!parentId) {
            return (
              <span className="category-list-parent">
                <FolderOpenOutlined className="category-list-parent-icon" />
                <Text type="secondary">Gốc</Text>
              </span>
            );
          }
          const parentPath = categoryIndex.pathById.get(parentId);
          return (
            <Tooltip title={parentPath || parentId}>
              <span className="category-list-parent">
                <FolderOpenOutlined className="category-list-parent-icon" />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {parentPath || parentId}
                </span>
              </span>
            </Tooltip>
          );
        },
      },
      {
        title: 'Trạng thái',
        dataIndex: 'status',
        key: 'status',
        width: 150,
        render: (value: string) => {
          const active = value === 'active';
          return (
            <span className={`category-list-status ${active ? 'category-list-status--active' : 'category-list-status--inactive'}`}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: active ? '#10b981' : '#f59e0b' }} />
              {statusLabel(value)}
            </span>
          );
        },
      },
      {
        title: 'Cập nhật',
        dataIndex: 'update_at',
        key: 'update_at',
        width: 160,
        render: (value: string) => <span className="category-list-updated">{formatDateTime(value)}</span>,
      },
      {
        title: 'Thao tác',
        key: 'actions',
        width: 112,
        align: 'right',
        fixed: 'right',
        render: (_, record) => {
          const id = getCategoryId(record);
          const rowDeleting = isDeleting && deletingId === id;
          return (
            <Space size={6} className="category-list-actions">
              <Tooltip title="Sửa">
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  aria-label="Sửa danh mục"
                  onClick={() => navigate(`/admin/categories/edit/${id}`)}
                  disabled={!id}
                />
              </Tooltip>
              <Popconfirm
                title="Xoá danh mục này?"
                description="Thao tác không thể hoàn tác."
                okText="Xoá"
                cancelText="Huỷ"
                okButtonProps={{ danger: true }}
                onConfirm={() => id && mutateDelete(id)}
              >
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  aria-label="Xoá danh mục"
                  loading={rowDeleting}
                  disabled={!id}
                />
              </Popconfirm>
            </Space>
          );
        },
      },
    ],
    [categoryIndex.levelById, categoryIndex.pathById, deletingId, isDeleting, mutateDelete, navigate]
  );

  return (
    <div className="category-list-page">
      <AdminPageHeader
        title="Danh mục Tour"
        subtitle="Quản lý danh mục hiển thị trên hệ thống."
        breadcrumbItems={[
          { title: <Link to="/admin/dashboard">Khu vực quản trị</Link> },
          { title: 'Danh mục' },
        ]}
        extra={
          <Space wrap>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/admin/categories/create')}>
              Thêm danh mục
            </Button>
            <Button icon={<ReloadOutlined />} loading={isFetching && !isLoading} onClick={() => refetch()}>
              Tải lại
            </Button>
          </Space>
        }
      />

      <div className="category-list-stats" aria-label="Thống kê danh mục">
        <div className="category-list-stat category-list-stat--accent">
          <div className="category-list-stat-label">Tổng (theo bộ lọc)</div>
          <div className="category-list-stat-value">{stats.total}</div>
        </div>
        <div className="category-list-stat">
          <div className="category-list-stat-label">Hoạt động</div>
          <div className="category-list-stat-value">{stats.active}</div>
        </div>
        <div className="category-list-stat">
          <div className="category-list-stat-label">Không hoạt động</div>
          <div className="category-list-stat-value">{stats.inactive}</div>
        </div>
      </div>

      {isError ? (
        <Alert
          type="error"
          showIcon
          message="Không tải được danh sách danh mục"
          description={
            <div>
              <div>{(error as Error)?.message || 'Unknown error'}</div>
              <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                Gợi ý: hãy chắc chắn server chạy và `VITE_API_URL` trỏ tới `http://localhost:5000/api/v1`.
              </Text>
            </div>
          }
        />
      ) : (
        <AdminListCard
          style={{
            borderRadius: 14,
            border: '1px solid #e2e8f0',
            boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
          }}
          toolbar={
            <div className="category-list-toolbar">
              <div className="category-list-toolbar-filters">
                <Input
                  allowClear
                  size="middle"
                  prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                  placeholder="Tìm theo tên hoặc mô tả..."
                  style={{ width: 'min(360px, 100%)' }}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <Select
                  allowClear
                  size="middle"
                  placeholder="Trạng thái"
                  style={{ width: 200 }}
                  value={status}
                  onChange={(v) => setStatus(v)}
                  options={[
                    { value: 'active', label: 'Hoạt động' },
                    { value: 'inactive', label: 'Không hoạt động' },
                  ]}
                />
              </div>
              <Text type="secondary" style={{ fontSize: 13 }}>
                {stats.total} mục
              </Text>
            </div>
          }
        >
          <Table<ICategory>
            className="category-list-table"
            loading={isLoading}
            rowKey={(r) => getCategoryId(r) || `row-${r.name}`}
            dataSource={categories}
            columns={columns}
            pagination={false}
            expandable={{ defaultExpandAllRows: true }}
            locale={{ emptyText: <Empty description="Chưa có danh mục" /> }}
            scroll={{ x: 920 }}
          />
        </AdminListCard>
      )}
    </div>
  );
};

export default CategoryList;
