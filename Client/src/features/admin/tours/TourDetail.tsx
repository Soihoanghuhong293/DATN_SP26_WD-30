import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { getProvider, getProviders } from '../../../services/api';
import { 
  Button, Card, Descriptions, Spin, Tabs, Tag, 
  Timeline, Image, Table, Typography, Space, Popconfirm, 
  message, Breadcrumb, Row, Col, ConfigProvider, Divider,
  Modal, Select
} from 'antd';
import { 
  ArrowLeftOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  CalendarOutlined,
  DollarOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  UsergroupAddOutlined,
  HomeOutlined,
  CheckCircleOutlined,
  StopOutlined,
  ShopOutlined,
  PhoneOutlined,
  MailOutlined,
  ContactsOutlined,
  FileTextOutlined,
  SwapOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;

const TourDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [changeProviderModalOpen, setChangeProviderModalOpen] = useState(false);
  const [selectedProviderIds, setSelectedProviderIds] = useState<string[]>([]);

  // 1. API GET DATA
  const { data: tour, isLoading } = useQuery({
    queryKey: ['tour', id],
    queryFn: async () => {
      const res = await axios.get(`http://localhost:5000/api/v1/tours/${id}`);
      return res.data.data || res.data.data.tour;
    },
    enabled: !!id,
  });

  const { data: providersData } = useQuery({
    queryKey: ['providers'],
    queryFn: () => getProviders({}),
  });
  const providers = providersData?.data?.providers ?? [];

  const tourProviders = tour?.suppliers?.map((sId: string) => providers.find((p: any) => p.id === sId || p._id === sId)).filter(Boolean) || [];

  const changeProviderMutation = useMutation({
    mutationFn: async (providerIds: string[]) => {
      await axios.put(`http://localhost:5000/api/v1/tours/${id}`, {
        suppliers: providerIds,
      });
    },
    onSuccess: () => {
      message.success('Đã cập nhật nhà cung cấp');
      queryClient.invalidateQueries({ queryKey: ['tour', id] });
      setChangeProviderModalOpen(false);
      setSelectedProviderIds([]);
    },
    onError: () => message.error('Cập nhật nhà cung cấp thất bại'),
  });

  const handleChangeProvider = () => {
    changeProviderMutation.mutate(selectedProviderIds);
  };

  // 2. API DELETE
  const deleteMutation = useMutation({
    mutationFn: async () => {
      await axios.delete(`http://localhost:5000/api/v1/tours/${id}`);
    },
    onSuccess: () => {
      message.success('Đã xóa tour thành công');
      queryClient.invalidateQueries({ queryKey: ['tours'] });
      navigate('/admin/tours');
    },
    onError: () => message.error('Xóa thất bại')
  });

  if (isLoading) return (
    <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Spin size="large" />
    </div>
  );

  if (!tour) return <div style={{ padding: 40, textAlign: 'center' }}>Không tìm thấy dữ liệu!</div>;

  // --- RENDER CONTENT COMPONENTS ---

  // Tab 1: Tổng quan (Chia 2 cột: Nội dung chính & Sidebar thông tin)
  const OverviewTab = () => (
    <Row gutter={24}>
      {/* CỘT TRÁI: Nội dung chi tiết */}
      <Col xs={24} lg={16}>
        <Card title="Mô tả chi tiết" bordered={true} className="saas-card mb-6">
          <div style={{ whiteSpace: 'pre-line', lineHeight: '1.6', color: '#374151' }}>
            {tour.description || "Chưa có mô tả cho tour này."}
          </div>
        </Card>

        <Card title="Thư viện ảnh" bordered={true} className="saas-card">
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 16 }}>
              {/* Ảnh đại diện */}
              {tour.image && (
                 <Image src={tour.image} style={{ borderRadius: 8, height: 120, objectFit: 'cover', width: '100%' }} />
              )}
              {/* Gallery */}
              {tour.images?.map((img: string, idx: number) => (
                 <Image key={idx} src={img} style={{ borderRadius: 8, height: 120, objectFit: 'cover', width: '100%' }} />
              ))}
           </div>
        </Card>
      </Col>

      {/* CỘT PHẢI: Thông tin quan trọng (Sidebar) */}
      <Col xs={24} lg={8}>
        <Card bordered={true} className="saas-card mb-6" style={{ backgroundColor: '#f9fafb' }}>
            <div style={{ marginBottom: 20 }}>
                <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '1px' }}>GIÁ CƠ BẢN</Text>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>
                    {tour.price?.toLocaleString()} ₫
                </div>
            </div>
            
            <Divider style={{ margin: '16px 0' }} />

            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Space><ClockCircleOutlined style={{ color: '#6b7280' }} /> <Text type="secondary">Thời lượng</Text></Space>
                    <Text strong>{tour.duration_days} ngày</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Space><UsergroupAddOutlined style={{ color: '#6b7280' }} /> <Text type="secondary">Số khách tối đa</Text></Space>
                    <Text strong>{tour.maxGroupSize || 20} người</Text>
                </div>
                 <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Space><EnvironmentOutlined style={{ color: '#6b7280' }} /> <Text type="secondary">Danh mục</Text></Space>
                    <Tag color="blue" style={{ margin: 0 }}>{tour.category_id?.name || 'General'}</Tag>
                </div>
                 <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Space><CalendarOutlined style={{ color: '#6b7280' }} /> <Text type="secondary">Ngày tạo</Text></Space>
                    <Text>{dayjs(tour.created_at).format('DD/MM/YYYY')}</Text>
                </div>
            </Space>
        </Card>

        <Card 
          title={
            <Space>
              <ShopOutlined />
              <span>Nhà cung cấp</span>
              <Button 
                type="link" 
                size="small" 
                icon={<SwapOutlined />} 
                onClick={() => {
                  setSelectedProviderIds(tour?.suppliers || []);
                  setChangeProviderModalOpen(true);
                }}
              >
                Thay đổi/Thêm
              </Button>
            </Space>
          }
          size="small" 
          bordered={true} 
          className="saas-card mb-6"
        >
          {tourProviders.length > 0 ? (
            tourProviders.map((provider: any, index: number) => (
            <div key={provider.id || provider._id} style={{ marginBottom: index !== tourProviders.length - 1 ? 16 : 0, paddingBottom: index !== tourProviders.length - 1 ? 16 : 0, borderBottom: index !== tourProviders.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
              <div style={{ marginBottom: 12 }}>
                <Link to={`/admin/providers/${provider.id || provider._id}`} style={{ fontWeight: 600, fontSize: 15 }}>
                  {provider.name}
                </Link>
                {provider.status && (
                  <Tag color={provider.status === 'active' ? 'green' : 'red'} style={{ marginLeft: 8 }}>
                    {provider.status === 'active' ? 'Hoạt động' : 'Không hoạt động'}
                  </Tag>
                )}
              </div>
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                {provider.phone && (
                  <div><PhoneOutlined style={{ color: '#6b7280', marginRight: 8 }} /><Text>{provider.phone}</Text></div>
                )}
                {provider.email && (
                  <div><MailOutlined style={{ color: '#6b7280', marginRight: 8 }} /><Text>{provider.email}</Text></div>
                )}
                {provider.address && (
                  <div><EnvironmentOutlined style={{ color: '#6b7280', marginRight: 8 }} /><Text type="secondary">{provider.address}</Text></div>
                )}
              </Space>
              <div style={{ marginTop: 12 }}>
                <Link to={`/admin/providers/${provider.id || provider._id}`}>
                  <Button type="link" size="small">Xem chi tiết nhà cung cấp →</Button>
                </Link>
              </div>
            </div>
            ))
          ) : tour?.suppliers?.length > 0 ? (
            <Spin size="small" tip="Đang tải thông tin NCC..." />
          ) : (
            <div>
              <Text type="secondary">Chưa chọn nhà cung cấp</Text>
              <div style={{ marginTop: 8 }}>
                <Button type="primary" size="small" onClick={() => setChangeProviderModalOpen(true)}>
                  Chọn nhà cung cấp
                </Button>
              </div>
            </div>
          )}
        </Card>

        <Card title="Trạng thái" size="small" bordered={true} className="saas-card">
             <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {tour.status === 'active' ? (
                    <CheckCircleOutlined style={{ fontSize: 24, color: '#10b981' }} />
                ) : (
                    <StopOutlined style={{ fontSize: 24, color: '#f59e0b' }} />
                )}
                <div>
                    <div style={{ fontWeight: 600 }}>{tour.status === 'active' ? 'Đang hoạt động' : 'Bản nháp'}</div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {tour.status === 'active' ? 'Tour này đang hiển thị công khai.' : 'Chỉ admin mới thấy tour này.'}
                    </Text>
                </div>
             </div>
        </Card>
      </Col>
    </Row>
  );

  // Tab 2: Lịch trình
  const ScheduleTab = () => (
    <Card bordered={true} className="saas-card">
      <Timeline 
        mode="left" 
        items={tour.schedule?.map((item: any) => ({
            label: <span style={{ fontWeight: 600, color: '#6b7280' }}>Ngày {item.day}</span>,
            children: (
                <div style={{ marginBottom: 24, paddingBottom: 12, borderBottom: '1px solid #f3f4f6' }}>
                    <Text strong style={{ fontSize: 16, color: '#111827' }}>{item.title}</Text>
                    <ul style={{ paddingLeft: 20, marginTop: 8, color: '#4b5563' }}>
                        {item.activities?.map((act: string, i: number) => (
                            <li key={i} style={{ marginBottom: 4 }}>{act}</li>
                        ))}
                    </ul>
                </div>
            ),
            color: 'gray'
        }))} 
      />
    </Card>
  );

  // Tab 3: Chính sách & Giá
  const PolicyTab = () => (
    <Row gutter={24}>
       <Col span={12}>
          <Card title="Cấu hình giá" bordered={true} className="saas-card">
             <Table
                dataSource={tour.prices}
                pagination={false}
                rowKey="name"
                size="small"
                columns={[
                    { title: 'Đối tượng', dataIndex: 'name', key: 'name', render: (t) => <Text strong>{t}</Text> },
                    { title: 'Giá áp dụng', dataIndex: 'price', key: 'price', align: 'right', render: (p) => p?.toLocaleString() + ' đ' },
                ]}
             />
          </Card>
       </Col>
       <Col span={12}>
          <Card title="Điều khoản & Chính sách" bordered={true} className="saas-card">
              <ul style={{ paddingLeft: 20, color: '#374151' }}>
                  {tour.policies?.map((pol: string, i: number) => (
                      <li key={i} style={{ marginBottom: 8 }}>{pol}</li>
                  ))}
              </ul>
          </Card>
       </Col>
    </Row>
  );

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
                    { title: <Link to="/admin/tours">Tours</Link> },
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
                        src={tour.image || "https://placehold.co/100x100"} 
                        alt="Thumbnail" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                </div>
                <div>
                    <Title level={3} style={{ margin: '0 0 4px 0' }}>{tour.name}</Title>
                    <Space size="small">
                        <Text type="secondary">ID: {tour._id}</Text>
                        <Divider type="vertical" />
                        <Tag color={tour.status === 'active' ? 'success' : 'warning'} bordered={false}>
                            {tour.status === 'active' ? 'Active' : 'Draft'}
                        </Tag>
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
                }
            ]} 
        />

        {/* Modal Thay đổi nhà cung cấp */}
        <Modal
          title="Thay đổi nhà cung cấp"
          open={changeProviderModalOpen}
          onOk={handleChangeProvider}
          onCancel={() => {
            setChangeProviderModalOpen(false);
            setSelectedProviderIds([]);
          }}
          okText="Cập nhật"
          cancelText="Huỷ"
          confirmLoading={changeProviderMutation.isPending}
          destroyOnClose
        >
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary">Chọn nhà cung cấp cho tour này:</Text>
          </div>
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            placeholder="Chọn nhà cung cấp"
            value={selectedProviderIds}
            onChange={setSelectedProviderIds}
            allowClear
            showSearch
            optionFilterProp="label"
            options={providers.map((p: any) => ({
              value: p.id || p._id,
              label: `${p.name}${p.phone ? ' - ' + p.phone : ''}`,
            }))}
          />
          <div style={{ marginTop: 12 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Bỏ chọn để gỡ nhà cung cấp khỏi tour
            </Text>
          </div>
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