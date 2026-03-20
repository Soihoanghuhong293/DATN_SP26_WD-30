// import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Form, Input, Select, Button, Card, Typography, message, Space } from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;

const UserCreate = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createUserMutation = useMutation({
    mutationFn: async (values: any) => {
      await axios.post('http://localhost:5000/api/v1/auth/register', values);
    },
    onSuccess: () => {
      message.success('Tạo tài khoản thành công!');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      navigate('/admin/users'); 
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Lỗi khi tạo tài khoản!');
    }
  });

  const onFinish = (values: any) => {
    createUserMutation.mutate(values);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <Space className="mb-6">
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/users')}>
          Quay lại danh sách
        </Button>
        <Title level={3} style={{ margin: 0 }}>Thêm Tài Khoản Mới</Title>
      </Space>

      <Card className="shadow-sm max-w-2xl mx-auto">
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ role: 'user' }}
        >
          <Form.Item 
            name="name" 
            label="Họ và Tên (Tên hiển thị)" 
            rules={[{ required: true, message: 'Vui lòng nhập tên!' }]}
          >
            <Input placeholder="Ví dụ: Nguyễn Văn A" size="large" />
          </Form.Item>

          <Form.Item 
            name="email" 
            label="Địa chỉ Email (Dùng để đăng nhập)" 
            rules={[
              { required: true, message: 'Vui lòng nhập email!' },
              { type: 'email', message: 'Email không đúng định dạng!' }
            ]}
          >
            <Input placeholder="ví dụ: huongdanvien@vivutour.com" size="large" />
          </Form.Item>

          <Form.Item 
            name="password" 
            label="Mật khẩu" 
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu!' },
              { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự!' }
            ]}
          >
            <Input.Password placeholder="Nhập mật khẩu" size="large" />
          </Form.Item>

          <Form.Item 
            name="role" 
            label="Quyền hạn (Role)" 
            rules={[{ required: true }]}
            extra={<Text type="secondary">Hướng dẫn viên sẽ được chọn trong menu điều hành tour.</Text>}
          >
            <Select size="large">
              <Option value="user">Khách hàng (User)</Option>
              <Option value="guide">Hướng dẫn viên (Guide)</Option>
              <Option value="hdv">HDV</Option>
              <Option value="admin">Quản trị viên (Admin)</Option>
            </Select>
          </Form.Item>

          <Button 
            type="primary" 
            htmlType="submit" 
            block 
            size="large" 
            icon={<SaveOutlined />}
            loading={createUserMutation.isPending}
            className="mt-4 bg-blue-600 h-12"
          >
            TẠO TÀI KHOẢN NÀY
          </Button>
        </Form>
      </Card>
    </div>
  );
};

export default UserCreate;