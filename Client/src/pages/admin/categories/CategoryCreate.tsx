import { Button, Card, Form, Input, Select, Space, Typography, message } from 'antd';
import { useMutation } from '@tanstack/react-query';
import { createCategory } from '../../../services/api';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

type FormValues = {
  name: string;
  description?: string;
  status: 'active' | 'inactive';
};

const CategoryCreate = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm<FormValues>();

  const { mutate, isPending } = useMutation({
    mutationFn: (payload: FormValues) => createCategory(payload),
    onSuccess: () => {
      message.success('Tạo danh mục thành công');
      navigate('/admin/categories');
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || 'Tạo danh mục thất bại');
    },
  });

  const onFinish = (values: FormValues) => {
    mutate(values);
  };

  return (
    <div>
      <Title level={3} style={{ marginTop: 0 }}>
        Thêm Danh mục mới
      </Title>
      <Text type="secondary">
        Nhập các trường bắt buộc: <b>Tên</b>. Các trường khác có thể để trống.
      </Text>

      <Card style={{ marginTop: 16 }}>
        <Form<FormValues>
          form={form}
          layout="vertical"
          initialValues={{ status: 'active' }}
          onFinish={onFinish}
        >
          <Form.Item
            label="Tên danh mục"
            name="name"
            rules={[{ required: true, message: 'Vui lòng nhập tên danh mục' }]}
          >
            <Input placeholder="VD: Tour trong nước, Tour nước ngoài..." />
          </Form.Item>

          <Form.Item label="Mô tả" name="description">
            <Input.TextArea rows={3} placeholder="Mô tả chi tiết về danh mục..." />
          </Form.Item>

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
              Tạo danh mục
            </Button>
            <Button onClick={() => navigate('/admin/categories')}>Huỷ</Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
};

export default CategoryCreate;
