import { App, Button, Card, Col, Divider, Form, Input, Row, Skeleton, Typography, Upload, Space } from "antd";
import type { UploadProps } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { changePassword, getMe, updateMe } from "../services/account";
import { useAuth } from "../auth/AuthProvider";
import { uploadImage } from "../services/upload";

const { Title, Text } = Typography;

const HdvSettingsPage = () => {
  const { message: messageApi } = App.useApp();
  const auth = useAuth();
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const isAuthed = !!auth.token;
  const watchedEmail = Form.useWatch("email", profileForm);
  const watchedDisplayName = Form.useWatch("displayName", profileForm);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!isAuthed) return;
      try {
        setLoading(true);
        const user = await getMe();
        if (!mounted) return;
        profileForm.setFieldsValue({
          email: user.email,
          displayName: user.name,
          avatarUrl: user.avatarUrl || "",
        });
      } catch (e: any) {
        messageApi.error(e?.response?.data?.message || "Không tải được thông tin tài khoản");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [isAuthed, messageApi, profileForm]);

  const canSubmitProfile =
    !loading &&
    !savingProfile &&
    !!String(watchedEmail || "").trim() &&
    !!String(watchedDisplayName || "").trim();

  const onSaveProfile = async () => {
    if (savingProfile) return;
    try {
      const values = await profileForm.validateFields();
      setSavingProfile(true);
      const user = await updateMe({
        name: String(values.displayName || "").trim(),
        email: String(values.email || "").trim(),
        avatarUrl: String(values.avatarUrl || "").trim(),
      });
      // sync auth email in header/sidebar
      auth.login({ token: auth.token!, role: auth.role, email: user.email });
      messageApi.open({ type: "success", content: "Đã cập nhật thông tin", key: "profile" });
      profileForm.setFieldsValue({
        email: user.email,
        displayName: user.name,
        avatarUrl: user.avatarUrl || "",
      });
    } catch (e: any) {
      if (e?.errorFields) return;
      messageApi.open({
        type: "error",
        content: e?.response?.data?.message || "Cập nhật thất bại",
        key: "profile",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const avatarUploadProps: UploadProps = {
    maxCount: 1,
    showUploadList: false,
    beforeUpload: async (file) => {
      try {
        setAvatarUploading(true);
        const url = await uploadImage(file as File);
        profileForm.setFieldsValue({ avatarUrl: url });
        messageApi.open({ type: "success", content: "Đã upload avatar", key: "profile" });
      } catch (e: any) {
        messageApi.open({
          type: "error",
          content: e?.response?.data?.message || "Upload avatar thất bại",
          key: "profile",
        });
      } finally {
        setAvatarUploading(false);
      }
      return false;
    },
  };

  const onChangePassword = async () => {
    if (savingPassword) return;
    try {
      const values = await passwordForm.validateFields();
      if (values.newPassword !== values.confirmPassword) {
        passwordForm.setFields([{ name: "confirmPassword", errors: ["Mật khẩu nhập lại không khớp"] }]);
        return;
      }
      setSavingPassword(true);
      await changePassword({
        currentPassword: String(values.currentPassword),
        newPassword: String(values.newPassword),
      });
      messageApi.open({ type: "success", content: "Đã đổi mật khẩu", key: "password" });
      passwordForm.resetFields();
    } catch (e: any) {
      if (e?.errorFields) return;
      messageApi.open({
        type: "error",
        content: e?.response?.data?.message || "Đổi mật khẩu thất bại",
        key: "password",
      });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ marginBottom: 14 }}>
        <Title level={3} style={{ marginBottom: 4 }}>
          Cài đặt tài khoản
        </Title>
        <Text type="secondary">Cập nhật thông tin cá nhân và bảo mật tài khoản HDV.</Text>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card style={{ borderRadius: 16 }}>
            <Title level={4} style={{ marginBottom: 12 }}>
              Thông tin cá nhân
            </Title>

            {loading ? (
              <Skeleton active paragraph={{ rows: 5 }} />
            ) : (
              <Form form={profileForm} layout="vertical">
                <Form.Item label="Email" name="email" rules={[{ required: true }, { type: "email" }]}>
                  <Input size="large" placeholder="email@domain.com" />
                </Form.Item>

                <Form.Item label="Tên hiển thị" name="displayName" rules={[{ required: true, message: "Nhập tên hiển thị" }]}>
                  <Input size="large" placeholder="Tên của bạn" />
                </Form.Item>

                <Form.Item label="Avatar URL" name="avatarUrl">
                  <Input size="large" placeholder="https://..." />
                </Form.Item>

                <Space style={{ width: "100%", justifyContent: "space-between" }}>
                  <Upload {...avatarUploadProps}>
                    <Button icon={<UploadOutlined />} loading={avatarUploading}>
                      Upload avatar
                    </Button>
                  </Upload>

                  <Button type="primary" onClick={onSaveProfile} loading={savingProfile} disabled={!canSubmitProfile}>
                    Lưu thay đổi
                  </Button>
                </Space>
              </Form>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card style={{ borderRadius: 16 }}>
            <Title level={4} style={{ marginBottom: 12 }}>
              Đổi mật khẩu
            </Title>

            {loading ? (
              <Skeleton active paragraph={{ rows: 5 }} />
            ) : (
              <Form form={passwordForm} layout="vertical">
                <Form.Item
                  label="Mật khẩu hiện tại"
                  name="currentPassword"
                  rules={[{ required: true, message: "Nhập mật khẩu hiện tại" }]}
                >
                  <Input.Password size="large" placeholder="••••••••" />
                </Form.Item>

                <Form.Item
                  label="Mật khẩu mới"
                  name="newPassword"
                  rules={[
                    { required: true, message: "Nhập mật khẩu mới" },
                    { min: 6, message: "Mật khẩu mới phải từ 6 ký tự" },
                  ]}
                >
                  <Input.Password size="large" placeholder="••••••••" />
                </Form.Item>

                <Form.Item
                  label="Nhập lại mật khẩu mới"
                  name="confirmPassword"
                  rules={[{ required: true, message: "Nhập lại mật khẩu mới" }]}
                >
                  <Input.Password size="large" placeholder="••••••••" />
                </Form.Item>

                <Divider style={{ margin: "10px 0 14px" }} />

                <Button type="primary" onClick={onChangePassword} loading={savingPassword} block size="large">
                  Đổi mật khẩu
                </Button>
              </Form>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default HdvSettingsPage;

