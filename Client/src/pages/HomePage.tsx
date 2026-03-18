import React from 'react';
import { Button } from 'antd';
import { SearchOutlined, RightOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import FeaturedTours from '../components/Client/FeaturedTours';
import './styles/HomePage.css';

const HomePage = () => {
  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-background">
          <div className="hero-overlay"></div>
          <video
            autoPlay
            muted
            loop
            className="hero-video"
            poster="https://images.pexels.com/photos/2325446/pexels-photo-2325446.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"
          >
            <source
              src="https://videos.pexels.com/video-files/3254013/3254013-sd_640_360_30fps.mp4"
              type="video/mp4"
            />
          </video>
        </div>
        <div className="hero-content">
          <h1 className="hero-title">Khám Phá Thế Giới</h1>
          <p className="hero-subtitle">
            Tìm kiếm những chuyến du lịch tuyệt vời và tạo những kỷ niệm không quên
          </p>
          <div className="hero-actions">
            <Link to="/tours">
              <Button type="primary" size="large" icon={<SearchOutlined />} className="hero-btn primary-btn">
                Tìm Tours
              </Button>
            </Link>
            <Link to="/guides">
              <Button size="large" icon={<RightOutlined />} className="hero-btn secondary-btn">
                Tìm Hướng Dẫn Viên
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="stats-container">
          <div className="stat-item">
            <div className="stat-number">500+</div>
            <div className="stat-label">Tours Hấp Dẫn</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">10k+</div>
            <div className="stat-label">Khách Hài Lòng</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">50+</div>
            <div className="stat-label">Địa Điểm</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">200+</div>
            <div className="stat-label">Hướng Dẫn Viên</div>
          </div>
        </div>
      </section>

      {/* Featured Tours Section */}
      <FeaturedTours />

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2 className="cta-title">Sẵn Sàng Bắt Đầu Cuộc Phiêu Lưu?</h2>
          <p className="cta-subtitle">
            Duyệt qua hàng trăm tours tuyệt vời và tìm những chuyến đi hoàn hảo cho bạn
          </p>
          <Link to="/tours">
            <Button type="primary" size="large" className="cta-btn">
              Khám Phá Tours Ngay
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default HomePage;