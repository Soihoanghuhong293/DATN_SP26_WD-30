import { useEffect, useState } from "react";
import { Layout, Menu, Button } from "antd";
import { Link, useLocation, useNavigate } from "react-router-dom";

const { Header: AntHeader } = Layout;

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [isLogin, setIsLogin] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsLogin(!!token);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    setIsLogin(false);
    navigate("/login");
  };

  const menuItems = [
    { key: "/", label: <Link to="/">Destinations</Link> },
    { key: "/tours", label: <Link to="/tours">Tours</Link> },
    { key: "/guides", label: <Link to="/guides">Guides</Link> },
    { key: "/blog", label: <Link to="/blog">Blog</Link> },
  ];

  return (
    <AntHeader
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <Link to="/" style={{ color: "#fff", fontWeight: "bold" }}>
        ViGo
      </Link>

      <Menu
        theme="dark"
        mode="horizontal"
        selectedKeys={[location.pathname]}
        items={menuItems}
        style={{ flex: 1, marginLeft: 40 }}
      />

      <div>
        {!isLogin ? (
          <>
            <Link to="/login">
              <Button type="text" style={{ color: "#fff" }}>
                Log In
              </Button>
            </Link>
            <Link to="/register">
              <Button type="primary">Sign Up</Button>
            </Link>
          </>
        ) : (
          <Button danger onClick={handleLogout}>
            Logout
          </Button>
        )}
      </div>
    </AntHeader>
  );
};

export default Header;