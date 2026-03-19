import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button, Card, Descriptions, Empty, Space, Spin, Tag, Timeline, Typography, message } from 'antd';
import dayjs from 'dayjs';
import './styles/MyBookingDetailPage.css';

const { Title, Text } = Typography;
const API = 'http://localhost:5000/api/v1/bookings';

const statusMap: Record<string, { color: string; text: string }> = {
  pending: { color: 'warning', text: 'Chờ duyệt' },
  confirmed: { color: 'processing', text: 'Đã xác nhận' },
  cancelled: { color: 'error', text: 'Đã hủy' },
  paid: { color: 'success', text: 'Đã thanh toán' },
  deposit: { color: 'purple', text: 'Đã cọc' },
  refunded: { color: 'default', text: 'Hoàn tiền' }
};

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

const MyBookingDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['my-booking-detail', id],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return null;
      }

      try {
        const res = await axios.get(`${API}/me/${id}`, getAuthHeader());
        return res.data?.data || null;
      } catch (error: any) {
        const status = error?.response?.status;
        if (status === 403) {
          message.error('Bạn không có quyền xem booking này');
        } else if (status === 404) {
          message.error('Không tìm thấy booking');
        } else {
          message.error(error?.response?.data?.message || 'Không thể tải dữ liệu booking');
        }
        return null;
      }
    },
    enabled: !!id,
    retry: false
  });

  const booking = useMemo(() => data || null, [data]);

  if (isLoading) {
    return (
      <div className="my-booking-detail" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="my-booking-detail">
        <Empty description="Không có dữ liệu booking" />
      </div>
    );
  }

  const bookingStatus = statusMap[booking.status] || { color: 'default', text: booking.status || 'Không rõ' };
  const tourName = booking.tour_id?.name || 'Chi tiết booking';
  const tourThumb = Array.isArray(booking.tour_id?.images) && booking.tour_id.images.length > 0
    ? booking.tour_id.images[0]
    : '';
  const logs = Array.isArray(booking.logs) ? booking.logs : [];

  return (
    <div className="my-booking-detail">
      <Space className="my-booking-detail__actions">
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/my-bookings')}>
          Quay lại danh sách
        </Button>
        <Link to="/tours">
          <Button type="primary" className="my-booking-detail__cta">
            Xem thêm tour
          </Button>
        </Link>
      </Space>

      <Card className="my-booking-detail__card">
        <div className="my-booking-detail__header">
          {tourThumb ? (
            <img src={tourThumb} alt={tourName} className="my-booking-detail__thumb" />
          ) : (
            <div className="my-booking-detail__thumb" />
          )}
          <div>
            <Title level={3} className="my-booking-detail__title">
              {tourName}
            </Title>
            <div className="my-booking-detail__meta">
              <span className="my-booking-detail__meta-id">Mã: {booking._id}</span>
              <Tag color={bookingStatus.color} className="my-booking-detail__tag">
                {bookingStatus.text}
              </Tag>
            </div>
            <div className="my-booking-detail__meta-tour">
              Ngày đi: {booking.startDate ? dayjs(booking.startDate).format('DD/MM/YYYY') : '---'} · {booking.groupSize || 0} khách
            </div>
          </div>
        </div>

        <Descriptions bordered column={1} size="middle" className="my-booking-detail__desc">
          <Descriptions.Item label="Mã booking">{booking._id}</Descriptions.Item>
          <Descriptions.Item label="Tour đã đặt">{booking.tour_id?.name || '---'}</Descriptions.Item>
          <Descriptions.Item label="Ngày đi">
            {booking.startDate ? dayjs(booking.startDate).format('DD/MM/YYYY') : '---'}
          </Descriptions.Item>
          <Descriptions.Item label="Số người">{booking.groupSize || 0}</Descriptions.Item>
          <Descriptions.Item label="Tổng tiền">
            <Text strong type="danger" className="my-booking-detail__money">
              {(booking.total_price || 0).toLocaleString()} đ
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="Trạng thái">
            <Tag color={bookingStatus.color}>{bookingStatus.text}</Tag>
          </Descriptions.Item>
        </Descriptions>

        <Card title="Lịch sử trạng thái" className="my-booking-detail__history">
          {logs.length === 0 ? (
            <Empty description="Chưa có lịch sử xử lý" />
          ) : (
            <Timeline
              items={logs.map((log: any) => ({
                children: (
                  <div>
                    <div className="my-booking-detail__timeline-time">
                      {log.time || dayjs(log.created_at).format('DD/MM/YYYY HH:mm')}
                    </div>
                    <div className="my-booking-detail__timeline-user">{log.user || 'Hệ thống'}</div>
                    <div className="my-booking-detail__timeline-change">
                      {log.old || 'Khởi tạo'} -&gt; {log.new || 'Cập nhật'}
                    </div>
                    {log.note ? <div className="my-booking-detail__timeline-note">"{log.note}"</div> : null}
                  </div>
                )
              }))}
            />
          )}
        </Card>
      </Card>
    </div>
  );
};

export default MyBookingDetailPage;
