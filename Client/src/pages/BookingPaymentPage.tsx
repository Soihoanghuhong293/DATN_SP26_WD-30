import React, { useEffect, useMemo, useState } from 'react';
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

  // IMPORTANT: hooks must not be conditional. Compute derived values safely even when booking is null.
  const totalPrice = booking?.total_price || booking?.totalPrice || 0;
  const paymentMethod = booking?.paymentMethod || 'full';
  const paymentStatus =
    booking?.payment_status
      || (booking?.status === 'paid' ? 'paid'
        : booking?.status === 'deposit' ? 'deposit'
        : booking?.status === 'refunded' ? 'refunded'
        : 'unpaid');

  const breakdown = useMemo(() => {
    const total = Number(totalPrice || 0);
    const depositAmount = Number(booking?.deposit_amount || Math.round(total * 0.3));
    const remaining = Math.max(0, total - depositAmount);

    if (paymentStatus === 'paid') return { payType: 'full' as const, amount: 0, label: 'Đã thanh toán đủ' };
    if (paymentStatus === 'deposit') return { payType: 'remaining' as const, amount: remaining, label: 'Thanh toán phần còn lại' };
    if (paymentMethod === 'deposit') return { payType: 'deposit' as const, amount: depositAmount, label: 'Thanh toán đặt cọc (30%)' };
    return { payType: 'full' as const, amount: total, label: 'Thanh toán toàn bộ (100%)' };
  }, [booking?.deposit_amount, paymentMethod, paymentStatus, totalPrice]);

  const paymentAmountRaw = Number((breakdown as any)?.amount);
  const paymentAmount = Number.isFinite(paymentAmountRaw) ? paymentAmountRaw : 0;

  const handleConfirmScanned = async () => {
    if (!id) return;
    setProcessing(true);
    try {
      if (paymentStatus === 'paid' || paymentAmount <= 0) {
        message.info('Đơn hàng đã thanh toán hoặc không còn số tiền cần thanh toán.');
        navigate(`/booking/success/${id}`);
        return;
      }

      const res = await axios.post(`http://localhost:5000/api/v1/bookings/${id}/payments/momo`, {
        // Backend sẽ tự tính tiền dựa theo booking (không tin amount từ client)
        orderInfo: `${String((breakdown as any)?.label || 'Thanh toán')} tour ${booking.tour_id?.name || ''}`.trim(),
        pay_type: (breakdown as any)?.payType || 'full',
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

        <div style={{ marginTop: 12 }}>
          <Text type="secondary">
            Hình thức: <b>{breakdown.label}</b>
          </Text>
        </div>

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
            {paymentAmount.toLocaleString('vi-VN')} ₫
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
            disabled={paymentStatus === 'paid' || paymentAmount <= 0}
          >
            Xác nhận đã quét
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default BookingPaymentPage;

