import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Spin,
  Empty,
  Button,
  Tag,
  Divider,
  message,
  List,
  Card,
  Image,
  Typography,
  Space,
} from "antd";
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  TeamOutlined,
  FlagOutlined,
  PictureOutlined,
  NotificationOutlined,
  FormOutlined,
} from "@ant-design/icons";
import { getTour } from "../services/api";
import { ITour } from "../types/tour.types";
import "./styles/TourDetail.css";
import BookingForm from "../components/Client/BookingForm";
import axios from "axios";
import dayjs from "dayjs";

const { Text } = Typography;

const TourDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [tour, setTour] = useState<ITour | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [isBookingModalVisible, setIsBookingModalVisible] = useState(false);

  // ── useEffect 1: Fetch tour ─────────────────────────────────────────────────
  useEffect(() => {
    const fetchTourDetail = async () => {
      if (!id) {
        setError("Tour ID not found");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const response = await getTour(id);
        if (response.data && response.data.data) {
          setTour(response.data.data as ITour);
        } else {
          setTour(response.data as ITour);
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

  // ── useEffect 2: Fetch posts — hoàn toàn độc lập với tour ──────────────────
  useEffect(() => {
    const fetchPosts = async () => {
      if (!id) {
        setPostsLoading(false);
        return;
      }
      try {
        setPostsLoading(true);
        const postsRes = await axios.get(
          `http://localhost:5000/api/v1/bookings/tour-posts/${id}`
        );
        setPosts(postsRes.data?.data || []);
      } catch (postErr: any) {
        console.error("Không thể tải bài viết:", postErr.response?.data || postErr.message);
        setPosts([]);
      } finally {
        setPostsLoading(false);
      }
    };
    fetchPosts();
  }, [id]); // ← chỉ phụ thuộc vào id, không phụ thuộc vào tour

  const handleGoBack = () => {
    navigate("/tours");
  };

  const getPostIcon = (type: string) => {
    switch (type) {
      case 'photo': return <PictureOutlined style={{ color: '#722ed1' }} />;
      case 'update': return <NotificationOutlined style={{ color: '#1890ff' }} />;
      case 'note': return <FormOutlined style={{ color: '#faad14' }} />;
      default: return <FlagOutlined style={{ color: '#52c41a' }} />;
    }
  };

  const getPostTypeLabel = (type: string) => {
    switch (type) {
      case 'photo': return 'Hình ảnh';
      case 'update': return 'Cập nhật';
      case 'note': return 'Ghi chú';
      default: return 'Hoạt động';
    }
  };

  if (loading) {
    return (
      <div className="tour-detail-loading">
        <Spin size="large" tip="Đang tải thông tin tour..." fullscreen />
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

      {/* BACK BUTTON */}
      <div className="tour-detail-header">
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={handleGoBack}>
          Quay lại
        </Button>
        <h1>{tour.name}</h1>
        <Tag color={tour.status === "active" ? "green" : "orange"}>
          {tour.status}
        </Tag>
      </div>

      {/* HERO IMAGE */}
      {tour.images && tour.images.length > 0 && (
        <div className="tour-hero">
          <img
            src={tour.images[0]}
            alt={tour.name}
            onError={(e) => {
              e.currentTarget.src =
                "https://via.placeholder.com/1200x500?text=Tour+Image";
            }}
          />
        </div>
      )}

      {/* MAIN LAYOUT */}
      <div className="tour-detail-container">

        {/* LEFT CONTENT */}
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

          {/* DESCRIPTION */}
          <section className="detail-section">
            <h2>Mô tả tour</h2>
            <p>{tour.description}</p>
          </section>

          <Divider />

          {/* SCHEDULE */}
          {tour.schedule && tour.schedule.length > 0 && (
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

          {/* PRICING */}
          {tour.prices && tour.prices.length > 0 && (
            <>
              <section className="detail-section">
                <h2>Bảng giá</h2>
                {tour.prices.map((tier, index) => (
                  <div key={index} className="price-row">
                    <span>{tier.title}</span>
                    <span>{tier.amount?.toLocaleString()}đ</span>
                  </div>
                ))}
              </section>
              <Divider />
            </>
          )}

          {/* POLICIES */}
          {tour.policies && tour.policies.length > 0 && (
            <section className="detail-section">
              <h2>Chính sách</h2>
              <ul>
                {tour.policies.map((policy, index) => (
                  <li key={index}>
                    <CheckCircleOutlined /> {policy}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <Divider />

          {/* NHẬT KÝ CHUYẾN ĐI */}
          <section className="detail-section">
            <h2><FlagOutlined /> Nhật ký từ các chuyến đi</h2>
            {postsLoading ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Spin tip="Đang tải nhật ký..." />
              </div>
            ) : posts.length === 0 ? (
              <Empty
                description="Chưa có cập nhật nào từ các chuyến đi gần đây."
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : (
              <List
                itemLayout="vertical"
                dataSource={posts}
                renderItem={(item: any) => (
                  <List.Item
                    key={item._id}
                    style={{ padding: '20px 0', borderBottom: '1px solid #f0f0f0' }}
                  >
                    <div style={{ display: 'flex', marginBottom: 8, alignItems: 'center', justifyContent: 'space-between' }}>
                      <Space>
                        <div style={{ fontSize: 18 }}>{getPostIcon(item.type)}</div>
                        <Text strong style={{ fontSize: 16 }}>{item.title}</Text>
                        <Tag color={
                          item.type === 'photo' ? 'purple' :
                          item.type === 'update' ? 'blue' :
                          item.type === 'note' ? 'gold' : 'green'
                        }>
                          {getPostTypeLabel(item.type)}
                        </Tag>
                      </Space>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {dayjs(item.created_at).format('HH:mm DD/MM/YYYY')} — bởi{' '}
                        {item.author_id?.name || (item.author_id?.role === 'admin' ? 'Admin' : 'HDV')}
                      </Text>
                    </div>

                    <div style={{ marginLeft: 26, marginBottom: 12, whiteSpace: 'pre-wrap', color: '#4b5563' }}>
                      {item.content}
                    </div>

                    {item.images && item.images.length > 0 && (
                      <div style={{ marginLeft: 26 }}>
                        <Image.PreviewGroup>
                          <Space size="small" wrap>
                            {item.images.map((img: string, idx: number) => (
                              <div
                                key={idx}
                                style={{
                                  width: 100, height: 100, overflow: 'hidden',
                                  borderRadius: 8, border: '1px solid #eee', cursor: 'pointer'
                                }}
                              >
                                <Image
                                  src={img}
                                  width={100}
                                  height={100}
                                  style={{ objectFit: 'cover' }}
                                  alt="post-img"
                                  fallback="https://via.placeholder.com/100?text=No+Image"
                                />
                              </div>
                            ))}
                          </Space>
                        </Image.PreviewGroup>
                      </div>
                    )}
                  </List.Item>
                )}
              />
            )}
          </section>

        </div>

        {/* SIDEBAR */}
        <div className="tour-detail-sidebar">
          <div className="sidebar-card">
            <p>Giá tour từ</p>
            <h2>{tour.price?.toLocaleString()}đ</h2>
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
          </div>
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