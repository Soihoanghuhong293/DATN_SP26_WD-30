import { Layout } from "antd";
import { Navigate, Outlet } from "react-router-dom";
import HdvSidebar from "../components/layout/HdvSidebar";
import HdvHeader from "../components/layout/HdvHeader";
import { useAuth } from "../auth/AuthProvider";
import { isHdvRole } from "../auth/roleHome";

const { Sider, Content } = Layout;

const HdvLayout = () => {
  const auth = useAuth();

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isHdvRole(auth.role)) {
    return <Navigate to="/" replace />;
  }

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider width={260} theme="light" breakpoint="lg" collapsedWidth="0">
        <HdvSidebar />
      </Sider>
      <Layout>
        <HdvHeader />
        <Content style={{ padding: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default HdvLayout;

