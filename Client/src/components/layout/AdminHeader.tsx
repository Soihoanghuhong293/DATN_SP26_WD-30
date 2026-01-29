import { Layout, Breadcrumb, Avatar, Badge } from "antd";
import { BellOutlined } from "@ant-design/icons";

const { Header } = Layout;

const AdminHeader = () => {
  return (
    <Header
      style={{
        height: 64,
        background: "#fff",
        padding: "0 32px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1px solid #e5e7eb",
      }}
    >
      <Breadcrumb
        items={[
          { title: "Trang chủ" },
          { title: "Quản lý" },
          { title: "Người dùng" },
        ]}
      />

      <div style={{ display: "flex", gap: 16 }}>
        <Badge dot>
          <BellOutlined style={{ fontSize: 18 }} />
        </Badge>
        <Avatar />
      </div>
    </Header>
  );
};

export default AdminHeader;
