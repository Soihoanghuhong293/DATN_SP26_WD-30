import { Button, Card, Form, Input, Select, Space, Typography, message, Spin } from 'antd';
import { useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getProvider, updateProvider } from '../../../services/api';
import type { IProvider, UpdateProviderPayload } from '../../../types/provider.types';
import { useNavigate, useParams } from 'react-router-dom';

const { Title, Text } = Typography;

const ProviderEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [form] = Form.useForm<UpdateProviderPayload>();

  const {
    data: providerRes,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['provider', id],
    queryFn: () => getProvider(id || ''),
    enabled: Boolean(id),
  });

  const provider: IProvider | undefined = providerRes?.data?.provider;

  useEffect(() => {
    if (!provider) return;

    form.setFieldsValue({
      name: provider.name,
      description: provider.description ?? '',
      phone: provider.phone ?? '',
      email: provider.email ?? '',
      address: provider.address ?? '',
      emergency_contact: provider.emergency_contact ?? '',
      contract_info: provider.contract_info ?? '',
      preferred_pricing: provider.preferred_pricing ?? '',
      status: (provider.status as 'active' | 'inactive') || 'active',
    });
  }, [form, provider]);

  const { mutate, isPending } = useMutation({
    mutationFn: (payload: UpdateProviderPayload) => updateProvider(id || '', payload),
    onSuccess: () => {
      message.success('Cập nhật nhà cung cấp thành công');
      navigate('/admin/providers');
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || 'Cập nhật nhà cung cấp thất bại');
    },
  });

  const onFinish = (values: UpdateProviderPayload) => {
    mutate(values);
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Spin />
      </div>
    );
  }

  if (isError || !provider) {
    return (
      <div style={{ background: '#fff', padding: 16, border: '1px solid #eee' }}>
        <Text type="danger">
          Không tải được nhà cung cấp: {(error as any)?.message || 'Unknown error'}
        </Text>
        <div style={{ marginTop: 16 }}>
          <Button onClick={() => navigate('/admin/providers')}>Quay lại danh sách</Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Title level={3} style={{ marginTop: 0 }}>
        Sửa Nhà cung cấp
      </Title>
      <Text type="secondary">ID: {provider.id || provider._id}</Text>

      <Card style={{ marginTop: 16 }}>
        <Form<UpdateProviderPayload> form={form} layout="vertical" onFinish={onFinish}>
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
              Lưu thay đổi
            </Button>
            <Button onClick={() => navigate('/admin/providers')}>Huỷ</Button>
            <Button onClick={() => navigate(`/admin/providers/${id}`)}>Xem chi tiết</Button>
          </Space>

          <div style={{ marginTop: 16 }}>
            <Text type="secondary">
              Ngày tạo: {provider.created_at} | Ngày cập nhật: {provider.update_at}
            </Text>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default ProviderEdit;
