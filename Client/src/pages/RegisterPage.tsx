import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Form, Input, Button, message } from "antd";
import { MailOutlined, LockOutlined, UserOutlined } from "@ant-design/icons";
import { registerAPI } from "../services/auth";
import "./styles/LoginPage.css";

const RegisterPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: { name: string; email: string; password: string }) => {
    setLoading(true);
    try {
      await registerAPI(values);
      message.success("Đăng ký thành công");
      navigate("/login");
    } catch (err: any) {
      message.error(err.response?.data?.message || "Register failed");
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
            <h1 className="login-title">Đăng ký</h1>
            <p className="login-subtitle">Tạo tài khoản để bắt đầu trải nghiệm</p>
          </div>

          <Form
            name="register"
            onFinish={onFinish}
            autoComplete="off"
            className="login-form"
            layout="vertical"
          >
            <Form.Item
              name="name"
              rules={[{ required: true, message: "Vui lòng nhập họ và tên" }]}
            >
              <Input
                prefix={<UserOutlined style={{ color: "#9ca3af" }} />}
                placeholder="Họ và tên"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="email"
              rules={[
                { required: true, message: "Vui lòng nhập email" },
                { type: "email", message: "Email không hợp lệ" },
              ]}
            >
              <Input
                prefix={<MailOutlined style={{ color: "#9ca3af" }} />}
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
                Đăng ký
              </Button>
            </Form.Item>
          </Form>

          <div className="login-divider"> hoặc </div>

          <div className="login-register">
            <span className="login-register-text">Đã có tài khoản?</span>
            <Link to="/login" className="login-register-link">
              Đăng nhập
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;