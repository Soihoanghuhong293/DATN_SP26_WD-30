import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Radio, Button, message, Calendar, Tag, Row, Col, Typography } from 'antd';
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

  const departureSchedule = tour?.departure_schedule || [];

  const getPriceForDate = (dateStr: string) => {
    let activePriceList = tour?.prices?.length > 0 
      ? tour.prices 
      : [{ name: 'Người lớn', price: tour?.price || 0 }];
      
    if (tour?.seasonalPrices?.length > 0) {
      for (const season of tour.seasonalPrices) {
        if (dateStr >= dayjs(season.startDate).format('YYYY-MM-DD') && 
            dateStr <= dayjs(season.endDate).format('YYYY-MM-DD')) {
          if (season.prices?.length > 0) {
            activePriceList = season.prices;
          }
          break;
        }
      }
    }
    return activePriceList.find((p: any) => p.name === 'Người lớn')?.price || activePriceList[0]?.price || 0;
  };

  const getNormalizedDate = (dateVal: string) => {
    if (!dateVal) return '';
    return dateVal.includes('T') ? dateVal.split('T')[0] : dayjs(dateVal).format('YYYY-MM-DD');
  };

  const dateCellRender = (value: Dayjs) => {
    const dateStr = value.format('YYYY-MM-DD');
    const schedule = departureSchedule.find((s: any) => getNormalizedDate(s.date) === dateStr);
    
    if (!schedule) return null;

    const price = getPriceForDate(dateStr);
    const isAvailable = schedule.slots > 0;
    const isSelected = selectedDate === dateStr;

    return (
      <div 
        className={`p-1 text-center h-full rounded cursor-pointer transition-all ${isAvailable ? 'hover:bg-blue-50' : 'bg-gray-100 cursor-not-allowed opacity-60'} ${isSelected ? 'bg-blue-100 border border-blue-400' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          if (isAvailable) {
            setSelectedDate(dateStr);
            form.setFieldsValue({ startDate: dayjs(dateStr) });
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
          {price.toLocaleString('vi-VN')}đ
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

    setLoading(true);
    try {
      const payload = {
        tour_id: tour?._id || tour?.id,
        customerName: values.customerName,
        phone: values.phone,
        email: values.email,
        startDate: selectedDate, 
        groupSize: values.groupSize,
        paymentMethod: values.paymentMethod,
      };

      await axios.post('http://localhost:5000/api/v1/bookings', payload);
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
               <span style={{ fontWeight: 600 }}>Ngày đã chọn: </span> 
               <span style={{ color: '#1890ff', fontWeight: 'bold' }}>{dayjs(selectedDate).format('DD/MM/YYYY')}</span>
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