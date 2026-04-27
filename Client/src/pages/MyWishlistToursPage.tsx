import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button, Card, Empty, message, Popconfirm, Row, Col, Space, Spin, Tag, Typography } from 'antd';
import { HeartFilled, ArrowRightOutlined } from '@ant-design/icons';
import { getMyWishlistTours, removeWishlistTour } from '../services/api';

type WishlistItem = {
  _id: string;
  tour_id: any;
  created_at?: string;
};

const MyWishlistToursPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      message.info('Vui lòng đăng nhập để xem tour yêu thích');
      navigate('/login');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await getMyWishlistTours();
        const data = (res as any)?.data || [];
        if (!cancelled) setItems(Array.isArray(data) ? data : []);
      } catch (err: any) {
        message.error(err?.response?.data?.message || 'Không thể tải danh sách yêu thích');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const handleRemove = async (tourId: string) => {
    try {
      setRemovingId(tourId);
      await removeWishlistTour(tourId);
      setItems((prev) => prev.filter((x) => String((x as any)?.tour_id?._id || (x as any)?.tour_id) !== String(tourId)));
      message.success('Đã xoá khỏi danh sách yêu thích');
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Không thể xoá yêu thích');
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
        <Card style={{ borderRadius: 14 }}>
          <Space align="center" size={12}>
            <Spin />
            <div>
              <Typography.Title level={4} style={{ margin: 0 }}>
                Tour yêu thích
              </Typography.Title>
              <Typography.Text type="secondary">Đang tải dữ liệu...</Typography.Text>
            </div>
          </Space>
        </Card>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
        <Card style={{ borderRadius: 14 }}>
          <Empty description="Chưa có tour yêu thích">
            <Button type="primary" onClick={() => navigate('/tours')} icon={<ArrowRightOutlined />}>
              Khám phá tour
            </Button>
          </Empty>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <Card style={{ borderRadius: 14, marginBottom: 16 }} bodyStyle={{ padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <Typography.Title level={3} style={{ margin: 0 }}>
              Tour yêu thích
            </Typography.Title>
            <Typography.Text type="secondary">
              Bạn có <b>{items.length}</b> tour đã lưu. Bạn có thể bỏ yêu thích hoặc xem chi tiết tour.
            </Typography.Text>
          </div>

          <Space>
            <Button onClick={() => navigate('/tours')} icon={<ArrowRightOutlined />}>
              Tiếp tục khám phá
            </Button>
          </Space>
        </div>
      </Card>

      <Row gutter={[16, 16]}>
        {items.map((item) => {
          const tour = (item as any)?.tour_id;
          const tourId = String(tour?._id || tour?.id || tour);
          const img = Array.isArray(tour?.images) && tour.images.length ? tour.images[0] : undefined;
          const price = Number(tour?.price ?? 0);
          const duration = tour?.duration_days ?? tour?.duration_ ?? null;

          return (
            <Col key={item._id} xs={24} sm={12} md={8}>
              <Card
                hoverable
                style={{ borderRadius: 14, overflow: 'hidden' }}
                bodyStyle={{ padding: 14 }}
                cover={
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/tours/${tourId}`)}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(`/tours/${tourId}`)}
                    style={{
                      height: 180,
                      background: img ? `url(${img}) center/cover no-repeat` : 'linear-gradient(135deg,#e2e8f0,#f8fafc)',
                      cursor: 'pointer',
                      position: 'relative',
                    }}
                  >
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(0,0,0,0) 40%, rgba(0,0,0,0.55) 100%)' }} />
                    <div style={{ position: 'absolute', left: 12, bottom: 12, right: 12 }}>
                      <Typography.Text style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>
                        {tour?.name || 'Tour'}
                      </Typography.Text>
                    </div>
                  </div>
                }
                actions={[
                  <Button key="detail" type="link" onClick={() => navigate(`/tours/${tourId}`)}>
                    Xem chi tiết
                  </Button>,
                  <Popconfirm
                    key="remove"
                    title="Bỏ yêu thích tour này?"
                    okText="Bỏ"
                    cancelText="Huỷ"
                    onConfirm={() => handleRemove(tourId)}
                  >
                    <Button
                      type="text"
                      danger
                      icon={<HeartFilled style={{ color: '#ef4444' }} />}
                      loading={removingId === tourId}
                    >
                      Bỏ yêu thích
                    </Button>
                  </Popconfirm>,
                ]}
              >
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <Space size={8} wrap>
                      <Tag color="blue">{duration ? `${duration} ngày` : 'Chưa cập nhật'}</Tag>
                    </Space>
                    <Typography.Text style={{ fontWeight: 900, color: '#dc2626' }}>
                      {price ? `${price.toLocaleString('vi-VN')}đ` : 'Liên hệ'}
                    </Typography.Text>
                  </div>

                  <Typography.Text type="secondary">
                    Nhấn vào ảnh để mở tour hoặc dùng nút “Xem chi tiết”.
                  </Typography.Text>
                </Space>
              </Card>
            </Col>
          );
        })}
      </Row>
    </div>
  );
};

export default MyWishlistToursPage;

