import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Button, Card, Form, Input, Space, Typography, message } from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const API_URL = (import.meta as any)?.env?.VITE_API_URL || 'http://localhost:5000/api/v1';

export default function GuideCreate() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createGuideAccountMutation = useMutation({
    mutationFn: async (values: any) => {
      // Tạo account với role guide; backend sẽ auto tạo Guide doc tương ứng
      await axios.post(`${API_URL}/auth/register`, { ...values, role: 'guide' });
    },
    onSuccess: () => {
      message.success('Tạo tài khoản hướng dẫn viên thành công!');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['guides'] });
      navigate('/admin/guides');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Lỗi khi tạo tài khoản hướng dẫn viên!');
    },
  });

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <Space className="mb-6">
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/guides')}>
          Quay lại danh sách
        </Button>
        <Title level={3} style={{ margin: 0 }}>
          Thêm Hướng Dẫn Viên
        </Title>
      </Space>

      <Card className="shadow-sm max-w-2xl mx-auto">
        <Form form={form} layout="vertical" onFinish={(values) => createGuideAccountMutation.mutate(values)}>
          <Form.Item
            name="name"
            label="Họ và Tên"
            rules={[{ required: true, message: 'Vui lòng nhập tên!' }]}
          >
            <Input placeholder="Ví dụ: Nguyễn Văn A" size="large" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email (dùng để đăng nhập)"
            rules={[
              { required: true, message: 'Vui lòng nhập email!' },
              { type: 'email', message: 'Email không đúng định dạng!' },
            ]}
          >
            <Input placeholder="Ví dụ: huongdanvien@vivutour.com" size="large" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Mật khẩu"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu!' },
              { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự!' },
            ]}
            extra={<Text type="secondary">Tài khoản sẽ được tạo với quyền “Hướng dẫn viên”.</Text>}
          >
            <Input.Password placeholder="Nhập mật khẩu" size="large" />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            block
            size="large"
            icon={<SaveOutlined />}
            loading={createGuideAccountMutation.isPending}
            className="mt-4 bg-blue-600 h-12"
          >
            TẠO HƯỚNG DẪN VIÊN
          </Button>
        </Form>
      </Card>
    </div>
  );
}

