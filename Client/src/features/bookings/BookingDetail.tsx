import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { 
  Button, Card, Spin, Tabs, Tag, Timeline, Table, 
  Typography, Space, Popconfirm, message, Breadcrumb, 
  Row, Col, ConfigProvider, Divider, Avatar, Modal, Form, Input, Select, Upload
} from 'antd';
import { 
  ArrowLeftOutlined, EditOutlined, DeleteOutlined, 
  CalendarOutlined, EnvironmentOutlined, UsergroupAddOutlined, 
  HomeOutlined, PrinterOutlined, PhoneOutlined, MailOutlined,
  IdcardOutlined, ProfileOutlined, UserOutlined, ClockCircleOutlined,
  FileExcelOutlined, PlusOutlined, UploadOutlined, ShopOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';

const { Title, Text } = Typography;
const { Option } = Select;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

const BookingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [guestList, setGuestList] = useState<any[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [form] = Form.useForm();

  // 1. API GET DATA
  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', id],
    queryFn: async () => {
      const res = await axios.get(`http://localhost:5000/api/v1/bookings/${id}`, getAuthHeader());
      return res.data?.data || res.data;
    },
    enabled: !!id,
  });

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await axios.get('http://localhost:5000/api/v1/users', getAuthHeader());
      return res.data?.data || [];
    }
  });

  const { data: toursData } = useQuery({
    queryKey: ['tours'],
    queryFn: async () => {
      const res = await axios.get('http://localhost:5000/api/v1/tours', getAuthHeader());
      return res.data?.data || [];
    }
  });

  // cập nhật gueslistr
  useEffect(() => {
    if (booking?.passengers || booking?.guests || booking?.guest_list) {
      setGuestList(booking.passengers || booking.guests || booking.guest_list);
    }
  }, [booking]);

  const tourInfo = useMemo(() => {
    if (!booking) return null;
    return toursData?.find((t: any) => t._id === (booking.tour_id?._id || booking.tour_id)) || booking.tour_id;
  }, [booking, toursData]);

  const guideInfo = useMemo(() => {
    if (!booking) return null;
    return usersData?.find((u: any) => u._id === (booking.guide_id?._id || booking.guide_id)) || booking.guide_id;
  }, [booking, usersData]);

  // tự động lưu danh sách khách vào db
  const saveGuestsMutation = useMutation({
    mutationFn: async (updatedGuests: any[]) => { 
      await axios.put(`http://localhost:5000/api/v1/bookings/${id}`, { passengers: updatedGuests }, getAuthHeader());
    },
    onSuccess: () => {
      message.success('Đã lưu danh sách khách hàng lên server!');
      queryClient.invalidateQueries({ queryKey: ['booking', id] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Lưu danh sách thất bại!');
      queryClient.invalidateQueries({ queryKey: ['booking', id] }); 
    }
  });

  // xóa booking
  const deleteMutation = useMutation({
    mutationFn: async () => {
      await axios.delete(`http://localhost:5000/api/v1/bookings/${id}`, getAuthHeader());
    },
    onSuccess: () => {
      message.success('Đã xóa booking thành công');
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      navigate('/admin/bookings');
    },
    onError: () => message.error('Xóa thất bại')
  });

  // xuất excel
  const handleExportExcel = () => {
    if (guestList.length === 0) {
      message.warning('Không có dữ liệu hành khách để xuất!');
      return;
    }
    
    const exportData = guestList.map((guest: any, index: number) => ({
      'STT': index + 1,
      'Họ và Tên': guest.name || guest.full_name || '',
      'Giới tính': guest.gender || '',
      'Phân loại': guest.type || guest.age_group || 'Người lớn',
      'Số điện thoại': guest.phone || guest.phoneNumber || '',
      'Số phòng': guest.room_name || guest.room || '',
      'Ghi chú': guest.note || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "DanhSachKhach");
    
    const fileName = `DanhSachKhach_${booking?.customer_name || 'Booking'}_${dayjs().format('DDMMYY')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    message.success('Đã xuất file Excel thành công!');
  };

  // import excerl
  const handleImportExcel = (file: any) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData: any[] = XLSX.utils.sheet_to_json(worksheet);
        
        const importedGuests = rawData.map((row, index) => ({
          id: `temp-${Date.now()}-${index}`,
          name: row['Họ và Tên'] || row['Tên'] || '',
          phone: row['Số điện thoại'] || row['SĐT'] || '',
          gender: row['Giới tính'] || 'Khác',
          type: row['Phân loại'] || 'Người lớn',
          room: row['Phòng'] || row['Số phòng'] || '',
          note: row['Ghi chú'] || ''
        })).filter(g => g.name);

        if (importedGuests.length > 0) {
          const newGuests = [...guestList, ...importedGuests];
          setGuestList(newGuests);
          saveGuestsMutation.mutate(newGuests); 
        } else {
          message.warning('File Excel trống hoặc sai định dạng!');
        }
      } catch (error) { message.error('Lỗi khi đọc file Excel!'); }
    };
    reader.readAsBinaryString(file);
    return false; 
  };

  // thêm khách thủ công
  const handleManualAdd = (values: any) => {
    const newGuests = [...guestList, { id: `temp-${Date.now()}`, ...values }];
    setGuestList(newGuests);
    setIsAddModalOpen(false);
    form.resetFields();
    saveGuestsMutation.mutate(newGuests); 
  };

  // xóa khách
  const handleRemoveGuest = (guestId: string) => {
    const newGuests = guestList.filter(g => g.id !== guestId && g._id !== guestId);
    setGuestList(newGuests);
    saveGuestsMutation.mutate(newGuests); 
  };

  if (isLoading) return <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><Spin size="large" /></div>;
  if (!booking) return <div style={{ padding: 40, textAlign: 'center' }}>Không tìm thấy dữ liệu!</div>;

  const renderStatus = (status: string) => {
    switch (status) {
      case 'confirmed': return <Tag color="success" bordered={false}>Đã xác nhận</Tag>;
      case 'pending': return <Tag color="warning" bordered={false}>Chờ duyệt</Tag>;
      case 'paid': return <Tag color="processing" bordered={false}>Đã thanh toán</Tag>;
      case 'cancelled': return <Tag color="error" bordered={false}>Đã hủy</Tag>;
      default: return <Tag bordered={false}>{status || 'Chưa rõ'}</Tag>;
    }
  };

  const logs = booking.logs || [];
  const providerData = booking.provider || booking.supplier || booking.provider_id;

  const OverviewTab = () => {
    return (
      <Row gutter={24}>
        {/* CỘT TRÁI */}
        <Col xs={24} lg={16}>
          <Card title={<Space><IdcardOutlined /> Thông tin người đặt</Space>} bordered={true} className="saas-card mb-6">
            <Row gutter={[24, 16]}>
              <Col span={12}>
                <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase' }}>Họ và Tên</Text>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>{booking.customer_name || '---'}</div>
              </Col>
              <Col span={12}>
                <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase' }}>Số điện thoại</Text>
                <div><PhoneOutlined style={{ color: '#6b7280', marginRight: 8 }} />{booking.customer_phone || '---'}</div>
              </Col>
              <Col span={12}>
                <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase' }}>Email</Text>
                <div><MailOutlined style={{ color: '#6b7280', marginRight: 8 }} />{booking.customer_email || '---'}</div>
              </Col>
              <Col span={12}>
                <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase' }}>Địa chỉ / Ghi chú</Text>
                <div><EnvironmentOutlined style={{ color: '#6b7280', marginRight: 8 }} />{booking.customer_address || '---'}</div>
              </Col>
            </Row>
          </Card>

          <Card 
            title={<Space><UsergroupAddOutlined /> Danh sách hành khách ({guestList.length}/{booking.groupSize || 0})</Space>} 
            bordered={true} 
            className="saas-card mb-6"
            extra={
              <Space className="print:hidden">
                <Upload accept=".xlsx, .xls" showUploadList={false} beforeUpload={handleImportExcel}>
                  <Button icon={<UploadOutlined />} className="text-green-600 border-green-200 bg-green-50" size="small" loading={saveGuestsMutation.isPending}>Nhập Excel</Button>
                </Upload>
                <Button type="dashed" icon={<PlusOutlined />} size="small" onClick={() => setIsAddModalOpen(true)}>Thêm tay</Button>
                <Button type="primary" ghost size="small" icon={<FileExcelOutlined />} onClick={handleExportExcel}>Xuất Excel</Button>
                <Button type="link" size="small" icon={<PrinterOutlined />} onClick={() => window.print()}>In</Button>
              </Space>
            }
          >
            <Table 
              dataSource={guestList} 
              rowKey={(record) => record.id || record._id || Math.random()} 
              pagination={false} 
              size="small"
              locale={{ emptyText: 'Chưa có danh sách khách hàng' }}
              columns={[
                { title: '#', render: (_, __, i) => i + 1, width: 40 },
                { title: 'Họ và Tên', render: (_, record) => <Text strong>{record.name || record.full_name}</Text> },
                { title: 'Số điện thoại', dataIndex: 'phone', render: (text) => text || '---' },
                { title: 'Loại', dataIndex: 'type', render: (t) => <Tag>{t || 'Người lớn'}</Tag> },
                { title: 'Giới tính', dataIndex: 'gender' },
                { title: 'Phòng', dataIndex: ['room_name', 'room'] },
                { 
                  title: '', width: 50, className: 'print:hidden',
                  render: (_, record) => (
                    <Popconfirm title="Xóa khách này?" onConfirm={() => handleRemoveGuest(record.id || record._id)}>
                      <Button type="text" danger icon={<DeleteOutlined />} size="small" loading={saveGuestsMutation.isPending} />
                    </Popconfirm>
                  ) 
                }
              ]}
            />
          </Card>
        </Col>

        {/* CỘT PHẢI */}
        <Col xs={24} lg={8}>
          <Card bordered={true} className="saas-card mb-6" style={{ backgroundColor: '#f9fafb' }}>
              <div style={{ marginBottom: 20 }}>
                  <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '1px' }}>TỔNG THANH TOÁN</Text>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#ef4444', marginTop: 4 }}>
                      {booking.total_price?.toLocaleString() || 0} ₫
                  </div>
                  <div style={{ marginTop: 8 }}>
                    {booking.status === 'paid' 
                      ? <Tag color="green">Đã thanh toán đủ</Tag> 
                      : <Tag color="red">Chưa thanh toán</Tag>}
                  </div>
              </div>
              
              <Divider style={{ margin: '16px 0' }} />

              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Space><CalendarOutlined style={{ color: '#6b7280' }} /> <Text type="secondary">Ngày đi</Text></Space>
                      <Text strong>{booking.startDate ? dayjs(booking.startDate).format('DD/MM/YYYY') : '---'}</Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Space><CalendarOutlined style={{ color: '#6b7280' }} /> <Text type="secondary">Ngày về</Text></Space>
                      <Text strong>{booking.endDate ? dayjs(booking.endDate).format('DD/MM/YYYY') : '---'}</Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Space><UserOutlined style={{ color: '#6b7280' }} /> <Text type="secondary">HDV</Text></Space>
                      <Text style={{ textAlign: 'right' }}>
                        {guideInfo?.name ? (
                          <>
                            <div style={{ fontWeight: 600 }}>{guideInfo.name}</div>
                            {guideInfo.phone && <div style={{ fontSize: 12, color: '#6b7280' }}>{guideInfo.phone}</div>}
                          </>
                        ) : <span style={{color: '#9ca3af'}}>Chưa phân công</span>}
                      </Text>
                  </div>
              </Space>
          </Card>

          {providerData && (
            <Card 
              title={<Space><ShopOutlined style={{ color: '#8b5cf6' }} /> Nhà cung cấp dịch vụ</Space>} 
              bordered={true} 
              size="small"
              className="saas-card mb-6"
            >
              <div style={{ fontWeight: 600, fontSize: 15, color: '#111827', marginBottom: 8 }}>
                {providerData.name || providerData.provider_name || 'Tên nhà cung cấp'}
              </div>
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                {(providerData.phone || providerData.contact_phone) && (
                  <div><PhoneOutlined style={{ color: '#6b7280', marginRight: 8 }} /><Text>{providerData.phone || providerData.contact_phone}</Text></div>
                )}
                {(providerData.email || providerData.contact_email) && (
                  <div><MailOutlined style={{ color: '#6b7280', marginRight: 8 }} /><Text>{providerData.email || providerData.contact_email}</Text></div>
                )}
                {(providerData.address) && (
                  <div><EnvironmentOutlined style={{ color: '#6b7280', marginRight: 8 }} /><Text type="secondary">{providerData.address}</Text></div>
                )}
              </Space>
            </Card>
          )}

          <Card 
            title={<Space><ClockCircleOutlined /> Lịch sử xử lý</Space>} 
            bordered={true} 
            className="saas-card mb-6"
            headStyle={{ paddingBottom: 0, borderBottom: 'none' }}
          >
            {logs.length > 0 ? (
              <Timeline 
                className="mt-4"
                items={logs.map((log: any, index: number) => ({
                    color: index === 0 ? 'blue' : 'gray', 
                    children: (
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 4 }}>
                              {log.time || dayjs(log.created_at).format('DD/MM/YYYY HH:mm')}
                            </div>
                            <div style={{ fontWeight: 600, fontSize: 15, color: '#111827', marginBottom: 6 }}>
                              {log.user || 'Hệ thống'}
                            </div>
                            <div style={{ color: '#374151', fontSize: 14 }}>
                              Đã đổi: {log.old || 'Khởi tạo'} → <span style={{ fontWeight: 600 }}>{log.new}</span>
                            </div>
                            {log.note && (
                              <div style={{ marginTop: 8, fontStyle: 'italic', color: '#6b7280', backgroundColor: '#f9fafb', padding: '6px 12px', borderRadius: 6, display: 'inline-block' }}>
                                "{log.note}"
                              </div>
                            )}
                        </div>
                    ),
                }))} 
              />
            ) : (
              <div className="text-center text-gray-400 py-4 italic">Chưa có lịch sử.</div>
            )}
          </Card>

          {booking.notes && (
            <Card title="Ghi chú chung" size="small" bordered={true} className="saas-card mb-6">
              <div style={{ padding: '8px 12px', backgroundColor: '#fef3c7', borderLeft: '4px solid #f59e0b', color: '#92400e', borderRadius: 4, whiteSpace: 'pre-wrap' }}>
                {booking.notes}
              </div>
            </Card>
          )}
        </Col>
      </Row>
    );
  };

  const DetailsTab = () => (
    <Row gutter={24}>
       <Col span={12}>
          <Card title={<Space><ProfileOutlined /> Lịch trình chi tiết</Space>} bordered={true} className="saas-card">
              <div style={{ whiteSpace: 'pre-wrap', color: '#374151', lineHeight: '1.6' }}>
                  {booking.schedule_detail || <Text type="secondary" italic>Chưa có dữ liệu lịch trình.</Text>}
              </div>
          </Card>
       </Col>
       <Col span={12}>
          <Card title={<Space><ProfileOutlined /> Dịch vụ & Chính sách</Space>} bordered={true} className="saas-card">
              <div style={{ whiteSpace: 'pre-wrap', color: '#374151', lineHeight: '1.6' }}>
                  {booking.service_detail || <Text type="secondary" italic>Chưa có dữ liệu chính sách.</Text>}
              </div>
          </Card>
       </Col>
    </Row>
  );

  return (
    <ConfigProvider
      theme={{
        token: {
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          colorPrimary: '#0f172a',
          borderRadius: 6,
        },
        components: {
          Card: { headerBg: 'transparent', headerFontSize: 16 },
          Tabs: { itemSelectedColor: '#2563eb', inkBarColor: '#2563eb', itemHoverColor: '#2563eb', titleFontSize: 14 }
        }
      }}
    >
      <div style={{ padding: '24px 40px', backgroundColor: '#fff', minHeight: '100vh' }}>
        
        <div style={{ marginBottom: 24 }}>
            <Breadcrumb items={[
                { title: <Link to="/admin"><HomeOutlined /></Link> },
                { title: <Link to="/admin/bookings">Bookings</Link> },
                { title: `Chi tiết Booking` }
            ]} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
            <div style={{ display: 'flex', gap: 16 }}>
                <Avatar 
                  size={64} shape="square" 
                  className="bg-blue-50 text-blue-500 font-bold border border-blue-100"
                  style={{ fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', textTransform: 'uppercase' }}
                >
                  {booking.customer_name?.charAt(0) || 'B'}
                </Avatar>
                <div>
                    <Title level={3} style={{ margin: '0 0 4px 0' }}>{tourInfo?.name || booking.tour_id || 'Booking Mới'}</Title>
                    <Space size="small">
                        <Text type="secondary">ID: {booking._id}</Text>
                        <Divider type="vertical" />
                        {renderStatus(booking.status)}
                    </Space>
                </div>
            </div>

            <Space>
                <Button icon={<EditOutlined />} onClick={() => navigate(`/admin/bookings/edit/${booking._id}`)}>Chỉnh sửa</Button>
                <Popconfirm
                    title="Xóa booking này?" description="Hành động này không thể hoàn tác."
                    onConfirm={() => deleteMutation.mutate()} okText="Xóa ngay" okButtonProps={{ danger: true }}
                >
                    <Button danger icon={<DeleteOutlined />}>Xóa</Button>
                </Popconfirm>
            </Space>
        </div>

        <Tabs 
            defaultActiveKey="1" size="large"
            items={[
                { key: '1', label: 'Tổng quan', children: <OverviewTab /> },
                { key: '2', label: 'Chi tiết & Dịch vụ', children: <DetailsTab /> }
            ]} 
        />

        <Modal
          title="Thêm hành khách" open={isAddModalOpen} onCancel={() => setIsAddModalOpen(false)}
          onOk={() => form.submit()} okText="Thêm vào danh sách" cancelText="Hủy"
        >
          <Form form={form} layout="vertical" onFinish={handleManualAdd}>
            <Form.Item name="name" label="Họ và Tên" rules={[{ required: true, message: 'Vui lòng nhập tên!' }]}>
              <Input placeholder="Nguyễn Văn A" />
            </Form.Item>
            <Form.Item name="phone" label="Số điện thoại">
              <Input placeholder="09xxxxxxxx" />
            </Form.Item>
            <div style={{ display: 'flex', gap: '16px' }}>
              <Form.Item name="gender" label="Giới tính" style={{ flex: 1 }} initialValue="Nam">
                <Select><Option value="Nam">Nam</Option><Option value="Nữ">Nữ</Option><Option value="Khác">Khác</Option></Select>
              </Form.Item>
              <Form.Item name="type" label="Phân loại" style={{ flex: 1 }} initialValue="Người lớn">
                <Select><Option value="Người lớn">Người lớn</Option><Option value="Trẻ em">Trẻ em</Option></Select>
              </Form.Item>
            </div>
            <Form.Item name="room" label="Số phòng"><Input placeholder="VD: P.201" /></Form.Item>
            <Form.Item name="note" label="Ghi chú"><Input.TextArea rows={2} placeholder="Ăn chay, dị ứng..." /></Form.Item>
          </Form>
        </Modal>

        <style>{`
            .saas-card .ant-card-body { padding: 24px; }
            .saas-card { box-shadow: none !important; border: 1px solid #e5e7eb !important; }
            .ant-timeline-item-tail { border-inline-start: 2px solid #e5e7eb !important; }
            @media print { .ant-tabs-nav, .ant-btn, .ant-breadcrumb { display: none !important; } .saas-card { border: none !important; } }
        `}</style>
      </div>
    </ConfigProvider>
  );
};

export default BookingDetail;