import { useMemo, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../components/styles/tourDetailU.css";
import {
  Spin,
  Empty,
  Button,
  Tag,
  Divider,
  message,
} from "antd";
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { getTour } from "../services/api";
import { ITour } from "../types/tour.types";
import "./styles/TourDetail.css";
import BookingForm from "../components/Client/BookingForm";

const TourDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [tour, setTour] = useState<ITour | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBookingModalVisible, setIsBookingModalVisible] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    const fetchTourDetail = async () => {
      if (!id) {
        setError("Tour ID not found");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await getTour(id);

        if (data.data && typeof data.data === "object") {
          if ("tour" in data.data) {
            setTour(data.data.tour);
          } else {
            setTour(data.data as ITour);
          }
        } else {
          setError("Could not load tour details");
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load tour details");
        message.error("Lỗi khi tải thông tin tour");
      } finally {
        setLoading(false);
      }
    };

    fetchTourDetail();
  }, [id]);

  const tourImages = useMemo(() => {
    const imgs = (tour?.images || []).filter(Boolean);
    return Array.isArray(imgs) ? imgs : [];
  }, [tour]);

  useEffect(() => {
    setActiveImageIndex(0);
  }, [id]);

  const handleGoBack = () => {
    navigate("/tours");
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
        <Empty description={error || "Tour không tìm thấy"} />
        <Button
          type="primary"
          icon={<ArrowLeftOutlined />}
          onClick={handleGoBack}
          style={{ marginTop: 20 }}
        >
          Quay lại
        </Button>
      </div>
    );
  }

  return (
    <div className="tour-detail-page">
      {/* HEADER */}
      <div className="tour-detail-header">
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={handleGoBack}>
          Quay lại
        </Button>

        <h1>{tour.name}</h1>

        <Tag color={tour.status === "active" ? "green" : "orange"}>
          {tour.status === "active" ? "Hoạt động" : "Tạm dừng"}
        </Tag>
      </div>

      {/* HERO + SIDEBAR */}
      {tourImages.length > 0 && (
        <div className="tour-hero">
          {/* LEFT: GALLERY */}
          <div className="tour-gallery">
            <div className="tour-gallery-thumbs">
              {tourImages.map((src, idx) => (
                <button
                  key={`${src}-${idx}`}
                  className={`tour-thumb ${
                    idx === activeImageIndex ? "is-active" : ""
                  }`}
                  onClick={() => setActiveImageIndex(idx)}
                >
                  <img src={src} alt="thumb" />
                </button>
              ))}
            </div>

            <div className="tour-gallery-main">
              <img
                src={
                  tourImages[
                    Math.min(activeImageIndex, tourImages.length - 1)
                  ]
                }
                alt="main"
              />
            </div>
          </div>

          {/* RIGHT: SIDEBAR */}
         {/* RIGHT: SIDEBAR */}
          <div className="tour-detail-sidebar">
            <div className="sidebar-card">
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>GIÁ TOUR</h3>
              <h1>{tour.price?.toLocaleString()}đ</h1>

              <Button
                type="primary"
                size="large"
                block
                onClick={() => setIsBookingModalVisible(true)}
              >
                Đặt tour ngay
              </Button>

              <Button block style={{ marginTop: 10 }}>
                Liên hệ tư vấn
              </Button>

              {/* MÔ TẢ TOUR ĐƯỢC CHUYỂN LÊN ĐÂY */}
              <Divider />
              <div className="tour-description-sidebar">
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>MÔ TẢ</h3>
                <p style={{ color: '#4b5563', lineHeight: '1.6', fontSize: '14px', margin: 0 }}>
                  {tour.description}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTENT */}
      <div className="tour-detail-container">
        <div>
          {/* QUICK INFO */}
          <div className="tour-detail-quick-info">
            <div className="info-card">
              <CalendarOutlined />
              <div>
                <p>Thời gian</p>
                <b>{tour.duration_ ? `${tour.duration_} ngày` : "Chưa cập nhật"}</b>
              </div>
            </div>

            <div className="info-card">
              <DollarOutlined />
              <div>
                <p>Giá từ</p>
                <b>{tour.price?.toLocaleString()}đ</b>
              </div>
            </div>

            <div className="info-card">
              <TeamOutlined />
              <div>
                <p>Hướng dẫn viên</p>
                <b>{tour.suppliers?.length || 0}</b>
              </div>
            </div>
          </div>

        
          <Divider />

          {tour.schedule?.length > 0 && (
            <section className="detail-section">
              <h2>Lịch trình</h2>

              {tour.schedule.map((item, index) => (
                <div key={index} className="schedule-item">
                  <div className="schedule-day">Ngày {item.day}</div>

                  <div className="schedule-content">
                    <h3>{item.title}</h3>
                    <ul>
                      {item.activities?.map((act, i) => (
                        <li key={i}>
                          <CheckCircleOutlined /> {act}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </section>
          )}
        </div>
      </div>

      <BookingForm
        visible={isBookingModalVisible}
        onClose={() => setIsBookingModalVisible(false)}
        tour={tour}
      />
    </div>
  );
};

export default TourDetailPage;