import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { ITour } from '../../types/tour.types';
import '../styles/TourCard.css';
import { tourImagePlaceholder } from '../../constants/tourImagePlaceholder';

interface TourCardProps {
  tour: ITour;
}

const TourCard: React.FC<TourCardProps> = ({ tour }) => {
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = tourImagePlaceholder(300, 200, 'Không ảnh');
  };

  const durationDays = tour.duration_days ?? tour.duration_;
  const scheduleItems = Array.isArray(tour.schedule) ? tour.schedule : [];

  return (
    <Link to={`/tours/${tour.id}`} className="tour-card-link">
      <div className="tour-card">
        <div className="tour-card-image-container">
          <img
            src={tour.images?.[0] || tourImagePlaceholder(300, 200, 'Ảnh tour')}
            alt={tour.name || 'Tour'}
            className="tour-card-image"
            onError={handleImageError}
          />
        </div>

        <div className="tour-card-content">
          <h3 className="tour-card-title">{tour.name}</h3>

           <div className="tour-card-meta">
             <span className="tour-meta-duration">{durationDays ?? '-'} ngày</span>
           </div>

          <p className="tour-card-description">{tour.description || 'Đang cập nhật mô tả tour.'}</p>

          <div className="tour-card-info">
            <div className="info-item">
              <CalendarOutlined className="info-icon" />
              <span>{durationDays ?? '-'} ngày</span>
            </div>
            <div className="info-item">
              <EnvironmentOutlined className="info-icon" />
              <span>Điểm tham quan</span>
            </div>
          </div>

          <div className="tour-card-schedule">
            <div>
              <p className="schedule-title">Lịch trình:</p>
              {scheduleItems.length > 0 ? (
                <>
                  {scheduleItems.slice(0, 2).map((item, index) => (
                    <div key={index} className="schedule-item">
                      <span className="day-badge">Ngày {item.day}</span>
                      <span className="day-title">{item.title}</span>
                    </div>
                  ))}
                  {scheduleItems.length > 2 && (
                    <p className="more-days">+{scheduleItems.length - 2} ngày khác</p>
                  )}
                </>
              ) : (
                <p className="schedule-empty">Chưa cập nhật lịch trình</p>
              )}
            </div>
          </div>

          <div className="tour-card-footer">
            <div className="tour-card-price">
              <span className="price-label">Từ</span>
              <span className="price-amount">{tour.price?.toLocaleString()}đ</span>
            </div>
            <button className="tour-card-btn">Xem Chi Tiết</button>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default TourCard;
