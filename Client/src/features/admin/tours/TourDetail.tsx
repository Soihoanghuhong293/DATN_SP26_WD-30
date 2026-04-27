import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { getProviders } from '../../../services/api';
import { 
  Button, Card, Descriptions, Spin, Tabs, Tag, 
  Image, Table, Typography, Space, Popconfirm, message, 
  Breadcrumb, Row, Col, ConfigProvider, Divider, Modal, Select,
  Form, DatePicker, InputNumber, Empty, List
} from 'antd';
import { 
  EditOutlined, 
  DeleteOutlined, 
  CalendarOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  UsergroupAddOutlined,
  HomeOutlined,
  CheckCircleOutlined,
  StopOutlined,
  ShopOutlined,
  PhoneOutlined,
  MailOutlined,
  SwapOutlined,
  PlusOutlined,
  MinusCircleOutlined,
  FileTextOutlined,
  TagsOutlined,
  CoffeeOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

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
  const [changeProviderModalOpen, setChangeProviderModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedProviderIds, setSelectedProviderIds] = useState<string[]>([]);
  const [scheduleForm] = Form.useForm();

  // 1. API GET DATA
  const { data: tour, isLoading } = useQuery({
    queryKey: ['tour', id],
    queryFn: async () => {
      const res = await axios.get(`http://localhost:5000/api/v1/tours/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const raw = res.data?.data;
      if (raw && typeof raw === 'object' && 'tour' in raw && (raw as any).tour) {
        return (raw as any).tour;
      }
      return raw ?? null;
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

  const updateScheduleMutation = useMutation({
    mutationFn: async (schedule: any[]) => {
      const payload = schedule.map(item => ({
        ...item,
        date: item.date ? dayjs(item.date).format('YYYY-MM-DD') : null
      })).filter(item => item.date);
      
      await axios.put(`http://localhost:5000/api/v1/tours/${id}`, {
        departure_schedule: payload,
      }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
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

  const coverSrc = (tour as any).image || tour.images?.[0] || 'https://placehold.co/100x100';

  const OverviewTab = () => (
    <>
      <Card title="Mô tả & giới thiệu tour" bordered className="saas-card" style={{ marginBottom: 24 }}>
        <div style={{ whiteSpace: 'pre-line', lineHeight: 1.75, color: '#374151', fontSize: 15 }}>
          {tour.description?.trim() ? tour.description : 'Chưa có mô tả cho tour này.'}
        </div>
      </Card>

      <Card title="Thư viện ảnh" bordered className="saas-card" style={{ marginBottom: 24 }}>
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

      <Card title="Thông tin nhanh" bordered className="saas-card" style={{ marginBottom: 24 }}>
        <Descriptions column={{ xs: 1, sm: 2, md: 3 }} size="small" bordered>
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

      <Row gutter={24}>
        <Col xs={24} lg={14}>
          <Card title="Bảng giá theo đối tượng" bordered className="saas-card" style={{ marginBottom: 24 }}>
            {Array.isArray(tour.prices) && tour.prices.length > 0 ? (
              <Table
                dataSource={tour.prices}
                pagination={false}
                rowKey={(row: any, i) => String(row?.name || i)}
                size="small"
                columns={[
                  { title: 'Đối tượng', dataIndex: 'name', key: 'name', render: (t: string) => <Text strong>{t}</Text> },
                  {
                    title: 'Giá',
                    key: 'amount',
                    align: 'right',
                    render: (_: unknown, row: any) => <Text>{formatMoney(priceTierAmount(row))}</Text>,
                  },
                ]}
              />
            ) : (
              <Text type="secondary">Chưa cấu hình bậc giá chi tiết — chỉ có giá niêm yết.</Text>
            )}
          </Card>

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
              <Text type="secondary">Chưa nhập chính sách.</Text>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={10}>
        <Card bordered={true} className="saas-card mb-6" style={{ backgroundColor: '#f9fafb' }}>
            <div style={{ marginBottom: 20 }}>
                <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '1px' }}>GIÁ CƠ BẢN</Text>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>
                    {formatMoney(Number(tour.price || 0))}
                </div>
            </div>
            
            <Divider style={{ margin: '16px 0' }} />

            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Space><ClockCircleOutlined style={{ color: '#6b7280' }} /> <Text type="secondary">Thời lượng</Text></Space>
                    <Text strong>{tour.duration_days} ngày</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Space><UsergroupAddOutlined style={{ color: '#6b7280' }} /> <Text type="secondary">Khách tối đa</Text></Space>
                    <Text strong>
                      {maxGuestsFromDepartureSchedule(tour.departure_schedule)?.compact ?? '—'}
                    </Text>
                </div>
                 <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Space><EnvironmentOutlined style={{ color: '#6b7280' }} /> <Text type="secondary">Danh mục</Text></Space>
                    <Tag color="blue" style={{ margin: 0 }}>{tour.category_id?.name || '—'}</Tag>
                </div>
            </Space>
        </Card>

        <Card 
          title={
            <Space>
              <CalendarOutlined />
              <span>Lịch khởi hành</span>
            </Space>
          }
          extra={<Button size="small" icon={<EditOutlined />} onClick={handleOpenScheduleModal}>Chỉnh sửa</Button>}
          bordered={true} 
          className="saas-card mb-6"
        >
          <Table
            dataSource={tour.departure_schedule || []}
            rowKey={(r: any, i) => String(r?.date ?? i)}
            pagination={false}
            size="small"
            locale={{ emptyText: 'Chưa có lịch khởi hành cụ thể.' }}
            columns={[
                { title: 'Ngày', dataIndex: 'date', key: 'date', render: (date: string) => <Text strong>{date ? dayjs(date).format('DD/MM/YYYY') : '—'}</Text> },
                { title: 'Số chỗ', dataIndex: 'slots', key: 'slots', align: 'right', render: (slots: number) => <Tag color="blue">{slots}</Tag> }
            ]}
          />
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
            <Spin size="small" spinning tip="Đang tải thông tin NCC...">
              <div style={{ minHeight: 48 }} />
            </Spin>
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
                    <div style={{ fontWeight: 600 }}>
                      {tour.status === 'active' ? 'Đang hoạt động' : tour.status === 'hidden' ? 'Đã ẩn' : 'Bản nháp'}
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {tour.status === 'active'
                          ? 'Tour hiển thị công khai (theo API).'
                          : tour.status === 'hidden'
                            ? 'Tour ẩn khỏi danh sách công khai.'
                            : 'Chỉ admin thấy khi ở trạng thái nháp.'}
                    </Text>
                </div>
             </div>
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
    const seasonal = Array.isArray((tour as any).seasonalPrices) ? (tour as any).seasonalPrices : [];
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
          <Card title="Giá theo khoảng thời gian (seasonalPrices)" bordered className="saas-card">
            {seasonal.length > 0 ? (
              seasonal.map((block: any, idx: number) => (
                <div key={idx} style={{ marginBottom: idx < seasonal.length - 1 ? 24 : 0 }}>
                  <Text strong>{block.title || `Gói ${idx + 1}`}</Text>
                  <div style={{ marginTop: 8, marginBottom: 8 }}>
                    <Text type="secondary">
                      {block.startDate ? dayjs(block.startDate).format('DD/MM/YYYY') : '—'} —{' '}
                      {block.endDate ? dayjs(block.endDate).format('DD/MM/YYYY') : '—'}
                    </Text>
                  </div>
                  <Table
                    dataSource={block.prices || []}
                    pagination={false}
                    size="small"
                    rowKey={(row: any, i) => String(row?.name ?? i)}
                    columns={[
                      { title: 'Đối tượng', dataIndex: 'name', key: 'name' },
                      {
                        title: 'Giá',
                        key: 'amount',
                        align: 'right',
                        render: (_: unknown, row: any) => formatMoney(priceTierAmount(row)),
                      },
                    ]}
                  />
                </div>
              ))
            ) : (
              <Text type="secondary">Chưa cấu hình giá theo mùa.</Text>
            )}
          </Card>
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
                        <Tag
                          color={tour.status === 'active' ? 'success' : tour.status === 'hidden' ? 'default' : 'warning'}
                          bordered={false}
                        >
                          {tour.status === 'active'
                            ? 'Đang hoạt động'
                            : tour.status === 'hidden'
                              ? 'Đã ẩn'
                              : 'Bản nháp'}
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