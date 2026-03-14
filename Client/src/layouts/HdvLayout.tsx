import { Layout } from "antd";
import { Navigate, Outlet } from "react-router-dom";

const { Content } = Layout;

const HdvLayout = () => {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Content style={{ padding: 24 }}>
        <Outlet />
      </Content>
    </Layout>
  );
};

export default HdvLayout;

