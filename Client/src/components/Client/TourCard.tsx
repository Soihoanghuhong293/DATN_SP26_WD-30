import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { ITour } from '../../types/tour.types';
import '../styles/TourCard.css';

interface TourCardProps {
  tour: ITour;
}

const TourCard: React.FC<TourCardProps> = ({ tour }) => {
  const statusLabelMap: Record<string, string> = {
    active: 'ACTIVE',
    draft: 'DRAFT',
    inactive: 'INACTIVE',
    hidden: 'HIDDEN',
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = 'https://via.placeholder.com/300x200?text=No+Image';
  };

  return (
    <Link to={`/tours/${tour.id}`} className="tour-card-link">
      <div className="tour-card">
        <div className="tour-card-image-container">
          <img
            src={tour.images?.[0] || 'https://via.placeholder.com/300x200?text=Tour+Image'}
            alt={tour.name || 'Tour'}
            className="tour-card-image"
            onError={handleImageError}
          />
          <div className="tour-card-badge">
            <span className={`badge badge-${tour.status}`}>
              {statusLabelMap[tour.status] ?? tour.status}
            </span>
          </div>
        </div>

        <div className="tour-card-content">
          <h3 className="tour-card-title">{tour.name}</h3>

           <div className="tour-card-meta">
             <span className="tour-meta-code">Mã tour: {tour.id?.slice(-6).toUpperCase()}</span>
             <span className="tour-meta-separator">•</span>
             <span className="tour-meta-duration">{tour.duration_} ngày</span>
           </div>

          <p className="tour-card-description">
            {tour.description?.length > 140
              ? `${tour.description.substring(0, 140)}...`
              : tour.description}
          </p>

          <div className="tour-card-info">
            <div className="info-item">
              <CalendarOutlined className="info-icon" />
              <span>{tour.duration_} ngày</span>
            </div>
            <div className="info-item">
              <EnvironmentOutlined className="info-icon" />
              <span>Điểm tham quan</span>
            </div>
          </div>

          <div className="tour-card-schedule">
            {tour.schedule?.length > 0 && (
              <div>
                <p className="schedule-title">Lịch trình:</p>
                {tour.schedule.slice(0, 2).map((item, index) => (
                  <div key={index} className="schedule-item">
                    <span className="day-badge">Ngày {item.day}</span>
                    <span className="day-title">{item.title}</span>
                  </div>
                ))}
                {tour.schedule.length > 2 && (
                  <p className="more-days">+{tour.schedule.length - 2} ngày khác</p>
                )}
              </div>
            )}
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
