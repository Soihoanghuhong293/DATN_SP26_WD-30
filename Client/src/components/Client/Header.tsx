import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Drawer } from 'antd';
import { SendOutlined, MenuOutlined } from '@ant-design/icons';
import { Link, useLocation, useNavigate } from 'react-router-dom'; 
const { Header: AntHeader } = Layout;

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate(); 

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isLogin, setIsLogin] = useState<boolean>(() => !!localStorage.getItem("token")); 

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Sync trạng thái login khi đổi route (sau login thường navigate("/"))
    setIsLogin(!!localStorage.getItem("token"));
  }, [location.pathname]);

  useEffect(() => {
    // Sync ngay sau login/logout (cùng tab) qua custom event
    const onAuthChanged = () => setIsLogin(!!localStorage.getItem("token"));
    window.addEventListener("auth:changed", onAuthChanged);
    return () => window.removeEventListener("auth:changed", onAuthChanged);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    setIsLogin(false);
    setMobileMenuOpen(false); 
    window.dispatchEvent(new Event("auth:changed"));
    navigate("/login");
  };

  const items = [
    { key: '/', label: <Link to="/">Điểm đến</Link> },
    { key: '/tours', label: <Link to="/tours">Tour</Link> },
    { key: '/guides', label: <Link to="/guides">Hướng dẫn viên</Link> },
    { key: '/blog', label: <Link to="/blog">Blog</Link> },
  ];

  return (
    <>
      <AntHeader
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 1000,
          width: '100%',
          padding: '0 24px', 
          height: '80px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: scrolled ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(8px)',
          boxShadow: scrolled ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
          transition: 'all 0.3s ease',
          maxWidth: '100vw', 
          boxSizing: 'border-box'
        }}
      >
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', flexShrink: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="40" height="40" rx="12" fill="url(#logo_gradient)"/>
              <path d="M10 18.5L30 9L21.5 29L19 21.5L10 18.5Z" fill="white" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M19 21.5L25 14" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              <defs>
                <linearGradient id="logo_gradient" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#13B6EC"/>
                  <stop offset="1" stopColor="#096dd9"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span style={{ fontSize: '22px', fontWeight: '800', color: '#262626', fontFamily: 'sans-serif' }}>
            <span style={{ color: '#13b6ec' }}>Vi</span>Go
          </span>
        </Link>

        
        <div className="desktop-menu" style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <Menu
            mode="horizontal"
            selectedKeys={[location.pathname]}
            items={items}
            style={{
              background: 'transparent',
              borderBottom: 'none',
              fontSize: '16px',
              fontWeight: '500',
              justifyContent: 'center',
              display: 'flex',
              width: '100%',
            }}
          />
        </div>

        <div className="desktop-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexShrink: 0 }}>
          {!isLogin ? (
            <>
              <Link to="/login">
                <Button type="text" style={{ fontWeight: '600', color: '#595959' }}>
                  Đăng nhập
                </Button>
              </Link>
              <Link to="/register">
                <Button
                  type="primary"
                  size="large"
                  style={{
                    backgroundColor: '#13b6ec',
                    borderColor: '#13b6ec',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    boxShadow: '0 4px 14px rgba(19, 182, 236, 0.4)',
                  }}
                >
                  Đăng ký
                </Button>
              </Link>
            </>
          ) : (
            <Button 
              danger 
              size="large"
              onClick={handleLogout}
              style={{ fontWeight: 'bold', borderRadius: '8px' }}
            >
              Đăng xuất
            </Button>
          )}
        </div>

        <div className="mobile-toggle">
          <Button 
            type="text" 
            icon={<MenuOutlined style={{ fontSize: '20px' }} />} 
            onClick={() => setMobileMenuOpen(true)} 
          />
        </div>
      </AntHeader>

      <Drawer
        title="Menu"
        placement="right"
        onClose={() => setMobileMenuOpen(false)}
        open={mobileMenuOpen}
        width={280} 
      >
        <Menu
          mode="vertical"
          selectedKeys={[location.pathname]}
          items={items}
          onClick={() => setMobileMenuOpen(false)}
          style={{ border: 'none', fontSize: '16px' }}
        />
        
        <div style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {!isLogin ? (
            <>
              <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button block size="large" style={{ fontWeight: '600' }}>Đăng nhập</Button>
              </Link>
              <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                <Button block type="primary" size="large" style={{ backgroundColor: '#13b6ec', fontWeight: 'bold' }}>Đăng ký</Button>
              </Link>
            </>
          ) : (
             <Button block danger size="large" onClick={handleLogout} style={{ fontWeight: 'bold' }}>
               Đăng xuất
             </Button>
          )}
        </div>
      </Drawer>

      <style>{`
        /* Mặc định ẩn nút mobile */
        .mobile-toggle { display: none !important; }
        
        /* Khi màn hình nhỏ hơn 992px (Tablet dọc/Mobile) */
        @media (max-width: 992px) {
          .desktop-menu, .desktop-actions { display: none !important; }
          .mobile-toggle { display: block !important; }
        }
      `}</style>
    </>
  );
};

export default Header;