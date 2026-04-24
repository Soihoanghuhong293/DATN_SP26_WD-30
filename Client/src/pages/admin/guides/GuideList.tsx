import { useMemo, useState } from 'react';
import { Button, Empty, Input, Modal, Popconfirm, Select, Space, Table, Tag, Tooltip, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteGuide, getGuides } from '../../../services/api';
import type { IGuide, GuideGroupType, HealthStatus } from '../../../types/guide.types';
import AdminPageHeader from '../../../components/admin/AdminPageHeader';
import AdminListCard from '../../../components/admin/AdminListCard';
import './GuideList.css';

const GuideList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [pagination, setPagination] = useState({ page: 1, limit: 10 });

  type FilterState = {
    search: string;
    groupType?: GuideGroupType;
    healthStatus?: HealthStatus;
    language?: string;
  };

  const emptyFilters = (): FilterState => ({
    search: '',
    groupType: undefined,
    healthStatus: undefined,
    language: undefined,
  });

  const [draft, setDraft] = useState<FilterState>(() => emptyFilters());
  const [applied, setApplied] = useState<FilterState>(() => emptyFilters());

  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedGuide, setSelectedGuide] = useState<IGuide | null>(null);

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['guides', applied, pagination],
    queryFn: () =>
      getGuides({
        page: pagination.page,
        limit: pagination.limit,
        search: applied.search || undefined,
        group_type: applied.groupType,
        health_status: applied.healthStatus,
        language: applied.language || undefined,
      }),
  });

  const guides = data?.data?.guides ?? [];
  const total = data?.data?.pagination?.total ?? 0;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteGuide(id),
    onSuccess: async () => {
      message.success('Xoá HDV thành công');
      await queryClient.invalidateQueries({ queryKey: ['guides'] });
    },
    onError: () => message.error('Lỗi khi xoá HDV'),
  });

  const handleShowDetail = (guide: IGuide) => {
    setSelectedGuide(guide);
    setDetailVisible(true);
  };

  const getHealthStatusColor = (status: HealthStatus) => {
    const colors: Record<HealthStatus, string> = {
      healthy: 'green',
      sick: 'red',
      on_leave: 'orange',
      retired: 'gray',
    };
    return colors[status];
  };

  const getHealthStatusLabel = (status: HealthStatus) => {
    const labels: Record<HealthStatus, string> = {
      healthy: 'Bình thường',
      sick: 'Bệnh',
      on_leave: 'Nghỉ phép',
      retired: 'Đã nghỉ hưu',
    };
    return labels[status];
  };

  const getGroupTypeLabel = (type: GuideGroupType) => {
    const labels: Partial<Record<GuideGroupType, string>> = {
      domestic: 'Nội địa',
      specialized_line: 'Chuyên tuyến',
      group_specialist: 'Chuyên khách đoàn',
    };
    return labels[type] || 'Khác';
  };

  const { Text } = Typography;

  const appliedTags = useMemo(() => {
    const tags: { key: keyof FilterState; label: string }[] = [];
    if (applied.search?.trim()) tags.push({ key: 'search', label: `Từ khóa: ${applied.search.trim()}` });
    if (applied.groupType) tags.push({ key: 'groupType', label: `Loại: ${getGroupTypeLabel(applied.groupType)}` });
    if (applied.healthStatus) tags.push({ key: 'healthStatus', label: `Tình trạng: ${getHealthStatusLabel(applied.healthStatus)}` });
    if (applied.language) tags.push({ key: 'language', label: `Ngôn ngữ: ${applied.language}` });
    return tags;
  }, [applied]);

  const columns: ColumnsType<IGuide> = [
    {
      title: 'Hướng dẫn viên',
      dataIndex: 'name',
      key: 'name',
      width: 240,
      render: (text: string, record: IGuide) => (
        <div className="guide-list-name-cell">
          <div className="guide-list-avatar" aria-hidden>
            <img src={record.avatar || 'https://placehold.co/100x100?text=HDV'} alt={record.name} />
          </div>
          <div className="guide-list-name-text">
            <div className="guide-list-name-title">{text}</div>
            <Text type="secondary" className="guide-list-sub">
              {record.phone}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Loại HDV',
      dataIndex: 'group_type',
      key: 'group_type',
      width: 140,
      render: (type: GuideGroupType) => <Tag>{getGroupTypeLabel(type)}</Tag>,
    },
    {
      title: 'Ngôn ngữ',
      dataIndex: 'languages',
      key: 'languages',
      width: 150,
      render: (languages: string[]) => (
        <div style={{ fontSize: 12 }}>
          {languages.slice(0, 2).join(', ')}
          {languages.length > 2 && ` +${languages.length - 2}`}
        </div>
      ),
    },
    {
      title: 'Kinh nghiệm',
      dataIndex: ['experience', 'years'],
      key: 'experience',
      width: 100,
      render: (years: number) => `${years} năm`,
    },
    {
      title: 'Đánh giá',
      dataIndex: ['rating', 'average'],
      key: 'rating',
      width: 100,
      render: (average: number) => (
        <div>
          <div style={{ fontWeight: 600 }}>{average.toFixed(1)}/5</div>
          <div style={{ fontSize: 12, color: '#666' }}>({average > 0 ? '⭐' : 'Chưa có'})</div>
        </div>
      ),
    },
    {
      title: 'Tình trạng',
      dataIndex: 'health_status',
      key: 'health_status',
      width: 110,
      render: (status: HealthStatus) => (
        <span className={`guide-list-status ${status === 'healthy' ? 'guide-list-status--active' : 'guide-list-status--inactive'}`}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: status === 'healthy' ? '#10b981' : '#94a3b8' }} />
          {getHealthStatusLabel(status)}
        </span>
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 112,
      align: 'right',
      fixed: 'right',
      render: (_: unknown, record: IGuide) => (
        <Space size={6} className="guide-list-actions">
          <Tooltip title="Sửa">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/admin/guides/edit/${record.id}`);
              }}
            />
          </Tooltip>
          <Popconfirm
            title="Xóa HDV"
            description="Bạn có chắc chắn muốn xóa HDV này?"
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Button type="text" danger icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="guide-list-page">
      <AdminPageHeader
        title="Hướng dẫn viên"
        subtitle="Quản lý danh sách hướng dẫn viên."
        extra={
          <Space wrap>
            <Link to="/admin/guides/create">
              <Button type="primary" icon={<PlusOutlined />}>
                Thêm HDV
              </Button>
            </Link>
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
          <div className="guide-filterbar">
            <div className="guide-filterbar-grid" onClick={(e) => e.stopPropagation()}>
              <div className="guide-filterbar-item">
                <div className="guide-filterbar-label">Tìm kiếm</div>
                <Input
                  allowClear
                  size="middle"
                  prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                  placeholder="Tìm theo tên hoặc SĐT..."
                  value={draft.search}
                  onChange={(e) => setDraft((p) => ({ ...p, search: e.target.value }))}
                />
              </div>

              <div className="guide-filterbar-item">
                <div className="guide-filterbar-label">Loại HDV</div>
                <Select
                  allowClear
                  size="middle"
                  placeholder="Lọc theo loại"
                  value={draft.groupType}
                  onChange={(v) => setDraft((p) => ({ ...p, groupType: v }))}
                  options={[
                    { label: 'Nội địa', value: 'domestic' },
                    { label: 'Chuyên tuyến', value: 'specialized_line' },
                    { label: 'Chuyên khách đoàn', value: 'group_specialist' },
                  ]}
                />
              </div>

              <div className="guide-filterbar-item">
                <div className="guide-filterbar-label">Tình trạng</div>
                <Select
                  allowClear
                  size="middle"
                  placeholder="Lọc sức khoẻ"
                  value={draft.healthStatus}
                  onChange={(v) => setDraft((p) => ({ ...p, healthStatus: v }))}
                  options={[
                    { label: 'Bình thường', value: 'healthy' },
                    { label: 'Bệnh', value: 'sick' },
                    { label: 'Nghỉ phép', value: 'on_leave' },
                    { label: 'Đã nghỉ hưu', value: 'retired' },
                  ]}
                />
              </div>

              <div className="guide-filterbar-item">
                <div className="guide-filterbar-label">Ngôn ngữ</div>
                <Select
                  allowClear
                  showSearch
                  size="middle"
                  placeholder="Nhập ngôn ngữ"
                  value={draft.language}
                  onChange={(v) => setDraft((p) => ({ ...p, language: v }))}
                  options={Array.from(new Set(guides.flatMap((g: IGuide) => g.languages || []))).map((l) => ({ value: l, label: l }))}
                />
              </div>

              <div className="guide-filterbar-item guide-filterbar-actions">
                <div className="guide-filterbar-label">&nbsp;</div>
                <Space wrap>
                  <Button
                    onClick={() => {
                      const cleared = emptyFilters();
                      setDraft(cleared);
                      setApplied(cleared);
                      setPagination((p) => ({ ...p, page: 1 }));
                    }}
                  >
                    Xóa bộ lọc
                  </Button>
                  <Button
                    type="primary"
                    loading={isFetching}
                    onClick={() => {
                      setApplied(draft);
                      setPagination((p) => ({ ...p, page: 1 }));
                    }}
                  >
                    Áp dụng
                  </Button>
                </Space>
              </div>
            </div>

            <div className="guide-filterbar-footer">
              <div className="guide-filterbar-tags">
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
                        } else {
                          (nextDraft as any)[t.key] = undefined;
                          (nextApplied as any)[t.key] = undefined;
                        }
                        setDraft(nextDraft);
                        setApplied(nextApplied);
                        setPagination((p) => ({ ...p, page: 1 }));
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
                {total} mục
              </Text>
            </div>
          </div>
        }
      >
        {isError ? (
          <div style={{ padding: 16 }}>
            <Text type="secondary">{(error as any)?.message || 'Không tải được danh sách HDV'}</Text>
          </div>
        ) : (
          <Table<IGuide>
            className="guide-list-table"
            columns={columns}
            dataSource={guides}
            locale={{ emptyText: <Empty description="Chưa có HDV" /> }}
            rowKey={(g) => g.id || g._id || Math.random().toString(16)}
            loading={isLoading}
          pagination={{
              current: pagination.page,
              pageSize: pagination.limit,
              total,
              onChange: (page) => setPagination((p) => ({ ...p, page })),
          }}
            scroll={{ x: 1200 }}
            onRow={(record) => ({
              onClick: () => handleShowDetail(record),
            })}
          />
        )}
      </AdminListCard>

      <Modal
        title="Chi tiết Hướng dẫn viên"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={800}
      >
        {selectedGuide && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
              {selectedGuide.avatar && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center' }}>
                  <img
                    src={selectedGuide.avatar}
                    alt={selectedGuide.name}
                    style={{ width: 120, height: 120, borderRadius: '50%', objectFit: 'cover' }}
                  />
                </div>
              )}
              <div>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Họ tên</div>
                <div style={{ fontWeight: 600, marginBottom: 16 }}>{selectedGuide.name}</div>

                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Số điện thoại</div>
                <div style={{ marginBottom: 16 }}>{selectedGuide.phone}</div>

                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Email</div>
                <div style={{ marginBottom: 16 }}>{selectedGuide.email || 'Chưa có'}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Ngày sinh</div>
                <div style={{ marginBottom: 16 }}>{new Date(selectedGuide.birtdate).toLocaleDateString('vi-VN')}</div>

                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Loại HDV</div>
                <div style={{ marginBottom: 16 }}>{getGroupTypeLabel(selectedGuide.group_type)}</div>

                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Tình trạng</div>
                <Tag color={getHealthStatusColor(selectedGuide.health_status)}>
                  {getHealthStatusLabel(selectedGuide.health_status)}
                </Tag>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 16, marginTop: 16 }}>
              <h3>Thông tin chuyên môn</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Kinh nghiệm</div>
                  <div style={{ marginBottom: 16 }}>{selectedGuide.experience.years} năm</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Chuyên ngành</div>
                  <div style={{ marginBottom: 16 }}>{selectedGuide.experience.specialization || 'Chưa có'}</div>
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Ngôn ngữ</div>
                <div>
                  {selectedGuide.languages.map((lang) => (
                    <Tag key={lang} style={{ marginRight: 8, marginBottom: 8 }}>
                      {lang}
                    </Tag>
                  ))}
                </div>
              </div>
            </div>

            {selectedGuide.certificate.length > 0 && (
              <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 16, marginTop: 16 }}>
                <h3>Chứng chỉ chuyên môn</h3>
                {selectedGuide.certificate.map((cert, index) => (
                  <div key={index} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #f0f0f0' }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{cert.name}</div>
                    <div style={{ fontSize: 12, color: '#666' }}>
                      Cấp ngày: {new Date(cert.issueDate).toLocaleDateString('vi-VN')}
                      {cert.expiryDate && ` - Hết hạn: ${new Date(cert.expiryDate).toLocaleDateString('vi-VN')}`}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 16, marginTop: 16 }}>
              <h3>Đánh giá</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Điểm trung bình</div>
                  <div style={{ fontWeight: 600, fontSize: 24 }}>{selectedGuide.rating.average.toFixed(1)}/5</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Tổng đánh giá</div>
                  <div style={{ fontWeight: 600, fontSize: 24 }}>{selectedGuide.rating.totalReviews}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default GuideList;
