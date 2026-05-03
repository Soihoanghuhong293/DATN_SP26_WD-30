import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Modal,
  Radio,
  Result,
  Row,
  Space,
  Spin,
  Steps,
  Tag,
  Typography,
  message,
} from 'antd';
import { ArrowLeftOutlined, CalendarOutlined, CheckCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { tourImagePlaceholder } from '../constants/tourImagePlaceholder';

const { Title, Text } = Typography;

const RAW_BASE = ((import.meta.env?.VITE_API_URL as string | undefined) || '').replace(/\/$/, '');
const API_V1 = RAW_BASE
  ? RAW_BASE.endsWith('/api/v1')
    ? RAW_BASE
    : `${RAW_BASE}/api/v1`
  : 'http://localhost:5000/api/v1';

const getPaymentStatusInfo = (booking: any) => {
  const paymentStatus =
    booking?.payment_status ||
    (booking?.status === 'paid'
      ? 'paid'
      : booking?.status === 'deposit'
        ? 'deposit'
        : booking?.status === 'refunded'
          ? 'refunded'
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
  const [searchParams] = useSearchParams();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [paymentGateway, setPaymentGateway] = useState<'bank' | 'momo'>('bank');

  useEffect(() => {
    let cancelled = false;
    const fetchBooking = async () => {
      try {
        const res = await axios.get(`${API_V1}/bookings/${id}`);
        if (!cancelled) setBooking(res.data.data || res.data);
      } catch (error) {
        message.error('Không tìm thấy thông tin đơn hàng');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (id) fetchBooking();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        <Spin size="large" spinning tip="Đang tải thông tin đơn hàng...">
          <div style={{ minHeight: 240 }} />
        </Spin>
      </div>
    );
  }
  if (!booking) {
    return (
      <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        <Result
          status="error"
          title="Không tìm thấy đơn hàng."
          extra={[
            <Button key="back" type="primary" onClick={() => navigate('/tours')}>
              Quay lại
            </Button>,
          ]}
        />
      </div>
    );
  }

  const totalPrice = booking.total_price || booking.totalPrice || 0;
  const paymentStatus =
    booking?.payment_status ||
    (booking?.status === 'paid'
      ? 'paid'
      : booking?.status === 'deposit'
        ? 'deposit'
        : booking?.status === 'refunded'
          ? 'refunded'
          : 'unpaid');
  const paymentMethod = booking.paymentMethod || 'full';
  const isDeposit = paymentMethod === 'deposit';
  const isLater = paymentMethod === 'later';
  const isPaid = paymentStatus === 'paid';
  const isDeposited = paymentStatus === 'deposit';
  const totalNum = Number(totalPrice || 0);
  const estimate30 = totalNum > 0 ? Math.round(totalNum * 0.3) : 0;
  const depField = Number(booking?.deposit_amount || 0);
  const paidSoFar = Number(booking?.paid_amount || 0);
  let credited = Math.max(Number.isFinite(paidSoFar) ? paidSoFar : 0, Number.isFinite(depField) ? depField : 0);
  if (isDeposited && !credited && totalNum > 0) credited = estimate30;

  const depositAmount = isPaid ? totalNum : credited > 0 ? credited : isDeposit ? (depField > 0 ? depField : estimate30) : 0;
  const remainingAmount = Math.max(0, totalNum - (isPaid ? totalNum : credited));
  const paymentAmount = isLater ? 0 : isPaid ? 0 : isDeposited ? remainingAmount : isDeposit ? depositAmount : totalNum;

  const paymentStatusInfo = getPaymentStatusInfo(booking);
  const bookingStatusInfo = getBookingStatusInfo(booking);

  const tourInfo = booking?.tour_id && typeof booking.tour_id === 'object' ? booking.tour_id : null;
  const tourName = tourInfo?.name || booking?.tour_name || booking?.tourName || '---';
  const tourCode = tourInfo?.code || booking?.tour_code || booking?.tourCode || tourInfo?._id || tourInfo?.id || '';
  const tourImage = tourInfo?.images?.[0] || booking?.tour_image || booking?.tourImage || '';

  const paymentJustSucceeded = String(searchParams.get('payment') || '').toLowerCase() === 'success';
  const gatewayLabel = String(searchParams.get('gateway') || '').toLowerCase();

  const handleGoToPaymentPage = () => {
    setIsModalOpen(false);
    if (isLater) {
      message.info('Bạn đã chọn "Thanh toán sau". Bạn có thể quay lại để xem thông tin đơn hàng.');
      return;
    }
    if (isPaid) {
      message.success('Đơn hàng đã thanh toán đủ.');
      return;
    }
    if (!id) {
      message.error('Thiếu mã booking để chuyển trang thanh toán.');
      return;
    }
    navigate(`/booking/payment/${id}?gateway=${encodeURIComponent(paymentGateway)}`);
  };

  const paidTotalDisplay = isPaid ? totalNum : paymentAmount;
  const paidColor = isPaid ? '#16a34a' : '#ff4d4f';

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => {
            if (window.history.length > 1) navigate(-1);
            else navigate('/my-bookings');
          }}
        >
          Quay lại
        </Button>
        <div />
      </div>

      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <Title level={2} style={{ marginBottom: 6 }}>
          ĐẶT TOUR
        </Title>
        <Text type="secondary">Hoàn tất thông tin để đặt tour nhanh chóng</Text>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
        <Steps current={2} items={[{ title: 'Nhập thông tin' }, { title: 'Thanh toán' }, { title: 'Hoàn tất' }]} style={{ maxWidth: 700, width: '100%' }} />
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card style={{ borderRadius: 12 }}>
            {isPaid && paymentJustSucceeded && (
              <Alert
                type="success"
                showIcon
                message="Thanh toán đã được ghi nhận"
                description={
                  gatewayLabel
                    ? `Cổng thanh toán: ${gatewayLabel === 'momo' ? 'MoMo' : 'Chuyển khoản ngân hàng'}`
                    : 'Cảm ơn bạn! Đơn hàng đã được cập nhật trạng thái thanh toán.'
                }
                style={{ marginBottom: 16 }}
              />
            )}

            <Result
              status="success"
              title={isPaid ? 'Thanh toán thành công!' : 'Đặt tour thành công!'}
              subTitle={
                isPaid
                  ? 'Đơn hàng đã được thanh toán đầy đủ. Cảm ơn bạn!'
                  : isLater
                    ? 'Bạn đã chọn thanh toán sau. Hãy lưu mã booking để thanh toán/đối soát sau.'
                    : isDeposited
                      ? 'Bạn đã đặt cọc. Vui lòng thanh toán phần còn lại để hoàn tất booking.'
                      : 'Vui lòng kiểm tra lại thông tin và tiến hành thanh toán để hoàn tất booking.'
              }
            />

            <Divider orientation="left" style={{ borderColor: '#d9d9d9' }}>
              <CheckCircleOutlined /> Thông tin đơn hàng
            </Divider>

            <Descriptions bordered column={1} labelStyle={{ width: '180px', fontWeight: 600 }}>
              <Descriptions.Item label="Mã Booking">
                <Text copyable>{booking._id}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Tour">{tourName}</Descriptions.Item>
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
                <Text>{Number(totalPrice || 0).toLocaleString('vi-VN')} ₫</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái đơn">
                <Tag color={bookingStatusInfo.color}>{bookingStatusInfo.label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái thanh toán">
                <Tag color={paymentStatusInfo.color}>{paymentStatusInfo.label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Phương thức">
                <Tag color={isLater ? 'default' : isDeposit ? 'orange' : 'blue'}>
                  {isLater ? 'Thanh toán sau' : isDeposit ? 'Đặt cọc trước (30%)' : 'Thanh toán toàn bộ (100%)'}
                </Tag>
              </Descriptions.Item>
            </Descriptions>

            <div style={{ marginTop: 24, padding: 24, background: '#f9f9f9', borderRadius: 8, textAlign: 'right', border: '1px solid #f0f0f0' }}>
              <Text style={{ fontSize: 16 }}>{isPaid ? 'Tổng đã thanh toán:' : 'Số tiền cần thanh toán ngay:'}</Text>
              <div style={{ fontSize: 32, fontWeight: 'bold', color: paidColor, margin: '4px 0 16px' }}>
                {Number(paidTotalDisplay || 0).toLocaleString('vi-VN')} ₫
              </div>

              {(isDeposit || isDeposited) && !isPaid && (
                <div style={{ marginTop: -8, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <Text type="secondary">
                    Đã đặt cọc: <b>{Number(depositAmount || 0).toLocaleString('vi-VN')} ₫</b>
                  </Text>
                  <Text type="secondary">
                    Còn lại: <b>{Number(remainingAmount || 0).toLocaleString('vi-VN')} ₫</b>
                  </Text>
                </div>
              )}

              {isPaid && (
                <div style={{ marginTop: -8, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <Text type="secondary">
                    Đã thanh toán: <b>{Number(booking?.paid_amount || totalNum || 0).toLocaleString('vi-VN')} ₫</b>
                  </Text>
                  <Text type="secondary">
                    Còn lại: <b>0 ₫</b>
                  </Text>
                </div>
              )}

              <Space size="middle">
                <Button size="large" onClick={() => navigate('/')}>
                  Về trang chủ
                </Button>
                <Button
                  type="primary"
                  size="large"
                  onClick={() => {
                    if (isLater || isPaid) return;
                    setIsModalOpen(true);
                  }}
                  disabled={paymentAmount <= 0 || isPaid}
                  style={{ height: 48, padding: '0 40px', fontSize: 16, fontWeight: 600 }}
                >
                  {isPaid ? 'ĐÃ THANH TOÁN' : isLater ? 'XEM ĐƠN HÀNG' : isDeposited ? 'THANH TOÁN PHẦN CÒN LẠI' : 'THANH TOÁN NGAY'}
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
              okButtonProps={{ disabled: isLater || paymentAmount <= 0 || isPaid }}
            >
              <div style={{ marginBottom: 16 }}>
                <Text>Số tiền cần thanh toán: </Text>
                <Text type="danger" strong style={{ fontSize: 18 }}>
                  {Number(paymentAmount || 0).toLocaleString('vi-VN')} ₫
                </Text>
              </div>

              <Radio.Group onChange={(e) => setPaymentGateway(e.target.value)} value={paymentGateway} style={{ width: '100%' }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Radio value="bank" style={{ border: '1px solid #d9d9d9', borderRadius: 8, padding: 12, width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', fontWeight: 500 }}>
                      <span style={{ color: '#096dd9', marginRight: 8, fontWeight: 'bold' }}>CK</span> Chuyển khoản ngân hàng (QR)
                    </div>
                  </Radio>
                  <Radio value="momo" style={{ border: '1px solid #d9d9d9', borderRadius: 8, padding: 12, width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', fontWeight: 500 }}>
                      <span style={{ color: '#a50064', marginRight: 8, fontWeight: 'bold' }}>MoMo</span> Ví điện tử MoMo (giả lập dev)
                    </div>
                  </Radio>
                </Space>
              </Radio.Group>
            </Modal>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card style={{ borderRadius: 12 }}>
            <Title level={4} style={{ marginBottom: 12 }}>
              Tóm tắt chuyến đi
            </Title>

            <div style={{ display: 'flex', gap: 12 }}>
              <img
                src={tourImage || tourImagePlaceholder(120, 80)}
                alt={tourName || 'tour'}
                style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 10 }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = tourImagePlaceholder(120, 80);
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontWeight: 700, display: 'block' }} ellipsis={{ tooltip: tourName }}>
                  {tourName}
                </Text>
                <Text type="secondary" style={{ display: 'block' }}>
                  Mã tour: {tourCode || '---'}
                </Text>
              </div>
            </div>

            <Divider />

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text>Ngày khởi hành</Text>
              <Text style={{ fontWeight: 700 }}>{booking?.startDate ? dayjs(booking.startDate).format('DD/MM/YYYY') : '---'}</Text>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text>Số khách</Text>
              <Text style={{ fontWeight: 700 }}>{Number(booking?.groupSize || 0) || '---'}</Text>
            </div>

            <Divider style={{ margin: '12px 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text>Trạng thái đơn</Text>
              <Tag color={bookingStatusInfo.color} style={{ marginInlineEnd: 0 }}>
                {bookingStatusInfo.label}
              </Tag>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text>Thanh toán</Text>
              <Tag color={paymentStatusInfo.color} style={{ marginInlineEnd: 0 }}>
                {paymentStatusInfo.label}
              </Tag>
            </div>

            <Divider style={{ margin: '12px 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Title level={5} style={{ margin: 0 }}>
                Tổng tiền
              </Title>
              <Title level={4} style={{ margin: 0, color: '#f5222d' }}>
                {Number(totalPrice || 0).toLocaleString('vi-VN')}đ
              </Title>
            </div>

            <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
              <Button block size="large" onClick={() => navigate('/my-bookings')}>
                Xem đơn của tôi
              </Button>
              <Button
                block
                type="primary"
                size="large"
                onClick={() => {
                  if (!tourInfo?._id && !tourInfo?.id) return navigate('/tours');
                  navigate(`/tours/${tourInfo?._id || tourInfo?.id}`);
                }}
              >
                Xem tour
              </Button>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default BookingSuccessPage;