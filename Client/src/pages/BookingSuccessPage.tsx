import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card, Button, Typography, Descriptions, Divider, Spin, message, Result, Tag, Space, ConfigProvider, Modal, Radio } from 'antd';
import { CalendarOutlined, CheckCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text } = Typography;

const getPaymentStatusInfo = (booking: any) => {
  const paymentStatus = booking?.payment_status
    || (booking?.status === 'paid' ? 'paid'
      : booking?.status === 'deposit' ? 'deposit'
      : booking?.status === 'refunded' ? 'refunded'
      : 'unpaid');

  if (paymentStatus === 'paid') return { color: 'green', label: 'Đã thanh toán đủ' };
  if (paymentStatus === 'deposit') return { color: 'orange', label: 'Đã đặt cọc' };
  if (paymentStatus === 'refunded') return { color: 'default', label: 'Đã hoàn tiền' };
  return { color: 'blue', label: 'Chưa thanh toán' };
};

const getBookingStatusInfo = (booking: any) => {
  const status = ['pending', 'confirmed', 'cancelled'].includes(booking?.status) ? booking.status : 'confirmed';
  if (status === 'pending') return { color: 'gold', label: 'Chờ xử lý' };
  if (status === 'cancelled') return { color: 'red', label: 'Đã hủy' };
  return { color: 'green', label: 'Đã xác nhận' };
};

const BookingSuccessPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [paymentGateway, setPaymentGateway] = useState('momo');

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
  const paymentMethod = booking.paymentMethod || 'full';
  const isDeposit = paymentMethod === 'deposit';
  const isLater = paymentMethod === 'later';
  const paymentAmount = isLater ? 0 : (isDeposit ? Math.round(totalPrice * 0.3) : totalPrice);
  const remainingAmount = isDeposit ? Math.max(0, totalPrice - paymentAmount) : 0;
  const paymentStatusInfo = getPaymentStatusInfo(booking);
  const bookingStatusInfo = getBookingStatusInfo(booking);

  const handleGoToPaymentPage = () => {
    setIsModalOpen(false);
    if (paymentGateway !== 'momo') {
      message.info('Hiện tại chỉ hỗ trợ mô phỏng thanh toán qua MoMo.');
      return;
    }
    if (!id) {
      message.error('Thiếu mã booking để chuyển trang thanh toán.');
      return;
    }
    navigate(`/booking/payment/${id}`);
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
            <Descriptions.Item label="Trạng thái đơn">
                <Tag color={bookingStatusInfo.color}>
                   {bookingStatusInfo.label}
                </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái thanh toán">
                <Tag color={paymentStatusInfo.color}>
                   {paymentStatusInfo.label}
                </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Phương thức">
                <Tag color={isLater ? 'default' : (isDeposit ? 'orange' : 'blue')}>
                   {isLater ? 'Thanh toán sau' : (isDeposit ? 'Đặt cọc trước (30%)' : 'Thanh toán toàn bộ (100%)')}
                </Tag>
            </Descriptions.Item>
          </Descriptions>

          <div style={{ marginTop: 24, padding: 24, background: '#f9f9f9', borderRadius: 8, textAlign: 'right', border: '1px solid #f0f0f0' }}>
             <Text style={{ fontSize: 16 }}>Số tiền cần thanh toán ngay:</Text>
             <div style={{ fontSize: 32, fontWeight: 'bold', color: '#ff4d4f', margin: '4px 0 16px' }}>
                {paymentAmount.toLocaleString()} ₫
             </div>

             {isDeposit && (
               <div style={{ marginTop: -8, marginBottom: 16 }}>
                 <Text type="secondary">
                   Số tiền còn lại cần thanh toán sau: <b>{remainingAmount.toLocaleString()} ₫</b>
                 </Text>
               </div>
             )}
             
             <Space size="middle">
               <Button size="large" onClick={() => navigate('/')}>Về trang chủ</Button>
               <Button
                 type="primary"
                 size="large"
                 onClick={() => setIsModalOpen(true)}
                 disabled={isLater || paymentAmount <= 0}
                 style={{ height: 48, padding: '0 40px', fontSize: 16, fontWeight: 600 }}
               >
                 THANH TOÁN NGAY
               </Button>
             </Space>
          </div>

          <Modal
            title="Chọn phương thức thanh toán"
            open={isModalOpen}
            onOk={handleGoToPaymentPage}
            onCancel={() => setIsModalOpen(false)}
            okText="Tiếp tục"
            cancelText="Đóng"
            okButtonProps={{ disabled: isLater || paymentAmount <= 0 }}
          >
            <div style={{ marginBottom: 16 }}>
              <Text>Số tiền cần thanh toán: </Text>
              <Text type="danger" strong style={{ fontSize: 18 }}>{paymentAmount.toLocaleString()} ₫</Text>
            </div>
            
            <Radio.Group onChange={(e) => setPaymentGateway(e.target.value)} value={paymentGateway} style={{ width: '100%' }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Radio value="momo" style={{ border: '1px solid #d9d9d9', borderRadius: 8, padding: 12, width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', fontWeight: 500 }}>
                     <span style={{ color: '#a50064', marginRight: 8, fontWeight: 'bold' }}>MoMo</span> Ví điện tử MoMo
                  </div>
                </Radio>
                <Radio value="vnpay" disabled style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 12, width: '100%', background: '#fafafa' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#999' }}>
                     <span>VNPAY (Đang bảo trì)</span>
                  </div>
                </Radio>
              </Space>
            </Radio.Group>
          </Modal>
        </Card>
      </div>
    </ConfigProvider>
  );
};

export default BookingSuccessPage;