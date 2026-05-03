import { useState, useEffect } from 'react';
import { Spin, Empty } from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { getTours } from '../../services/api';
import { ITour } from '../../types/tour.types';
import TourCard from './TourCard';
import '../styles/FeaturedTours.css';

const FeaturedTours = () => {
  const [tours, setTours] = useState<ITour[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeaturedTours = async () => {
      try {
        setLoading(true);
        const data = await getTours({
          page: 1,
          limit: 6,
        });
        if (data?.data && Array.isArray(data.data)) {
          setTours(data.data);
        } else if (data?.data && typeof data.data === 'object' && 'tours' in data.data) {
          setTours(Array.isArray((data.data as any).tours) ? (data.data as any).tours : []);
        } else {
          setTours([]);
        }
      } catch (error) {
        console.error('Error fetching featured tours:', error);
        setTours([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedTours();
  }, []);

  return (
    <section className="featured-tours-section">
      <div className="featured-tours-container">
        <div className="featured-tours-header">
          <div>
            <h2 className="featured-tours-title">Tour Nổi Bật</h2>
            <p className="featured-tours-subtitle">
              Những chuyến du lịch được yêu thích và được bình chọn cao nhất
            </p>
          </div>
          <Link to="/tours" className="featured-tours-view-all">
            Xem tất cả <ArrowRightOutlined />
          </Link>
        </div>

        <Spin spinning={loading} tip="Đang tải..." size="large">
          {tours.length === 0 && !loading ? (
            <Empty description="Chưa có tour nào" style={{ marginTop: '40px' }} />
          ) : (
            <div className="featured-tours-grid">
              {tours.map((tour) => (
                <TourCard key={tour.id} tour={tour} />
              ))}
            </div>
          )}
        </Spin>
      </div>
    </section>
  );
};

export default FeaturedTours;
