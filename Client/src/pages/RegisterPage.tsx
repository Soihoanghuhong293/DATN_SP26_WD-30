import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Form, Input, Button, message } from "antd";
import { UserOutlined, MailOutlined, LockOutlined } from "@ant-design/icons";
import { registerAPI } from "../services/auth";
import "./styles/RegisterPage.css";

const RegisterPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: {
    name: string;
    email: string;
    password: string;
  }) => {
    setLoading(true);
    try {
      await registerAPI(values);
      message.success("Đăng ký thành công");
      navigate("/login");
    } catch (err: any) {
      message.error(err.response?.data?.message || "Đăng ký thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-section">
        <div className="register-background">
          <div className="register-overlay" />
        </div>

        <div className="register-card">
          <div className="register-header">
            <h1 className="register-title">Đăng ký tài khoản</h1>
            <p className="register-subtitle">
              Tạo tài khoản để đặt tour và trải nghiệm dịch vụ tốt nhất
            </p>
          </div>

          <Form
            name="register"
            onFinish={onFinish}
            autoComplete="off"
            className="register-form"
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
              rules={[
                { required: true, message: "Vui lòng nhập mật khẩu" },
                { min: 6, message: "Mật khẩu tối thiểu 6 ký tự" },
              ]}
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
                className="register-btn"
                size="large"
              >
                Đăng ký
              </Button>
            </Form.Item>
          </Form>

          <div className="register-divider"> hoặc </div>

          <div className="register-login">
            <span className="register-login-text">Đã có tài khoản?</span>
            <Link to="/login" className="register-login-link">
              Đăng nhập ngay
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
