import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { Button, Form, Input, Steps, message } from "antd";
import { MailOutlined, LockOutlined, SafetyOutlined } from "@ant-design/icons";
import {
  forgotPasswordAPI,
  resetPasswordAPI,
  verifyForgotPasswordOtpAPI,
} from "../services/auth";
import "./styles/LoginPage.css";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const query = useQuery();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState<string>("");
  const [token, setToken] = useState<string>("");

  useEffect(() => {
    const qEmail = query.get("email") || "";
    const qToken = query.get("token") || "";
    if (qEmail && qToken) {
      setEmail(qEmail);
      setToken(qToken);
      setStep(2);
    }
  }, [query]);

  const submitEmail = async (values: { email: string }) => {
    setLoading(true);
    try {
      const normalized = values.email.trim();
      setEmail(normalized);
      await forgotPasswordAPI({ email: normalized });
      message.success("Nếu email tồn tại, hệ thống đã gửi OTP/link reset.");
      setStep(1);
    } catch (err: any) {
      message.error(err.response?.data?.message || "Không thể gửi yêu cầu");
    } finally {
      setLoading(false);
    }
  };

  const submitOtp = async (values: { otp: string }) => {
    setLoading(true);
    try {
      const res = await verifyForgotPasswordOtpAPI({ email, otp: values.otp.trim() });
      const t = res.data?.token as string | undefined;
      if (!t) throw new Error("Missing token");
      setToken(t);
      message.success("Xác thực OTP thành công");
      setStep(2);
    } catch (err: any) {
      message.error(err.response?.data?.message || "OTP không hợp lệ hoặc đã hết hạn");
    } finally {
      setLoading(false);
    }
  };

  const submitNewPassword = async (values: { newPassword: string; confirmPassword: string }) => {
    setLoading(true);
    try {
      if (values.newPassword !== values.confirmPassword) {
        message.error("Mật khẩu xác nhận không khớp");
        return;
      }
      await resetPasswordAPI({ email, token, newPassword: values.newPassword });
      message.success("Cập nhật mật khẩu thành công. Vui lòng đăng nhập lại.");
      navigate("/login");
    } catch (err: any) {
      message.error(err.response?.data?.message || "Không thể cập nhật mật khẩu");
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
            <h1 className="login-title">Quên mật khẩu</h1>
            <p className="login-subtitle">Khôi phục mật khẩu bằng OTP hoặc link reset</p>
          </div>

          <Steps
            size="small"
            current={step}
            items={[
              { title: "Nhập email" },
              { title: "Xác thực OTP" },
              { title: "Mật khẩu mới" },
            ]}
            style={{ marginBottom: 20 }}
          />

          {step === 0 && (
            <Form layout="vertical" onFinish={submitEmail} className="login-form" autoComplete="off">
              <Form.Item
                name="email"
                rules={[
                  { required: true, message: "Vui lòng nhập email" },
                  { type: "email", message: "Email không hợp lệ" },
                ]}
              >
                <Input
                  prefix={<MailOutlined style={{ color: "#9ca3af" }} />}
                  placeholder="Email đã đăng ký"
                  size="large"
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  className="login-btn"
                  size="large"
                >
                  Gửi OTP / Link reset
                </Button>
              </Form.Item>
            </Form>
          )}

          {step === 1 && (
            <Form layout="vertical" onFinish={submitOtp} className="login-form" autoComplete="off">
              <div style={{ marginBottom: 12, color: "#6b7280", fontSize: 14 }}>
                Nhập OTP đã gửi về email: <b>{email}</b>
              </div>

              <Form.Item
                name="otp"
                rules={[
                  { required: true, message: "Vui lòng nhập OTP" },
                  { len: 6, message: "OTP gồm 6 chữ số" },
                ]}
              >
                <Input
                  prefix={<SafetyOutlined style={{ color: "#9ca3af" }} />}
                  placeholder="OTP (6 chữ số)"
                  size="large"
                  inputMode="numeric"
                />
              </Form.Item>

              <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                <Button
                  onClick={() => setStep(0)}
                  size="large"
                  style={{ flex: 1 }}
                  disabled={loading}
                >
                  Quay lại
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  className="login-btn"
                  size="large"
                  style={{ flex: 1 }}
                >
                  Xác thực
                </Button>
              </div>
            </Form>
          )}

          {step === 2 && (
            <Form layout="vertical" onFinish={submitNewPassword} className="login-form" autoComplete="off">
              <div style={{ marginBottom: 12, color: "#6b7280", fontSize: 14 }}>
                Đặt lại mật khẩu cho: <b>{email}</b>
              </div>

              <Form.Item
                name="newPassword"
                rules={[{ required: true, message: "Vui lòng nhập mật khẩu mới" }]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: "#9ca3af" }} />}
                  placeholder="Mật khẩu mới"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                dependencies={["newPassword"]}
                rules={[{ required: true, message: "Vui lòng xác nhận mật khẩu" }]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: "#9ca3af" }} />}
                  placeholder="Xác nhận mật khẩu mới"
                  size="large"
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  className="login-btn"
                  size="large"
                  disabled={!token || !email}
                >
                  Cập nhật mật khẩu
                </Button>
              </Form.Item>
            </Form>
          )}

          <div className="login-divider"> hoặc </div>
          <div className="login-register">
            <span className="login-register-text">Đã nhớ mật khẩu?</span>
            <Link to="/login" className="login-register-link">
              Đăng nhập
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;

