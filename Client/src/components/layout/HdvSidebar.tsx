import { Menu, Avatar } from "antd";
import {
  DashboardOutlined,
  CalendarOutlined,
  CarOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  LeftOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import { getMe } from "../../services/account";
import "./AdminSidebar.css";

type Props = {
  collapsed: boolean;
  onToggleCollapse: () => void;
};

const HdvSidebar = ({ collapsed, onToggleCollapse }: Props) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const auth = useAuth();
  const [profile, setProfile] = useState<{ email?: string; name?: string; avatarUrl?: string } | null>(null);
  const email = profile?.email || auth.email || "HDV";
  const displayName = profile?.name || "Hướng dẫn viên";

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

  const menuItems = useMemo(
    () => [
      { key: "/hdv", icon: <DashboardOutlined />, label: <Link to="/hdv">Tổng quan</Link> },
      { key: "/hdv/tours", icon: <CarOutlined />, label: <Link to="/hdv/tours">Tour của tôi</Link> },
      { key: "/hdv/assigned-trips", icon: <CarOutlined />, label: <Link to="/hdv/assigned-trips">Trip được phân công</Link> },
      { key: "/hdv/schedule", icon: <CalendarOutlined />, label: <Link to="/hdv/schedule">Lịch làm việc</Link> },
      { key: "/hdv/settings", icon: <SettingOutlined />, label: <Link to="/hdv/settings">Cài đặt</Link> },
    ],
    []
  );

  return (
    <div className="admin-sider">
      <div className="admin-sider__brand">
        <Avatar size={40} className="admin-sider__avatar" src={profile?.avatarUrl}>
          <UserOutlined />
        </Avatar>
        <div className="admin-sider__brandText">
          <div className="admin-sider__brandTitle">{displayName}</div>
          <div className="admin-sider__brandSub">{email}</div>
        </div>
      </div>

      <div className="admin-sider__menuScroll">
        <Menu mode="inline" selectedKeys={[pathname]} className="admin-sider__menu" items={menuItems} />
      </div>

      <div className="admin-sider__footer">
        <button type="button" className="admin-sider__collapseBtn" onClick={onToggleCollapse}>
          {collapsed ? <RightOutlined /> : <LeftOutlined />}
          <span className="admin-sider__collapseText">{collapsed ? "Mở rộng" : "Thu gọn"}</span>
        </button>

        <button type="button" className="admin-sider__logoutBtn" onClick={handleLogout}>
          <LogoutOutlined />
          <span className="admin-sider__logoutText">Đăng xuất</span>
        </button>
      </div>
    </div>
  );
};

export default HdvSidebar;
