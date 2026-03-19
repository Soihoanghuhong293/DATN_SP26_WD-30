import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { 
  Form, Select, DatePicker, InputNumber, Button, Card, 
  Row, Col, Typography, message, Input, Spin
} from 'antd';
import { 
  ArrowLeftOutlined, SaveOutlined,
  EnvironmentOutlined, IdcardOutlined, ProfileOutlined,
  CalculatorOutlined, SettingOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

//  trạng thái hợp lệ đồng bộ với   backend
const validTransitions: Record<string, string[]> = {
  pending: ['pending', 'confirmed', 'deposit', 'paid', 'cancelled'],
  confirmed: ['confirmed', 'deposit', 'paid', 'cancelled'],
  deposit: ['deposit', 'paid', 'cancelled'],
  paid: ['paid', 'cancelled'],
  cancelled: ['cancelled', 'refunded'],
  refunded: ['refunded'],
};

const BookingEdit = () => {
  const { id } = useParams();
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [currentPrices, setCurrentPrices] = useState<any[]>([]); 
  const [activeHolidayName, setActiveHolidayName] = useState<string | null>(null);

  const { data: holidayRules = [] } = useQuery({
    queryKey: ['holiday-pricings'],
    queryFn: async () => {
      const res = await axios.get('http://localhost:5000/api/v1/holiday-pricings', getAuthHeader());
      return res.data?.data || [];
    }
  });

  const { data: booking, isLoading: isBookingLoading } = useQuery({
    queryKey: ['booking', id],
    queryFn: async () => {
      const res = await axios.get(`http://localhost:5000/api/v1/bookings/${id}`, getAuthHeader());
      return res.data?.data || res.data;
    },
    enabled: !!id,
  });

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

  const { data: providersData } = useQuery({
    queryKey: ['providers'],
    queryFn: async () => {
      const res = await axios.get('http://localhost:5000/api/v1/providers', getAuthHeader());
      return res.data?.data?.providers || res.data?.data || [];
    }
  });
  const providers = Array.isArray(providersData) ? providersData : [];

  const customers = useMemo(() => usersData?.filter((u: any) => u.role === 'user') || [], [usersData]);

  useEffect(() => {
    if (booking) {
      const formValues: any = {
        ...booking,
        tour_id: booking.tour_id?._id || booking.tour_id,
        user_id: booking.user_id?._id || booking.user_id,
        startDate: booking.startDate ? dayjs(booking.startDate) : null,
        endDate: booking.endDate ? dayjs(booking.endDate) : null,
      };

      const selectedTour = tours?.find((t: any) => t._id === formValues.tour_id);
      if (selectedTour) {
         const tourSuppliers = selectedTour.suppliers || [];
         if (tourSuppliers.length > 0) {
            const foundProviders = tourSuppliers.map((supplier: any) => {
               const actualId = typeof supplier === 'object' ? (supplier._id || supplier.id) : supplier;
               return providers.find((p: any) => p._id === actualId || p.id === actualId) || (typeof supplier === 'object' ? supplier : null);
            }).filter(Boolean);

            if (foundProviders.length > 0) {
               formValues.provider_detail = foundProviders.map((p: any, i: number) => `--- NCC ${i+1} ---\nTên NCC: ${p.name || 'Không có'}\nSĐT: ${p.phone || 'Không có'}\nEmail: ${p.email || 'Không có'}\nĐịa chỉ: ${p.address || 'Không có'}`).join('\n\n');
            } else {
               formValues.provider_detail = 'Không tìm thấy thông tin nhà cung cấp.';
            }
         } else {
            formValues.provider_detail = 'Tour này chưa được gắn nhà cung cấp.';
         }
         
         let activePriceList = (selectedTour.prices && selectedTour.prices.length > 0) 
            ? selectedTour.prices 
            : [{ name: 'Người lớn', price: selectedTour.price || 0 }];
         setCurrentPrices(activePriceList);
         
         formValues['qty_Người lớn'] = booking.groupSize || 1;
      }

      form.setFieldsValue(formValues);
    }
  }, [booking, tours, providers, form]);

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      const { files, provider_detail, ...restValues } = values;
      const payload: any = { ...restValues };
      
      payload.startDate = values.startDate ? values.startDate.format('YYYY-MM-DD') : undefined;
      payload.endDate = values.endDate ? values.endDate.format('YYYY-MM-DD') : undefined;

      if (!payload.user_id) payload.user_id = null;

      return await axios.put(`http://localhost:5000/api/v1/bookings/${id}`, payload, getAuthHeader());
    },
    onSuccess: () => {
      message.success('Cập nhật booking thành công!');
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booking', id] });
      navigate('/admin/bookings');
    },
    onError: (error: any) => {
      console.error("Lỗi từ backend:", error.response?.data);
      message.error(error.response?.data?.message || 'Lỗi khi cập nhật!');
    }
  });

  const handleValuesChange = (changedValues: any, allValues: any) => {
    const selectedTour = tours?.find((t: any) => t._id === allValues.tour_id);
    const fieldsToUpdate: any = {};

    if ((changedValues.tour_id || changedValues.startDate) && allValues.tour_id && selectedTour) {
      if (allValues.startDate) {
        const duration = selectedTour.duration_days || 1;
        const newEndDate = dayjs(allValues.startDate).add(duration - 1, 'day');
        fieldsToUpdate.endDate = newEndDate;
      }
    }

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

      const tourSuppliers = selectedTour.suppliers || [];
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

    if (allValues.tour_id && allValues.startDate && selectedTour) {
      const selectedDateStr = dayjs(allValues.startDate).format('YYYY-MM-DD');
      const targetTime = new Date(selectedDateStr + 'T12:00:00Z').getTime();
      
      let activePriceList = (selectedTour.prices && selectedTour.prices.length > 0) 
          ? JSON.parse(JSON.stringify(selectedTour.prices)) 
          : [{ name: 'Người lớn', price: selectedTour.price || 0 }];
      let holidayName = null;

      const applicableRules = holidayRules.filter((rule: any) => {
        const isForTour = !rule.tour_id || rule.tour_id?._id === selectedTour._id || rule.tour_id === selectedTour._id;
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

  if (isBookingLoading) {
     return <div className="flex justify-center items-center h-screen"><Spin size="large" /></div>;
  }

  // Lấy trạng thái gốc của đơn hàng hiện tại từ DB để tính toán danh sách được phép chuyển
  const originalStatus = booking?.status || 'pending';
  const allowedStatuses = validTransitions[originalStatus] || [];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Title level={4} className="mb-1 text-gray-800">Cập nhật Booking</Title>
          <Text type="secondary">Chỉnh sửa thông tin phiếu đặt tour</Text>
        </div>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/bookings')}>
          Quay lại
        </Button>
      </div>

      <Form form={form} layout="vertical" onFinish={onFinish} onValuesChange={handleValuesChange}>
        <Row gutter={24}>
          <Col xs={24} lg={16}>
            <Card title={<><EnvironmentOutlined className="text-blue-500 mr-2" /> Thông tin Tour & Thời gian</>} className="mb-6 shadow-sm">
              <Form.Item name="tour_id" label="Tour" rules={[{ required: true, message: 'Vui lòng chọn tour!' }]}>
                <Select showSearch placeholder="-- Vui lòng chọn Tour --" loading={isToursLoading} optionFilterProp="children" size="large" disabled>
                  {Array.isArray(tours) && tours.map((t: any) => <Option key={t._id} value={t._id}>{t.name}</Option>)}
                </Select>
              </Form.Item>
              <Row gutter={16}>
                <Col span={12}><Form.Item name="startDate" label="Ngày khởi hành" rules={[{ required: true, message: 'Chọn ngày đi!' }]}><DatePicker format="DD/MM/YYYY" className="w-full" size="large" /></Form.Item></Col>
                <Col span={12}><Form.Item name="endDate" label="Ngày kết thúc" tooltip="Tự động tính theo thời lượng tour"><DatePicker format="DD/MM/YYYY" className="w-full bg-gray-100" size="large" disabled /></Form.Item></Col>
              </Row>
            </Card>
            <Card title={<><IdcardOutlined className="text-blue-500 mr-2" /> Khách hàng đại diện</>} className="mb-6 shadow-sm">
              <Form.Item name="user_id" label="Liên kết Tài khoản"><Select showSearch allowClear optionFilterProp="children" loading={isUsersLoading}>{customers.map((u: any) => <Option key={u._id} value={u._id}>{u.name} ({u.email})</Option>)}</Select></Form.Item>
              <Row gutter={16}>
                <Col span={12}><Form.Item name="customer_name" label="Họ và Tên" rules={[{ required: true }]}><Input size="large" /></Form.Item></Col>
                <Col span={12}><Form.Item name="customer_phone" label="Số điện thoại" rules={[{ required: true }]}><Input size="large" /></Form.Item></Col>
                <Col span={12}><Form.Item name="customer_email" label="Email / Liên hệ khác"><Input size="large" /></Form.Item></Col>
                <Col span={12}><Form.Item name="customer_address" label="Địa chỉ"><Input size="large" /></Form.Item></Col>
                <Col span={24}><Form.Item name="customer_note" label="Ghi chú từ khách hàng"><Input.TextArea rows={2} /></Form.Item></Col>
              </Row>
            </Card>
            <Card title={<><ProfileOutlined className="text-cyan-500 mr-2" /> Chi tiết nội dung</>} className="mb-6 shadow-sm">
              <Row gutter={16}>
                <Col span={12}><Form.Item name="provider_detail" label="Nhà cung cấp"><TextArea rows={4} className="bg-gray-50" readOnly /></Form.Item></Col>
                <Col span={12}><Form.Item name="notes" label="Ghi chú chung"><TextArea rows={4} /></Form.Item></Col>
                <Col span={12}><Form.Item name="schedule_detail" label="Lịch trình chi tiết"><TextArea rows={8} className="bg-gray-50" readOnly /></Form.Item></Col>
                <Col span={12}><Form.Item name="service_detail" label="Dịch vụ bao gồm"><TextArea rows={8} className="bg-gray-50" readOnly /></Form.Item></Col>
              </Row>
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card title={<><CalculatorOutlined className="text-green-500 mr-2" /> Chi phí & Số lượng</>} className="mb-6 shadow-sm border-t-4 border-t-green-500">
              {currentPrices.length > 0 ? (
                <div className="mb-4">
                  <div className="font-bold text-gray-700 mb-3">Số lượng hành khách {activeHolidayName && <div className="text-orange-500 font-normal text-xs mt-1">(Đang áp dụng: {activeHolidayName})</div>}</div>
                  {currentPrices.map((priceItem: any, index: number) => (
                    <div className="flex justify-between items-center mb-3" key={index}>
                      <div><div className="font-medium">{priceItem.name}</div><div className="text-xs text-gray-500">{priceItem.price.toLocaleString()} đ/người</div></div>
                      <Form.Item name={`qty_${priceItem.name}`} noStyle><InputNumber min={0} className="w-24 text-center" size="large" /></Form.Item>
                    </div>
                  ))}
                  <Form.Item name="groupSize" hidden><InputNumber /></Form.Item>
                </div>
              ) : <div className="text-center text-gray-400 mb-4 py-4 italic">Vui lòng chọn Tour và Ngày đi</div>}
              <hr className="my-4 border-gray-200" />
              <Form.Item name="total_price" label={<span className="text-success font-bold uppercase">Tổng thành tiền (VND)</span>}><InputNumber className="w-full text-red-600 font-bold" size="large" readOnly formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} /></Form.Item>
            </Card>
            <Card title={<><SettingOutlined className="text-yellow-500 mr-2" /> Điều hành</>} className="mb-6 shadow-sm border-t-4 border-t-yellow-500">
              <Form.Item 
                name="status" 
                label="Trạng thái đơn"
                extra={<span className="text-xs text-gray-500 italic mt-1 inline-block">Hệ thống làm mờ các trạng thái sai quy trình.</span>}
              >
                <Select size="large">
                  <Option value="pending" disabled={!allowedStatuses.includes('pending')}>Chờ duyệt</Option>
                  <Option value="confirmed" disabled={!allowedStatuses.includes('confirmed')}>Đã xác nhận</Option>
                  <Option value="deposit" disabled={!allowedStatuses.includes('deposit')}>Đã cọc</Option>
                  <Option value="paid" disabled={!allowedStatuses.includes('paid')}>Đã thanh toán</Option>
                  <Option value="cancelled" disabled={!allowedStatuses.includes('cancelled')}>Đã hủy</Option>
                  <Option value="refunded" disabled={!allowedStatuses.includes('refunded')}>Hoàn tiền</Option>
                </Select>
              </Form.Item>
            </Card>
            <Button type="primary" htmlType="submit" block size="large" icon={<SaveOutlined />} loading={mutation.isPending} className="bg-orange-500 hover:bg-orange-600 border-none h-14 text-lg font-bold shadow-md">
              CẬP NHẬT BOOKING
            </Button>
          </Col>
        </Row>
      </Form>
    </div>
  );
};
export default BookingEdit;