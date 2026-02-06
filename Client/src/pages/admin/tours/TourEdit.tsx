import { Button, Card, Form, Input, InputNumber, Select, Space, Typography, Upload, message, Spin } from 'antd';
import { useMemo, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getCategories, getTour, updateTour } from '../../../services/api';
import type { ICategory, ITour, ITourPriceTier } from '../../../types/tour.types';
import { useNavigate, useParams } from 'react-router-dom';

const { Title, Text } = Typography;

const splitLinesOrComma = (value: string | undefined) => {
  if (!value) return [];
  const raw = value.includes('\n') ? value.split('\n') : value.split(',');
  return raw.map((s) => s.trim()).filter(Boolean);
};

const joinLines = (arr?: string[]) => (arr && arr.length ? arr.join('\n') : '');

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

const TourEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams();
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

  const {
    data: tourRes,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['tour', id],
    queryFn: () => getTour(id || ''),
    enabled: Boolean(id),
  });

  const tour: ITour | undefined = tourRes?.data?.tour;

  useEffect(() => {
    if (!tour) return;

    const initial: FormValues = {
      category_id: tour.category_id,
      description: tour.description,
      duration_: tour.duration_,
      price: tour.price,
      status: (tour.status as any) || 'draft',
      suppliers: tour.suppliers ?? [],
      policiesText: joinLines(tour.policies),
      images: (tour.images ?? []).map((url) => ({
        fileList: [{ uid: '-1', name: 'image', status: 'done', url }],
      })),
      schedule: (tour.schedule ?? []).map((s) => ({
        day: s.day,
        title: s.title,
        activitiesText: joinLines(s.activities),
      })),
      prices: tour.prices ?? [],
    };

    form.setFieldsValue(initial);
  }, [form, tour]);

  const { mutate, isPending } = useMutation({
    mutationFn: (payload: any) => updateTour(id || '', payload),
    onSuccess: () => {
      message.success('Cập nhật tour thành công');
      navigate('/admin/tours');
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || 'Cập nhật tour thất bại');
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
          const file = i.fileList?.[0]?.originFileObj || i.fileList?.[0]?.url;
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

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Spin />
      </div>
    );
  }

  if (isError || !tour) {
    return (
      <div style={{ background: '#fff', padding: 16, border: '1px solid #eee' }}>
        <Text type="danger">Không tải được tour: {(error as any)?.message || 'Unknown error'}</Text>
      </div>
    );
  }

  return (
    <div>
      <Title level={3} style={{ marginTop: 0 }}>
        Sửa Tour
      </Title>
      <Text type="secondary">ID: {tour.id || tour._id}</Text>

      <Card style={{ marginTop: 16 }}>
        <Form<FormValues> form={form} layout="vertical" onFinish={onFinish}>
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
            <Input.TextArea rows={4} />
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
            <Input.TextArea rows={3} />
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
                        <Input />
                      </Form.Item>
                      <Form.Item
                        {...field}
                        label="Hoạt động - mỗi dòng 1 hoạt động"
                        name={[field.name, 'activitiesText']}
                        style={{ width: 420 }}
                      >
                        <Input.TextArea rows={2} />
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
                      <Input style={{ width: 240 }} />
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
                      <Input style={{ width: 320 }} />
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
              Lưu thay đổi
            </Button>
            <Button onClick={() => navigate('/admin/tours')}>Huỷ</Button>
          </Space>

          <div style={{ marginTop: 16 }}>
            <Text type="secondary">
              Ngày tạo: {tour.created_at} | Ngày cập nhật: {tour.update_at}
            </Text>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default TourEdit;
