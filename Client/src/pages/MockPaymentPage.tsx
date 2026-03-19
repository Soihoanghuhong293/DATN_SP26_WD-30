import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, Button, Typography, Space, message, ConfigProvider } from 'antd';
import axios from 'axios';

const { Title, Text } = Typography;

const MockPaymentPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const bookingId = searchParams.get('bookingId');
  const amount = searchParams.get('amount');
  const type = searchParams.get('type');

  const handleSimulatePayment = async (status: 'success' | 'failed') => {
    if (status === 'failed') {
      message.error('Đã hủy giao dịch thanh toán!');
      navigate(`/booking-success/${bookingId}`); // Quay lại trang thông tin đơn
      return;
    }

    setLoading(true);
    try {
      // Gọi Callback API báo thanh toán thành công
      await axios.post('http://localhost:5000/api/v1/payments/mock-callback', {
        bookingId,
        status: 'success',
        pay_type: type
      });
      message.success('Thanh toán thành công! Trạng thái đơn hàng đã được cập nhật.');
      
      // Chuyển hướng người dùng về trang chủ hoặc trang quản lý đơn hàng
      navigate('/'); 
    } catch (error) {
      message.error('Lỗi khi cập nhật thanh toán!');
    } finally {
      setLoading(false);
    }
  };

  if (!bookingId) return <div style={{ padding: 50, textAlign: 'center' }}>URL thanh toán không hợp lệ</div>;

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#a50064' } }}>
      <div style={{ padding: '50px 20px', display: 'flex', justifyContent: 'center', background: '#f0f2f5', minHeight: '100vh' }}>
        <Card style={{ width: 450, textAlign: 'center', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
          <Title level={3} style={{ color: '#a50064', margin: 0 }}>Ví MoMo</Title>
          <Text type="secondary">Cổng thanh toán giả lập (Môi trường Test)</Text>
          
          <div style={{ margin: '30px 0', padding: '20px', background: '#f9f9f9', borderRadius: 8, border: '1px dashed #d9d9d9' }}>
            <Text style={{ fontSize: 16 }}>Số tiền cần thanh toán:</Text>
            <div style={{ fontSize: 32, fontWeight: 'bold', color: '#f5222d', margin: '10px 0' }}>
              {Number(amount).toLocaleString('vi-VN')} ₫
            </div>
            <div>Mã đơn hàng: <b>{bookingId}</b></div>
          </div>

          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Button 
              type="primary" 
              size="large" 
              block 
              style={{ height: 50, fontSize: 16, fontWeight: 'bold' }}
              onClick={() => handleSimulatePayment('success')}
              loading={loading}
            >
              XÁC NHẬN THANH TOÁN (MOCK)
            </Button>
            <Button size="large" block danger onClick={() => handleSimulatePayment('failed')} disabled={loading}>
              Hủy giao dịch
            </Button>
          </Space>
        </Card>
      </div>
    </ConfigProvider>
  );
};

export default MockPaymentPage;