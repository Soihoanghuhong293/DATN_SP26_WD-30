import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Typography, Button, Spin, message } from 'antd';
import axios from 'axios';

const { Title, Text } = Typography;

const BookingPaymentPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const fetchBooking = async () => {
      if (!id) return;
      try {
        const res = await axios.get(`http://localhost:5000/api/v1/bookings/${id}`);
        setBooking(res.data.data || res.data);
      } catch (error) {
        message.error('Không tìm thấy thông tin đơn hàng để thanh toán.');
      } finally {
        setLoading(false);
      }
    };
    fetchBooking();
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div style={{ textAlign: 'center', marginTop: 100 }}>
        Không tìm thấy đơn hàng.
      </div>
    );
  }

  const totalPrice = booking.total_price || booking.totalPrice || 0;
  const isDeposit = booking.paymentMethod === 'deposit';
  const paymentAmount = isDeposit ? Math.round(totalPrice * 0.3) : totalPrice;

  const handleConfirmScanned = async () => {
    if (!id) return;
    setProcessing(true);
    try {
      const res = await axios.post(`http://localhost:5000/api/v1/bookings/${id}/payments/momo`, {
        amount: paymentAmount,
        orderInfo: `Thanh toán ${isDeposit ? 'cọc' : 'toàn bộ'} tour ${booking.tour_id?.name}`,
        pay_type: isDeposit ? 'deposit' : 'full',
      });

      if (res.data?.status === 'success') {
        message.success('Thanh toán giả lập thành công!');
        navigate(`/booking/success/${id}`);
      } else {
        message.error(res.data?.message || 'Không nhận được phản hồi hợp lệ từ API thanh toán');
      }
    } catch (error) {
      message.error('Lỗi khi xác nhận thanh toán. Vui lòng thử lại sau.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div style={{ padding: '40px 20px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <Card
        style={{
          maxWidth: 600,
          margin: '0 auto',
          borderRadius: 12,
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          textAlign: 'center',
        }}
      >
        <Title level={3} style={{ marginBottom: 8 }}>
          Thanh toán MoMo (giả lập)
        </Title>
        <Text type="secondary">
          Vui lòng quét mã QR bên dưới bằng ứng dụng MoMo (mô phỏng), sau đó nhấn "Xác nhận đã quét".
        </Text>

        <div
          style={{
            width: 260,
            height: 260,
            margin: '24px auto 16px',
            borderRadius: 16,
            border: '1px dashed #d9d9d9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background:
              'repeating-linear-gradient(45deg, #fafafa, #fafafa 10px, #f0f0f0 10px, #f0f0f0 20px)',
          }}
        >
          <span style={{ fontSize: 16, color: '#999' }}>QR MoMo mô phỏng</span>
        </div>

        <div style={{ marginBottom: 24 }}>
          <Text>Số tiền:&nbsp;</Text>
          <Text strong type="danger" style={{ fontSize: 20 }}>
            {paymentAmount.toLocaleString()} ₫
          </Text>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
          <Button onClick={() => navigate(-1)} size="large">
            Quay lại
          </Button>
          <Button
            type="primary"
            size="large"
            onClick={handleConfirmScanned}
            loading={processing}
          >
            Xác nhận đã quét
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default BookingPaymentPage;

