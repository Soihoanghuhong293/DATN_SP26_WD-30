import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { 
  Form, Select, DatePicker, InputNumber, Button, Card, 
  Row, Col, Typography, message, Input
} from 'antd';
import { 
  ArrowLeftOutlined, SaveOutlined,
  EnvironmentOutlined, IdcardOutlined, ProfileOutlined,
  CalculatorOutlined, SettingOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  groupToursForAdminBooking,
  mergeDepartureRowsForInstances,
  getTourInstanceForDepartureDate,
} from '../../utils/adminTourGroups';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const isSingleRoomPriceRow = (name: string) => String(name || '').toLowerCase().includes('phòng đơn');
const isPassengerPriceRow = (name: string) => !isSingleRoomPriceRow(name);

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

const BookingCreate = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [calculatedPrice, setCalculatedPrice] = useState(0);
  const [currentPrices, setCurrentPrices] = useState<any[]>([]); 
  const [activeHolidayName, setActiveHolidayName] = useState<string | null>(null);

  const { data: holidayRules = [] } = useQuery({
    queryKey: ['holiday-pricings'],
    queryFn: async () => {
      const res = await axios.get('http://localhost:5000/api/v1/holiday-pricings', getAuthHeader());
      return res.data?.data || [];
    }
  });

  const { data: tours, isLoading: isToursLoading } = useQuery({
    queryKey: ['tours', 'bookable-active'],
    queryFn: async () => {
      const res = await axios.get('http://localhost:5000/api/v1/tours', {
        ...getAuthHeader(),
        params: { status: 'active' },
      });
      return res.data?.data || [];
    },
  });

  const { data: usersData, isLoading: isUsersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await axios.get('http://localhost:5000/api/v1/users', getAuthHeader());
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

  // lấy booking
  const { data: allBookings } = useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const res = await axios.get('http://localhost:5000/api/v1/bookings', getAuthHeader());
      return res.data?.data || res.data?.results || [];
    }
  });

  // users ->Khách hàng và HDV
  const customers = useMemo(() => usersData?.filter((u: any) => u.role === 'user') || [], [usersData]);

  /** Một dòng / tour logic (gộp nhiều instance cùng template hoặc cùng tên) */
  const groupedTours = useMemo(() => groupToursForAdminBooking(tours || []), [tours]);

  // chọn tour ra các số ngày khởi hành
  const watchedTourId = Form.useWatch('tour_id', form);

  const selectedGroup = useMemo(() => {
    if (!watchedTourId) return null;
    return groupedTours.find((g: any) => String(g._id) === String(watchedTourId)) || null;
  }, [groupedTours, watchedTourId]);

  const instanceIdsInSelectedGroup = useMemo(() => {
    if (!selectedGroup?._instances) return new Set<string>();
    return new Set((selectedGroup._instances as any[]).map((i: any) => String(i._id)));
  }, [selectedGroup]);

  // tính số chỗ — gộp booking của mọi instance trong nhóm
  const bookedSlotsByDate = useMemo(() => {
    if (!instanceIdsInSelectedGroup.size || !allBookings) return {};
    const grouped: Record<string, number> = {};
    allBookings.forEach((b: any) => {
      const bTourId = b?.tour_id?._id || b?.tour_id;
      if (!instanceIdsInSelectedGroup.has(String(bTourId))) return;
      if (b?.status === 'cancelled') return;

      const dateStr = b.startDate ? (b.startDate.includes('T') ? b.startDate.split('T')[0] : dayjs(b.startDate).format('YYYY-MM-DD')) : '';
      if (!dateStr) return;

      const size = Number(b?.groupSize || 0);
      grouped[dateStr] = (grouped[dateStr] || 0) + size;
    });
    return grouped;
  }, [instanceIdsInSelectedGroup, allBookings]);

  const availableDepartureDates = useMemo(() => {
    if (!selectedGroup?._instances?.length) return [];
    const rows = mergeDepartureRowsForInstances(selectedGroup._instances);
    return rows.map(({ dateStr, baseSlots }) => {
      const booked = bookedSlotsByDate[dateStr] || 0;
      const remaining = Math.max(0, baseSlots - booked);
      return {
        label: `${dayjs(dateStr).format('DD/MM/YYYY')} (Còn ${remaining} chỗ)`,
        value: dateStr,
        slots: remaining,
      };
    });
  }, [selectedGroup, bookedSlotsByDate]);

  const watchedStartDate = Form.useWatch('startDate', form);
  const availableSlotsForSelectedDate = useMemo(() => {
    if (!watchedStartDate) return null;
    const dateStr = dayjs(watchedStartDate).format('YYYY-MM-DD');

    const dateInfo = availableDepartureDates.find((d: { value: string; slots: number }) => d.value === dateStr);
    return dateInfo ? dateInfo.slots : null;
  }, [watchedStartDate, availableDepartureDates]);

  // submit Form
 const mutation = useMutation({
    mutationFn: async (values: any) => {
      // Tách file ra để không gửi nhầm object vào JSON
      const { files, provider_detail, ...restValues } = values;

      const payload: any = { ...restValues };

      const group = groupedTours.find((g: any) => String(g._id) === String(values.tour_id));
      if (group?._instances?.length && values.startDate) {
        const inst = getTourInstanceForDepartureDate(group._instances, values.startDate);
        if (inst?._id) payload.tour_id = inst._id;
      }

      payload.startDate = values.startDate ? dayjs(values.startDate).format('YYYY-MM-DD') : undefined;
      payload.endDate = values.endDate ? values.endDate.format('YYYY-MM-DD') : undefined;

      if (!payload.user_id) delete payload.user_id;

      // Số phòng đơn yêu cầu: lấy từ dòng giá "Phòng đơn..."
      const singleRoomPriceRow = currentPrices.find((p: any) => isSingleRoomPriceRow(String(p?.name || '')));
      if (singleRoomPriceRow?.name) {
        const key = `qty_${singleRoomPriceRow.name}`;
        payload.single_room_request_count = Math.max(0, Number(values[key] || 0));
      } else {
        payload.single_room_request_count = 0;
      }

      return await axios.post('http://localhost:5000/api/v1/bookings', payload, getAuthHeader());
    },
    onSuccess: () => {
      message.success('Tạo đơn đặt tour thành công!');
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['hdv-bookings'] });
      navigate('/admin/bookings');
    },
    onError: (error: any) => {
      console.error("Lỗi từ backend:", error.response?.data);
      message.error(error.response?.data?.message || 'Lỗi khi tạo đơn hàng!');
    }
  });

  const handleValuesChange = (changedValues: any, allValues: any) => {
    const group =
      allValues.tour_id != null
        ? groupedTours.find((g: any) => String(g._id) === String(allValues.tour_id))
        : null;
    const instanceForDate =
      group && allValues.startDate
        ? getTourInstanceForDepartureDate(group._instances || [], allValues.startDate)
        : null;
    const selectedTour = instanceForDate || group || tours?.find((t: any) => t._id === allValues.tour_id);
    const fieldsToUpdate: any = {};

    // Nếu đổi tour, reset lại ngày khởi hành
    if (changedValues.tour_id) {
      fieldsToUpdate.startDate = null;
      fieldsToUpdate.endDate = null;
    }

    // Nếu đổi ngày xuất phát tính lại ngày về
    if (changedValues.startDate && allValues.tour_id && selectedTour) {
      if (allValues.startDate) {
        const duration = selectedTour.duration_days || 1;
        const newEndDate = dayjs(allValues.startDate).add(duration - 1, 'day');
        fieldsToUpdate.endDate = newEndDate;
      }
    }

    // tự động fill chi tiết dịch vụ và chính sách
    if (changedValues.tour_id && group) {
      const tourForStaticFields = group;
      if (tourForStaticFields.schedule?.length > 0) {
        fieldsToUpdate.schedule_detail = tourForStaticFields.schedule
          .map((day: any) => {
            const acts = day.activities ? day.activities.map((act: string) => `- ${act}`).join('\n') : '';
            const lunchName =
              typeof day.lunch_restaurant_id === 'object' && day.lunch_restaurant_id?.name
                ? day.lunch_restaurant_id.name
                : '';
            const dinnerName =
              typeof day.dinner_restaurant_id === 'object' && day.dinner_restaurant_id?.name
                ? day.dinner_restaurant_id.name
                : '';
            const meals = [lunchName ? `- Trưa: ${lunchName}` : '', dinnerName ? `- Tối: ${dinnerName}` : '']
              .filter(Boolean)
              .join('\n');
            const ticketLines =
              Array.isArray(day.ticket_ids) && day.ticket_ids.length > 0
                ? day.ticket_ids
                    .map((tk: any) => {
                      if (typeof tk === 'object' && tk?.name) {
                        const m = tk.application_mode === 'included_in_tour' ? 'bao gồm trong tour' : 'mua thêm';
                        return `- Vé: ${tk.name}${tk.ticket_type ? ` (${tk.ticket_type})` : ''} [[${m}]]`;
                      }
                      return '';
                    })
                    .filter(Boolean)
                    .join('\n')
                : '';
            return `[Ngày ${day.day}] ${day.title}\n${acts}${meals ? `\n${meals}` : ''}${ticketLines ? `\n${ticketLines}` : ''}`;
          })
          .join('\n\n');
      } else {
        fieldsToUpdate.schedule_detail = ''; 
      }

      if (tourForStaticFields.policies?.length > 0) {
        fieldsToUpdate.service_detail = tourForStaticFields.policies.map((p: string) => `- ${p}`).join('\n');
      } else {
        fieldsToUpdate.service_detail = '';
      }

      // Tự động fill nhà cung cấp
      const tourSuppliers = tourForStaticFields.suppliers || [];
      if (tourSuppliers.length > 0) {
        const foundProviders = tourSuppliers.map((supplier: any) => {
          const actualId = typeof supplier === 'object' ? (supplier._id || supplier.id) : supplier;
          return providers.find((p: any) => p._id === actualId || p.id === actualId) || (typeof supplier === 'object' ? supplier : null);
        }).filter(Boolean);

        if (foundProviders.length > 0) {
          fieldsToUpdate.provider_detail = foundProviders.map((p: any, i: number) => `--- NCC ${i+1} ---\nTên NCC: ${p.name || 'Không có'}\nSĐT: ${p.phone || 'Không có'}\nEmail: ${p.email || 'Không có'}\nĐịa chỉ: ${p.address || 'Không có'}`).join('\n\n');
        } else {
          fieldsToUpdate.provider_detail = 'Không tìm thấy thông tin nhà cung cấp.';
        }
      } else {
        fieldsToUpdate.provider_detail = 'Tour này chưa được gắn nhà cung cấp.';
      }
    }

    //  Tính tiền (dùng instance đúng ngày để giá có thể khác nhau theo đợt)
    if (allValues.tour_id && allValues.startDate && selectedTour) {
      const selectedDateStr = dayjs(allValues.startDate).format('YYYY-MM-DD');
      const targetTime = new Date(selectedDateStr + 'T12:00:00Z').getTime();
      
      let activePriceList = (selectedTour.prices && selectedTour.prices.length > 0) 
          ? JSON.parse(JSON.stringify(selectedTour.prices)) // Deep copy để không sửa nhầm vào object gốc
          : [{ name: 'Người lớn', price: selectedTour.price || 0 }];
      let holidayName = null;

      const instanceIdSet = group
        ? new Set((group._instances || []).map((i: any) => String(i._id)))
        : new Set(selectedTour._id ? [String(selectedTour._id)] : []);

      const applicableRules = holidayRules.filter((rule: any) => {
        const rid = rule.tour_id?._id || rule.tour_id;
        const isForTour = !rid || instanceIdSet.has(String(rid));
        if (!isForTour) return false;

        let end = new Date(rule.end_date).getTime();
        const endHr = new Date(rule.end_date).getUTCHours();
        if (endHr === 17 || endHr === 0) end += 24 * 60 * 60 * 1000 - 1; 

        const start = new Date(rule.start_date).getTime();
        return targetTime >= start && targetTime <= end;
      });

      if (applicableRules.length > 0) {
        applicableRules.sort((a: any, b: any) => (b.priority || 0) - (a.priority || 0));
        const rule = applicableRules[0];
        holidayName = rule.name;

        activePriceList = activePriceList.map((item: any) => {
          let newPrice = item.price;
          if (rule.fixed_price) {
            newPrice = selectedTour.price > 0 ? Math.round(item.price * (rule.fixed_price / selectedTour.price)) : rule.fixed_price;
          } else {
            newPrice = Math.round(item.price * (rule.price_multiplier || 1));
          }
          return { ...item, price: newPrice };
        });
      }

      setCurrentPrices(activePriceList);
      setActiveHolidayName(holidayName);

      const dateStr = dayjs(allValues.startDate).format('YYYY-MM-DD');
      const dateInfo = availableDepartureDates.find((d: any) => d.value === dateStr);
      const maxSlots = dateInfo ? dateInfo.slots : null;

      let totalMoney = 0;
      let totalPeople = 0;
      const isTourOrDateChanged = !!changedValues.tour_id || !!changedValues.startDate;

      // Bước 1: Tính tổng số người tạm thời
      activePriceList.forEach((item: any) => {
        let qty = allValues[`qty_${item.name}`];
        if (isTourOrDateChanged || qty === undefined || qty === null) {
          qty = item.name === 'Người lớn' ? 1 : 0;
          fieldsToUpdate[`qty_${item.name}`] = qty;
        } else {
          qty = Number(qty);
        }
        if (isPassengerPriceRow(item.name)) totalPeople += qty;
      });

      // Bước 2: Cắt giảm tự động nếu vượt quá số chỗ cho phép
      if (maxSlots !== null && totalPeople > maxSlots && !isTourOrDateChanged) {
        const changedKey = Object.keys(changedValues).find(k => k.startsWith('qty_'));
        if (changedKey) {
          const changedName = changedKey.replace(/^qty_/, '');
          // Không giới hạn theo slots cho dòng phòng đơn (không phải số người)
          if (isSingleRoomPriceRow(changedName)) {
            // bỏ qua chặn số chỗ
          } else {
          const excess = totalPeople - maxSlots;
          const currentVal = Number(allValues[changedKey]);
          const allowedVal = Math.max(0, currentVal - excess);
          
          fieldsToUpdate[changedKey] = allowedVal;
          allValues[changedKey] = allowedVal; // Cập nhật lại cho vòng lặp tính tiền
          message.destroy(); // Xóa tin nhắn cũ tránh spam
          message.warning(`Giới hạn! Chỉ còn trống ${maxSlots} chỗ cho ngày này.`);
          totalPeople = maxSlots;
          }
        }
      }

      // Bước 3: Tính lại tổng tiền chính xác sau khi đã chuẩn hóa số lượng
      activePriceList.forEach((item: any) => {
        let qty = fieldsToUpdate[`qty_${item.name}`] !== undefined 
          ? fieldsToUpdate[`qty_${item.name}`] 
          : Number(allValues[`qty_${item.name}`] || 0);
        totalMoney += qty * item.price;
      });

      setCalculatedPrice(totalMoney);
      fieldsToUpdate.total_price = totalMoney;
      fieldsToUpdate.groupSize = totalPeople;
    }

    if (Object.keys(fieldsToUpdate).length > 0) {
      form.setFieldsValue(fieldsToUpdate);
    }
  };

  const onFinish = (values: any) => {
    if (values.groupSize === 0) return message.error('Vui lòng nhập số lượng khách!');

    const singleRoomPriceRow = currentPrices.find((p: any) => isSingleRoomPriceRow(String(p?.name || '')));
    const singleRoomCount = singleRoomPriceRow?.name ? Math.max(0, Number(values[`qty_${singleRoomPriceRow.name}`] || 0)) : 0;
    if (singleRoomCount > Number(values.groupSize || 0)) {
      return message.error('Số phòng đơn yêu cầu không được vượt quá số lượng khách.');
    }
    
    if (availableSlotsForSelectedDate !== null && values.groupSize > availableSlotsForSelectedDate) {
      return message.error(`Số lượng khách (${values.groupSize}) vượt quá số chỗ còn lại (${availableSlotsForSelectedDate})! Vui lòng giảm số khách hoặc chọn ngày khác.`);
    }

    mutation.mutate(values);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Title level={4} className="mb-1 text-gray-800">Tạo Booking Mới</Title>
          <Text type="secondary">Nhập thông tin để tạo phiếu đặt tour mới</Text>
        </div>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/bookings')}>
          Quay lại danh sách
        </Button>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        onValuesChange={handleValuesChange}
        initialValues={{ paymentMethod: 'offline' }}
      >
        <Row gutter={24}>
          <Col xs={24} lg={16}>
            
            <Card title={<><EnvironmentOutlined className="text-blue-500 mr-2" /> Thông tin Tour & Thời gian</>} className="mb-6 shadow-sm">
              <Form.Item name="tour_id" label="Chọn Tour" rules={[{ required: true, message: 'Vui lòng chọn tour!' }]}>
                <Select showSearch placeholder="-- Vui lòng chọn Tour --" loading={isToursLoading} optionFilterProp="children" size="large">
                  {groupedTours.map((t: any) => (
                    <Option key={t._groupKey} value={t._id}>{t.name}</Option>
                  ))}
                </Select>
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="startDate" label="Ngày khởi hành" rules={[{ required: true, message: 'Chọn ngày đi!' }]}>
                    <Select 
                      placeholder="-- Chọn ngày khởi hành --" 
                      size="large"
                      disabled={!watchedTourId}
                    >
                      {availableDepartureDates.map((d: any) => (
                        <Option key={d.value} value={d.value} disabled={d.slots <= 0}>
                          {d.label}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="endDate" label="Ngày kết thúc" tooltip="Tự động tính theo thời lượng tour">
                    <DatePicker format="DD/MM/YYYY" className="w-full bg-gray-100" size="large" disabled />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            <Card title={<><IdcardOutlined className="text-blue-500 mr-2" /> Khách hàng đặt tour</>} className="mb-6 shadow-sm">
              {/* <Form.Item name="user_id" label="Liên kết Tài khoản hệ thống (Nếu có)">
                <Select showSearch placeholder="Chọn tài khoản để liên kết..." allowClear optionFilterProp="children" loading={isUsersLoading}>
                  {customers.map((u: any) => (
                    <Option key={u._id} value={u._id}>{u.name} ({u.email})</Option>
                  ))}
                </Select>
              </Form.Item> */}

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="customer_name" label="Họ và Tên" rules={[{ required: true, message: 'Nhập tên!' }]}>
                    <Input placeholder="Nguyễn Văn A" size="large" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="customer_phone" label="Số điện thoại" rules={[{ required: true, message: 'Nhập SĐT!' }]}>
                    <Input placeholder="09xxxxxxxx" size="large" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="customer_email" label="Email / Liên hệ khác">
                    <Input placeholder="email@example.com" size="large" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="customer_address" label="Địa chỉ">
                    <Input placeholder="Hà Nội..." size="large" />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item name="customer_note" label="Ghi chú từ khách hàng">
                    <Input.TextArea rows={2} placeholder="Yêu cầu đặc biệt, dị ứng, giờ đón..." />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            <Card title={<><ProfileOutlined className="text-cyan-500 mr-2" /> Chi tiết nội dung</>} className="mb-6 shadow-sm">
              {/* ... Giữ nguyên các phần TextArea chi tiết, policies và Upload file ... */}
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="provider_detail" label="Nhà cung cấp">
                    <TextArea rows={4} placeholder="Thông tin nhà cung cấp sẽ tự động tải..." className="bg-gray-50" readOnly />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="notes" label="Ghi chú chung">
                    <TextArea rows={4} placeholder="Ghi chú nội bộ cho booking này..." />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="schedule_detail" label="Lịch trình chi tiết">
                    <TextArea rows={8} placeholder="Nội dung sẽ tự động tải khi chọn tour..." />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="service_detail" label="Dịch vụ bao gồm (Chính sách)">
                    <TextArea rows={8} placeholder="Chi tiết dịch vụ sẽ tự động tải..." />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            <Card title={<><CalculatorOutlined className="text-green-500 mr-2" /> Chi phí & Số lượng</>} className="mb-6 shadow-sm border-t-4 border-t-green-500">
              
              {currentPrices.length > 0 ? (
                <div className="mb-4">
                  <div className="font-bold text-gray-700 mb-3">
                    Số lượng hành khách 
                    {availableSlotsForSelectedDate !== null && (
                       <span className="text-blue-600 font-normal ml-2">
                         (Còn {availableSlotsForSelectedDate} chỗ)
                       </span>
                    )}
                    {activeHolidayName && <div className="text-orange-500 font-normal text-xs mt-1">(Đang áp dụng: {activeHolidayName})</div>}
                  </div>
                  
                  {currentPrices.map((priceItem: any, index: number) => (
                    <div className="flex justify-between items-center mb-3" key={index}>
                      <div>
                        <div className="font-medium">{priceItem.name}</div>
                        <div className="text-xs text-gray-500">
                          {priceItem.price.toLocaleString()} {isSingleRoomPriceRow(priceItem.name) ? 'đ/phòng' : 'đ/người'}
                        </div>
                      </div>
                      <Form.Item name={`qty_${priceItem.name}`} noStyle>
                        <InputNumber min={0} className="w-24 text-center" size="large" />
                      </Form.Item>
                    </div>
                  ))}
                  <Form.Item name="groupSize" hidden><InputNumber /></Form.Item>
                </div>
              ) : (
                <div className="text-center text-gray-400 mb-4 py-4 italic">Vui lòng chọn Tour và Ngày đi</div>
              )}

              <hr className="my-4 border-gray-200" />

              <Form.Item name="total_price" label={<span className="text-success font-bold uppercase">Tổng thành tiền (VND)</span>}>
                <InputNumber 
                  className="w-full text-red-600 font-bold" 
                  size="large" readOnly
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                />
              </Form.Item>
            </Card>

            <Button 
              type="primary" htmlType="submit" block size="large" 
              icon={<SaveOutlined />} loading={mutation.isPending}
              className="bg-blue-600 h-14 text-lg font-bold shadow-md"
            >
              TẠO BOOKING
            </Button>
          </Col>
        </Row>
      </Form>
    </div>
  );
};

export default BookingCreate;