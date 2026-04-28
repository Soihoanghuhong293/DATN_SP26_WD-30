import { useState } from "react";
import { Layout } from "antd";
import { Outlet, Navigate } from "react-router-dom";
import AdminSidebar from "../components/layout/AdminSidebar";
import AdminHeader from "../components/layout/AdminHeader";
import { useAuth } from "../auth/AuthProvider";

const { Sider, Content } = Layout;

const AdminLayout = () => {
  const auth = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  // ❌ chưa login
  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // ❌ không phải admin
  if (auth.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  // ✅ admin hợp lệ
  return (
    <Layout style={{ height: "100vh", overflow: "hidden" }}>
      <Sider
        width={260}
        theme="dark"
        breakpoint="lg"
        collapsedWidth={80}
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={null}
        style={{ background: "#001529" }}
      >
        <AdminSidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed((v) => !v)} />
      </Sider>

      <Layout style={{ minWidth: 0, flex: 1, height: "100vh", overflow: "hidden" }}>
        <AdminHeader />

        <Content
          style={{
            padding: 24,
            minWidth: 0,
            overflow: "auto",
            height: "calc(100vh - 64px)",
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminLayout;