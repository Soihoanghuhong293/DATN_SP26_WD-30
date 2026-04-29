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
  LeftOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./AdminSidebar.css";
import { useAuth } from "../../auth/AuthProvider";
import { getMe } from "../../services/account";

type Props = {
  collapsed: boolean;
  onToggleCollapse: () => void;
};

const AdminSidebar = ({ collapsed, onToggleCollapse }: Props) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [openKeys, setOpenKeys] = useState<string[]>([]);

  const rootSubmenuKeys = useMemo(
    () => [
      "category-management",
      "tour-management",
      "guide-management",
      "provider-management",
      "booking-management",
      "holiday-pricing-management",
      "review-management",
    ],
    []
  );
  const auth = useAuth();
  const [profile, setProfile] = useState<{ email?: string; name?: string; avatarUrl?: string } | null>(null);
  const email = profile?.email || auth.email || "Admin";
  const displayName = profile?.name || "Quản trị viên";

  const handleLogout = () => {
    auth.logout();
    navigate("/login");
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!auth.token) return;
        const me = await getMe();
        if (mounted) setProfile({ email: me.email, name: me.name, avatarUrl: me.avatarUrl });
      } catch {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, [auth.token]);

  const getOpenKeys = () => {
    const keys = [];
    if (pathname.includes("/admin/tours")) keys.push("tour-management");
    if (pathname.includes("/admin/categories")) keys.push("category-management");
    if (pathname.includes("/admin/bookings")) keys.push("booking-management");
    if (pathname.includes("/admin/guides")) keys.push("guide-management");
    if (pathname.includes("/admin/providers")) keys.push("provider-management");
    if (pathname.includes("/admin/holiday-pricing")) keys.push("holiday-pricing-management");
    if (pathname.includes("/admin/tour-reviews")) keys.push("review-management");
    return keys;
  };

  useEffect(() => {
    if (collapsed) {
      setOpenKeys([]);
      return;
    }
    setOpenKeys(getOpenKeys());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, collapsed]);

  const menuItems = useMemo(
    () => [
      {
        key: "/admin/dashboard",
        icon: <DashboardOutlined />,
        label: "Tổng quan",
      },
      {
        key: "category-management",
        icon: <TagsOutlined />,
        label: "Quản lý Danh mục",
        onTitleClick: () =>
          setOpenKeys((prev) => (prev.includes("category-management") ? [] : ["category-management"])),
        children: [
          {
            key: "/admin/categories",
            icon: <UnorderedListOutlined />,
            label: "Danh sách danh mục",
          },
          {
            key: "/admin/categories/create",
            icon: <PlusCircleOutlined />,
            label: "Thêm danh mục",
          },
        ],
      },
      {
        key: "tour-management",
        icon: <AppstoreOutlined />,
        label: "Quản lý Tour",
        onTitleClick: () =>
          setOpenKeys((prev) => (prev.includes("tour-management") ? [] : ["tour-management"])),
        children: [
          {
            key: "/admin/tours",
            icon: <UnorderedListOutlined />,
            label: "Danh sách Tour",
          },
          {
            key: "/admin/tours/create",
            icon: <PlusCircleOutlined />,
            label: "Thêm Tour mới",
          },
          {
            key: "/admin/tour-templates",
            icon: <UnorderedListOutlined />,
            label: "Tour Templates",
          },
          {
            key: "/admin/tour-templates/create",
            icon: <PlusCircleOutlined />,
            label: "Thêm Template",
          },
        ],
      },
      {
        key: "guide-management",
        icon: <TeamOutlined />,
        label: "Quản lý Hướng dẫn viên",
        onTitleClick: () =>
          setOpenKeys((prev) => (prev.includes("guide-management") ? [] : ["guide-management"])),
        children: [
          {
            key: "/admin/guides",
            icon: <UnorderedListOutlined />,
            label: "Danh sách HDV",
          },
        ],
      },
      {
        key: "review-management",
        icon: <StarOutlined />,
        label: "Quản lý đánh giá",
        onTitleClick: () =>
          setOpenKeys((prev) => (prev.includes("review-management") ? [] : ["review-management"])),
        children: [
          {
            key: "/admin/tour-reviews",
            icon: <StarOutlined />,
            label: "Đánh giá tour & HDV",
          },
        ],
      },
      {
        key: "provider-management",
        icon: <ShopOutlined />,
        label: "Nhà cung cấp",
        onTitleClick: () =>
          setOpenKeys((prev) => (prev.includes("provider-management") ? [] : ["provider-management"])),
        children: [
          {
            key: "/admin/providers",
            icon: <UnorderedListOutlined />,
            label: "Danh sách nhà cung cấp",
          },
          {
            key: "/admin/providers/create",
            icon: <PlusCircleOutlined />,
            label: "Thêm nhà cung cấp",
          },
        ],
      },
      {
        key: "booking-management",
        icon: <BookOutlined />,
        label: "Quản lý Booking",
        onTitleClick: () =>
          setOpenKeys((prev) => (prev.includes("booking-management") ? [] : ["booking-management"])),
        children: [
          {
            key: "/admin/bookings",
            icon: <UnorderedListOutlined />,
            label: "Danh sách đơn",
          },
          {
            key: "/admin/bookings/create",
            icon: <PlusCircleOutlined />,
            label: "Tạo đơn mới",
          },
          // Lấy theo nhánh lastn: quản lý đơn hủy/hoàn tiền
          {
            key: "/admin/bookings/cancelled",
            icon: <UnorderedListOutlined />,
            label: "Quản lý tour hủy",
          },
        ],
      },
      {
        key: "holiday-pricing-management",
        icon: <CalendarOutlined />,
        label: "Quản lý Ngày lễ",
        onTitleClick: () =>
          setOpenKeys((prev) =>
            prev.includes("holiday-pricing-management") ? [] : ["holiday-pricing-management"]
          ),
        children: [
          {
            key: "/admin/holiday-pricing",
            icon: <UnorderedListOutlined />,
            label: "Danh sách Ngày lễ",
          },
          {
            key: "/admin/holiday-pricing/create",
            icon: <PlusCircleOutlined />,
            label: "Thêm Ngày lễ",
          },
        ],
      },
      {
        key: "/admin/contact-messages",
        icon: <MessageOutlined />,
        label: "Tin nhắn offline",
      },
      {
        key: "/admin/users",
        icon: <UserOutlined />,
        label: "Người dùng",
      },
      {
        key: "/admin/settings",
        icon: <SettingOutlined />,
        label: "Cài đặt",
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
          <div className="admin-sider__brandTitle">{displayName}</div>
          <div className="admin-sider__brandSub" title={email}>
            {email}
          </div>
        </div>
      </div>

      <div className="admin-sider__menuScroll">
        <Menu
          mode="inline"
          theme="dark"
          selectedKeys={[pathname]}
          openKeys={openKeys}
          triggerSubMenuAction="click"
          onOpenChange={(keys) => {
            const nextKeys = (keys as string[]) ?? [];
            const latest = nextKeys.find((k) => !openKeys.includes(k));
            if (latest && rootSubmenuKeys.includes(latest)) {
              setOpenKeys([latest]);
              return;
            }
            setOpenKeys(nextKeys.filter((k) => rootSubmenuKeys.includes(k)));
          }}
          className="admin-sider__menu"
          items={menuItems}
          onClick={(e) => {
            const key = String(e.key);
            if (key.startsWith("/")) navigate(key);
          }}
        />
      </div>

      <div className="admin-sider__footer">
        <button type="button" className="admin-sider__logoutBtn" onClick={handleLogout}>
          <LogoutOutlined />
          <span className="admin-sider__logoutText">Đăng xuất</span>
        </button>

        <button
          type="button"
          className="admin-sider__collapseBtn"
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollapse();
          }}
          aria-label={collapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
        >
          {collapsed ? <RightOutlined /> : <LeftOutlined />}
          <span className="admin-sider__collapseText">{collapsed ? "Mở rộng" : "Thu gọn"}</span>
        </button>
      </div>
    </div>
  );
};

export default AdminSidebar;