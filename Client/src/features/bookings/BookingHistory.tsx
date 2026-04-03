import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Breadcrumb, Button, Card, ConfigProvider, Spin, Timeline, Typography } from 'antd';
import { ArrowLeftOutlined, ClockCircleOutlined, HomeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { formatBookingLogValue } from './bookingLogLabels';

const { Title, Text } = Typography;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

const BookingHistory = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', id],
    queryFn: async () => {
      const res = await axios.get(`http://localhost:5000/api/v1/bookings/${id}`, getAuthHeader());
      return res.data?.data || res.data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        Không tìm thấy đơn đặt chỗ.
        <div style={{ marginTop: 16 }}>
          <Button onClick={() => navigate('/admin/bookings')}>Về danh sách đơn</Button>
        </div>
      </div>
    );
  }

  const logs = booking.logs || [];

  return (
    <ConfigProvider
      theme={{
        token: {
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          colorPrimary: '#0f172a',
          borderRadius: 6,
        },
        components: {
          Card: { headerBg: 'transparent', headerFontSize: 16 },
        },
      }}
    >
      <div style={{ padding: '24px 40px', backgroundColor: '#fff', minHeight: '100vh' }}>
        <div style={{ marginBottom: 24 }}>
          <Breadcrumb
            items={[
              { title: <Link to="/admin"><HomeOutlined /></Link> },
              { title: <Link to="/admin/bookings">Danh sách đơn</Link> },
              { title: <Link to={`/admin/bookings/${booking._id}`}>Chi tiết đơn</Link> },
              { title: 'Lịch sử xử lý' },
            ]}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(`/admin/bookings/${booking._id}`)}>
            Quay lại chi tiết
          </Button>
        </div>

        <Title level={3} style={{ marginBottom: 8 }}>
          <ClockCircleOutlined style={{ marginRight: 10 }} />
          Lịch sử xử lý
        </Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
          Khách hàng: {booking.customer_name || '—'} · Mã đơn: {booking._id}
        </Text>

        <Card bordered className="saas-card" style={{ maxWidth: 900 }}>
          {logs.length > 0 ? (
            <Timeline
              className="mt-4"
              items={logs.map((log: any, index: number) => ({
                color: index === 0 ? 'blue' : 'gray',
                children: (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 4 }}>
                      {log.time || dayjs(log.created_at).format('DD/MM/YYYY HH:mm')}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 15, color: '#111827', marginBottom: 6 }}>
                      {log.user || 'Hệ thống'}
                    </div>
                    <div style={{ color: '#374151', fontSize: 14 }}>
                      Thay đổi:{' '}
                      <span style={{ fontWeight: 600 }}>{formatBookingLogValue(log.old || 'Khởi tạo')}</span>
                      {' → '}
                      <span style={{ fontWeight: 600 }}>{formatBookingLogValue(log.new)}</span>
                    </div>
                    {log.note && (
                      <div
                        style={{
                          marginTop: 8,
                          fontStyle: 'italic',
                          color: '#6b7280',
                          backgroundColor: '#f9fafb',
                          padding: '6px 12px',
                          borderRadius: 6,
                          display: 'inline-block',
                        }}
                      >
                        &quot;{log.note}&quot;
                      </div>
                    )}
                  </div>
                ),
              }))}
            />
          ) : (
            <div className="text-center text-gray-400 py-8 italic">Chưa có lịch sử.</div>
          )}
        </Card>

        <style>{`
            .saas-card .ant-card-body { padding: 24px; }
            .saas-card { box-shadow: none !important; border: 1px solid #e5e7eb !important; }
            .ant-timeline-item-tail { border-inline-start: 2px solid #e5e7eb !important; }
        `}</style>
      </div>
    </ConfigProvider>
  );
};

export default BookingHistory;
