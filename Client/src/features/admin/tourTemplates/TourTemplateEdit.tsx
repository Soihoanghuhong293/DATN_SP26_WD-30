import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Button, Card, Col, Form, Input, InputNumber, message, Row, Select, Space, Spin, Typography, Upload } from 'antd';
import { getProviders, getRestaurants } from '../../../services/api';
import type { IProvider, IRestaurant } from '../../../types/provider.types';
import { ArrowLeftOutlined, MinusCircleOutlined, PlusOutlined, SaveOutlined, UploadOutlined } from '@ant-design/icons';

const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

type CategoryNode = {
  _id?: string;
  id?: string;
  name: string;
  children?: CategoryNode[];
};

const mealRefId = (v: any): string | undefined => {
  if (v == null || v === '') return undefined;
  if (typeof v === 'object' && v != null && v._id != null) return String(v._id);
  return String(v);
};

const normalizeScheduleForForm = (sched: any[] | undefined) => {
  if (!Array.isArray(sched)) {
    return [{ day: 1, title: '', activities: [], lunch_restaurant_id: undefined, dinner_restaurant_id: undefined }];
  }
  return sched.map((s, idx) => {
    const legacy = Array.isArray(s.restaurant_ids) ? s.restaurant_ids : [];
    let lunch = mealRefId(s.lunch_restaurant_id);
    let dinner = mealRefId(s.dinner_restaurant_id);
    if (!lunch && legacy[0]) lunch = mealRefId(legacy[0]);
    if (!dinner && legacy[1]) dinner = mealRefId(legacy[1]);
    return {
      day: typeof s.day === 'number' ? s.day : idx + 1,
      title: s.title ?? '',
      activities: Array.isArray(s.activities) ? s.activities : [],
      lunch_restaurant_id: lunch,
      dinner_restaurant_id: dinner,
    };
  });
};

const flattenCategoryTree = (nodes: CategoryNode[], level = 0): { value: string; label: string }[] => {
  const res: { value: string; label: string }[] = [];
  for (const n of nodes) {
    const value = (n._id || n.id || '') as string;
    if (value) {
      const prefix = level > 0 ? `${'— '.repeat(level)}` : '';
      res.push({ value, label: `${prefix}${n.name}` });
    }
    if (Array.isArray(n.children) && n.children.length) {
      res.push(...flattenCategoryTree(n.children, level + 1));
    }
  }
  return res;
};

