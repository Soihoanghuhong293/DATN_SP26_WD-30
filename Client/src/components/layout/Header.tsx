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
  const [authed, setAuthed] = useState<boolean>(() => Boolean(localStorage.getItem('token')));

  // Hiệu ứng cuộn
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleAuthChanged = () => setAuthed(Boolean(localStorage.getItem('token')));
    window.addEventListener('auth:changed', handleAuthChanged as any);
    return () => window.removeEventListener('auth:changed', handleAuthChanged as any);
  }, []);

  const items = [
    { key: '/', label: <Link to="/">Destinations</Link> },
    { key: '/tours', label: <Link to="/tours">Tours</Link> },
    ...(authed ? [{ key: '/my-wishlist', label: <Link to="/my-wishlist">Yêu thích</Link> }] : []),
    { key: '/guides', label: <Link to="/guides">Guides</Link> },
    { key: '/blog', label: <Link to="/blog">Blog</Link> },
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('user_email');
    window.dispatchEvent(new Event('auth:changed'));
    navigate('/');
  };

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
              width: '40px',
              height: '40px',
              backgroundColor: '#e6f7ff',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SendOutlined rotate={-45} style={{ fontSize: '20px', color: '#13b6ec', marginBottom: '4px' }} />
          </div>
          <span style={{ fontSize: '22px', fontWeight: '800', color: '#262626', fontFamily: 'sans-serif' }}>
            ViGo-Trarvel
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
          {authed ? (
            <>
              <Button type="text" style={{ fontWeight: '600', color: '#595959' }} onClick={() => navigate('/my-wishlist')}>
                Yêu thích
              </Button>
              <Button type="text" style={{ fontWeight: '600', color: '#595959' }} onClick={handleLogout}>
                Đăng xuất
              </Button>
            </>
          ) : (
            <>
              <Button type="text" style={{ fontWeight: '600', color: '#595959' }} onClick={() => navigate('/login')}>
                Log In
              </Button>
              <Button
                type="primary"
                size="large"
                onClick={() => navigate('/register')}
                style={{
                  backgroundColor: '#13b6ec',
                  borderColor: '#13b6ec',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 14px rgba(19, 182, 236, 0.4)',
                }}
              >
                Sign Up
              </Button>
            </>
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
          {authed ? (
            <>
              <Button block size="large" style={{ fontWeight: '600' }} onClick={() => navigate('/my-wishlist')}>
                Tour yêu thích
              </Button>
              <Button block size="large" danger style={{ fontWeight: '600' }} onClick={handleLogout}>
                Đăng xuất
              </Button>
            </>
          ) : (
            <>
              <Button block size="large" style={{ fontWeight: '600' }} onClick={() => navigate('/login')}>
                Log In
              </Button>
              <Button
                block
                type="primary"
                size="large"
                onClick={() => navigate('/register')}
                style={{ backgroundColor: '#13b6ec', fontWeight: 'bold' }}
              >
                Sign Up
              </Button>
            </>
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