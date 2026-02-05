import { Menu, Avatar } from "antd";
import {
  AppstoreOutlined,
  UserOutlined,
  SettingOutlined,
  BookOutlined,
  DashboardOutlined,
  PlusCircleOutlined,
  UnorderedListOutlined,
  TagsOutlined
} from "@ant-design/icons";
import { Link, useLocation } from "react-router-dom";

const AdminSidebar = () => {
  const { pathname } = useLocation();

  const getOpenKeys = () => {
    const keys = [];
    if (pathname.includes("/admin/tours")) keys.push("tour-management");
    if (pathname.includes("/admin/categories")) keys.push("category-management");
    if (pathname.includes("/admin/bookings")) keys.push("booking-management");
    return keys;
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
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
        defaultOpenKeys={getOpenKeys()} 
        style={{ border: "none" }}
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