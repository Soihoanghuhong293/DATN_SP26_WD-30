import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Form, Input, Button, message } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { loginAPI } from "../services/auth";
import { useAuth } from "../auth/AuthProvider";
import { roleHome } from "../auth/roleHome";

const AdminLoginPage = () => {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      const res = await loginAPI(values);
      const { token, role } = res.data;

      if (role !== "admin") {
        message.error("Không phải tài khoản admin");
        return;
      }

      auth.login({ token, role, email: values.email });
      message.success("Đăng nhập admin thành công");

      const from = (location.state as any)?.from;
      navigate(typeof from === "string" && from ? from : roleHome(role), { replace: true });
    } catch (err: any) {
      message.error(err.response?.data?.message || "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ width: "min(420px, 100%)" }}>
        <h2 style={{ textAlign: "center", marginBottom: 16 }}>Đăng nhập Admin</h2>
        <Form name="admin-login" onFinish={onFinish} autoComplete="off" layout="vertical">
          <Form.Item
            name="email"
            rules={[
              { required: true, message: "Vui lòng nhập email" },
              { type: "email", message: "Email không hợp lệ" },
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder="Email" size="large" />
          </Form.Item>

          <Form.Item name="password" rules={[{ required: true, message: "Vui lòng nhập mật khẩu" }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu" size="large" />
          </Form.Item>

          <Button type="primary" htmlType="submit" loading={loading} block size="large">
            Đăng nhập
          </Button>
        </Form>
      </div>
    </div>
  );
};

export default AdminLoginPage;