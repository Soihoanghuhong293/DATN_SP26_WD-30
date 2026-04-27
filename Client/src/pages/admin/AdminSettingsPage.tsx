import { App, Button, Card, Col, Divider, Form, Input, Row, Skeleton, Typography, Upload, Space } from "antd";
import type { UploadProps } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { changePassword, getMe, updateMe } from "../../services/account";
import { useAuth } from "../../auth/AuthProvider";
import { getSystemSettings, updateSystemSettings, uploadSystemLogo } from "../../services/settings";
import { uploadImage } from "../../services/upload";

const { Title, Text } = Typography;

const AdminSettingsPage = () => {
  const { message: messageApi } = App.useApp();
  const auth = useAuth();
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [settingsForm] = Form.useForm();
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
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
  }, [isAuthed, profileForm]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingSettings(true);
        const settings = await getSystemSettings();
        if (!mounted) return;
        settingsForm.setFieldsValue({
          siteName: settings.siteName,
          logoUrl: settings.logoUrl || "",
          contactEmail: settings.contactEmail || "",
          contactPhone: settings.contactPhone || "",
        });
      } catch (e: any) {
        messageApi.error(e?.response?.data?.message || "Không tải được cài đặt chung");
      } finally {
        if (mounted) setLoadingSettings(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [messageApi, settingsForm]);

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
      auth.login({ token: auth.token!, role: auth.role, email: user.email });
      messageApi.open({ type: "success", content: "Đã cập nhật thông tin", key: "profile" });
      profileForm.setFieldsValue({ email: user.email, displayName: user.name, avatarUrl: user.avatarUrl || "" });
    } catch (e: any) {
      if (e?.errorFields) return; // antd validation
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
        passwordForm.setFields([
          { name: "confirmPassword", errors: ["Mật khẩu nhập lại không khớp"] },
        ]);
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

  const uploadProps: UploadProps = {
    maxCount: 1,
    showUploadList: false,
    beforeUpload: async (file) => {
      try {
        setLogoUploading(true);
        const url = await uploadSystemLogo(file as File);
        settingsForm.setFieldsValue({ logoUrl: url });
        messageApi.open({ type: "success", content: "Đã upload logo", key: "settings" });
      } catch (e: any) {
        messageApi.open({
          type: "error",
          content: e?.response?.data?.message || "Upload logo thất bại",
          key: "settings",
        });
      } finally {
        setLogoUploading(false);
      }
      return false; // prevent auto upload by antd
    },
  };

  const onSaveSettings = async () => {
    if (savingSettings) return;
    try {
      const values = await settingsForm.validateFields();
      setSavingSettings(true);
      await updateSystemSettings({
        siteName: String(values.siteName || "").trim(),
        logoUrl: String(values.logoUrl || "").trim(),
        contactEmail: String(values.contactEmail || "").trim(),
        contactPhone: String(values.contactPhone || "").trim(),
      });
      messageApi.open({ type: "success", content: "Đã cập nhật cài đặt chung", key: "settings" });
    } catch (e: any) {
      if (e?.errorFields) return;
      messageApi.open({
        type: "error",
        content: e?.response?.data?.message || "Cập nhật cài đặt chung thất bại",
        key: "settings",
      });
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>
          Cài đặt
        </Title>
        <Text type="secondary">Quản lý một số cấu hình cơ bản cho tài khoản quản trị.</Text>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Thông tin tài khoản" bordered={false}>
            {loading ? (
              <Skeleton active paragraph={{ rows: 4 }} />
            ) : (
              <Form form={profileForm} layout="vertical" requiredMark={false}>
                <Form.Item label="Avatar" name="avatarUrl">
                  <Space direction="vertical" style={{ width: "100%" }}>
                    <Input placeholder="URL avatar" />
                    <Upload {...avatarUploadProps} disabled={avatarUploading}>
                      <Button icon={<UploadOutlined />} loading={avatarUploading}>
                        Upload avatar
                      </Button>
                    </Upload>
                    {String(profileForm.getFieldValue("avatarUrl") || "").trim() ? (
                      <img
                        src={String(profileForm.getFieldValue("avatarUrl"))}
                        alt="avatar preview"
                        style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 16, border: "1px solid #f0f0f0" }}
                      />
                    ) : null}
                  </Space>
                </Form.Item>
                <Form.Item
                  label="Email"
                  name="email"
                  rules={[
                    { required: true, message: "Vui lòng nhập email" },
                    { type: "email", message: "Email không hợp lệ" },
                  ]}
                >
                  <Input placeholder="admin@example.com" />
                </Form.Item>
                <Form.Item
                  label="Tên hiển thị"
                  name="displayName"
                  rules={[{ required: true, message: "Vui lòng nhập tên hiển thị" }]}
                >
                  <Input placeholder="Quản trị viên" />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" onClick={onSaveProfile} loading={savingProfile} disabled={!canSubmitProfile}>
                    Lưu thay đổi
                  </Button>
                </Form.Item>
              </Form>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Đổi mật khẩu" bordered={false}>
            <Form form={passwordForm} layout="vertical" requiredMark={false}>
              <Form.Item
                label="Mật khẩu hiện tại"
                name="currentPassword"
                rules={[{ required: true, message: "Vui lòng nhập mật khẩu hiện tại" }]}
              >
                <Input.Password placeholder="Nhập mật khẩu hiện tại" />
              </Form.Item>
              <Form.Item
                label="Mật khẩu mới"
                name="newPassword"
                rules={[
                  { required: true, message: "Vui lòng nhập mật khẩu mới" },
                  { min: 6, message: "Mật khẩu mới phải từ 6 ký tự" },
                ]}
              >
                <Input.Password placeholder="Nhập mật khẩu mới" />
              </Form.Item>
              <Form.Item
                label="Nhập lại mật khẩu mới"
                name="confirmPassword"
                dependencies={["newPassword"]}
                rules={[
                  { required: true, message: "Vui lòng nhập lại mật khẩu mới" },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue("newPassword") === value) return Promise.resolve();
                      return Promise.reject(new Error("Mật khẩu nhập lại không khớp"));
                    },
                  }),
                ]}
              >
                <Input.Password placeholder="Nhập lại mật khẩu mới" />
              </Form.Item>
              <Form.Item>
                <Button type="primary" onClick={onChangePassword} loading={savingPassword} disabled={savingPassword}>
                  Cập nhật mật khẩu
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>

      <Divider style={{ margin: "20px 0" }} />

      <Card title="Cài đặt chung" bordered={false}>
        {loadingSettings ? (
          <Skeleton active paragraph={{ rows: 4 }} />
        ) : (
          <Form form={settingsForm} layout="vertical" requiredMark={false}>
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Tên website"
                  name="siteName"
                  rules={[{ required: true, message: "Vui lòng nhập tên website" }]}
                >
                  <Input placeholder="Tên website" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item label="Logo" name="logoUrl">
                  <Space direction="vertical" style={{ width: "100%" }}>
                    <Input placeholder="URL logo" />
                    <Upload {...uploadProps} disabled={logoUploading}>
                      <Button icon={<UploadOutlined />} loading={logoUploading}>
                        Upload logo
                      </Button>
                    </Upload>
                    {String(settingsForm.getFieldValue("logoUrl") || "").trim() ? (
                      <img
                        src={String(settingsForm.getFieldValue("logoUrl"))}
                        alt="logo preview"
                        style={{ height: 56, objectFit: "contain", borderRadius: 8, border: "1px solid #f0f0f0" }}
                      />
                    ) : null}
                  </Space>
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  label="Email liên hệ"
                  name="contactEmail"
                  rules={[{ type: "email", message: "Email không hợp lệ" }]}
                >
                  <Input placeholder="support@example.com" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item label="SĐT liên hệ" name="contactPhone">
                  <Input placeholder="VD: 0901 234 567" />
                </Form.Item>
              </Col>
            </Row>

            <Button type="primary" onClick={onSaveSettings} loading={savingSettings} disabled={savingSettings}>
              Lưu cài đặt chung
            </Button>
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">Thông tin này sẽ dùng để hiển thị toàn hệ thống (Header/Footer).</Text>
            </div>
          </Form>
        )}
      </Card>
    </div>
  );
};

export default AdminSettingsPage;

