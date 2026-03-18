import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card, Button, Typography, Descriptions, Divider, Spin, message, Result, Tag, Space, ConfigProvider } from 'antd';
import { CalendarOutlined, CheckCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text } = Typography;

const BookingSuccessPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/v1/bookings/${id}`);
        setBooking(res.data.data || res.data);
      } catch (error) {
        message.error('Không tìm thấy thông tin đơn hàng');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchBooking();
  }, [id]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', marginTop: 100 }}><Spin size="large" /></div>;
  if (!booking) return <div style={{ textAlign: 'center', marginTop: 100 }}>Không tìm thấy đơn hàng.</div>;

  const totalPrice = booking.total_price || booking.totalPrice || 0;
  const isDeposit = booking.paymentMethod === 'deposit';
  const paymentAmount = isDeposit ? Math.round(totalPrice * 0.3) : totalPrice;

  const handlePayment = async () => {
    try {
      message.loading('Đang khởi tạo thanh toán MoMo...', 1);
      const res = await axios.post(`http://localhost:5000/api/v1/bookings/${id}/payments/momo`, {
        amount: paymentAmount,
        orderInfo: `Thanh toán ${isDeposit ? 'cọc' : 'toàn bộ'} tour ${booking.tour_id?.name}`
      });
      if (res.data?.payUrl) {
        window.location.href = res.data.payUrl;
      } else {
        message.error('Không nhận được link thanh toán từ MoMo');
      }
    } catch (error) {
      message.error('Lỗi khởi tạo thanh toán. Vui lòng thử lại sau.');
    }
  };

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#1890ff' } }}>
      <div style={{ padding: '40px 20px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
        <Card style={{ maxWidth: 800, margin: '0 auto', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <Result
            status="success"
            title="Đặt tour thành công!"
            subTitle="Vui lòng kiểm tra lại thông tin và tiến hành thanh toán để hoàn tất booking."
          />
          
          <Divider orientation="left" style={{ borderColor: '#d9d9d9' }}><CheckCircleOutlined /> Thông tin đơn hàng</Divider>
          
          <Descriptions bordered column={1} labelStyle={{ width: '180px', fontWeight: 600 }}>
            <Descriptions.Item label="Mã Booking"><Text copyable>{booking._id}</Text></Descriptions.Item>
            <Descriptions.Item label="Tour">{booking.tour_id?.name || '---'}</Descriptions.Item>
            <Descriptions.Item label="Khách hàng">
                <div>{booking.customer_name || booking.customerName}</div>
                <div style={{ fontSize: 13, color: '#666' }}>{booking.customer_phone || booking.phone}</div>
            </Descriptions.Item>
            <Descriptions.Item label="Lịch khởi hành">
               <Space>
                 <CalendarOutlined style={{ color: '#1890ff' }} /> 
                 <Text strong>{dayjs(booking.startDate).format('DD/MM/YYYY')}</Text>
               </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Số lượng khách">{booking.groupSize} người</Descriptions.Item>
            <Descriptions.Item label="Tổng giá trị tour">
                <Text>{totalPrice.toLocaleString()} ₫</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Phương thức">
                <Tag color={isDeposit ? 'orange' : 'blue'}>
                   {isDeposit ? 'Đặt cọc trước (30%)' : 'Thanh toán toàn bộ (100%)'}
                </Tag>
            </Descriptions.Item>
          </Descriptions>

          <div style={{ marginTop: 24, padding: 24, background: '#f9f9f9', borderRadius: 8, textAlign: 'right', border: '1px solid #f0f0f0' }}>
             <Text style={{ fontSize: 16 }}>Số tiền cần thanh toán ngay:</Text>
             <div style={{ fontSize: 32, fontWeight: 'bold', color: '#ff4d4f', margin: '4px 0 16px' }}>
                {paymentAmount.toLocaleString()} ₫
             </div>
             
             <Space size="middle">
               <Button size="large" onClick={() => navigate('/')}>Về trang chủ</Button>
               <Button type="primary" size="large" onClick={handlePayment} style={{ height: 48, padding: '0 40px', fontSize: 16, fontWeight: 600 }}>THANH TOÁN NGAY</Button>
             </Space>
          </div>
        </Card>
      </div>
    </ConfigProvider>
  );
};

export default BookingSuccessPage;