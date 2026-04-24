import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { Form, Input, Button, message } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { loginAPI } from "../services/auth";
import "./styles/LoginPage.css";
import { useAuth } from "../auth/AuthProvider";
import { roleHome } from "../auth/roleHome";

const LoginPage = () => {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      const res = await loginAPI(values);
      const { token, role } = res.data;

      auth.login({ token, role, email: values.email });

      message.success("Đăng nhập thành công");

      const from = (location.state as any)?.from;
      navigate(typeof from === "string" && from ? from : roleHome(role), { replace: true });
    } catch (err: any) {
      message.error(err.response?.data?.message || "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-section">
        <div className="login-background">
          <div className="login-overlay" />
        </div>

        <div className="login-card">
          <div className="login-header">
            <h1 className="login-title">Đăng nhập</h1>
            <p className="login-subtitle">
              Chào mừng trở lại! Vui lòng đăng nhập để tiếp tục
            </p>
          </div>

          <Form
            name="login"
            onFinish={onFinish}
            autoComplete="off"
            className="login-form"
            layout="vertical"
          >
            <Form.Item
              name="email"
              rules={[
                { required: true, message: "Vui lòng nhập email" },
                { type: "email", message: "Email không hợp lệ" },
              ]}
            >
              <Input
                prefix={<UserOutlined style={{ color: "#9ca3af" }} />}
                placeholder="Email"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: "Vui lòng nhập mật khẩu" }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: "#9ca3af" }} />}
                placeholder="Mật khẩu"
                size="large"
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: 32 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                className="login-btn"
                size="large"
              >
                Đăng nhập
              </Button>
            </Form.Item>
          </Form>

          <div className="login-divider"> hoặc </div>

          <div className="login-register">
            <span className="login-register-text">Chưa có tài khoản?</span>
            <Link to="/register" className="login-register-link">
              Đăng ký ngay
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
