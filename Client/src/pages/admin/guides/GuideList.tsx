import { useEffect, useState } from 'react';
import { Table, Button, Space, Tag, Popconfirm, message, Input, Select, Modal } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { getGuides, deleteGuide } from '../../../services/api';
import type { IGuide, GuideGroupType, HealthStatus } from '../../../types/guide.types';

const GuideList = () => {
  const [guides, setGuides] = useState<IGuide[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [search, setSearch] = useState('');
  const [groupTypeFilter, setGroupTypeFilter] = useState<GuideGroupType | undefined>();
  const [healthStatusFilter, setHealthStatusFilter] = useState<HealthStatus | undefined>();
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedGuide, setSelectedGuide] = useState<IGuide | null>(null);

  const fetchGuides = async (page = 1) => {
    try {
      setLoading(true);
      const response = await getGuides({
        page,
        limit: pagination.limit,
        search: search || undefined,
        group_type: groupTypeFilter,
        health_status: healthStatusFilter,
      });
      setGuides(response.data.guides);
      setPagination({
        page: response.data.pagination.page,
        limit: response.data.pagination.limit,
        total: response.data.pagination.total,
      });
    } catch (error) {
      message.error('Lỗi khi tải danh sách HDV');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuides(pagination.page);
  }, [search, groupTypeFilter, healthStatusFilter]);

  const handleDelete = async (id: string) => {
    try {
      await deleteGuide(id);
      message.success('Xoá HDV thành công');
      fetchGuides(pagination.page);
    } catch (error) {
      message.error('Lỗi khi xoá HDV');
      console.error(error);
    }
  };

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
    const labels: Record<GuideGroupType, string> = {
      domestic: 'Nội địa',
      international: 'Quốc tế',
      specialized_line: 'Chuyên tuyến',
      group_specialist: 'Chuyên khách đoàn',
    };
    return labels[type];
  };

  const columns = [
    {
      title: 'Họ tên',
      dataIndex: 'name',
      key: 'name',
      width: 180,
      render: (text: string, record: IGuide) => (
        <div>
          <div style={{ fontWeight: 600 }}>{text}</div>
          <div style={{ fontSize: 12, color: '#666' }}>{record.phone}</div>
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
          <div style={{ fontSize: 12, color: '#666' }}>({average > 0 ? '⭐' : 'N/A'})</div>
        </div>
      ),
    },
    {
      title: 'Tình trạng',
      dataIndex: 'health_status',
      key: 'health_status',
      width: 110,
      render: (status: HealthStatus) => (
        <Tag color={getHealthStatusColor(status)}>{getHealthStatusLabel(status)}</Tag>
      ),
    },
    {
      title: 'Hành động',
      key: 'action',
      width: 150,
      render: (_: unknown, record: IGuide) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleShowDetail(record)}
          >
            Chi tiết
          </Button>
          <Link to={`/admin/guides/edit/${record.id}`}>
            <Button type="default" size="small" icon={<EditOutlined />}>
              Sửa
            </Button>
          </Link>
          <Popconfirm
            title="Xóa HDV"
            description="Bạn có chắc chắn muốn xóa HDV này?"
            onConfirm={() => handleDelete(record.id)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Button danger size="small" icon={<DeleteOutlined />}>
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h1 style={{ margin: 0 }}>Quản lý Hướng dẫn viên</h1>
          <Link to="/admin/guides/create">
            <Button type="primary" icon={<PlusOutlined />} size="large">
              Thêm HDV mới
            </Button>
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <Input
            placeholder="Tìm kiếm theo tên, số điện thoại..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
          />
          <Select
            placeholder="Lọc theo loại HDV"
            value={groupTypeFilter}
            onChange={setGroupTypeFilter}
            allowClear
            options={[
              { label: 'Nội địa', value: 'domestic' },
              { label: 'Quốc tế', value: 'international' },
              { label: 'Chuyên tuyến', value: 'specialized_line' },
              { label: 'Chuyên khách đoàn', value: 'group_specialist' },
            ]}
          />
          <Select
            placeholder="Lọc theo tình trạng sức khoẻ"
            value={healthStatusFilter}
            onChange={setHealthStatusFilter}
            allowClear
            options={[
              { label: 'Bình thường', value: 'healthy' },
              { label: 'Bệnh', value: 'sick' },
              { label: 'Nghỉ phép', value: 'on_leave' },
              { label: 'Đã nghỉ hưu', value: 'retired' },
            ]}
          />
        </div>
      </div>

      <Table
        columns={columns}
        dataSource={guides.map((guide) => ({ ...guide, key: guide.id }))}
        loading={loading}
        pagination={{
          current: pagination.page,
          pageSize: pagination.limit,
          total: pagination.total,
          onChange: (page) => fetchGuides(page),
        }}
        scroll={{ x: 1200 }}
      />

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
                <div style={{ marginBottom: 16 }}>{selectedGuide.email || 'N/A'}</div>
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
                  <div style={{ marginBottom: 16 }}>{selectedGuide.experience.specialization || 'N/A'}</div>
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
