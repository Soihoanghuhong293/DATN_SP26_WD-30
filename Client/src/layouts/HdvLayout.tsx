import { Layout } from "antd";
import { Navigate, Outlet } from "react-router-dom";
import HdvSidebar from "../components/layout/HdvSidebar";
import HdvHeader from "../components/layout/HdvHeader";
import { useAuth } from "../auth/AuthProvider";
import { isHdvRole } from "../auth/roleHome";
import { useState } from "react";

const { Sider, Content } = Layout;

const HdvLayout = () => {
  const auth = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isHdvRole(auth.role)) {
    return <Navigate to="/" replace />;
  }

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
        <HdvSidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed((v) => !v)} />
      </Sider>

      <Layout style={{ minWidth: 0, flex: 1, height: "100vh", overflow: "hidden" }}>
        <HdvHeader />
        <Content style={{ padding: 24, minWidth: 0, overflow: "auto", height: "calc(100vh - 64px)" }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default HdvLayout;

