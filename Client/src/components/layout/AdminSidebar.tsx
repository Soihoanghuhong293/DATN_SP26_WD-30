import { Menu, Avatar } from "antd";
import {
  AppstoreOutlined,
  UserOutlined,
  SettingOutlined,
  BookOutlined,
  DashboardOutlined,
} from "@ant-design/icons";
import { Link, useLocation } from "react-router-dom";

const AdminSidebar = () => {
  const { pathname } = useLocation();

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Logo */}
      <div style={{ padding: 24, display: "flex", gap: 12 }}>
        <Avatar size={40}>VIGO</Avatar>
        <div>
          <div style={{ fontWeight: 700 }}>Tour Admin</div>
          <div style={{ fontSize: 12, color: "#0f4694" }}>
            Quản trị Tour ViGo
          </div>
        </div>
      </div>

      <Menu
        mode="inline"
        selectedKeys={[pathname]}
        style={{ border: "none" }}
        items={[
          {
            key: "/admin",
            icon: <DashboardOutlined />,
            label: <Link to="/admin">Tổng quan</Link>,
          },
          {
            key: "/admin/tours",
            icon: <AppstoreOutlined />,
            label: <Link to="/admin/tours">Quản lý Tour</Link>,
          },
          {
            key: "/admin/bookings",
            icon: <BookOutlined />,
            label: <Link to="/admin/bookings">Đơn đặt chỗ</Link>,
          },
          {
            key: "/admin/users",
            icon: <UserOutlined />,
            label: <Link to="/admin/users">Người dùng</Link>,
          },
          {
            key: "/admin/settings",
            icon: <SettingOutlined />,
            label: <Link to="/admin/settings">Cài đặt</Link>,
          },
        ]}
      />
    </div>
  );
};

export default AdminSidebar;
