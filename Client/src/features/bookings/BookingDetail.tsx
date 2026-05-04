import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { 
  Button, Card, Spin, Tabs, Tag, Table, 
  Typography, Space, Popconfirm, message, Breadcrumb, Tooltip,
  Row, Col, ConfigProvider, Divider, Avatar, Modal, Form, Input, Select, Upload, Radio
} from 'antd';
import { 
  ArrowLeftOutlined, EditOutlined, DeleteOutlined, 
  CalendarOutlined, EnvironmentOutlined, UsergroupAddOutlined, 
  HomeOutlined, PrinterOutlined, PhoneOutlined, MailOutlined,
  IdcardOutlined, ProfileOutlined, UserOutlined, ClockCircleOutlined,
  FileExcelOutlined, PlusOutlined, UploadOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { canAdminDeleteBookingRecord } from './bookingPaymentResolve';

const { Title, Text } = Typography;
const { Option } = Select;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

type SaveGuestsIntent = 'add' | 'remove' | 'import' | 'sync_leader' | 'change_representative';

const SAVE_GUESTS_SUCCESS: Record<SaveGuestsIntent, string> = {
  add: 'Đã thêm hành khách và lưu danh sách.',
  remove: 'Đã xóa hành khách và lưu danh sách.',
  import: 'Đã nhập danh sách từ Excel và lưu.',
  sync_leader: 'Đã cập nhật khách đại diện đoàn.',
  change_representative: 'Đã đổi khách đại diện đoàn.',
};

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
    refetchOnMount: 'always',
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

  const formatBirthDate = (val: any) => {
    if (!val) return null;
    const d = dayjs(val);
    return d.isValid() ? d.format("DD/MM/YYYY") : null;
  };

  const formatGender = (val: any) => {
    const raw = String(val || "").trim();
    if (!raw) return "";
    const lower = raw.toLowerCase();
    if (lower === "male" || lower === "nam") return "Nam";
    if (lower === "female" || lower === "nữ" || lower === "nu") return "Nữ";
    if (lower === "other" || lower === "khác" || lower === "khac") return "Khác";
    // Nếu backend/frontend đã lưu sẵn tiếng Việt
    return raw;
  };

  // cập nhật gueslistr
  useEffect(() => {
    if (booking?.passengers || booking?.guests || booking?.guest_list) {
      setGuestList(booking.passengers || booking.guests || booking.guest_list);
    }
  }, [booking]);

  const tourInfo = useMemo(() => {
    if (!booking) return null;
    const tidRaw = booking.tour_id?._id || booking.tour_id;
    const fromList = toursData?.find((t: any) => String(t._id) === String(tidRaw));
    const fromPopulate =
      booking.tour_id && typeof booking.tour_id === 'object' ? (booking.tour_id as any) : null;
    if (!fromList && !fromPopulate) {
      return typeof tidRaw === 'string' ? ({ _id: tidRaw } as any) : null;
    }
    return { ...(fromList || {}), ...(fromPopulate || {}) };
  }, [booking, toursData]);

  const displayEndDate = useMemo(() => {
    if (!booking?.startDate) return null;
    if (booking.endDate) return dayjs(booking.endDate);
    const durationDays = Number((tourInfo as any)?.duration_days ?? 1);
    return dayjs(booking.startDate).add(Math.max(0, durationDays - 1), 'day');
  }, [booking?.startDate, booking?.endDate, tourInfo]);

  const guideInfo = useMemo(() => {
    if (!booking) return null;
    return usersData?.find((u: any) => u._id === (booking.guide_id?._id || booking.guide_id)) || booking.guide_id;
  }, [booking, usersData]);

  // tự động lưu danh sách khách vào db
  const saveGuestsMutation = useMutation({
    mutationFn: async (vars: { passengers: any[]; intent: SaveGuestsIntent }) => {
      await axios.put(
        `http://localhost:5000/api/v1/bookings/${id}`,
        { passengers: vars.passengers },
        getAuthHeader()
      );
    },
    onSuccess: (_data, variables) => {
      message.success(SAVE_GUESTS_SUCCESS[variables.intent]);
      queryClient.invalidateQueries({ queryKey: ['booking', id] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Lưu danh sách thất bại!');
      queryClient.invalidateQueries({ queryKey: ['booking', id] }); 
    }
  });

  const updatePaymentMutation = useMutation({
    mutationFn: async (next: 'unpaid' | 'deposit' | 'paid' | 'refunded') => {
      await axios.put(`http://localhost:5000/api/v1/bookings/${id}`, { payment_status: next }, getAuthHeader());
    },
    onSuccess: () => {
      message.success('Đã cập nhật trạng thái thanh toán');
      queryClient.invalidateQueries({ queryKey: ['booking', id] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['hdv-bookings'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Cập nhật thanh toán thất bại!');
      queryClient.invalidateQueries({ queryKey: ['booking', id] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['hdv-bookings'] });
    }
  });

  // xóa booking
  const deleteMutation = useMutation({
    mutationFn: async () => {
      await axios.delete(`http://localhost:5000/api/v1/bookings/${id}`, getAuthHeader());
    },
    onSuccess: async () => {
      message.success('Đã xóa booking thành công');
      queryClient.removeQueries({ queryKey: ['booking', id] });
      await queryClient.invalidateQueries({ queryKey: ['bookings'] });
      await queryClient.invalidateQueries({ queryKey: ['hdv-bookings'] });
      navigate('..', { relative: 'path', replace: true });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || 'Xóa thất bại');
    },
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
      'Giới tính': formatGender(guest.gender),
      'Phân loại': guest.type || guest.age_group || 'Người lớn',
      'Ngày sinh': formatBirthDate(guest.birthDate) || '',
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
          const maxCount = booking?.groupSize || 0;
          const availableSlots = maxCount - guestList.length;

          if (availableSlots <= 0) {
            return message.error(`Đã đủ ${maxCount} khách, không thể thêm!`);
          }
          
          let finalImport = importedGuests;
          if (importedGuests.length > availableSlots) {
             finalImport = importedGuests.slice(0, availableSlots);
             message.warning(`Chỉ có thể thêm ${availableSlots} khách. Đã tự động bỏ qua các dòng dư thừa trong file.`);
          }
          const newGuests = [...guestList, ...finalImport];
          setGuestList(newGuests);
          saveGuestsMutation.mutate({ passengers: newGuests, intent: 'import' });
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
    if (guestList.length >= (booking?.groupSize || 0)) {
      message.error(`Đoàn đã đủ ${booking?.groupSize} khách, không thể thêm!`);
      return;
    }
    const isFirst = guestList.length === 0;
    const newGuests = [
      ...guestList.map((g) => ({ ...g, is_leader: Boolean(g?.is_leader) })),
      { id: `temp-${Date.now()}`, ...values, is_leader: isFirst },
    ];
    setGuestList(newGuests);
    setIsAddModalOpen(false);
    form.resetFields();
    saveGuestsMutation.mutate({ passengers: newGuests, intent: 'add' });
  };

  // đảm bảo luôn có 1 trưởng đoàn mặc định (khách #1) nếu chưa ai được tick
  useEffect(() => {
    if (!booking?._id) return;
    if (!Array.isArray(guestList) || guestList.length === 0) return;
    const leaderIdx = guestList.findIndex((g: any) => g?.is_leader === true);
    // Nếu chưa có leader -> set idx 0; nếu có nhiều leader -> giữ leader đầu tiên
    const patched = guestList.map((g: any, idx: number) => ({
      ...g,
      is_leader: leaderIdx >= 0 ? idx === leaderIdx : idx === 0,
    }));
    const normalizedSame =
      leaderIdx >= 0
        ? guestList.every((g: any, idx: number) => Boolean(g?.is_leader) === (idx === leaderIdx))
        : guestList.every((g: any, idx: number) => Boolean(g?.is_leader) === (idx === 0));
    if (normalizedSame) return;
    setGuestList(patched);
    saveGuestsMutation.mutate({ passengers: patched, intent: 'sync_leader' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking?._id, guestList.length]);

  const setLeader = (leaderKey: string) => {
    const patched = guestList.map((g: any) => {
      const key = String(g?.id || g?._id || '');
      return { ...g, is_leader: key === leaderKey };
    });
    setGuestList(patched);
    saveGuestsMutation.mutate({ passengers: patched, intent: 'change_representative' });
  };

  // xóa khách
  const handleRemoveGuest = (guestId: string) => {
    const newGuests = guestList.filter(g => g.id !== guestId && g._id !== guestId);
    setGuestList(newGuests);
    saveGuestsMutation.mutate({ passengers: newGuests, intent: 'remove' });
  };

  if (isLoading) return <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><Spin size="large" /></div>;
  if (!booking) return <div style={{ padding: 40, textAlign: 'center' }}>Không tìm thấy dữ liệu!</div>;

  const tourStage = String((booking as any).tour_stage || 'scheduled');
  const deleteBlockedByStage = tourStage === 'in_progress' || tourStage === 'completed';

  const deleteBlockedByPayment = !canAdminDeleteBookingRecord(booking as any);
  const deleteDisabled = deleteBlockedByStage || deleteBlockedByPayment;

  const renderStatus = (bookingObj: any) => {
    const status = String(bookingObj?.status || 'pending').trim().toLowerCase();
    const tourStage = String(bookingObj?.tour_stage || 'scheduled').trim().toLowerCase();

    if (status === 'cancelled') {
      return <Tag color="error" bordered={false}>Đã hủy</Tag>;
    }
    if (tourStage === 'completed') {
      return <Tag color="default" bordered={false}>Đã kết thúc</Tag>;
    }
    if (tourStage === 'in_progress') {
      return <Tag color="blue" bordered={false}>Đang diễn ra</Tag>;
    }

    const resolvedPayment = bookingObj?.payment_status ||
      (status === 'paid' ? 'paid' : status === 'deposit' ? 'deposit' : status === 'refunded' ? 'refunded' : 'unpaid');

    switch (resolvedPayment) {
      case 'paid':
        return <Tag color="green" bordered={false}>Đã thanh toán đủ</Tag>;
      case 'deposit':
        return <Tag color="purple" bordered={false}>Đã đặt cọc</Tag>;
      case 'refunded':
        return <Tag color="default" bordered={false}>Đã hoàn tiền</Tag>;
      default:
        return status === 'confirmed'
          ? <Tag color="success" bordered={false}>Đã xác nhận</Tag>
          : <Tag color="warning" bordered={false}>Chờ xác nhận</Tag>;
    }
  };

  const renderPaymentStatus = (paymentStatus?: string, legacyStatus?: string) => {
    const resolved = paymentStatus
      || (legacyStatus === 'paid' ? 'paid'
        : legacyStatus === 'deposit' ? 'deposit'
        : legacyStatus === 'refunded' ? 'refunded'
        : 'unpaid');

    switch (resolved) {
      case 'paid': return <Tag color="green">Đã thanh toán đủ</Tag>;
      case 'deposit': return <Tag color="purple">Đã đặt cọc</Tag>;
      case 'refunded': return <Tag color="default">Đã hoàn tiền</Tag>;
      default: return <Tag color="warning">Chưa thanh toán</Tag>;
    }
  };

  const logs = booking.logs || [];

  const OverviewTab = () => {
    const isGuestListFull = guestList.length >= (booking.groupSize || 0);

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
                <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase' }}>Địa chỉ</Text>
                <div><EnvironmentOutlined style={{ color: '#6b7280', marginRight: 8 }} />{booking.customer_address || '---'}</div>
              </Col>
              <Col span={24}>
                <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase' }}>Ghi chú từ khách hàng</Text>
                <div style={{ padding: '8px 12px', backgroundColor: '#f3f4f6', borderRadius: 4, marginTop: 4 }}>{booking.customer_note || 'Không có ghi chú'}</div>
              </Col>
            </Row>
          </Card>

          <Card 
            title={<Space><UsergroupAddOutlined /> Danh sách hành khách ({guestList.length}/{booking.groupSize || 0})</Space>} 
            bordered={true} 
            className="saas-card mb-6"
            extra={
              <Space className="print:hidden">
                <Upload accept=".xlsx, .xls" showUploadList={false} beforeUpload={handleImportExcel} disabled={isGuestListFull}>
                  <Button icon={<UploadOutlined />} className="text-green-600 border-green-200 bg-green-50" size="small" loading={saveGuestsMutation.isPending} disabled={isGuestListFull}>Nhập Excel</Button>
                </Upload>
                <Button type="dashed" icon={<PlusOutlined />} size="small" onClick={() => setIsAddModalOpen(true)} disabled={isGuestListFull}>Thêm tay</Button>
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
                {
                  title: 'Đại diện',
                  width: 70,
                  className: 'print:hidden',
                  render: (_, record) => {
                    const key = String(record?.id || record?._id || '');
                    const selectedKey = String((guestList.find((g: any) => g?.is_leader === true)?.id) ||
                      (guestList.find((g: any) => g?.is_leader === true)?._id) ||
                      '');
                    return (
                      <Radio
                        checked={key && selectedKey ? key === selectedKey : false}
                        onChange={() => setLeader(key)}
                        disabled={!key}
                      />
                    );
                  },
                },
                { title: 'Họ và Tên', render: (_, record) => <Text strong>{record.name || record.full_name}</Text> },
                { title: 'Số điện thoại', dataIndex: 'phone', render: (text) => text || '---' },
                { title: 'Loại', dataIndex: 'type', render: (t) => <Tag>{t || 'Người lớn'}</Tag> },
                { title: 'Giới tính', dataIndex: 'gender', render: (g) => <span>{formatGender(g) || '---'}</span> },
                { title: 'Ngày sinh', render: (_, record) => formatBirthDate(record.birthDate) || '---' },
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

          {/* Phân bổ xe/phòng & nhà cung cấp đã chuyển sang quản lý theo Trip */}
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
                    {renderPaymentStatus(booking.payment_status, booking.status)}
                  </div>
                  {String((booking as any)?.created_by_type || '') === 'admin' ? (
                    <div style={{ marginTop: 10 }}>
                      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                        Cập nhật thanh toán (chỉ booking admin tạo)
                      </Text>
                      <Select
                        size="middle"
                        style={{ width: '100%' }}
                        value={(booking.payment_status as any) || 'unpaid'}
                        onChange={(v) => updatePaymentMutation.mutate(v)}
                        loading={updatePaymentMutation.isPending}
                        options={(() => {
                          const cur = String((booking as any)?.payment_status || 'unpaid');
                          if (cur === 'unpaid') {
                            return [
                              { value: 'unpaid', label: 'Chưa thanh toán' },
                              { value: 'deposit', label: 'Đã đặt cọc' },
                              { value: 'paid', label: 'Đã thanh toán đủ' },
                            ];
                          }
                          if (cur === 'deposit') {
                            return [
                              { value: 'deposit', label: 'Đã đặt cọc' },
                              { value: 'paid', label: 'Đã thanh toán đủ' },
                              { value: 'refunded', label: 'Đã hoàn tiền' },
                            ];
                          }
                          if (cur === 'paid') {
                            return [
                              { value: 'paid', label: 'Đã thanh toán đủ' },
                              { value: 'refunded', label: 'Đã hoàn tiền' },
                            ];
                          }
                          return [{ value: 'refunded', label: 'Đã hoàn tiền' }];
                        })()}
                      />
                    </div>
                  ) : null}
              </div>
              
              <Divider style={{ margin: '16px 0' }} />

              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Space><CalendarOutlined style={{ color: '#6b7280' }} /> <Text type="secondary">Ngày đi</Text></Space>
                      <Text strong>{booking.startDate ? dayjs(booking.startDate).format('DD/MM/YYYY') : '---'}</Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Space><CalendarOutlined style={{ color: '#6b7280' }} /> <Text type="secondary">Ngày về</Text></Space>
                      <Text strong>{displayEndDate ? displayEndDate.format('DD/MM/YYYY') : '---'}</Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Space><UserOutlined style={{ color: '#6b7280' }} /> <Text type="secondary">HDV</Text></Space>
                      <div style={{ textAlign: 'right' }}>
                        {guideInfo?.name ? (
                          <>
                            <div style={{ fontWeight: 600 }}>{guideInfo.name}</div>
                            {guideInfo.phone && <div style={{ fontSize: 12, color: '#6b7280' }}>{guideInfo.phone}</div>}
                          </>
                        ) : <span style={{color: '#9ca3af'}}>Chưa phân công</span>}
                      </div>
                  </div>
              </Space>
          </Card>

          <Card 
            title={<Space><ClockCircleOutlined /> Lịch sử xử lý</Space>} 
            bordered={true} 
            className="saas-card mb-6"
            headStyle={{ paddingBottom: 0, borderBottom: 'none' }}
          >
            {logs.length > 0 ? (
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Text type="secondary">Có {logs.length} bản ghi. Mở trang riêng để xem đầy đủ.</Text>
                <Button type="primary" block onClick={() => navigate(`/admin/bookings/${booking._id}/history`)}>
                  Xem
                </Button>
              </Space>
            ) : (
              <div className="text-center text-gray-400 py-4 italic">Chưa có lịch sử.</div>
            )}
          </Card>

          <Card title="Ghi chú chung" size="small" bordered={true} className="saas-card mb-6">
            {booking.notes ? (
              <div style={{ padding: '8px 12px', backgroundColor: '#fef3c7', borderLeft: '4px solid #f59e0b', color: '#92400e', borderRadius: 4, whiteSpace: 'pre-wrap' }}>
                {booking.notes}
              </div>
            ) : (
              <div className="text-gray-400 italic text-center py-2">Không có ghi chú chung.</div>
            )}
          </Card>
        </Col>
      </Row>
    );
  };

  const DetailsTab = () => {
    const tour = tourInfo as any;
    const scheduleFromTour: any[] = Array.isArray(tour?.schedule) ? tour.schedule : [];

    const renderScheduleFromTour = () => {
      if (scheduleFromTour.length === 0) return null;
      const rows = scheduleFromTour
        .map((d: any, idx: number) => ({
          day: Number(d?.day ?? idx + 1),
          title: d?.title || `Ngày ${idx + 1}`,
          activities: Array.isArray(d?.activities) ? d.activities.filter((x: any) => typeof x === 'string' && x.trim()) : [],
        }))
        .sort((a, b) => a.day - b.day);

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {rows.map((d) => (
            <div
              key={d.day}
              style={{
                padding: 14,
                background: '#f9fafb',
                borderRadius: 10,
                border: '1px solid #e5e7eb',
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 10, color: '#111827' }}>
                <Tag color="blue" style={{ marginRight: 8 }}>Ngày {d.day}</Tag>
                {d.title}
              </div>
              {d.activities.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: 20, color: '#374151', lineHeight: 1.65 }}>
                  {d.activities.map((act: string, i: number) => (
                    <li key={i} style={{ marginBottom: 4 }}>
                      {act}
                    </li>
                  ))}
                </ul>
              ) : (
                <Text type="secondary">Chưa khai báo hoạt động chi tiết cho ngày này.</Text>
              )}
            </div>
          ))}
        </div>
      );
    };

    const policiesList: string[] = Array.isArray(tour?.policies)
      ? tour.policies.filter((x: any) => typeof x === 'string' && x.trim())
      : [];
    const tourDesc = tour?.description ? String(tour.description).trim() : '';
    const hasBookingSchedule = !!String(booking.schedule_detail || '').trim();
    const hasBookingService = !!String(booking.service_detail || '').trim();

    const renderPoliciesFromTour = () => {
      if (!tourDesc && policiesList.length === 0) return null;
      return (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {tourDesc ? (
            <div>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                Mô tả tour
              </Text>
              <div style={{ whiteSpace: 'pre-wrap', color: '#374151', lineHeight: 1.65 }}>
                {tourDesc}
              </div>
            </div>
          ) : null}
          {policiesList.length > 0 ? (
            <div>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                Chính sách &amp; lưu ý
              </Text>
              <ul style={{ margin: 0, paddingLeft: 20, color: '#374151', lineHeight: 1.65 }}>
                {policiesList.map((p: string, i: number) => (
                  <li key={i} style={{ marginBottom: 6 }}>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Space>
      );
    };

    return (
      <Row gutter={24}>
        <Col xs={24} lg={12}>
          <Card title={<Space><ProfileOutlined /> Lịch trình chi tiết</Space>} bordered className="saas-card">
            {hasBookingSchedule ? (
              <div style={{ whiteSpace: 'pre-wrap', color: '#374151', lineHeight: 1.65 }}>
                {booking.schedule_detail}
              </div>
            ) : scheduleFromTour.length > 0 ? (
              <>
                <Text type="secondary" style={{ display: 'block', marginBottom: 14, fontSize: 13 }}>
                  Hiển thị theo lịch trình tour đã đặt
                  {tour?.name ? (
                    <>
                      {' '}
                      (<Text strong>{tour.name}</Text>)
                    </>
                  ) : null}
                  .
                </Text>
                {renderScheduleFromTour()}
              </>
            ) : (
              <Text type="secondary" italic>
                Chưa có lịch trình (booking không ghi chữ và tour chưa có mục schedule).
              </Text>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title={<Space><ProfileOutlined /> Dịch vụ &amp; chính sách</Space>} bordered className="saas-card">
            {hasBookingService ? (
              <div style={{ whiteSpace: 'pre-wrap', color: '#374151', lineHeight: 1.65 }}>
                {booking.service_detail}
              </div>
            ) : renderPoliciesFromTour() ? (
              <>
                <Text type="secondary" style={{ display: 'block', marginBottom: 14, fontSize: 13 }}>
                  Hiển thị mô tả và chính sách từ tour đã đặt.
                </Text>
                {renderPoliciesFromTour()}
              </>
            ) : (
              <Text type="secondary" italic>
                Chưa có dữ liệu (booking không ghi chữ và tour chưa có mô tả/chính sách).
              </Text>
            )}
          </Card>
        </Col>
      </Row>
    );
  };

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
                { title: <Link to="/admin/bookings">Danh sách đơn</Link> },
                { title: 'Chi tiết đơn' }
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
                        {renderStatus(booking)}
                    </Space>
                </div>
            </div>

            <Space wrap>
                <Button
                  icon={<ClockCircleOutlined />}
                  onClick={() => navigate(`/admin/bookings/${booking._id}/history`)}
                >
                  Lịch sử xử lý
                </Button>
                <Button icon={<EditOutlined />} onClick={() => navigate(`/admin/bookings/edit/${booking._id}`)}>Chỉnh sửa</Button>
                <Tooltip
                  title={
                    deleteBlockedByStage
                      ? 'Không thể xóa booking khi tour đang diễn ra hoặc đã kết thúc.'
                      : deleteBlockedByPayment
                        ? 'Không thể xóa đơn đã thanh toán đủ hoặc đã hoàn tiền.'
                        : undefined
                  }
                >
                  <span>
                    <Popconfirm
                      title="Xóa booking này?"
                      description="Hành động này không thể hoàn tác."
                      disabled={deleteDisabled}
                      onConfirm={() => deleteMutation.mutate()}
                      okText="Xóa ngay"
                      okButtonProps={{ danger: true }}
                    >
                      <Button danger icon={<DeleteOutlined />} disabled={deleteDisabled}>
                        Xóa
                      </Button>
                    </Popconfirm>
                  </span>
                </Tooltip>
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
            <Form.Item name="note" label="Ghi chú"><Input.TextArea rows={2} placeholder="Ăn chay, dị ứng..." /></Form.Item>
          </Form>
        </Modal>

        <style>{`
            .saas-card .ant-card-body { padding: 24px; }
            .saas-card { box-shadow: none !important; border: 1px solid #e5e7eb !important; }
            @media print { .ant-tabs-nav, .ant-btn, .ant-breadcrumb { display: none !important; } .saas-card { border: none !important; } }
        `}</style>
      </div>
    </ConfigProvider>
  );
};

export default BookingDetail;