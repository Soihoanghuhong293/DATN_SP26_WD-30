import { Button, Card, Form, Input, InputNumber, Select, Space, Typography, Upload, message } from 'antd';
import { useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createTour, getCategories } from '../../../services/api';
import type { ICategory, ITourPriceTier } from '../../../types/tour.types';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

const splitLinesOrComma = (value: string | undefined) => {
  if (!value) return [];
  const raw = value.includes('\n') ? value.split('\n') : value.split(',');
  return raw.map((s) => s.trim()).filter(Boolean);
};

type FormValues = {
  category_id?: string;
  description: string;
  duration_: number;
  price: number;
  status: 'draft' | 'active' | 'inactive';
  suppliers?: string[];
  policiesText?: string;
  images?: { fileList?: any }[];
  schedule?: { day: number; title?: string; activitiesText?: string }[];
  prices?: ITourPriceTier[];
};

const TourCreate = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm<FormValues>();

  const { data: categoriesRes, isLoading: loadingCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const categories: ICategory[] = categoriesRes?.data?.categories ?? [];
  const categoryOptions = useMemo(
    () => categories.map((c) => ({ value: c.id || c._id, label: c.name })),
    [categories]
  );

  const { mutate, isPending } = useMutation({
    mutationFn: (payload: any) => createTour(payload),
    onSuccess: () => {
      message.success('Tạo tour thành công');
      navigate('/admin/tours');
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || 'Tạo tour thất bại');
    },
  });

  const onFinish = (values: FormValues) => {
    const payload = {
      category_id: values.category_id,
      description: values.description,
      duration_: values.duration_,
      price: values.price,
      status: values.status,
      suppliers: values.suppliers ?? [],
      policies: splitLinesOrComma(values.policiesText),
      images: (values.images ?? [])
        .map((i) => {
          const file = i.fileList?.[0]?.originFileObj || i.fileList?.[0];
          return file;
        })
        .filter(Boolean),
      schedule: (values.schedule ?? []).map((s) => ({
        day: s.day,
        title: s.title || '',
        activities: splitLinesOrComma(s.activitiesText),
      })),
      prices: (values.prices ?? []).filter((p) => p?.title && typeof p?.amount === 'number'),
    };

    mutate(payload);
  };

  return (
    <div>
      <Title level={3} style={{ marginTop: 0 }}>
        Thêm Tour mới
      </Title>
      <Text type="secondary">
        Nhập các trường bắt buộc: <b>Mô tả</b>, <b>Thời lượng</b>, <b>Giá</b>. Các trường khác có
        thể để trống.
      </Text>

      <Card style={{ marginTop: 16 }}>
        <Form<FormValues>
          form={form}
          layout="vertical"
          initialValues={{
            status: 'draft',
            suppliers: [],
            images: [],
            schedule: [],
            prices: [],
            duration_: 1,
            price: 0,
          }}
          onFinish={onFinish}
        >
          <Form.Item label="Danh mục" name="category_id">
            <Select
              allowClear
              loading={loadingCategories}
              placeholder="Chọn danh mục (tuỳ chọn)"
              options={categoryOptions}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>

          <Form.Item
            label="Mô tả"
            name="description"
            rules={[{ required: true, message: 'Vui lòng nhập mô tả' }]}
          >
            <Input.TextArea rows={4} placeholder="VD: Tour Đà Nẵng 3N2Đ..." />
          </Form.Item>

          <Space style={{ display: 'flex' }} size={16} align="start" wrap>
            <Form.Item
              label="Thời lượng (ngày)"
              name="duration_"
              rules={[{ required: true, message: 'Vui lòng nhập thời lượng' }]}
              style={{ minWidth: 220 }}
            >
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              label="Giá"
              name="price"
              rules={[{ required: true, message: 'Vui lòng nhập giá' }]}
              style={{ minWidth: 220 }}
            >
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item label="Trạng thái" name="status" style={{ minWidth: 220 }}>
              <Select
                options={[
                  { value: 'draft', label: 'Bản nháp' },
                  { value: 'active', label: 'Hoạt động' },
                  { value: 'inactive', label: 'Không hoạt động' },
                ]}
              />
            </Form.Item>
          </Space>

          <Form.Item label="Nhà cung cấp" name="suppliers">
            <Select mode="tags" placeholder="Nhập nhà cung cấp và nhấn Enter" />
          </Form.Item>

          <Form.Item label="Chính sách - mỗi dòng 1 chính sách" name="policiesText">
            <Input.TextArea rows={3} placeholder="VD:\nHoàn huỷ trước 7 ngày\nTrẻ em dưới 5 tuổi miễn phí" />
          </Form.Item>

          <Form.List name="images">
            {(fields, { add, remove }) => (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text strong>Ảnh</Text>
                  <Button onClick={() => add({ fileList: [] })}>Thêm ảnh</Button>
                </div>
                {fields.map((field) => (
                  <Space key={field.key} style={{ display: 'flex', marginBottom: 8 }} align="start">
                    <Form.Item
                      {...field}
                      name={[field.name, 'fileList']}
                      rules={[{ required: true, message: 'Chọn file ảnh' }]}
                      valuePropName="fileList"
                    >
                      <Upload
                        maxCount={1}
                        beforeUpload={() => false}
                        accept="image/*"
                        style={{ width: 520 }}
                      >
                        <Button>Chọn ảnh</Button>
                      </Upload>
                    </Form.Item>
                    <Button danger onClick={() => remove(field.name)}>
                      Xoá
                    </Button>
                  </Space>
                ))}
              </div>
            )}
          </Form.List>

          <Form.List name="schedule">
            {(fields, { add, remove }) => (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text strong>Lịch trình</Text>
                  <Button onClick={() => add({ day: fields.length + 1 })}>Thêm ngày</Button>
                </div>
                {fields.map((field) => (
                  <Card key={field.key} size="small" style={{ marginBottom: 12 }}>
                    <Space align="start" size={12} wrap>
                      <Form.Item
                        {...field}
                        label="Ngày"
                        name={[field.name, 'day']}
                        rules={[{ required: true, message: 'Nhập ngày' }]}
                        style={{ width: 120 }}
                      >
                        <InputNumber min={1} style={{ width: '100%' }} />
                      </Form.Item>
                      <Form.Item {...field} label="Tiêu đề" name={[field.name, 'title']} style={{ width: 320 }}>
                        <Input placeholder="VD: Tham quan..." />
                      </Form.Item>
                      <Form.Item
                        {...field}
                        label="Hoạt động - mỗi dòng 1 hoạt động"
                        name={[field.name, 'activitiesText']}
                        style={{ width: 420 }}
                      >
                        <Input.TextArea rows={2} placeholder={'Check-in\nĂn trưa\n...' } />
                      </Form.Item>
                      <Button danger onClick={() => remove(field.name)}>
                        Xoá ngày
                      </Button>
                    </Space>
                  </Card>
                ))}
              </div>
            )}
          </Form.List>

          <Form.List name="prices">
            {(fields, { add, remove }) => (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text strong>Giá theo gói</Text>
                  <Button onClick={() => add({ title: '', amount: 0 })}>Thêm gói giá</Button>
                </div>
                {fields.map((field) => (
                  <Space key={field.key} style={{ display: 'flex', marginBottom: 8 }} align="start" wrap>
                    <Form.Item
                      {...field}
                      label="Tiêu đề"
                      name={[field.name, 'title']}
                      rules={[{ required: true, message: 'Nhập tiêu đề' }]}
                    >
                      <Input placeholder="VD: Người lớn" style={{ width: 240 }} />
                    </Form.Item>
                    <Form.Item
                      {...field}
                      label="Số tiền"
                      name={[field.name, 'amount']}
                      rules={[{ required: true, message: 'Nhập số tiền' }]}
                    >
                      <InputNumber min={0} style={{ width: 180 }} />
                    </Form.Item>
                    <Form.Item {...field} label="Ghi chú" name={[field.name, 'note']}>
                      <Input placeholder="Tuỳ chọn" style={{ width: 320 }} />
                    </Form.Item>
                    <Button danger onClick={() => remove(field.name)}>
                      Xoá
                    </Button>
                  </Space>
                ))}
              </div>
            )}
          </Form.List>

          <Space>
            <Button type="primary" htmlType="submit" loading={isPending}>
              Tạo tour
            </Button>
            <Button onClick={() => navigate('/admin/tours')}>Huỷ</Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
};

export default TourCreate;
