import { Layout } from "antd";

const { Header } = Layout;

const AdminHeader = () => {
  return (
    <Header
      style={{
        height: 64,
        background: "#fff",
        padding: "0 24px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1px solid #e5e7eb",
        position: "sticky",
        top: 0,
        zIndex: 1000,
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 600, color: "#1f2937" }}>
        Khu vực quản trị
      </div>
    </Header>
  );
};

export default AdminHeader;
