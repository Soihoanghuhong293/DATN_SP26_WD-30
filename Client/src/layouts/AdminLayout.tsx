import { Layout } from "antd";
import { Outlet, Navigate } from "react-router-dom";
import AdminSidebar from "../components/layout/AdminSidebar";
import AdminHeader from "../components/layout/AdminHeader";

const { Sider, Content } = Layout;

const AdminLayout = () => {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  // ❌ chưa đăng nhập
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // ❌ không phải admin
  if (role !== "admin") {
    return <Navigate to="/" replace />;
  }

  // ✅ admin hợp lệ
  return (
    <Layout style={{ minHeight: "100vh", background: "#f5f7f8" }}>
      <Sider
        width={260}
        theme="light"
        style={{
          borderRight: "1px solid #e5e7eb",
          background: "#fff",
        }}
      >
        <AdminSidebar />
      </Sider>

      <Layout>
        <AdminHeader />

        <Content
          style={{
            padding: "24px 32px",
            background: "#f5f7f8",
          }}
        >
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminLayout;