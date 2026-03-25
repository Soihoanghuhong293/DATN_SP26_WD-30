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
} from "@ant-design/icons";
import { Link, useLocation, useNavigate } from "react-router-dom";

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
    return keys;
  };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", position: "sticky", top: 0 }}>
      <div style={{ padding: 24, display: "flex", gap: 12, alignItems: "center" }}>
        <Avatar size={40} style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
          <UserOutlined />
        </Avatar>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Quản trị viên</div>
          <div style={{ fontSize: 12, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis" }}>
            {email}
          </div>
        </div>
      </div>

      <Menu
        mode="inline"
        selectedKeys={[pathname]}
        defaultOpenKeys={getOpenKeys()}
        style={{ border: "none", flex: 1, overflowY: "auto", overflowX: "hidden" }}
        items={[
         
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

export default AdminSidebar;