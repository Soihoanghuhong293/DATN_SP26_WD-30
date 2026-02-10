import React from 'react';
import { Layout, Row, Col, Typography, Input, Button, Space } from 'antd';
import { 
  SendOutlined, 
  FacebookFilled, 
  InstagramFilled, 
  TwitterSquareFilled,
  LinkedinFilled 
} from '@ant-design/icons';
import { Link } from 'react-router-dom';

const { Footer: AntFooter } = Layout;
const { Title, Text } = Typography;

const Footer = () => {
  return (
    <AntFooter style={{ background: '#fff', padding: '64px 24px 24px', borderTop: '1px solid #f0f0f0' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        <Row gutter={[48, 48]}>
          
          <Col xs={24} md={8}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  backgroundColor: '#e6f7ff',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <SendOutlined rotate={-45} style={{ fontSize: '18px', color: '#13b6ec', marginBottom: '4px' }} />
              </div>
              <span style={{ fontSize: '22px', fontWeight: '800', color: '#262626', fontFamily: 'sans-serif' }}>
                Traveler
              </span>
            </div>
            <Text type="secondary" style={{ fontSize: '15px', lineHeight: '1.8', display: 'block', marginBottom: '24px' }}>
              Khám phá những vùng đất mới, trải nghiệm văn hóa độc đáo và tạo nên những kỷ niệm khó quên cùng chúng tôi.
            </Text>
            
            <Space size="middle">
              <FacebookFilled style={{ fontSize: '24px', color: '#8c8c8c', cursor: 'pointer' }} className="social-icon" />
              <InstagramFilled style={{ fontSize: '24px', color: '#8c8c8c', cursor: 'pointer' }} className="social-icon" />
              <TwitterSquareFilled style={{ fontSize: '24px', color: '#8c8c8c', cursor: 'pointer' }} className="social-icon" />
              <LinkedinFilled style={{ fontSize: '24px', color: '#8c8c8c', cursor: 'pointer' }} className="social-icon" />
            </Space>
          </Col>

          <Col xs={12} md={5}>
            <Title level={5} style={{ marginBottom: '24px', fontSize: '16px' }}>Về Traveler</Title>
            <Space direction="vertical" size="middle">
              <Link to="/about" className="footer-link">Giới thiệu</Link>
              <Link to="/careers" className="footer-link">Tuyển dụng</Link>
              <Link to="/blog" className="footer-link">Tin tức & Blog</Link>
              <Link to="/partners" className="footer-link">Đối tác</Link>
            </Space>
          </Col>

          <Col xs={12} md={5}>
            <Title level={5} style={{ marginBottom: '24px', fontSize: '16px' }}>Hỗ trợ</Title>
            <Space direction="vertical" size="middle">
              <Link to="/help" className="footer-link">Trung tâm trợ giúp</Link>
              <Link to="/safety" className="footer-link">An toàn du lịch</Link>
              <Link to="/cancellation" className="footer-link">Chính sách hoàn hủy</Link>
              <Link to="/contact" className="footer-link">Liên hệ</Link>
            </Space>
          </Col>

          <Col xs={24} md={6}>
            <Title level={5} style={{ marginBottom: '24px', fontSize: '16px' }}>Đăng ký nhận tin</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: '16px' }}>
              Nhận thông báo về các ưu đãi tour mới nhất và bí kíp du lịch.
            </Text>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Input placeholder="Email của bạn" style={{ borderRadius: '6px' }} />
              <Button 
                type="primary" 
                style={{ 
                  backgroundColor: '#13b6ec', 
                  borderColor: '#13b6ec',
                  borderRadius: '6px',
                  fontWeight: '600'
                }}
              >
                Gửi
              </Button>
            </div>
          </Col>
        </Row>

        <div 
          style={{ 
            marginTop: '64px', 
            paddingTop: '24px', 
            borderTop: '1px solid #f0f0f0',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px'
          }}
        >
          <Text type="secondary" style={{ fontSize: '14px' }}>
            © 2023 Traveler Inc. Bảo lưu mọi quyền.
          </Text>
          <Space split={<span style={{ color: '#d9d9d9' }}>|</span>}>
            <Link to="/privacy" className="footer-link-small">Quyền riêng tư</Link>
            <Link to="/terms" className="footer-link-small">Điều khoản</Link>
            <Link to="/sitemap" className="footer-link-small">Sitemap</Link>
          </Space>
        </div>
      </div>


      <style>{`
        .footer-link {
          color: #595959;
          font-size: 14px;
          transition: color 0.3s;
          text-decoration: none;
        }
        .footer-link:hover {
          color: #13b6ec;
        }
        .footer-link-small {
          color: #8c8c8c;
          font-size: 13px;
          text-decoration: none;
          transition: color 0.3s;
        }
        .footer-link-small:hover {
          color: #262626;
        }
        .social-icon:hover {
          color: #13b6ec !important;
          transition: color 0.3s;
        }
      `}</style>
    </AntFooter>
  );
};

export default Footer;