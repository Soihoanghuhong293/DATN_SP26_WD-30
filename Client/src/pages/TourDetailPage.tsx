import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spin, Empty, Button, Carousel, Tag, Divider, Space, message } from 'antd';
import { ArrowLeftOutlined, CalendarOutlined, DollarOutlined, CheckCircleOutlined, TeamOutlined } from '@ant-design/icons';
import { getTour } from '../services/api';
import { ITour } from '../types/tour.types';
import './styles/TourDetail.css';
import BookingForm from '../components/Client/BookingForm';

const TourDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tour, setTour] = useState<ITour | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBookingModalVisible, setIsBookingModalVisible] = useState(false);

  useEffect(() => {
    const fetchTourDetail = async () => {
      if (!id) {
        setError('Tour ID not found');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await getTour(id);
        
        // Handle different response structures
        if (data.data && typeof data.data === 'object') {
          if ('tour' in data.data) {
            setTour(data.data.tour);
          } else {
            setTour(data.data as ITour);
          }
        } else {
          setError('Could not load tour details');
        }
      } catch (err) {
        console.error('Error fetching tour detail:', err);
        setError('Failed to load tour details');
        message.error('Lỗi khi tải thông tin tour');
      } finally {
        setLoading(false);
      }
    };

    fetchTourDetail();
  }, [id]);

  const handleGoBack = () => {
    navigate('/tours');
  };

  if (loading) {
    return (
      <div className="tour-detail-loading">
        <Spin size="large" tip="Đang tải thông tin tour..." />
      </div>
    );
  }

  if (error || !tour) {
    return (
      <div className="tour-detail-error">
        <Empty
          description={error || 'Tour không tìm thấy'}
          style={{ marginTop: '40px' }}
        />
        <Button
          type="primary"
          icon={<ArrowLeftOutlined />}
          onClick={handleGoBack}
          style={{ marginTop: '20px' }}
        >
          Quay lại
        </Button>
      </div>
    );
  }

  return (
    <div className="tour-detail-page">
      {/* Header with Back Button */}
      <div className="tour-detail-header">
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={handleGoBack}
          className="back-btn"
        >
          Quay lại
        </Button>
        <h1 className="tour-detail-title">{tour.name}</h1>
        <Tag color={tour.status === 'active' ? 'green' : 'orange'}>{tour.status}</Tag>
      </div>

      {/* Image Gallery */}
      {tour.images && tour.images.length > 0 && (
        <div className="tour-detail-gallery">
          <Carousel autoplay>
            {tour.images.map((image, index) => (
              <div key={index} className="carousel-slide">
                <img
                  src={image}
                  alt={`${tour.name} - ${index + 1}`}
                  className="carousel-image"
                  onError={(e) => {
                    e.currentTarget.src = 'https://via.placeholder.com/800x400?text=Tour+Image';
                  }}
                />
              </div>
            ))}
          </Carousel>
        </div>
      )}

      <div className="tour-detail-container">
        <div>
          {/* Quick Info */}
          <div className="tour-detail-quick-info">
            <div className="info-card">
              <CalendarOutlined className="info-icon" />
              <div>
                <p className="info-label">Thời gian</p>
                <p className="info-value">{tour.duration_} ngày</p>
              </div>
            </div>

            <div className="info-card">
              <DollarOutlined className="info-icon" />
              <div>
                <p className="info-label">Giá từ</p>
                <p className="info-value">{tour.price?.toLocaleString()}đ</p>
              </div>
            </div>

            <div className="info-card">
              <TeamOutlined className="info-icon" />
              <div>
                <p className="info-label">Hướng dẫn viên</p>
                <p className="info-value">{tour.suppliers?.length || 0}</p>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="tour-detail-content">
          {/* Description */}
          <section className="detail-section">
            <h2 className="section-title">Mô tả tour</h2>
            <p className="section-content">{tour.description}</p>
          </section>

          <Divider />

          {/* Schedule */}
          {tour.schedule && tour.schedule.length > 0 && (
            <>
              <section className="detail-section">
                <h2 className="section-title">Lịch trình chi tiết</h2>
                <div className="schedule-timeline">
                  {tour.schedule.map((item, index) => (
                    <div key={index} className="schedule-item-detail">
                      <div className="schedule-day-badge">Ngày {item.day}</div>
                      <div className="schedule-item-content">
                        <h3 className="schedule-title">{item.title}</h3>
                        {item.activities && item.activities.length > 0 && (
                          <ul className="activities-list">
                            {item.activities.map((activity, actIndex) => (
                              <li key={actIndex}>
                                <CheckCircleOutlined className="activity-icon" />
                                {activity}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <Divider />
            </>
          )}

          {/* Pricing */}
          {tour.prices && tour.prices.length > 0 && (
            <>
              <section className="detail-section">
                <h2 className="section-title">Bảng giá</h2>
                <div className="pricing-table">
                  {tour.prices.map((tier, index) => (
                    <div key={index} className="pricing-row">
                      <span className="pricing-name">{tier.title || `Giá ${index + 1}`}</span>
                      <span className="pricing-amount">{tier.amount?.toLocaleString()}đ</span>
                      {tier.note && <span className="pricing-note">{tier.note}</span>}
                    </div>
                  ))}
                </div>
              </section>

              <Divider />
            </>
          )}

          {/* Policies */}
          {tour.policies && tour.policies.length > 0 && (
            <>
              <section className="detail-section">
                <h2 className="section-title">Chính sách & Quy định</h2>
                <ul className="policies-list">
                  {tour.policies.map((policy, index) => (
                    <li key={index}>
                      <CheckCircleOutlined className="policy-icon" />
                      {policy}
                    </li>
                  ))}
                </ul>
              </section>

              <Divider />
            </>
          )}

          {/* Suppliers/Guides */}
          {tour.suppliers && tour.suppliers.length > 0 && (
            <section className="detail-section">
              <h2 className="section-title">Nhà cung cấp / Hướng dẫn viên</h2>
              <div className="suppliers-list">
                {tour.suppliers.map((supplier, index) => (
                  <Tag key={index} color="blue">
                    {supplier}
                  </Tag>
                ))}
              </div>
            </section>
          )}
        </div>
        </div>

        {/* Sidebar */}
        <div className="tour-detail-sidebar">
          <div className="sidebar-card">
            <div className="sidebar-price">
              <span className="price-label">Giá tour từ</span>
              <span className="price-value">{tour.price?.toLocaleString()}đ</span>
            </div>
            <Button
              type="primary"
              size="large"
              block
              className="booking-btn"
              style={{ marginTop: '16px' }}
              onClick={() => setIsBookingModalVisible(true)}
            >
              Đặt tour ngay
            </Button>
            <Button
              type="default"
              size="large"
              block
              style={{ marginTop: '12px' }}
            >
              Liên hệ tư vấn
            </Button>
          </div>

          <div className="sidebar-card">
            <h3 className="sidebar-title">Thông tin quan trọng</h3>
            <div className="important-info">
              <div className="info-row">
                <span className="info-label">Thời lượng:</span>
                <span className="info-text">{tour.duration_} ngày</span>
              </div>
              <div className="info-row">
                <span className="info-label">Trạng thái:</span>
                <span className="info-text">
                  <Tag
                    color={tour.status === 'active' ? 'green' : tour.status === 'draft' ? 'orange' : 'red'}
                  >
                    {tour.status}
                  </Tag>
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Ngày tạo:</span>
                <span className="info-text">
                  {new Date(tour.created_at).toLocaleDateString('vi-VN')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <BookingForm
        visible={isBookingModalVisible}
        onClose={() => setIsBookingModalVisible(false)}
        tourId={id!}
      />
    </div>
  );
};

export default TourDetailPage;
