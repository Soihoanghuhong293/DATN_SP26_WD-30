import React from 'react';
import { Form, Input, Select, Button, Upload, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';

const { TextArea } = Input;
const { Option } = Select;

interface TripPostFormProps {
  onSubmit: (values: any) => void;
  loading?: boolean;
  initialValues?: any;
}

const TripPostForm: React.FC<TripPostFormProps> = ({ onSubmit, loading = false, initialValues }) => {
  const [form] = Form.useForm();

  const handleSubmit = (values: any) => {
    // Xử lý images: chuyển từ fileList sang array URL (giả lập)
    const images = values.images?.fileList?.map((file: any) => file.url || file.thumbUrl) || [];
    const data = { ...values, images };
    onSubmit(data);
  };

  const uploadProps = {
    listType: 'picture-card',
    maxCount: 10,
    beforeUpload: (file: File) => {
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        message.error('Chỉ được upload file hình ảnh!');
        return false;
      }
      const isLt5M = file.size / 1024 / 1024 < 5;
      if (!isLt5M) {
        message.error('Hình ảnh phải nhỏ hơn 5MB!');
        return false;
      }
      return false; // Không upload tự động, xử lý thủ công
    },
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      initialValues={initialValues || { status: 'draft' }}
    >
      <Form.Item
        name="title"
        label="Tiêu đề"
        rules={[{ required: true, message: 'Vui lòng nhập tiêu đề!' }]}
      >
        <Input placeholder="Nhập tiêu đề bài viết" />
      </Form.Item>

      <Form.Item
        name="content"
        label="Nội dung"
        rules={[{ required: true, message: 'Vui lòng nhập nội dung!' }]}
      >
        <TextArea
          rows={4}
          placeholder="Nhập nội dung bài viết"
        />
      </Form.Item>

      <Form.Item
        name="images"
        label="Hình ảnh (tối đa 10 ảnh)"
      >
        <Upload {...uploadProps}>
          <Button icon={<UploadOutlined />}>Chọn hình ảnh</Button>
        </Upload>
      </Form.Item>

      <Form.Item
        name="status"
        label="Trạng thái"
        rules={[{ required: true, message: 'Vui lòng chọn trạng thái!' }]}
      >
        <Select placeholder="Chọn trạng thái">
          <Option value="draft">Bản nháp</Option>
          <Option value="private">Riêng tư</Option>
          <Option value="public">Công khai</Option>
        </Select>
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} block>
          Lưu bài viết
        </Button>
      </Form.Item>
    </Form>
  );
};

export default TripPostForm;