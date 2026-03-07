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
import isBetween from 'dayjs/plugin/isBetween';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';

dayjs.extend(isBetween);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

const BookingCreate = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [calculatedPrice, setCalculatedPrice] = useState(0);
  const [currentPrices, setCurrentPrices] = useState<any[]>([]); 
  const [activeSeasonName, setActiveSeasonName] = useState<string | null>(null);

  // lưu trữ ngày được chọn để tính hdv rảnh
  const [selectedDates, setSelectedDates] = useState<{ start: dayjs.Dayjs | null, end: dayjs.Dayjs | null }>({ start: null, end: null });

  const { data: tours, isLoading: isToursLoading } = useQuery({
    queryKey: ['tours'],
    queryFn: async () => {
      const res = await axios.get('http://localhost:5000/api/v1/tours', getAuthHeader());
      return res.data?.data || [];
    }
  });

  const { data: usersData, isLoading: isUsersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await axios.get('http://localhost:5000/api/v1/users', getAuthHeader());
      return res.data?.data || [];
    }
  });

  const { data: allBookings } = useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const res = await axios.get('http://localhost:5000/api/v1/bookings', getAuthHeader());
      return res.data?.data || res.data?.results || [];
    }
  });

  // Tách users thành Khách hàng và HDV
  const customers = useMemo(() => usersData?.filter((u: any) => u.role === 'user') || [], [usersData]);
  const allGuides = useMemo(() => usersData?.filter((u: any) => u.role === 'guide') || [], [usersData]);

  // tìm hdv rảnh
  const availableGuides = useMemo(() => {
    if (!selectedDates.start || !selectedDates.end) return allGuides; 

    return allGuides.filter((guide: any) => {
      const isBusy = allBookings?.some((booking: any) => {
        if (booking.status === 'cancelled') return false; 
        
        const currentGuideId = booking.guide_id?._id || booking.guide_id;
        
        if (!currentGuideId || currentGuideId !== guide._id) return false;

        const bookingStart = dayjs(booking.startDate);
        const bookingEnd = dayjs(booking.endDate);

        const isOverlapping = selectedDates.start!.isSameOrBefore(bookingEnd, 'day') && 
                              selectedDates.end!.isSameOrAfter(bookingStart, 'day');
        
        return isOverlapping;
      });

      return !isBusy; 
    });
  }, [allGuides, allBookings, selectedDates]);
  // submit Form
 const mutation = useMutation({
    mutationFn: async (values: any) => {
      // Tách file ra để không gửi nhầm object vào JSON
      const { files, ...restValues } = values;

      const payload: any = { ...restValues };
      
      payload.startDate = values.startDate ? values.startDate.format('YYYY-MM-DD') : undefined;
      payload.endDate = values.endDate ? values.endDate.format('YYYY-MM-DD') : undefined;

      if (!payload.user_id) delete payload.user_id;
      if (!payload.guide_id) delete payload.guide_id;

      return await axios.post('http://localhost:5000/api/v1/bookings', payload, getAuthHeader());
    },
    onSuccess: () => {
      message.success('Tạo đơn đặt tour thành công!');
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      navigate('/admin/bookings');
    },
    onError: (error: any) => {
      console.error("Lỗi từ backend:", error.response?.data);
      message.error(error.response?.data?.message || 'Lỗi khi tạo đơn hàng!');
    }
  });

  const handleValuesChange = (changedValues: any, allValues: any) => {
    const selectedTour = tours?.find((t: any) => t._id === allValues.tour_id);
    const fieldsToUpdate: any = {};

    // nếu đổi ngày xuất phát tính lại ngyaf về
    if ((changedValues.tour_id || changedValues.startDate) && allValues.tour_id && selectedTour) {
      if (allValues.startDate) {
        const duration = selectedTour.duration_days || 1;
        const newEndDate = dayjs(allValues.startDate).add(duration - 1, 'day');
        fieldsToUpdate.endDate = newEndDate;
        
        // cập nhật lại ngày để kích hạot hdc
        setSelectedDates({ start: allValues.startDate, end: newEndDate });

        // chọn lại hdv nếu ngày thay đổi
        if (changedValues.startDate) fieldsToUpdate.guide_id = undefined;
      }
    }

    // tự động fill chi tiết dịch vụ và chính sách
    if (changedValues.tour_id && selectedTour) {
      if (selectedTour.schedule?.length > 0) {
        fieldsToUpdate.schedule_detail = selectedTour.schedule.map((day: any) => 
          `[Ngày ${day.day}] ${day.title}\n${day.activities ? day.activities.map((act: string) => `- ${act}`).join('\n') : ''}`
        ).join('\n\n');
      } else {
        fieldsToUpdate.schedule_detail = ''; 
      }

      if (selectedTour.policies?.length > 0) {
        fieldsToUpdate.service_detail = selectedTour.policies.map((p: string) => `- ${p}`).join('\n');
      } else {
        fieldsToUpdate.service_detail = '';
      }
    }

    //  Tính tiền
    if (allValues.tour_id && allValues.startDate && selectedTour) {
      const selectedDateStr = dayjs(allValues.startDate).format('YYYY-MM-DD');
      
      let activePriceList = (selectedTour.prices && selectedTour.prices.length > 0) 
          ? selectedTour.prices 
          : [{ name: 'Người lớn', price: selectedTour.price || 0 }];
      let seasonTitle = null;

      if (selectedTour.seasonalPrices?.length > 0) {
        for (const season of selectedTour.seasonalPrices) {
          if (selectedDateStr >= dayjs(season.startDate).format('YYYY-MM-DD') && 
              selectedDateStr <= dayjs(season.endDate).format('YYYY-MM-DD')) {
            if (season.prices?.length > 0) {
              activePriceList = season.prices;
              seasonTitle = season.title;
            }
            break;
          }
        }
      }

      setCurrentPrices(activePriceList);
      setActiveSeasonName(seasonTitle);

      let totalMoney = 0;
      let totalPeople = 0;
      const isTourOrDateChanged = !!changedValues.tour_id || !!changedValues.startDate;

      activePriceList.forEach((item: any) => {
        let qty = allValues[`qty_${item.name}`];
        if (isTourOrDateChanged || qty === undefined || qty === null) {
          qty = item.name === 'Người lớn' ? 1 : 0;
          fieldsToUpdate[`qty_${item.name}`] = qty;
        }
        totalMoney += qty * item.price;
        totalPeople += qty;
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
        initialValues={{ status: 'confirmed', paymentMethod: 'offline' }}
      >
        <Row gutter={24}>
          <Col xs={24} lg={16}>
            
            <Card title={<><EnvironmentOutlined className="text-blue-500 mr-2" /> Thông tin Tour & Thời gian</>} className="mb-6 shadow-sm">
              <Form.Item name="tour_id" label="Chọn Tour" rules={[{ required: true, message: 'Vui lòng chọn tour!' }]}>
                <Select showSearch placeholder="-- Vui lòng chọn Tour --" loading={isToursLoading} optionFilterProp="children" size="large">
                  {Array.isArray(tours) && tours.map((t: any) => (
                    <Option key={t._id} value={t._id}>{t.name}</Option>
                  ))}
                </Select>
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="startDate" label="Ngày khởi hành" rules={[{ required: true, message: 'Chọn ngày đi!' }]}>
                    <DatePicker format="DD/MM/YYYY" className="w-full" size="large" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="endDate" label="Ngày kết thúc" tooltip="Tự động tính theo thời lượng tour">
                    <DatePicker format="DD/MM/YYYY" className="w-full bg-gray-100" size="large" disabled />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            <Card title={<><IdcardOutlined className="text-blue-500 mr-2" /> Khách hàng đại diện (Trưởng đoàn)</>} className="mb-6 shadow-sm">
              <Form.Item name="user_id" label="Liên kết Tài khoản hệ thống (Nếu có)">
                <Select showSearch placeholder="Chọn tài khoản để liên kết..." allowClear optionFilterProp="children" loading={isUsersLoading}>
                  {customers.map((u: any) => (
                    <Option key={u._id} value={u._id}>{u.name} ({u.email})</Option>
                  ))}
                </Select>
              </Form.Item>

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
                  <Form.Item name="customer_address" label="Địa chỉ / Ghi chú khách">
                    <Input placeholder="Hà Nội..." size="large" />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            <Card title={<><ProfileOutlined className="text-cyan-500 mr-2" /> Chi tiết nội dung</>} className="mb-6 shadow-sm">
              {/* ... Giữ nguyên các phần TextArea chi tiết, policies và Upload file ... */}
              <Row gutter={16}>
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
                <Col span={24}>
                  <Form.Item name="notes" label="Ghi chú chung">
                    <TextArea rows={2} placeholder="Ghi chú nội bộ cho booking này..." />
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
                    {activeSeasonName && <div className="text-orange-500 font-normal text-xs mt-1">(Đang áp dụng: {activeSeasonName})</div>}
                  </div>
                  
                  {currentPrices.map((priceItem: any, index: number) => (
                    <div className="flex justify-between items-center mb-3" key={index}>
                      <div>
                        <div className="font-medium">{priceItem.name}</div>
                        <div className="text-xs text-gray-500">{priceItem.price.toLocaleString()} đ/người</div>
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

            <Card title={<><SettingOutlined className="text-yellow-500 mr-2" /> Điều hành</>} className="mb-6 shadow-sm border-t-4 border-t-yellow-500">
              
              {/* DROPDOWN CHỌN HDV THÔNG MINH */}
              <Form.Item 
                name="guide_id" 
                label={
                  <div className="flex justify-between w-full">
                    <span>Phân công HDV</span>
                    {selectedDates.start && (
                      <span className="text-xs text-green-600 font-normal">
                        Có {availableGuides.length} HDV rảnh
                      </span>
                    )}
                  </div>
                }
                tooltip="Hệ thống tự động loại bỏ các HDV bị trùng lịch trong ngày diễn ra tour"
              >
                <Select 
                  placeholder={!selectedDates.start ? "Vui lòng chọn Ngày Khởi Hành trước" : "-- Chọn Hướng dẫn viên --"} 
                  allowClear 
                  size="large"
                  disabled={!selectedDates.start}
                  showSearch
                  optionFilterProp="children"
                >
                  {availableGuides.map((g: any) => (
                    <Option key={g._id} value={g._id}>
                      {g.name} - {g.email || g.phone}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item name="status" label="Trạng thái đơn">
                <Select size="large">
                  <Option value="pending">Chờ duyệt</Option>
                  <Option value="confirmed">Đã xác nhận</Option>
                  <Option value="paid">Đã thanh toán</Option>
                  <Option value="cancelled">Đã hủy</Option>
                </Select>
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