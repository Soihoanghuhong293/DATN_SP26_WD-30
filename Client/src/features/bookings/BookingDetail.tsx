import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Modal, message, Spin } from 'antd';
import { ArrowLeftOutlined, PlusOutlined } from '@ant-design/icons';
import TripPostList from '../../components/Client/TripPostList';
import TripPostForm from '../../components/Client/TripPostForm';
import { getTripPosts, createTripPost } from '../../services/tripPostApi';

const BookingDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tripPosts, setTripPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchTripPosts();
    }
  }, [id]);

  const fetchTripPosts = async () => {
    setLoading(true);
    try {
      const response = await getTripPosts(id!);
      setTripPosts(response.data || []);
    } catch (error) {
      message.error('Lỗi khi tải bài viết!');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTripPost = async (values: any) => {
    setSubmitting(true);
    try {
      await createTripPost({ ...values, booking_id: id });
      message.success('Tạo bài viết thành công!');
      setModalVisible(false);
      fetchTripPosts(); // Refresh list
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Lỗi khi tạo bài viết!');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/bookings')} style={{ marginBottom: 16 }}>
        Quay lại danh sách
      </Button>

      <Card title="Chi tiết Booking" style={{ marginBottom: 24 }}>
        {/* Placeholder cho thông tin booking - có thể thêm sau */}
        <p>ID Booking: {id}</p>
        <p>Thông tin chi tiết booking sẽ được hiển thị ở đây...</p>
      </Card>

      <Card
        title="Bài viết chuyến đi"
        extra={
          <Button icon={<PlusOutlined />} type="primary" onClick={() => setModalVisible(true)}>
            Thêm bài viết
          </Button>
        }
      >
        <TripPostList tripPosts={tripPosts} loading={loading} />
      </Card>

      <Modal
        title="Thêm bài viết mới"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <TripPostForm onSubmit={handleCreateTripPost} loading={submitting} />
      </Modal>
    </div>
  );
};

export default BookingDetail;