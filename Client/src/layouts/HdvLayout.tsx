import { Layout } from "antd";
import { Navigate, Outlet } from "react-router-dom";
import HdvSidebar from "../components/layout/HdvSidebar";
import HdvHeader from "../components/layout/HdvHeader";

const { Sider, Content } = Layout;

const HdvLayout = () => {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (role !== "hdv" && role !== "guide") {
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

