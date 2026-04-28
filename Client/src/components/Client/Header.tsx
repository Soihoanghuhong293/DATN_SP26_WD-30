import React, { useMemo, useState, useEffect } from 'react';
import { Layout, Menu, Button, Drawer, Popover } from 'antd';
import { MenuOutlined, DownOutlined } from '@ant-design/icons';
import { Link, useLocation, useNavigate } from 'react-router-dom'; 
const { Header: AntHeader } = Layout;

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate(); 

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isLogin, setIsLogin] = useState<boolean>(() => !!localStorage.getItem("token"));
  const [role, setRole] = useState<string | null>(() => localStorage.getItem("role"));

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
    setRole(localStorage.getItem("role"));
  }, [location.pathname]);

  useEffect(() => {
    // Sync ngay sau login/logout (cùng tab) qua custom event
    const onAuthChanged = () => {
      setIsLogin(!!localStorage.getItem("token"));
      setRole(localStorage.getItem("role"));
    };
    window.addEventListener("auth:changed", onAuthChanged);
    return () => window.removeEventListener("auth:changed", onAuthChanged);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    setIsLogin(false);
    setRole(null);
    setMobileMenuOpen(false);
    window.dispatchEvent(new Event("auth:changed"));
    navigate("/login");
  };

  const destinationColumns = useMemo(
    () => [
      {
        title: 'MIỀN BẮC',
        items: ['Hà Nội', 'Hạ Long', 'Sapa', 'Ninh Bình', 'Hà Giang'],
      },
      {
        title: 'MIỀN TRUNG',
        items: ['Đà Nẵng', 'Hội An', 'Huế', 'Quy Nhơn', 'Nha Trang'],
      },
      {
        title: 'MIỀN NAM',
        items: ['TP. Hồ Chí Minh', 'Phú Quốc', 'Vũng Tàu', 'Cần Thơ', 'Côn Đảo'],
      },
    ],
    []
  );

  const destinationContent = (
    <div className="destination-mega">
      <div className="destination-mega-head">
        <span className="destination-mega-title">Trong nước</span>
      </div>
      <div className="destination-mega-grid">
        {destinationColumns.map((col) => (
          <div key={col.title} className="destination-mega-col">
            <div className="destination-mega-col-head">{col.title}</div>
            <ul className="destination-mega-list">
              {col.items.map((name) => (
                <li key={name}>
                  <span className="destination-mega-link destination-mega-link--static">{name}</span>
                </li>
              ))}
            </ul>
            <span className="destination-mega-viewall destination-mega-viewall--static">Xem tất cả →</span>
          </div>
        ))}
      </div>
    </div>
  );

  const items = useMemo(() => {
    const base = [
      {
        key: '/',
        label: (
          <Popover
            placement="bottom"
            trigger="hover"
            mouseEnterDelay={0.05}
            mouseLeaveDelay={0.12}
            arrow={false}
            overlayClassName="destination-mega-popover"
            content={destinationContent}
          >
            <Link to="/" className="destination-mega-trigger" aria-haspopup="true">
              <span>Điểm đến</span>
              <DownOutlined className="destination-mega-chevron" />
            </Link>
          </Popover>
        ),
      },
      { key: '/tours', label: <Link to="/tours">Tour</Link> },
      { key: '/guides', label: <Link to="/guides">Hướng dẫn viên</Link> },
      { key: '/blog', label: <Link to="/blog">Blog</Link> },
    ];
    const isCustomer = isLogin && (!role || role === 'user');
    if (isCustomer) {
      return [
        ...base,
        { key: '/my-bookings', label: <Link to="/my-bookings">Đơn của tôi</Link> },
      ];
    }
    return base;
  }, [isLogin, role]);

  const menuSelectedKeys = useMemo(() => {
    const p = location.pathname;
    if (p.startsWith('/my-bookings')) return ['/my-bookings'];
    return [p];
  }, [location.pathname]);

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
            selectedKeys={menuSelectedKeys}
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
          selectedKeys={menuSelectedKeys}
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

        .destination-mega-trigger {
          border: none;
          background: transparent;
          padding: 0;
          margin: 0;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: inherit;
          font: inherit;
          font-weight: 500;
          text-decoration: none;
        }

        .destination-mega-chevron {
          font-size: 11px;
          opacity: 0.75;
        }

        .destination-mega-popover .ant-popover-inner {
          padding: 0;
          border-radius: 12px;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
          border: 1px solid rgba(0, 0, 0, 0.06);
          max-width: min(1080px, calc(100vw - 24px));
        }

        .destination-mega {
          width: min(900px, calc(100vw - 32px));
          max-height: min(70vh, 520px);
          display: flex;
          flex-direction: column;
          background: #fff;
        }

        .destination-mega-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px 10px 20px;
          border-bottom: 1px solid #f3f4f6;
        }

        .destination-mega-title {
          font-size: 15px;
          font-weight: 700;
          color: #111827;
        }

        .destination-mega-grid {
          padding: 16px 18px 20px;
          display: grid;
          grid-template-columns: repeat(3, minmax(180px, 1fr));
          gap: 20px 24px;
          align-content: start;
        }

        .destination-mega-col {
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 0;
        }

        .destination-mega-col-head {
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #111827;
          padding-bottom: 4px;
          border-bottom: 1px solid #e5e7eb;
        }

        .destination-mega-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .destination-mega-link {
          border: none;
          background: transparent;
          padding: 2px 0;
          font-size: 14px;
          color: #374151;
          cursor: pointer;
          text-align: left;
          line-height: 1.4;
        }

        .destination-mega-link--static {
          cursor: default;
          user-select: none;
          display: inline-block;
        }

        .destination-mega-link:hover,
        .destination-mega-viewall:hover {
          color: #007bff;
        }

        .destination-mega-viewall {
          margin-top: auto;
          padding-top: 8px;
          border: none;
          background: transparent;
          font-size: 12px;
          font-weight: 600;
          color: #007bff;
          cursor: pointer;
          text-align: left;
        }

        .destination-mega-viewall--static {
          cursor: default;
          user-select: none;
          display: inline-block;
        }

        .destination-mega-link--static:hover,
        .destination-mega-viewall--static:hover {
          color: inherit;
        }

        @media (max-width: 768px) {
          .destination-mega-grid {
            grid-template-columns: repeat(2, minmax(160px, 1fr));
            gap: 16px;
            padding: 12px 12px 16px;
          }
        }

        @media (max-width: 520px) {
          .destination-mega-grid {
            grid-template-columns: 1fr;
          }
        }
        
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