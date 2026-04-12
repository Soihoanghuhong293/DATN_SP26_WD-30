import { Layout } from "antd";
import { Outlet, Navigate } from "react-router-dom";
import AdminSidebar from "../components/layout/AdminSidebar";
import AdminHeader from "../components/layout/AdminHeader";

const { Sider, Content } = Layout;

const AdminLayout = () => {
  const token = localStorage.getItem("token") || localStorage.getItem("admin_token");
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

      <Layout style={{ minWidth: 0, flex: 1 }}>
        <AdminHeader />

        <Content style={{ padding: 24, minWidth: 0, width: "100%" }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminLayout;