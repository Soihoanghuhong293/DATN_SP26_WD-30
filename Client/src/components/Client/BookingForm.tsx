import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Radio, Button, message, Calendar, Tag, Row, Col, Typography, Spin } from 'antd';
import { UserOutlined, PhoneOutlined, MailOutlined, CalendarOutlined, TeamOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';

interface BookingFormProps {
  visible: boolean;
  onClose: () => void;
  tour: any;
}

const BookingForm: React.FC<BookingFormProps> = ({ visible, onClose, tour }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [calculatedPrice, setCalculatedPrice] = useState<number>(0);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [holidayRules, setHolidayRules] = useState<any[]>([]);

  // Fetch thông tin giá ngày lễ ngay khi mở form
  useEffect(() => {
    if (visible) {
      axios.get('http://localhost:5000/api/v1/holiday-pricings')
        .then(res => setHolidayRules(res.data.data || []))
        .catch(err => console.error('Lỗi khi tải giá ngày lễ:', err));
    }
  }, [visible]);

  // Theo dõi sự thay đổi của trường Số lượng khách (groupSize) để tính tổng tiền realtime
  const currentGroupSize = Form.useWatch('groupSize', form) || 1;

  const departureSchedule = tour?.departure_schedule || [];

  // Hàm tính hiển thị giá trực tiếp trên lịch
  const getPriceForDate = (dateStr: string) => {
    const basePrice = tour?.price || 0;
    const targetTime = new Date(dateStr + 'T12:00:00Z').getTime();

    const applicableRules = holidayRules.filter(rule => {
      const isForTour = !rule.tour_id || rule.tour_id?._id === (tour?._id || tour?.id) || rule.tour_id === (tour?._id || tour?.id);
      if (!isForTour) return false;

      let end = new Date(rule.end_date).getTime();
      // Vá lỗi cho các rule đã tạo cũ (cộng dồn cho hết ngày)
      const endHr = new Date(rule.end_date).getUTCHours();
      if (endHr === 17 || endHr === 0) end += 24 * 60 * 60 * 1000 - 1; 

      const start = new Date(rule.start_date).getTime();
      return targetTime >= start && targetTime <= end;
    });

    if (applicableRules.length > 0) {
      applicableRules.sort((a, b) => (b.priority || 0) - (a.priority || 0));
      const rule = applicableRules[0];
      if (rule.fixed_price) return rule.fixed_price;
      return basePrice * (rule.price_multiplier || 1);
    }
    return basePrice;
  };

  const handleDateSelect = async (dateStr: string) => {
    setSelectedDate(dateStr);
    form.setFieldsValue({ startDate: dayjs(dateStr) });
    
    // Cập nhật ngay giá trị đã tính toán từ frontend để giao diện không bị delay
    setCalculatedPrice(getPriceForDate(dateStr));

    setLoadingPrice(true);
    try {
      const res = await axios.post('http://localhost:5000/api/v1/holiday-pricings/calculate', {
        tour_id: tour?._id || tour?.id,
        basePrice: tour?.price || 0,
        departureDate: dateStr
      });
      setCalculatedPrice(res.data.data);
    } catch (error) {
      console.error('Lỗi khi tính giá:', error);
      setCalculatedPrice(tour?.price || 0); // Mặc định về giá gốc nếu có lỗi
    } finally {
      setLoadingPrice(false);
    }
  };

  const getNormalizedDate = (dateVal: string) => {
    if (!dateVal) return '';
    return dateVal.includes('T') ? dateVal.split('T')[0] : dayjs(dateVal).format('YYYY-MM-DD');
  };

  const dateCellRender = (value: Dayjs) => {
    const dateStr = value.format('YYYY-MM-DD');
    const schedule = departureSchedule.find((s: any) => getNormalizedDate(s.date) === dateStr);
    
    if (!schedule) return null;

    // Dùng hàm tính toán để lấy mức giá mới nhất thay vì dùng giá gốc
    const displayPrice = getPriceForDate(dateStr);
    const isAvailable = schedule.slots > 0;
    const isSelected = selectedDate === dateStr;

    return (
      <div 
        className={`p-1 text-center h-full rounded cursor-pointer transition-all ${isAvailable ? 'hover:bg-blue-50' : 'bg-gray-100 cursor-not-allowed opacity-60'} ${isSelected ? 'bg-blue-100 border border-blue-400' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          if (isAvailable) {
            handleDateSelect(dateStr);
          }
        }}
        style={{ 
          minHeight: '60px', 
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
          backgroundColor: isSelected ? '#e6f7ff' : isAvailable ? '#f0fdf4' : '#f5f5f5',
          border: isSelected ? '2px solid #1890ff' : '1px solid transparent'
        }}
      >
        <div style={{ fontWeight: 'bold', color: isAvailable ? '#f97316' : '#9ca3af', fontSize: '12px' }}>
          {displayPrice.toLocaleString('vi-VN')}đ
        </div>
        <div style={{ marginTop: '2px' }}>
          {isAvailable 
            ? <Tag color="green" style={{ margin: 0, fontSize: '10px', padding: '0 4px', lineHeight: '16px' }}>Còn {schedule.slots}</Tag> 
            : <Tag color="red" style={{ margin: 0, fontSize: '10px', padding: '0 4px', lineHeight: '16px' }}>Hết</Tag>
          }
        </div>
      </div>
    );
  };

  const handleSubmit = async (values: any) => {
    if (!selectedDate) {
      return message.error('Vui lòng chọn ngày khởi hành trên lịch!');
    }

    if (values.paymentMethod === 'deposit') {
      const today = dayjs().startOf('day');
      const selectedD = dayjs(selectedDate).startOf('day');
      if (selectedD.isSame(today) || selectedD.isBefore(today.add(1, 'day'))) {
        return message.error('Không thể đặt cọc cho tour khởi hành trong ngày hôm nay hoặc ngày mai.');
      }
    }

    const token = localStorage.getItem('token');
    if (!token) {
      return message.error('Vui lòng đăng nhập trước khi đặt tour!');
    }

    setLoading(true);
    try {
      const payload = {
        tour_id: tour?._id || tour?.id,
        customer_name: values.customerName,
        customer_phone: values.phone,
        customer_email: values.email,
        startDate: selectedDate, 
        groupSize: values.groupSize,
        paymentMethod: values.paymentMethod,
        customer_note: values.customer_note,
        // Truyền tổng tiền đã tính toán (sau khi áp dụng giá ngày lễ) xuống Backend
        total_price: calculatedPrice * values.groupSize,
      };

      await axios.post('http://localhost:5000/api/v1/bookings', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      message.success('Đặt tour thành công!');
      form.resetFields();
      setSelectedDate(null);
      onClose();
    } catch (error: any) {
      console.error('Lỗi đặt tour:', error);
      message.error(error.response?.data?.message || 'Lỗi khi đặt tour!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!visible) {
      form.resetFields();
      setSelectedDate(null);
    }
  }, [visible, form]);

  return (
    <Modal
      title={<div style={{ fontSize: 20 }}>Đặt Tour: <span style={{ color: '#1890ff' }}>{tour?.name}</span></div>}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={900}
      destroyOnClose
      style={{ top: 20 }}
    >
      <Row gutter={24}>
        <Col xs={24} md={12}>
          <Typography.Title level={5} style={{ marginBottom: 16 }}>1. Chọn ngày khởi hành</Typography.Title>
          <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            Vui lòng nhấp vào ngày có lịch (màu xanh) trên lịch bên dưới.
          </Typography.Text>
          <div style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 8 }}>
            <Calendar 
              fullscreen={false}
              dateCellRender={dateCellRender} 
              disabledDate={(current) => current && current < dayjs().startOf('day')}
            />
          </div>
          {selectedDate && (
             <div style={{ marginTop: 16, padding: 12, backgroundColor: '#e6f7ff', borderRadius: 8, border: '1px solid #91d5ff' }}>
               <div style={{ marginBottom: 8 }}>
                 <span style={{ fontWeight: 600 }}>Ngày khởi hành: </span> 
                 <span style={{ color: '#1890ff', fontWeight: 'bold' }}>{dayjs(selectedDate).format('DD/MM/YYYY')}</span>
               </div>
               <div>
                 <span style={{ fontWeight: 600 }}>Giá áp dụng: </span>
                 {loadingPrice ? <Spin size="small" /> : <span style={{ color: '#f5222d', fontWeight: 'bold', fontSize: 16 }}>{calculatedPrice.toLocaleString('vi-VN')}đ / khách</span>}
               </div>
               <div style={{ marginTop: 8, borderTop: '1px dashed #91d5ff', paddingTop: 8 }}>
                 <span style={{ fontWeight: 600 }}>Tổng tiền dự kiến: </span>
                 {loadingPrice ? <Spin size="small" /> : <span style={{ color: '#f5222d', fontWeight: 'bold', fontSize: 18 }}>{(calculatedPrice * currentGroupSize).toLocaleString('vi-VN')}đ</span>}
               </div>
             </div>
          )}
        </Col>

        <Col xs={24} md={12}>
          <Typography.Title level={5} style={{ marginBottom: 16, marginTop: window.innerWidth < 768 ? 24 : 0 }}>2. Thông tin liên hệ</Typography.Title>
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{
              paymentMethod: 'full',
            }}
          >
            <Form.Item
              name="customerName"
              label="Họ tên"
              rules={[
                { required: true, message: 'Vui lòng nhập họ tên!' },
                { whitespace: true, message: 'Họ tên không được chỉ chứa khoảng trắng!' }
              ]}
            >
              <Input prefix={<UserOutlined />} placeholder="Nhập họ tên" size="large" />
            </Form.Item>

            <Form.Item
              name="phone"
              label="Số điện thoại"
              rules={[
                { required: true, message: 'Vui lòng nhập số điện thoại!' },
                { pattern: /^(\+84|0)[3|5|7|8|9][0-9]{8}$/, message: 'Số điện thoại không hợp lệ!' }
              ]}
            >
              <Input prefix={<PhoneOutlined />} placeholder="Nhập số điện thoại" size="large" />
            </Form.Item>

            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: 'Vui lòng nhập email!' },
                { type: 'email', message: 'Email không hợp lệ!' }
              ]}
            >
              <Input prefix={<MailOutlined />} placeholder="Nhập email" size="large" />
            </Form.Item>

            <Form.Item
              name="groupSize"
              label="Số lượng khách"
              rules={[
                { required: true, message: 'Vui lòng nhập số lượng khách!' },
                { type: 'number', min: 1, message: 'Số lượng khách phải ít nhất 1!' },
              ]}
            >
              <InputNumber min={1} placeholder="Nhập số lượng khách" style={{ width: '100%' }} size="large" />
            </Form.Item>

            <Form.Item
              name="paymentMethod"
              label="Phương thức thanh toán"
              rules={[{ required: true, message: 'Vui lòng chọn phương thức thanh toán!' }]}
            >
              <Radio.Group>
                <Radio value="full">Thanh toán toàn bộ</Radio>
                <Radio value="deposit">Đặt cọc trước</Radio>
                <Radio value="later">Thanh toán sau</Radio>
              </Radio.Group>
            </Form.Item>

            <Form.Item
              name="customer_note"
              label="Ghi chú (Tùy chọn)"
            >
              <Input.TextArea rows={3} placeholder="Ví dụ: Ăn chay, dị ứng, yêu cầu đặc biệt..." />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" block size="large" loading={loading} style={{ height: 48, fontSize: 16, fontWeight: 600 }}>
                Xác nhận đặt tour
              </Button>
            </Form.Item>
          </Form>
        </Col>
      </Row>
    </Modal>
  );
};

export default BookingForm;