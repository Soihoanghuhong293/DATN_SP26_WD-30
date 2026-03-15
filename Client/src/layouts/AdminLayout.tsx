import { Layout } from "antd";
import { Outlet, Navigate } from "react-router-dom";
import AdminSidebar from "../components/layout/AdminSidebar";
import AdminHeader from "../components/layout/AdminHeader";

const { Sider, Content } = Layout;

const AdminLayout = () => {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  // ❌ chưa login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // ❌ không phải admin
  if (role !== "admin") {
    return <Navigate to="/" replace />;
  }

  // ✅ admin hợp lệ
  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider width={260} theme="light" breakpoint="lg" collapsedWidth="0">
        <AdminSidebar />
      </Sider>

      <Layout>
        <AdminHeader />

        <Content style={{ padding: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminLayout;