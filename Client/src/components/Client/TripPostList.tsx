import React from 'react';
import { List, Card, Typography, Image, Empty } from 'antd';
import { UserOutlined, CalendarOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

interface TripPost {
  _id: string;
  title: string;
  content: string;
  images: string[];
  author_id: { name: string; email: string };
  status: 'public' | 'private' | 'draft';
  created_at: string;
}

interface TripPostListProps {
  tripPosts: TripPost[];
  loading?: boolean;
}

const TripPostList: React.FC<TripPostListProps> = ({ tripPosts, loading = false }) => {
  if (tripPosts.length === 0 && !loading) {
    return <Empty description="Chưa có bài viết nào" />;
  }

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>Bài viết chuyến đi</Title>
      <List
        loading={loading}
        dataSource={tripPosts}
        renderItem={(post) => (
          <List.Item>
            <Card
              style={{ width: '100%' }}
              title={
                <div>
                  <Title level={5} style={{ margin: 0 }}>{post.title}</Title>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    <UserOutlined style={{ marginRight: 4 }} />
                    {post.author_id?.name || 'Unknown'} •
                    <CalendarOutlined style={{ marginLeft: 8, marginRight: 4 }} />
                    {new Date(post.created_at).toLocaleDateString('vi-VN')}
                  </Text>
                </div>
              }
            >
              <Paragraph ellipsis={{ rows: 3, expandable: true, symbol: 'Xem thêm' }}>
                {post.content}
              </Paragraph>
              {post.images && post.images.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <Image.PreviewGroup>
                    {post.images.slice(0, 3).map((img, index) => (
                      <Image
                        key={index}
                        src={img}
                        alt={`Image ${index + 1}`}
                        width={100}
                        height={100}
                        style={{ marginRight: 8, objectFit: 'cover' }}
                      />
                    ))}
                    {post.images.length > 3 && (
                      <div style={{ display: 'inline-block', width: 100, height: 100, background: '#f0f0f0', textAlign: 'center', lineHeight: '100px', marginRight: 8 }}>
                        +{post.images.length - 3}
                      </div>
                    )}
                  </Image.PreviewGroup>
                </div>
              )}
              <Text type="secondary" style={{ fontSize: '12px', marginTop: 8, display: 'block' }}>
                Trạng thái: {post.status === 'public' ? 'Công khai' : post.status === 'private' ? 'Riêng tư' : 'Bản nháp'}
              </Text>
            </Card>
          </List.Item>
        )}
      />
    </div>
  );
};

export default TripPostList;