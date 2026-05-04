import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { Form, Input, Button, message } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { loginAPI } from "../services/auth";
import "./styles/LoginPage.css";
import { useAuth } from "../auth/AuthProvider";
import { roleHome } from "../auth/roleHome";
import { parseApiErrorFromAxios } from "../utils/axiosErrorMessage";

const LoginPage = () => {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const clearServerFieldErrors = () => {
    form.setFields([
      { name: "email", errors: [] },
      { name: "password", errors: [] },
    ]);
  };

  const applyServerLoginError = (parsed: ReturnType<typeof parseApiErrorFromAxios>) => {
    if (parsed.code === "INVALID_PASSWORD") {
      form.setFields([
        { name: "email", errors: [] },
        { name: "password", errors: ["Mật khẩu bạn nhập không khớp."] },
      ]);
      return;
    }
    if (parsed.code === "EMAIL_NOT_FOUND") {
      form.setFields([
        { name: "email", errors: [parsed.message] },
        { name: "password", errors: [] },
      ]);
      return;
    }
    form.setFields([
      { name: "email", errors: [parsed.message] },
      { name: "password", errors: [] },
    ]);
  };

  const onFinish = async (values: { email: string; password: string }) => {
    clearServerFieldErrors();
    setLoading(true);
    try {
      const payload = {
        email: values.email.trim(),
        password: values.password.trim(),
      };
      const res = await loginAPI(payload);
      const { token, role } = res.data;

      auth.login({ token, role, email: payload.email });

      message.success("Đăng nhập thành công — chào mừng bạn quay lại ViGo!");

      const from = (location.state as any)?.from;
      navigate(typeof from === "string" && from ? from : roleHome(role), { replace: true });
    } catch (err: unknown) {
      applyServerLoginError(parseApiErrorFromAxios(err, "Đăng nhập thất bại"));
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
            form={form}
            name="login"
            onFinish={onFinish}
            onValuesChange={() => clearServerFieldErrors()}
            autoComplete="off"
            className="login-form"
            layout="vertical"
            scrollToFirstError={{ behavior: "smooth", block: "center" }}
            validateTrigger={["onBlur", "onChange"]}
          >
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: "Vui lòng nhập địa chỉ email để đăng nhập." },
                {
                  type: "email",
                  message:
                    "Email chưa đúng định dạng (ví dụ: ten@gmail.com). Kiểm tra ký tự @ và phần sau @.",
                },
              ]}
            >
              <Input
                prefix={<UserOutlined style={{ color: "#9ca3af" }} />}
                placeholder="Nhập email đã đăng ký"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="Mật khẩu"
              rules={[
                {
                  required: true,
                  message: "Vui lòng nhập mật khẩu. Mật khẩu phân biệt chữ hoa/thường.",
                },
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
