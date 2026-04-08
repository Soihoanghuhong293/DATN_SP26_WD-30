import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { 
  Button, Card, Spin, Tabs, Tag, Table, 
  Typography, Space, Popconfirm, message, Breadcrumb, 
  Row, Col, ConfigProvider, Divider, Avatar, Modal, Form, Input, Select, Upload, Collapse, List, Empty
} from 'antd';
import { 
  ArrowLeftOutlined, EditOutlined, DeleteOutlined, 
  CalendarOutlined, EnvironmentOutlined, UsergroupAddOutlined, 
  HomeOutlined, PrinterOutlined, PhoneOutlined, MailOutlined,
  IdcardOutlined, ProfileOutlined, UserOutlined, ClockCircleOutlined,
  FileExcelOutlined,   PlusOutlined, UploadOutlined, ShopOutlined, CarOutlined, BookOutlined, PictureOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import * as XLSX from 'xlsx';

dayjs.extend(isBetween);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

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
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [selectedGuideId, setSelectedGuideId] = useState<string | undefined>();

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

  const { data: providersData } = useQuery({
    queryKey: ['providers'],
    queryFn: async () => {
      const res = await axios.get('http://localhost:5000/api/v1/providers', getAuthHeader());
      return res.data?.data?.providers || res.data?.data || [];
    }
  });
  const providers = Array.isArray(providersData) ? providersData : [];

  const { data: allBookings } = useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const res = await axios.get('http://localhost:5000/api/v1/bookings', getAuthHeader());
      return res.data?.data || res.data?.results || [];
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
    return toursData?.find((t: any) => t._id === (booking.tour_id?._id || booking.tour_id)) || booking.tour_id;
  }, [booking, toursData]);

  const displayEndDate = useMemo(() => {
    if (!booking?.startDate) return null;
    if (booking.endDate) return dayjs(booking.endDate);
    const durationDays = Number((tourInfo as any)?.duration_days ?? 1);
    return dayjs(booking.startDate).add(Math.max(0, durationDays - 1), 'day');
  }, [booking?.startDate, booking?.endDate, tourInfo]);

  const tourProviders = useMemo(() => {
    if (!tourInfo || !tourInfo.suppliers) return [];
    return tourInfo.suppliers.map((sId: any) => {
      const id = typeof sId === 'object' ? (sId._id || sId.id) : sId;
      return providers.find((p: any) => p.id === id || p._id === id) || (typeof sId === 'object' ? sId : null);
    }).filter(Boolean);
  }, [tourInfo, providers]);

  const guideInfo = useMemo(() => {
    if (!booking) return null;
    return usersData?.find((u: any) => u._id === (booking.guide_id?._id || booking.guide_id)) || booking.guide_id;
  }, [booking, usersData]);

  const allGuides = useMemo(() => usersData?.filter((u: any) => u.role === 'guide' || u.role === 'hdv') || [], [usersData]);

  const availableGuides = useMemo(() => {
    if (!booking?.startDate || !displayEndDate) return allGuides;

    return allGuides.filter((guide: any) => {
      const isBusy = allBookings?.some((b: any) => {
        if (b._id === booking._id) return false;
        if (b.status === 'cancelled') return false;

        const currentGuideId = b.guide_id?._id || b.guide_id;
        if (!currentGuideId || currentGuideId !== guide._id) return false;

        const bStart = dayjs(b.startDate);
        const bEnd = b.endDate ? dayjs(b.endDate) : dayjs(b.startDate).add(Math.max(0, Number((b.tour_id as any)?.duration_days ?? 1) - 1), 'day');
        const currentStart = dayjs(booking.startDate);
        const currentEnd = displayEndDate;

        return currentStart.isSameOrBefore(bEnd, 'day') && currentEnd.isSameOrAfter(bStart, 'day');
      });
      return !isBusy;
    });
  }, [allGuides, allBookings, booking, displayEndDate]);

  const allocatedCars = useMemo(() => {
    const rows = booking?.allocated_services?.cars;
    if (!Array.isArray(rows)) return [];

    return rows
      .map((row: any, index: number) => {
        const provider =
          providers.find((p: any) => p._id === row.provider_id || p.id === row.provider_id) || null;

        return {
          key: row.vehicle_allocation_id || `${row.day_no}-${row.plate}-${index}`,
          providerName: provider?.name || provider?.provider_name || '',
          ...row,
        };
      })
      .sort((a: any, b: any) => {
        if ((a.day_no || 0) !== (b.day_no || 0)) return (a.day_no || 0) - (b.day_no || 0);
        return String(a.plate || '').localeCompare(String(b.plate || ''));
      });
  }, [booking, providers]);

  const allocatedRooms = useMemo(() => {
    const rows = booking?.allocated_services?.rooms;
    if (!Array.isArray(rows)) return [];

    return rows
      .map((row: any, index: number) => {
        const provider =
          providers.find((p: any) => p._id === row.provider_id || p.id === row.provider_id) || null;

        return {
          key: row.room_allocation_id || `${row.day_no}-${row.hotel_name}-${row.room_number}-${index}`,
          providerName: provider?.name || provider?.provider_name || '',
          ...row,
        };
      })
      .sort((a: any, b: any) => {
        if ((a.day_no || 0) !== (b.day_no || 0)) return (a.day_no || 0) - (b.day_no || 0);
        return String(a.hotel_name || '').localeCompare(String(b.hotel_name || ''));
      });
  }, [booking, providers]);

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

  const assignGuideMutation = useMutation({
    mutationFn: async (guideId: string | null) => {
      await axios.put(`http://localhost:5000/api/v1/bookings/${id}`, { guide_id: guideId }, getAuthHeader());
    },
    onSuccess: () => {
      message.success('Đã cập nhật Hướng dẫn viên!');
      queryClient.invalidateQueries({ queryKey: ['booking', id] });
      setIsGuideModalOpen(false);
    },
    onError: () => message.error('Cập nhật HDV thất bại!'),
  });

  const autoAllocateCarsMutation = useMutation({
    mutationFn: async () => {
      await axios.post(`http://localhost:5000/api/v1/bookings/${id}/auto-allocate-cars`, {}, getAuthHeader());
    },
    onSuccess: () => {
      message.success('Đã tự động phân bổ xe thành công!');
      queryClient.invalidateQueries({ queryKey: ['booking', id] });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || 'Phân bổ xe thất bại!');
    },
  });

  const autoAllocateRoomsMutation = useMutation({
    mutationFn: async () => {
      await axios.post(`http://localhost:5000/api/v1/bookings/${id}/auto-allocate-rooms`, {}, getAuthHeader());
    },
    onSuccess: () => {
      message.success('Đã tự động phân bổ phòng thành công!');
      queryClient.invalidateQueries({ queryKey: ['booking', id] });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || 'Phân bổ phòng thất bại!');
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
    if (guestList.length >= (booking?.groupSize || 0)) {
      message.error(`Đoàn đã đủ ${booking?.groupSize} khách, không thể thêm!`);
      return;
    }
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
      case 'cancelled': return <Tag color="error" bordered={false}>Đã hủy</Tag>;
      default: return <Tag bordered={false}>{status || 'Chưa rõ'}</Tag>;
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

  const CheckinTab = () => {
    const checkpointCheckins = (booking as any)?.checkpoint_checkins || {};
    const schedule = (tourInfo as any)?.schedule || [];
    const passengers = Array.isArray((booking as any)?.passengers) ? (booking as any).passengers : [];

    const checkpointDays =
      Array.isArray(schedule) && schedule.length > 0
        ? schedule
            .map((d: any, idx: number) => ({
              day: Number(d?.day ?? idx + 1),
              title: d?.title || `Ngày ${idx + 1}`,
              checkpoints: Array.isArray(d?.activities)
                ? d.activities.filter((x: any) => typeof x === 'string' && x.trim().length > 0)
                : [],
            }))
            .sort((a: any, b: any) => a.day - b.day)
        : [];

    const people = [
      { type: 'leader' as const, name: booking.customer_name || 'Trưởng đoàn' },
      ...passengers.map((p: any, i: number) => ({
        type: 'passenger' as const,
        passengerIndex: i,
        name: p?.name || p?.full_name || `Khách ${i + 1}`,
      })),
    ];

    const diaryEntries: any[] = Array.isArray((booking as any)?.diary_entries)
      ? (booking as any).diary_entries
      : [];

    const getDiaryForDay = (dayNum: number) =>
      diaryEntries.find((e: any) => Number(e?.day_no ?? 1) === Number(dayNum));

    const renderDiaryForDay = (dayNum: number) => {
      const entry = getDiaryForDay(dayNum);
      if (!entry) {
        return (
          <div style={{ marginTop: 16, padding: '12px 14px', background: '#f9fafb', borderRadius: 10, border: '1px dashed #e5e7eb' }}>
            <Space size={8}>
              <BookOutlined style={{ color: '#94a3b8' }} />
              <Text type="secondary" italic>Chưa có nhật ký hành trình từ HDV cho ngày này.</Text>
            </Space>
          </div>
        );
      }
      const imgs = Array.isArray(entry.images) ? entry.images.filter((x: any) => x?.url) : [];
      return (
        <Card
          size="small"
          title={
            <Space>
              <BookOutlined style={{ color: '#2563eb' }} />
              <span>Nhật ký hành trình (HDV)</span>
              {entry.created_by ? <Tag color="blue">{String(entry.created_by)}</Tag> : null}
            </Space>
          }
          style={{ marginTop: 16, background: '#f8fafc', borderColor: '#e2e8f0' }}
        >
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            {entry.date ? (
              <Text type="secondary" style={{ fontSize: 13 }}>
                {dayjs(entry.date).format('DD/MM/YYYY')}
                {entry.title ? ` · ${entry.title}` : ''}
              </Text>
            ) : entry.title ? (
              <Text strong>{entry.title}</Text>
            ) : null}
            {entry.highlight ? (
              <div
                style={{
                  padding: '8px 10px',
                  background: '#fffbeb',
                  borderLeft: '3px solid #f59e0b',
                  borderRadius: 4,
                  fontWeight: 600,
                  color: '#92400e',
                }}
              >
                {entry.highlight}
              </div>
            ) : null}
            {entry.content ? (
              <div style={{ whiteSpace: 'pre-wrap', color: '#334155', lineHeight: 1.65 }}>{entry.content}</div>
            ) : !entry.highlight ? (
              <Text type="secondary" italic>HDV chưa nhập nội dung chi tiết.</Text>
            ) : null}
            {imgs.length > 0 ? (
              <div>
                <Divider orientation="left" plain style={{ margin: '12px 0 8px', fontSize: 12 }}>
                  <PictureOutlined /> Hình ảnh ({imgs.length})
                </Divider>
                <Space wrap size={[8, 8]}>
                  {imgs.map((img: any, ii: number) => (
                    <a key={ii} href={img.url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={img.url}
                        alt={img.name || `Ảnh ${ii + 1}`}
                        style={{
                          width: 96,
                          height: 96,
                          objectFit: 'cover',
                          borderRadius: 8,
                          border: '1px solid #e2e8f0',
                        }}
                      />
                    </a>
                  ))}
                </Space>
              </div>
            ) : null}
          </Space>
        </Card>
      );
    };

    if (checkpointDays.length === 0) {
      return <Empty description="Chưa có dữ liệu checkpoint để hiển thị điểm danh." />;
    }

    return (
      <Collapse
        accordion
        items={checkpointDays.map((d: any) => ({
          key: String(d.day),
          label: (
            <Space>
              <Tag color="blue" style={{ margin: 0 }}>Ngày {d.day}</Tag>
              <span style={{ fontWeight: 700 }}>{d.title}</span>
            </Space>
          ),
          children: (
            <div>
              {d.checkpoints.length === 0 ? (
                <Empty description="Ngày này chưa có checkpoint/hoạt động." />
              ) : (
                <List
                  dataSource={d.checkpoints.map((cp: string, cpIndex: number) => ({ cp, cpIndex }))}
                  renderItem={(cpItem: any) => {
                    const cpData = checkpointCheckins?.[String(d.day)]?.[String(cpItem.cpIndex)] || {};
                    const leaderStatus = cpData?.leader;
                    const leaderReason = cpData?.reasons?.leader;
                    const passengerStatuses: any[] = Array.isArray(cpData?.passengers) ? cpData.passengers : [];
                    const passengerReasons: any[] = Array.isArray(cpData?.reasons?.passengers) ? cpData.reasons.passengers : [];

                    const renderStatus = (status: any) => {
                      if (status === true) return <Tag color="green" style={{ margin: 0 }}>Có mặt</Tag>;
                      if (status === false) return <Tag color="red" style={{ margin: 0 }}>Vắng</Tag>;
                      return <Tag style={{ margin: 0 }}>Chưa điểm danh</Tag>;
                    };

                    return (
                      <List.Item style={{ paddingLeft: 0, paddingRight: 0 }}>
                        <Card size="small" style={{ width: '100%', borderRadius: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                            <div style={{ fontWeight: 800 }}>{cpItem.cp}</div>
                            <Text type="secondary">Checkpoint #{cpItem.cpIndex + 1}</Text>
                          </div>

                          <Divider style={{ margin: '12px 0' }} />

                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {people.map((p: any, idx: number) => {
                              const isLeader = p.type === 'leader';
                              const status = isLeader ? leaderStatus : passengerStatuses[p.passengerIndex];
                              const reason = isLeader ? leaderReason : passengerReasons[p.passengerIndex];
                              return (
                                <div
                                  key={`${p.type}-${p.passengerIndex ?? 'leader'}-${idx}`}
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                    gap: 12,
                                    padding: '8px 10px',
                                    background: '#fafafa',
                                    borderRadius: 10,
                                    border: '1px solid #f0f0f0',
                                  }}
                                >
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700 }}>
                                      {p.name}{' '}
                                      {isLeader ? <Tag color="blue" style={{ marginLeft: 8 }}>Trưởng đoàn</Tag> : null}
                                    </div>
                                    {status === false && reason ? (
                                      <div style={{ marginTop: 4, color: '#6b7280', fontStyle: 'italic' }}>
                                        Lý do: {String(reason)}
                                      </div>
                                    ) : null}
                                  </div>
                                  <div>{renderStatus(status)}</div>
                                </div>
                              );
                            })}
                          </div>
                        </Card>
                      </List.Item>
                    );
                  }}
                />
              )}
              {renderDiaryForDay(d.day)}
            </div>
          ),
        }))}
      />
    );
  };

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
                { title: 'Họ và Tên', render: (_, record) => <Text strong>{record.name || record.full_name}</Text> },
                { title: 'Số điện thoại', dataIndex: 'phone', render: (text) => text || '---' },
                { title: 'Loại', dataIndex: 'type', render: (t) => <Tag>{t || 'Người lớn'}</Tag> },
                { title: 'Giới tính', dataIndex: 'gender', render: (g) => <span>{formatGender(g) || '---'}</span> },
                { title: 'Ngày sinh', render: (_, record) => formatBirthDate(record.birthDate) || '---' },
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

          {tourProviders.length > 0 && (
            <Card 
              title={<Space><ShopOutlined style={{ color: '#8b5cf6' }} /> Nhà cung cấp dịch vụ</Space>} 
              bordered={true} 
              className="saas-card mb-6"
            >
              {tourProviders.map((provider: any, index: number) => (
                <div key={provider.id || provider._id || index} style={{ marginBottom: index !== tourProviders.length - 1 ? 16 : 0, paddingBottom: index !== tourProviders.length - 1 ? 16 : 0, borderBottom: index !== tourProviders.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                  <div style={{ fontWeight: 600, fontSize: 15, color: '#111827', marginBottom: 8 }}>
                    <Link to={`/admin/providers/${provider.id || provider._id}`}>
                      {provider.name || provider.provider_name || 'Tên nhà cung cấp'}
                    </Link>
                    {provider.status && (
                      <Tag color={provider.status === 'active' ? 'green' : 'red'} style={{ marginLeft: 8 }}>
                        {provider.status === 'active' ? 'Hoạt động' : 'Không hoạt động'}
                      </Tag>
                    )}
                  </div>
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    {(provider.phone || provider.contact_phone) && (
                      <div><PhoneOutlined style={{ color: '#6b7280', marginRight: 8 }} /><Text>{provider.phone || provider.contact_phone}</Text></div>
                    )}
                    {(provider.email || provider.contact_email) && (
                      <div><MailOutlined style={{ color: '#6b7280', marginRight: 8 }} /><Text>{provider.email || provider.contact_email}</Text></div>
                    )}
                    {(provider.address) && (
                      <div><EnvironmentOutlined style={{ color: '#6b7280', marginRight: 8 }} /><Text type="secondary">{provider.address}</Text></div>
                    )}
                  </Space>
                </div>
              ))}
            </Card>
          )}

          <Card
            title={<Space><CarOutlined style={{ color: '#2563eb' }} /> Phân bổ xe tự động</Space>}
            bordered={true}
            className="saas-card mb-6"
            extra={(
              <Button
                type="primary"
                ghost
                size="small"
                loading={autoAllocateCarsMutation.isPending}
                onClick={() => autoAllocateCarsMutation.mutate()}
              >
                Tự động phân bổ xe
              </Button>
            )}
          >
            <Table
              dataSource={allocatedCars}
              pagination={false}
              size="small"
              locale={{ emptyText: 'Chưa có dữ liệu phân bổ xe. Bấm "Tự động phân bổ xe" để chạy.' }}
              columns={[
                { title: 'Ngày', dataIndex: 'day_no', width: 70, render: (v) => `Day ${v || 1}` },
                {
                  title: 'Ngày sử dụng',
                  dataIndex: 'service_date',
                  render: (v) => (v ? dayjs(v).format('DD/MM/YYYY') : '---'),
                },
                { title: 'Biển số', dataIndex: 'plate', render: (v) => <Text strong>{v || '---'}</Text> },
                {
                  title: 'Nhà cung cấp',
                  dataIndex: 'providerName',
                  render: (v) => v || <Text type="secondary">---</Text>,
                },
                { title: 'Sức chứa', dataIndex: 'capacity', render: (v) => `${v || 0} chỗ` },
                {
                  title: 'Trạng thái',
                  dataIndex: 'status',
                  render: (v) => (
                    <Tag color={v === 'confirmed' ? 'green' : v === 'cancelled' ? 'red' : 'processing'}>
                      {v === 'confirmed' ? 'Đã xác nhận' : v === 'cancelled' ? 'Đã hủy' : 'Đã giữ chỗ'}
                    </Tag>
                  ),
                },
              ]}
            />
          </Card>

          <Card
            title={<Space><HomeOutlined style={{ color: '#059669' }} /> Phân bổ khách sạn &amp; phòng</Space>}
            bordered={true}
            className="saas-card mb-6"
            extra={(
              <Space size="small" wrap>
                <Button
                  type="primary"
                  ghost
                  size="small"
                  loading={autoAllocateRoomsMutation.isPending}
                  onClick={() => autoAllocateRoomsMutation.mutate()}
                >
                  Phân bổ phòng
                </Button>
              </Space>
            )}
          >
            <Table
              dataSource={allocatedRooms}
              pagination={false}
              size="small"
              locale={{ emptyText: 'Chưa có phân bổ phòng. Khai báo khách sạn/phòng ở nhà cung cấp rồi bấm phân bổ.' }}
              columns={[
                { title: 'Ngày', dataIndex: 'day_no', width: 70, render: (v) => `Đêm ${v || 1}` },
                {
                  title: 'Ngày ở',
                  dataIndex: 'service_date',
                  render: (v) => (v ? dayjs(v).format('DD/MM/YYYY') : '---'),
                },
                { title: 'Khách sạn', dataIndex: 'hotel_name', render: (v) => <Text strong>{v || '---'}</Text> },
                { title: 'Số phòng', dataIndex: 'room_number', render: (v) => <Text strong>{v || '---'}</Text> },
                {
                  title: 'Nhà cung cấp',
                  dataIndex: 'providerName',
                  render: (v) => v || <Text type="secondary">---</Text>,
                },
                { title: 'Sức chứa', dataIndex: 'max_occupancy', render: (v) => `${v || 0} người` },
                {
                  title: 'Trạng thái',
                  dataIndex: 'status',
                  render: (v) => (
                    <Tag color={v === 'confirmed' ? 'green' : v === 'cancelled' ? 'red' : 'processing'}>
                      {v === 'confirmed' ? 'Đã xác nhận' : v === 'cancelled' ? 'Đã hủy' : 'Đã giữ chỗ'}
                    </Tag>
                  ),
                },
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
                    {renderPaymentStatus(booking.payment_status, booking.status)}
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
                        <div style={{ marginTop: 4 }}>
                          <Button type="link" size="small" onClick={() => {
                            setSelectedGuideId(guideInfo?._id || guideInfo?.id || undefined);
                            setIsGuideModalOpen(true);
                          }}>
                            Thay đổi/Phân công
                          </Button>
                        </div>
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
                        {renderStatus(booking.status)}
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
                { key: '2', label: 'Chi tiết & Dịch vụ', children: <DetailsTab /> },
                { key: '3', label: 'Điểm danh (HDV)', children: <CheckinTab /> }
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

        <Modal
          title="Phân công Hướng dẫn viên"
          open={isGuideModalOpen}
          onOk={() => assignGuideMutation.mutate(selectedGuideId || null)}
          onCancel={() => setIsGuideModalOpen(false)}
          okText="Cập nhật"
          cancelText="Hủy"
          confirmLoading={assignGuideMutation.isPending}
        >
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary">Chọn HDV cho tour này (Hệ thống tự động lọc HDV rảnh):</Text>
          </div>
          <Select
            style={{ width: '100%' }}
            placeholder="-- Chọn Hướng dẫn viên --"
            value={selectedGuideId}
            onChange={setSelectedGuideId}
            allowClear
            showSearch
            optionFilterProp="children"
          >
            {availableGuides.map((g: any) => (
              <Option key={g._id} value={g._id}>
                {g.name} - {g.email || g.phone}
              </Option>
            ))}
          </Select>
          <div style={{ marginTop: 12 }}>
             <Text type="secondary" style={{ fontSize: 12 }}>
               Lưu ý: Bỏ chọn (nhấn dấu x trên ô chọn) rồi Cập nhật để gỡ phân công HDV hiện tại.
             </Text>
          </div>
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