export default function TourTemplateEdit() {
  const [form] = Form.useForm();
  const providerId = Form.useWatch('provider_id', form);
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [imageFileList, setImageFileList] = useState<any[]>([]);

  const { data: providersRes, isLoading: isProvidersLoading } = useQuery({
    queryKey: ['providers', { status: 'active' }],
    queryFn: () => getProviders({ status: 'active' }),
  });
  const providers: IProvider[] = providersRes?.data?.providers ?? [];

  const { data: restaurantsRes, isLoading: isRestaurantsLoading } = useQuery({
    queryKey: ['restaurants', providerId],
    queryFn: () => getRestaurants({ provider_id: providerId }),
    enabled: Boolean(providerId),
  });
  const restaurants: IRestaurant[] = restaurantsRes?.data?.restaurants ?? [];

  const restaurantOptions = useMemo(
    () =>
      restaurants
        .map((r) => ({
          value: r.id || r._id || '',
          label: `${r.name}${r.location ? ` — ${r.location}` : ''}${r.capacity ? ` (${r.capacity} chỗ)` : ''}`,
        }))
        .filter((o) => o.value),
    [restaurants]
  );

  const { data: categories = [], isLoading: isCategoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await axios.get('http://localhost:5000/api/v1/categories/tree');
      const data = res.data?.data?.categories || res.data?.data || res.data;
      return Array.isArray(data) ? data : [];
    },
  });

  const categoryOptions = useMemo(() => flattenCategoryTree(categories as CategoryNode[]), [categories]);

  const { data: template, isLoading } = useQuery({
    queryKey: ['tour-template', id],
    enabled: !!id,
    queryFn: async () => {
      const res = await axios.get(`http://localhost:5000/api/v1/tour-templates/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      return res.data?.data || res.data;
    },
  });

  useEffect(() => {
    if (!template) return;
    form.setFieldsValue({
      ...template,
      category_id: template.category_id?._id || template.category_id,
      provider_id: template.provider_id?._id || template.provider_id,
      schedule: normalizeScheduleForForm(template.schedule),
    });

    const existingImages = Array.isArray(template.images) ? template.images : [];
    setImageFileList(
      existingImages.map((url: string, idx: number) => ({
        uid: `existing-${idx}`,
        name: `image-${idx + 1}`,
        status: 'done',
        url,
      }))
    );
  }, [template, form]);

  const handleValuesChange = useMemo(
    () => (changedValues: any) => {
      if (changedValues.duration_days !== undefined) {
        const duration = changedValues.duration_days || 1;
        const currentSchedule = form.getFieldValue('schedule') || [];
        let next = [...currentSchedule];
        if (duration > currentSchedule.length) {
          for (let i = currentSchedule.length; i < duration; i++) {
            next.push({ day: i + 1, title: '', activities: [], lunch_restaurant_id: undefined, dinner_restaurant_id: undefined });
          }
        } else if (duration < currentSchedule.length) {
          next = next.slice(0, duration);
        }
        form.setFieldsValue({ schedule: next });
      }
    },
    [form]
  );

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      return await axios.put(`http://localhost:5000/api/v1/tour-templates/${id}`, values, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
    },
    onSuccess: () => {
      message.success('Đã cập nhật template');
      queryClient.invalidateQueries({ queryKey: ['tour-templates'] });
      queryClient.invalidateQueries({ queryKey: ['tour-template', id] });
      navigate('/admin/tour-templates');
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || 'Cập nhật thất bại');
    },
  });

  const onFinish = (values: any) => {
    const payload = { ...values };
    const imageUrls = imageFileList
      .filter((f) => f.status === 'done' && (f.url || f.response?.data?.url))
      .map((f) => f.url || f.response?.data?.url)
      .filter(Boolean);
    payload.images = imageUrls;
    mutation.mutate(payload);
  };

  const uploadEndpoint = useMemo(() => 'http://localhost:5000/api/v1/uploads/images', []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-[#f8fafc] min-h-screen font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Space size="middle">
            <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/tour-templates')} />
            <Title level={3} style={{ margin: 0, color: '#111827', fontWeight: 600 }}>
              Sửa Tour Template
            </Title>
          </Space>

          <Button
            type="primary"
            onClick={() => form.submit()}
            size="large"
            icon={<SaveOutlined />}
            loading={mutation.isPending}
            className="font-medium rounded-lg px-6"
          >
            LƯU
          </Button>
        </div>

        <Form form={form} layout="vertical" onFinish={onFinish} onValuesChange={handleValuesChange}>
          <Row gutter={24}>
            <Col xs={24} lg={14}>
              <Card className="rounded-2xl shadow-sm border border-gray-100 mb-6" bordered={false}>
                <div className="text-lg font-semibold text-gray-800 mb-4">Thông tin template</div>

                <Form.Item name="name" label="Tên template" rules={[{ required: true, message: 'Nhập tên template' }]}>
                  <Input size="large" className="rounded-lg" />
                </Form.Item>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="category_id" label="Danh mục">
                      <Select size="large" placeholder="Chọn danh mục..." loading={isCategoriesLoading} className="rounded-lg">
                        {categoryOptions.map((opt) => (
                          <Option key={opt.value} value={opt.value}>
                            {opt.label}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="duration_days" label="Thời lượng (Ngày)" rules={[{ required: true }]}>
                      <InputNumber min={1} className="w-full rounded-lg" size="large" />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  name="provider_id"
                  label="Nhà cung cấp (để chọn nhà hàng trong lịch trình)"
                  tooltip="Chọn NCC rồi mỗi ngày có thể chọn nhà hàng buổi trưa và buổi tối (đã khai báo cho NCC đó)."
                >
                  <Select
                    allowClear
                    showSearch
                    size="large"
                    placeholder="Chọn nhà cung cấp..."
                    loading={isProvidersLoading}
                    optionFilterProp="label"
                    options={providers
                      .map((p) => ({
                        value: p.id || p._id || '',
                        label: p.name,
                      }))
                      .filter((o) => o.value)}
                    onChange={() => {
                      const sched = form.getFieldValue('schedule') || [];
                      form.setFieldsValue({
                        schedule: sched.map((s: any) => ({
                          ...s,
                          lunch_restaurant_id: undefined,
                          dinner_restaurant_id: undefined,
                        })),
                      });
                    }}
                  />
                </Form.Item>

                <Form.Item name="description" label="Mô tả">
                  <TextArea rows={4} className="rounded-lg" />
                </Form.Item>
              </Card>

              <Card className="rounded-2xl shadow-sm border border-gray-100 mb-6" bordered={false}>
                <div className="text-lg font-semibold text-gray-800 mb-4">Ảnh template</div>
                <Upload
                  accept="image/*"
                  listType="picture-card"
                  fileList={imageFileList}
                  beforeUpload={(file) => {
                    const isImage = file.type?.startsWith('image/');
                    if (!isImage) {
                      message.error('Chỉ hỗ trợ file ảnh.');
                      return Upload.LIST_IGNORE;
                    }
                    const isLt10M = file.size / 1024 / 1024 < 10;
                    if (!isLt10M) {
                      message.error('Ảnh phải nhỏ hơn 10MB.');
                      return Upload.LIST_IGNORE;
                    }
                    return true;
                  }}
                  customRequest={async (options: any) => {
                    const { file, onSuccess, onError, onProgress } = options;
                    const fd = new FormData();
                    fd.append('image', file);
                    try {
                      const res = await axios.post(uploadEndpoint, fd, {
                        headers: { 'Content-Type': 'multipart/form-data' },
                        onUploadProgress: (evt) => {
                          if (!evt.total) return;
                          onProgress?.({ percent: Math.round((evt.loaded / evt.total) * 100) });
                        },
                      });
                      const url = res.data?.data?.url;
                      onSuccess?.({ ...res.data, url }, file);
                    } catch (e) {
                      onError?.(e);
                    }
                  }}
                  onChange={({ fileList }) => {
                    const normalized = fileList.map((f: any) => {
                      const url = f.url || f.response?.data?.url || f.response?.url;
                      return url ? { ...f, url } : f;
                    });
                    setImageFileList(normalized);
                  }}
                  multiple
                >
                  {imageFileList.length >= 8 ? null : (
                    <div>
                      <UploadOutlined />
                      <div style={{ marginTop: 8 }}>Upload</div>
                    </div>
                  )}
                </Upload>
              </Card>

              <Card className="rounded-2xl shadow-sm border border-gray-100 mb-6" bordered={false}>
                <div className="text-lg font-semibold text-gray-800 mb-2">Lịch trình mẫu</div>

                <Form.List name="schedule">
                  {(fields) => (
                    <div className="space-y-4">
                      {fields.map(({ key, name, ...restField }, index) => (
                        <div key={key} className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                          <div className="font-semibold text-purple-600 mb-3">Ngày {index + 1}</div>
                          <Form.Item {...restField} name={[name, 'day']} hidden>
                            <InputNumber />
                          </Form.Item>
                          <Row gutter={[16, 12]}>
                            <Col xs={24} md={8}>
                              <Form.Item {...restField} name={[name, 'title']} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                                <Input className="rounded-lg" placeholder="Tiêu đề" />
                              </Form.Item>
                            </Col>
                            <Col xs={24} md={16}>
                              <Form.Item {...restField} name={[name, 'activities']} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                                <Select mode="tags" open={false} className="rounded-lg" placeholder="Nhập hoạt động & Enter" />
                              </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                              <Form.Item {...restField} name={[name, 'lunch_restaurant_id']} style={{ marginBottom: 0 }} label="Nhà hàng buổi trưa">
                                <Select
                                  allowClear
                                  className="rounded-lg w-full"
                                  showSearch
                                  optionFilterProp="label"
                                  placeholder={
                                    providerId ? 'Chọn nhà hàng trưa' : 'Chọn nhà cung cấp trước'
                                  }
                                  disabled={!providerId}
                                  loading={isRestaurantsLoading}
                                  options={restaurantOptions}
                                  notFoundContent={providerId ? 'Chưa có nhà hàng — thêm tại NCC' : null}
                                />
                              </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                              <Form.Item {...restField} name={[name, 'dinner_restaurant_id']} style={{ marginBottom: 0 }} label="Nhà hàng buổi tối">
                                <Select
                                  allowClear
                                  className="rounded-lg w-full"
                                  showSearch
                                  optionFilterProp="label"
                                  placeholder={
                                    providerId ? 'Chọn nhà hàng tối' : 'Chọn nhà cung cấp trước'
                                  }
                                  disabled={!providerId}
                                  loading={isRestaurantsLoading}
                                  options={restaurantOptions}
                                  notFoundContent={providerId ? 'Chưa có nhà hàng — thêm tại NCC' : null}
                                />
                              </Form.Item>
                            </Col>
                          </Row>
                        </div>
                      ))}
                    </div>
                  )}
                </Form.List>
              </Card>
            </Col>

            <Col xs={24} lg={10}>
              <Card className="rounded-2xl shadow-sm border border-gray-100 mb-6" bordered={false}>
                <div className="text-lg font-semibold text-gray-800 mb-4">Chính sách</div>
                <Form.Item name="policies">
                  <Select mode="tags" open={false} className="rounded-lg" placeholder="Nhập chính sách & Enter" />
                </Form.Item>
              </Card>
            </Col>
          </Row>
        </Form>
      </div>
    </div>
  );
}

