import { Button, Card, Form, Input, Select, Space, Typography, message } from 'antd';
import { useMutation } from '@tanstack/react-query';
import { createProvider } from '../../../services/api';
import { useNavigate } from 'react-router-dom';
import type { CreateProviderPayload } from '../../../types/provider.types';

const { Title, Text } = Typography;

const ProviderCreate = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm<CreateProviderPayload>();

  const { mutate, isPending } = useMutation({
    mutationFn: (payload: CreateProviderPayload) => createProvider(payload),
    onSuccess: () => {
      message.success('Tạo nhà cung cấp thành công');
      navigate('/admin/providers');
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || 'Tạo nhà cung cấp thất bại');
    },
  });

  const onFinish = (values: CreateProviderPayload) => {
    mutate(values);
  };

  return (
    <div>
      <Title level={3} style={{ marginTop: 0 }}>
        Thêm Nhà cung cấp mới
      </Title>
      <Text type="secondary">
        Nhập các trường bắt buộc: <b>Tên</b>. Các trường khác có thể để trống.
      </Text>

      <Card style={{ marginTop: 16 }}>
        <Form<CreateProviderPayload>
          form={form}
          layout="vertical"
          initialValues={{ status: 'active' }}
          onFinish={onFinish}
        >
          <Form.Item
            label="Tên nhà cung cấp"
            name="name"
            rules={[{ required: true, message: 'Vui lòng nhập tên nhà cung cấp' }]}
          >
            <Input placeholder="VD: Công ty du lịch ABC..." />
          </Form.Item>

          <Form.Item label="Mô tả" name="description">
            <Input.TextArea rows={3} placeholder="Mô tả về nhà cung cấp..." />
          </Form.Item>

          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Title level={5} style={{ margin: 0 }}>
              Thông tin liên hệ
            </Title>
            <Space wrap style={{ width: '100%' }}>
              <Form.Item label="Số điện thoại" name="phone" style={{ marginBottom: 0 }}>
                <Input placeholder="0123456789" style={{ width: 200 }} />
              </Form.Item>
              <Form.Item label="Email" name="email" style={{ marginBottom: 0 }}>
                <Input placeholder="provider@example.com" style={{ width: 260 }} />
              </Form.Item>
              <Form.Item label="Địa chỉ" name="address" style={{ marginBottom: 0, minWidth: 300 }}>
                <Input placeholder="Địa chỉ công ty..." />
              </Form.Item>
            </Space>
            <Form.Item label="Liên hệ khẩn cấp" name="emergency_contact">
              <Input placeholder="SĐT liên hệ khẩn cấp 24/7" style={{ maxWidth: 300 }} />
            </Form.Item>
          </Space>

          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Title level={5} style={{ margin: 0 }}>
              Hợp đồng & Giá ưu đãi
            </Title>
            <Form.Item label="Thông tin hợp đồng" name="contract_info">
              <Input.TextArea rows={2} placeholder="Số hợp đồng, ngày ký, thời hạn..." />
            </Form.Item>
            <Form.Item label="Mức giá ưu đãi" name="preferred_pricing">
              <Input.TextArea rows={2} placeholder="Ghi chú về giá ưu đãi, chiết khấu..." />
            </Form.Item>
          </Space>

          <Form.Item label="Trạng thái" name="status" style={{ maxWidth: 240 }}>
            <Select
              options={[
                { value: 'active', label: 'Hoạt động' },
                { value: 'inactive', label: 'Không hoạt động' },
              ]}
            />
          </Form.Item>

          <Space>
            <Button type="primary" htmlType="submit" loading={isPending}>
              Tạo nhà cung cấp
            </Button>
            <Button onClick={() => navigate('/admin/providers')}>Huỷ</Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
};

export default ProviderCreate;
