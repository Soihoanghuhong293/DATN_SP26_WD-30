import { Menu, Avatar } from "antd";
import {
  AppstoreOutlined,
  UserOutlined,
  SettingOutlined,
  BookOutlined,
  DashboardOutlined,
  PlusCircleOutlined,
  UnorderedListOutlined,
  TagsOutlined,
  TeamOutlined,
  ShopOutlined,
  MessageOutlined,
  CalendarOutlined,
  StarOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./AdminSidebar.css";

const AdminSidebar = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const email = localStorage.getItem("user_email") || "Admin";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user_email");
    navigate("/login");
  };

  const getOpenKeys = () => {
    const keys = [];
    if (pathname.includes("/admin/tours")) keys.push("tour-management");
    if (pathname.includes("/admin/categories")) keys.push("category-management");
    if (pathname.includes("/admin/bookings")) keys.push("booking-management");
    if (pathname.includes("/admin/guides")) keys.push("guide-management");
    if (pathname.includes("/admin/providers")) keys.push("provider-management");
    if (pathname.includes("/admin/holiday-pricing")) keys.push("holiday-pricing-management");
    if (pathname.includes("/admin/guide-reviews")) keys.push("guide-management");
    return keys;
  };

  const menuItems = useMemo(
    () => [
      {
        key: "/admin/dashboard",
        icon: <DashboardOutlined />,
        label: <Link to="/admin/dashboard">Tổng quan</Link>,
      },
      {
        key: "category-management",
        icon: <TagsOutlined />,
        label: "Quản lý Danh mục",
        children: [
          {
            key: "/admin/categories",
            icon: <UnorderedListOutlined />,
            label: <Link to="/admin/categories">Danh sách danh mục</Link>,
          },
          {
            key: "/admin/categories/create",
            icon: <PlusCircleOutlined />,
            label: <Link to="/admin/categories/create">Thêm danh mục</Link>,
          },
        ],
      },
      {
        key: "tour-management",
        icon: <AppstoreOutlined />,
        label: "Quản lý Tour",
        children: [
          {
            key: "/admin/tours",
            icon: <UnorderedListOutlined />,
            label: <Link to="/admin/tours">Danh sách Tour</Link>,
          },
          {
            key: "/admin/tours/create",
            icon: <PlusCircleOutlined />,
            label: <Link to="/admin/tours/create">Thêm Tour mới</Link>,
          },
          {
            key: "/admin/tour-templates",
            icon: <UnorderedListOutlined />,
            label: <Link to="/admin/tour-templates">Tour Templates</Link>,
          },
          {
            key: "/admin/tour-templates/create",
            icon: <PlusCircleOutlined />,
            label: <Link to="/admin/tour-templates/create">Thêm Template</Link>,
          },
        ],
      },
      {
        key: "guide-management",
        icon: <TeamOutlined />,
        label: "Quản lý Hướng dẫn viên",
        children: [
          {
            key: "/admin/guides",
            icon: <UnorderedListOutlined />,
            label: <Link to="/admin/guides">Danh sách HDV</Link>,
          },
          {
            key: "/admin/guide-reviews",
            icon: <StarOutlined />,
            label: <Link to="/admin/guide-reviews">Quản lý đánh giá</Link>,
          },
        ],
      },
      {
        key: "provider-management",
        icon: <ShopOutlined />,
        label: "Nhà cung cấp",
        children: [
          {
            key: "/admin/providers",
            icon: <UnorderedListOutlined />,
            label: <Link to="/admin/providers">Danh sách nhà cung cấp</Link>,
          },
          {
            key: "/admin/providers/create",
            icon: <PlusCircleOutlined />,
            label: <Link to="/admin/providers/create">Thêm nhà cung cấp</Link>,
          },
        ],
      },
      {
        key: "booking-management",
        icon: <BookOutlined />,
        label: "Quản lý Đặt chỗ",
        children: [
          {
            key: "/admin/bookings",
            icon: <UnorderedListOutlined />,
            label: <Link to="/admin/bookings">Danh sách đơn</Link>,
          },
          {
            key: "/admin/bookings/create",
            icon: <PlusCircleOutlined />,
            label: <Link to="/admin/bookings/create">Tạo đơn mới</Link>,
          },
        ],
      },
      {
        key: "holiday-pricing-management",
        icon: <CalendarOutlined />,
        label: "Quản lý Ngày lễ",
        children: [
          {
            key: "/admin/holiday-pricing",
            icon: <UnorderedListOutlined />,
            label: <Link to="/admin/holiday-pricing">Danh sách Ngày lễ</Link>,
          },
          {
            key: "/admin/holiday-pricing/create",
            icon: <PlusCircleOutlined />,
            label: <Link to="/admin/holiday-pricing/create">Thêm Ngày lễ</Link>,
          },
        ],
      },
      {
        key: "/admin/contact-messages",
        icon: <MessageOutlined />,
        label: <Link to="/admin/contact-messages">Tin nhắn offline</Link>,
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
    ],
    []
  );

  return (
    <div className="admin-sider">
      <div className="admin-sider__brand">
        <Avatar size={40} className="admin-sider__avatar">
          <UserOutlined />
        </Avatar>
        <div className="admin-sider__brandText">
          <div className="admin-sider__brandTitle">Quản trị viên</div>
          <div className="admin-sider__brandSub" title={email}>{email}</div>
        </div>
      </div>

      <div className="admin-sider__menuScroll">
        <Menu
          mode="inline"
          theme="dark"
          selectedKeys={[pathname]}
          defaultOpenKeys={getOpenKeys()}
          className="admin-sider__menu"
          items={menuItems}
        />
      </div>

      <div className="admin-sider__footer">
        <button type="button" className="admin-sider__logoutBtn" onClick={handleLogout}>
          <LogoutOutlined />
          <span className="admin-sider__logoutText">Đăng xuất</span>
        </button>
      </div>
    </div>
  );
};

export default AdminSidebar;