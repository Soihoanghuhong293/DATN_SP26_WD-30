import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Button, Card, Col, Form, Input, InputNumber, message, Row, Select, Space, Typography, Upload } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, UploadOutlined } from '@ant-design/icons';

const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

export default function TourTemplateCreate() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [imageFileList, setImageFileList] = useState<any[]>([]);

  const { data: categories = [], isLoading: isCategoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await axios.get('http://localhost:5000/api/v1/categories');
      const data = res.data?.data?.categories || res.data?.data || res.data;
      return Array.isArray(data) ? data : [];
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      return await axios.post('http://localhost:5000/api/v1/tour-templates', values, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
    },
    onSuccess: () => {
      message.success('Đã tạo template');
      queryClient.invalidateQueries({ queryKey: ['tour-templates'] });
      navigate('/admin/tour-templates');
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || 'Tạo template thất bại');
    },
  });

  const handleValuesChange = useMemo(
    () => (changedValues: any) => {
      if (changedValues.duration_days !== undefined) {
        const duration = changedValues.duration_days || 1;
        const currentSchedule = form.getFieldValue('schedule') || [];
        let next = [...currentSchedule];
        if (duration > currentSchedule.length) {
          for (let i = currentSchedule.length; i < duration; i++) {
            next.push({ day: i + 1, title: '', activities: [] });
          }
        } else if (duration < currentSchedule.length) {
          next = next.slice(0, duration);
        }
        form.setFieldsValue({ schedule: next });
      }
    },
    [form]
  );

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

  return (
    <div className="p-4 md:p-8 bg-[#f8fafc] min-h-screen font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Space size="middle">
            <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/tour-templates')} />
            <Title level={3} style={{ margin: 0, color: '#111827', fontWeight: 600 }}>
              Tạo Tour Template
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
            LƯU TEMPLATE
          </Button>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          onValuesChange={handleValuesChange}
          initialValues={{
            duration_days: 1,
            schedule: [{ day: 1, title: '', activities: [] }],
          }}
        >
          <Row gutter={24}>
            <Col xs={24} lg={14}>
              <Card className="rounded-2xl shadow-sm border border-gray-100 mb-6" bordered={false}>
                <div className="text-lg font-semibold text-gray-800 mb-4">Thông tin template</div>

                <Form.Item name="name" label="Tên template" rules={[{ required: true, message: 'Nhập tên template' }]}>
                  <Input size="large" className="rounded-lg" placeholder="VD: Template Hà Giang 3N2Đ" />
                </Form.Item>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="category_id" label="Danh mục">
                      <Select size="large" placeholder="Chọn danh mục..." loading={isCategoriesLoading} className="rounded-lg">
                        {Array.isArray(categories) &&
                          categories.map((cat: any) => (
                            <Option key={cat._id} value={cat._id}>
                              {cat.name}
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

                <Form.Item name="description" label="Mô tả">
                  <TextArea rows={4} className="rounded-lg" placeholder="Ghi chú về template..." />
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
                          <Row gutter={16}>
                            <Col span={8}>
                              <Form.Item {...restField} name={[name, 'title']} rules={[{ required: true, message: 'Nhập tiêu đề' }]} style={{ marginBottom: 0 }}>
                                <Input className="rounded-lg" placeholder="Tiêu đề" />
                              </Form.Item>
                            </Col>
                            <Col span={16}>
                              <Form.Item {...restField} name={[name, 'activities']} rules={[{ required: true, message: 'Nhập hoạt động' }]} style={{ marginBottom: 0 }}>
                                <Select mode="tags" open={false} className="rounded-lg" placeholder="Nhập hoạt động & Enter" />
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

