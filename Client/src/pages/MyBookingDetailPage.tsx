import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button, Card, Descriptions, Empty, Space, Spin, Tag, Timeline, Typography, message } from 'antd';
import dayjs from 'dayjs';

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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div style={{ maxWidth: 1000, margin: '24px auto', padding: '0 16px' }}>
        <Empty description="Không có dữ liệu booking" />
      </div>
    );
  }

  const bookingStatus = statusMap[booking.status] || { color: 'default', text: booking.status || 'Không rõ' };
  const logs = Array.isArray(booking.logs) ? booking.logs : [];

  return (
    <div style={{ maxWidth: 1000, margin: '24px auto', padding: '0 16px' }}>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/my-bookings')}>
          Quay lại danh sách
        </Button>
        <Link to="/tours">
          <Button type="link">Xem thêm tour</Button>
        </Link>
      </Space>

      <Card>
        <Title level={3} style={{ marginTop: 0 }}>
          {booking.tour_id?.name || 'Chi tiết booking'}
        </Title>

        <Descriptions bordered column={1} size="middle">
          <Descriptions.Item label="Mã booking">{booking._id}</Descriptions.Item>
          <Descriptions.Item label="Tour đã đặt">{booking.tour_id?.name || '---'}</Descriptions.Item>
          <Descriptions.Item label="Ngày đi">
            {booking.startDate ? dayjs(booking.startDate).format('DD/MM/YYYY') : '---'}
          </Descriptions.Item>
          <Descriptions.Item label="Số người">{booking.groupSize || 0}</Descriptions.Item>
          <Descriptions.Item label="Tổng tiền">
            <Text strong type="danger">{(booking.total_price || 0).toLocaleString()} đ</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Trạng thái">
            <Tag color={bookingStatus.color}>{bookingStatus.text}</Tag>
          </Descriptions.Item>
        </Descriptions>

        <Card title="Lịch sử trạng thái" style={{ marginTop: 20 }}>
          {logs.length === 0 ? (
            <Empty description="Chưa có lịch sử xử lý" />
          ) : (
            <Timeline
              items={logs.map((log: any) => ({
                children: (
                  <div>
                    <div>{log.time || dayjs(log.created_at).format('DD/MM/YYYY HH:mm')}</div>
                    <Text strong>{log.user || 'Hệ thống'}</Text>
                    <div>
                      {log.old || 'Khởi tạo'} -&gt; {log.new || 'Cập nhật'}
                    </div>
                    {log.note ? <Text type="secondary">"{log.note}"</Text> : null}
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
