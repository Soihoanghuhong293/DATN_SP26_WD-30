import { Button, Card, Form, Input, Select, Space, Typography, message, Spin } from 'antd';
import { useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getCategories, getCategory, updateCategory } from '../../../services/api';
import type { ICategory } from '../../../types/tour.types';
import { useNavigate, useParams } from 'react-router-dom';

const { Title, Text } = Typography;

type FormValues = {
  name: string;
  description?: string;
  status: 'active' | 'inactive';
  parent_id?: string | null;
};

const CategoryEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [form] = Form.useForm<FormValues>();

  const {
    data: categoryRes,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['category', id],
    queryFn: () => getCategory(id || ''),
    enabled: Boolean(id),
  });

  const category: ICategory | undefined = categoryRes?.data?.category;

  const { data: categoriesRes, isLoading: isLoadingCategories } = useQuery({
    queryKey: ['categories', { status: 'active' }],
    queryFn: () => getCategories({ status: 'active' }),
  });
  const categories: ICategory[] = categoriesRes?.data?.categories ?? [];

  useEffect(() => {
    if (!category) return;

    form.setFieldsValue({
      name: category.name,
      description: category.description ?? '',
      status: (category.status as 'active' | 'inactive') || 'active',
      parent_id: category.parent_id ?? null,
    });
  }, [form, category]);

  const { mutate, isPending } = useMutation({
    mutationFn: (payload: FormValues) => updateCategory(id || '', payload),
    onSuccess: () => {
      message.success('Cập nhật danh mục thành công');
      navigate('/admin/categories');
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || 'Cập nhật danh mục thất bại');
    },
  });

  const onFinish = (values: FormValues) => {
    mutate(values);
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Spin />
      </div>
    );
  }

  if (isError || !category) {
    return (
      <div style={{ background: '#fff', padding: 16, border: '1px solid #eee' }}>
        <Text type="danger">
          Không tải được danh mục: {(error as any)?.message || 'Unknown error'}
        </Text>
      </div>
    );
  }

  return (
    <div>
      <Title level={3} style={{ marginTop: 0 }}>
        Sửa Danh mục
      </Title>
      <Text type="secondary">ID: {category.id || category._id}</Text>

      <Card style={{ marginTop: 16 }}>
        <Form<FormValues> form={form} layout="vertical" onFinish={onFinish}>
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

          <Form.Item label="Danh mục cha" name="parent_id">
            <Select
              allowClear
              loading={isLoadingCategories}
              placeholder="(Không chọn) = danh mục gốc"
              options={categories
                .filter((c) => (c.id || c._id) !== (category.id || category._id))
                .map((c) => ({ value: c.id || c._id, label: c.name }))}
            />
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
              Lưu thay đổi
            </Button>
            <Button onClick={() => navigate('/admin/categories')}>Huỷ</Button>
          </Space>

          <div style={{ marginTop: 16 }}>
            <Text type="secondary">
              Ngày tạo: {category.created_at} | Ngày cập nhật: {category.update_at}
            </Text>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default CategoryEdit;
