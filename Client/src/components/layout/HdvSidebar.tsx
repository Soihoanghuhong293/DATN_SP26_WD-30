import { Menu, Avatar } from "antd";
import {
  DashboardOutlined,
  CalendarOutlined,
  CarOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Link, useLocation, useNavigate } from "react-router-dom";

const HdvSidebar = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const email = localStorage.getItem("user_email") || "HDV";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user_email");
    navigate("/login");
  };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", position: "sticky", top: 0 }}>
      <div style={{ padding: 24, display: "flex", gap: 12, alignItems: "center" }}>
        <Avatar size={40} style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
          <UserOutlined />
        </Avatar>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Hướng dẫn viên</div>
          <div style={{ fontSize: 12, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis" }}>
            {email}
          </div>
        </div>
      </div>

      <Menu
        mode="inline"
        selectedKeys={[pathname]}
        style={{ border: "none", flex: 1, overflowY: "auto", overflowX: "hidden" }}
        items={[
          {
            key: "/hdv",
            icon: <DashboardOutlined />,
            label: <Link to="/hdv">Tổng quan</Link>,
          },
          {
            key: "/hdv/tours",
            icon: <CarOutlined />,
            label: <Link to="/hdv/tours">Tour của tôi</Link>,
          },
          {
            key: "/hdv/schedule",
            icon: <CalendarOutlined />,
            label: <Link to="/hdv/schedule">Lịch làm việc</Link>,
          },
        ]}
      />

      <div style={{ padding: 16, borderTop: "1px solid #f0f0f0" }}>
        <Menu
          mode="inline"
          selectedKeys={[]}
          style={{ border: "none" }}
          items={[
            {
              key: "logout",
              icon: <UserOutlined />,
              label: "Đăng xuất",
              onClick: handleLogout,
            },
          ]}
        />
      </div>
    </div>
  );
};

export default HdvSidebar;
