import React from 'react';
import { Modal, Form, Input, DatePicker, InputNumber, Radio, Button, message } from 'antd';
import { UserOutlined, PhoneOutlined, MailOutlined, CalendarOutlined, TeamOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

interface BookingFormProps {
  visible: boolean;
  onClose: () => void;
  tourId: string;
}

const BookingForm: React.FC<BookingFormProps> = ({ visible, onClose, tourId }) => {
  const [form] = Form.useForm();

  const handleSubmit = async (values: any) => {
    try {
      const payload = {
        tour_id: tourId,
        customerName: values.customerName,
        phone: values.phone,
        email: values.email,
        startDate: values.startDate.format('YYYY-MM-DD'),
        groupSize: values.groupSize,
        paymentMethod: values.paymentMethod,
        status: 'pending', // mặc định pending
      };

      await axios.post('http://localhost:5000/api/v1/bookings', payload);
      message.success('Đặt tour thành công!');
      form.resetFields();
      onClose();
    } catch (error: any) {
      console.error('Lỗi đặt tour:', error);
      message.error(error.response?.data?.message || 'Lỗi khi đặt tour!');
    }
  };

  return (
    <Modal
      title="Đặt Tour"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={600}
    >
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
          rules={[{ required: true, message: 'Vui lòng nhập họ tên!' }]}
        >
          <Input prefix={<UserOutlined />} placeholder="Nhập họ tên" />
        </Form.Item>

        <Form.Item
          name="phone"
          label="Số điện thoại"
          rules={[{ required: true, message: 'Vui lòng nhập số điện thoại!' }]}
        >
          <Input prefix={<PhoneOutlined />} placeholder="Nhập số điện thoại" />
        </Form.Item>

        <Form.Item
          name="email"
          label="Email"
          rules={[
            { required: true, message: 'Vui lòng nhập email!' },
            { type: 'email', message: 'Email không hợp lệ!' }
          ]}
        >
          <Input prefix={<MailOutlined />} placeholder="Nhập email" />
        </Form.Item>

        <Form.Item
          name="startDate"
          label="Ngày đi"
          rules={[{ required: true, message: 'Vui lòng chọn ngày đi!' }]}
        >
          <DatePicker
            format="DD/MM/YYYY"
            placeholder="Chọn ngày đi"
            disabledDate={(current) => current && current < dayjs().startOf('day')}
          />
        </Form.Item>

        <Form.Item
          name="groupSize"
          label="Số lượng khách"
          rules={[{ required: true, message: 'Vui lòng nhập số lượng khách!' }]}
        >
          <InputNumber
            min={1}
            placeholder="Nhập số lượng khách"
            style={{ width: '100%' }}
          />
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
          <Button type="primary" htmlType="submit" block>
            Xác nhận đặt tour
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default BookingForm;