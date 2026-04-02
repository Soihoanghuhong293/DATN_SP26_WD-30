import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { getCategoryTree, getProviders } from '../../../services/api';
import { 
  Form, Input, InputNumber, Button, Card, Row, Col, 
  Space, Typography, message, Select, Divider, Spin, 
  DatePicker, Upload
} from 'antd';
import { 
  MinusCircleOutlined, PlusOutlined, 
  ArrowLeftOutlined, SaveOutlined 
} from '@ant-design/icons';
import './TourCreate.css'; 

const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const DEFAULT_PRICE_CATEGORIES = [
  { name: 'Người lớn', price: 0 },
  { name: 'Trẻ em (0-10 tuổi)', price: 0 }
];

import type { ICategory } from '../../../types/tour.types';
import { flattenCategoryTree as flattenTree } from '../../../utils/categoryTree';

const TourCreate = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [imageFileList, setImageFileList] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>(undefined);
  const [rawTourName, setRawTourName] = useState<string>('');
  const [selectedDepartureDate, setSelectedDepartureDate] = useState<any>(null);

  const { data: categoryRes, isLoading: isCategoriesLoading } = useQuery({
    queryKey: ['categories', { tree: true }],
    queryFn: () => getCategoryTree({ status: 'active' }),
  });
  const categories: ICategory[] = (categoryRes as any)?.data?.categories ?? [];
  const categoryOptions = useMemo(() => flattenTree(categories, { includePath: true }), [categories]);

  const { data: providersData, isLoading: isProvidersLoading } = useQuery({
    queryKey: ['providers'],
    queryFn: () => getProviders({ status: 'active' }),
  });
  const providers = providersData?.data?.providers ?? [];

  const { data: tourTemplates = [] } = useQuery({
    queryKey: ['tour-templates'],
    queryFn: async () => {
      const res = await axios.get('http://localhost:5000/api/v1/tour-templates', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      return res.data?.data || res.data || [];
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      return await axios.post('http://localhost:5000/api/v1/tours', values);
    },
    onSuccess: () => {
      message.success('Thêm tour mới thành công!');
      queryClient.invalidateQueries({ queryKey: ['tours'] }); 
      navigate('/admin/tours'); 
    },
    onError: (error: any) => {
      console.error("Lỗi:", error.response?.data);
      message.error(error.response?.data?.message || 'Có lỗi xảy ra khi thêm tour!');
    }
  });

  // tự động tính giá
  const handleValuesChange = (changedValues: any) => {
    if (changedValues.price !== undefined) {
      const basePrice = changedValues.price || 0;
      const currentPrices = form.getFieldValue('prices') || [];

      const updatedPrices = currentPrices.map((item: any, index: number) => {
        if (index === 0) return { ...item, price: basePrice }; 
        if (index === 1) return { ...item, price: Math.round(basePrice * 0.8) }; 
        return item; 
      });

      form.setFieldsValue({ prices: updatedPrices });
    }

    // Tự động sinh lịch trình dựa trên số ngày
    if (changedValues.duration_days !== undefined) {
      const duration = changedValues.duration_days || 1;
      const currentSchedule = form.getFieldValue('schedule') || [];
      
      let newSchedule = [...currentSchedule];
      
      if (duration > currentSchedule.length) {
        for (let i = currentSchedule.length; i < duration; i++) {
          newSchedule.push({ day: i + 1, title: '', activities: [] });
        }
      } else if (duration < currentSchedule.length) {
        newSchedule = newSchedule.slice(0, duration);
      }
      
      form.setFieldsValue({ schedule: newSchedule });
    }
  };

  const applyTemplateToForm = async (templateId: string) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/v1/tour-templates/${templateId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const tpl = res.data?.data || res.data;
      if (!tpl) return;

      // Không đụng departure_schedule vì tour thật sẽ set theo lịch khởi hành
      form.setFieldsValue({
        name: tpl.name ? `${tpl.name} ` : undefined,
        description: tpl.description || '',
        duration_days: Number(tpl.duration_days || 1),
        category_id: tpl.category_id?._id || tpl.category_id,
        schedule: Array.isArray(tpl.schedule) && tpl.schedule.length ? tpl.schedule : [{ day: 1, title: '', activities: [] }],
        policies: Array.isArray(tpl.policies) ? tpl.policies : [],
        suppliers: Array.isArray(tpl.suppliers) ? tpl.suppliers : [],
      });

      // Đồng bộ ảnh từ template sang tour (dạng fileList của Upload)
      const tplImages: string[] = Array.isArray(tpl.images) ? tpl.images.filter(Boolean) : [];
      if (tplImages.length) {
        setImageFileList(
          tplImages.slice(0, 8).map((url: string, idx: number) => ({
            uid: `tpl-${templateId}-${idx}`,
            name: `template-${idx + 1}`,
            status: 'done',
            url,
          }))
        );
      } else {
        setImageFileList([]);
      }
      message.success('Đã áp dụng template vào form');
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Không thể tải template');
    }
  };

  const onFinish = (values: any) => {
    const finalValues = { ...values };
    finalValues.suppliers = Array.isArray(values.suppliers) ? values.suppliers : (values.suppliers ? [values.suppliers] : []);

    // template tồn tại (backend validate); frontend gửi template_id nếu chọn template
    if (selectedTemplateId) {
      finalValues.template_id = selectedTemplateId;
    }

    // Admin chỉ hiển thị tên có ngày, DB vẫn lưu tên gốc
    if (rawTourName && typeof rawTourName === 'string') {
      finalValues.name = rawTourName.trim();
    }

    // Mỗi tour instance chỉ có 1 ngày khởi hành
    if (!values.departure_date || !values.departure_slots) {
      message.error('Vui lòng chọn 1 ngày khởi hành và nhập số chỗ.');
      return;
    }
    finalValues.departure_schedule = [
      {
        date: values.departure_date.format('YYYY-MM-DD'),
        slots: Number(values.departure_slots || 0),
      },
    ];

    const imageUrls = imageFileList
      .filter((f) => f.status === 'done' && (f.url || f.response?.data?.url))
      .map((f) => f.url || f.response?.data?.url)
      .filter(Boolean);
    if (imageUrls.length === 0) {
      message.error('Vui lòng upload ít nhất 1 ảnh!');
      return;
    }
    finalValues.images = imageUrls;

    // Xoá field phụ trợ chỉ dùng cho form
    delete finalValues.departure_date;
    delete finalValues.departure_slots;

    mutation.mutate(finalValues);
  };

  const uploadEndpoint = useMemo(() => 'http://localhost:5000/api/v1/uploads/images', []);

  return (
    <div className="p-4 md:p-8 bg-[#f8fafc] min-h-screen font-sans">
      <div className="max-w-7xl mx-auto">
        
        <div className="flex items-center justify-between mb-8">
          <Space size="middle">
            <Button 
              type="text" 
              icon={<ArrowLeftOutlined />} 
              onClick={() => navigate('/admin/tours')}
              className="hover:bg-gray-200"
            />
            <Title level={3} style={{ margin: 0, color: '#111827', fontWeight: 600 }}>
              Tạo Tour Mới
            </Title>
          </Space>
          <Button 
            type="primary" onClick={() => form.submit()} 
            size="large" icon={<SaveOutlined />}
            loading={mutation.isPending} 
            className="btn-primary-vigo font-medium rounded-lg px-6"
          >
            XÁC NHẬN TẠO
          </Button>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          onValuesChange={handleValuesChange} 
          initialValues={{ 
            status: 'draft', 
            duration_days: 1,
            schedule: [{ day: 1, title: '', activities: [] }],
            prices: DEFAULT_PRICE_CATEGORIES
          }}
        >
          <Row gutter={24}>
            <Col xs={24} lg={16}>
              <Card className="modern-card rounded-2xl shadow-sm border border-gray-100 mb-6" bordered={false}>
                <div className="text-lg font-semibold text-gray-800 mb-4">Thông tin cơ bản</div>
                <Form.Item label={<span className="font-medium text-gray-600">Chọn Template (tuỳ chọn)</span>}>
                  <Select
                    size="large"
                    placeholder="Chọn template để đổ dữ liệu..."
                    value={selectedTemplateId}
                    onChange={(v) => {
                      setSelectedTemplateId(v);
                      if (v) applyTemplateToForm(v);
                    }}
                    allowClear
                    className="rounded-lg"
                    options={(tourTemplates || []).map((t: any) => ({
                      value: t._id,
                      label: `${t.name} • ${t.duration_days || 1} ngày`,
                    }))}
                  />
                </Form.Item>
                <Form.Item
                  name="name"
                  label={<span className="font-medium text-gray-600">Tên Tour (Admin hiển thị kèm ngày khởi hành)</span>}
                  rules={[{ required: true, message: 'Vui lòng nhập tên tour!' }]}
                >
                  <Input
                    placeholder="Ví dụ: Khám phá Hà Giang 3N2Đ..."
                    size="large"
                    className="rounded-lg"
                    onChange={(e) => {
                      const v = e.target.value || '';
                      // nếu đang hiển thị tên có ngày, admin sửa lại sẽ cập nhật rawName theo phần trước dấu (
                      const raw = v.split('(')[0].trim();
                      setRawTourName(raw);
                    }}
                  />
                </Form.Item>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="category_id" label={<span className="font-medium text-gray-600">Danh mục</span>} rules={[{ required: true }]}>
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
                    <Form.Item name="duration_days" label={<span className="font-medium text-gray-600">Thời lượng (Ngày)</span>} rules={[{ required: true }]}>
                      <InputNumber min={1} className="w-full rounded-lg" size="large" />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item name="description" label={<span className="font-medium text-gray-600">Mô tả chi tiết</span>}>
                  <TextArea rows={4} placeholder="Viết giới thiệu về điểm nổi bật..." className="rounded-lg" />
                </Form.Item>
              </Card>

              <Card className="modern-card rounded-2xl shadow-sm border border-gray-100 mb-6" bordered={false}>
                <div className="text-lg font-semibold text-gray-800 mb-2">Lịch trình chi tiết</div>
                
                <Form.List name="schedule">
                  {(fields) => (
                    <div className="space-y-4">
                      {fields.map(({ key, name, ...restField }, index) => (
                        <div key={key} className="p-4 rounded-xl bg-gray-50 border border-gray-100 relative group">
                          <div className="font-semibold text-purple-600 mb-3">Ngày {index + 1}</div>
                          <Form.Item {...restField} name={[name, 'day']} hidden><InputNumber /></Form.Item>
                          <Row gutter={16}>
                            <Col span={8}>
                              <Form.Item {...restField} name={[name, 'title']} rules={[{ required: true, message: 'Vui lòng nhập tiêu đề ngày!' }]} style={{marginBottom: 0}}>
                                <Input placeholder="Tiêu đề (VD: Hà Nội - Sapa)" className="rounded-lg" />
                              </Form.Item>
                            </Col>
                            <Col span={16}>
                              <Form.Item {...restField} name={[name, 'activities']} rules={[{ required: true, message: 'Vui lòng thêm ít nhất 1 hoạt động!' }]} style={{marginBottom: 0}}>
                                <Select mode="tags" placeholder="Nhập hoạt động & Enter" open={false} className="rounded-lg" />
                              </Form.Item>
                            </Col>
                          </Row>
                        </div>
                      ))}
                    </div>
                  )}
                </Form.List>
              </Card>

              <Card className="modern-card rounded-2xl shadow-sm border border-gray-100 mb-6" bordered={false}>
                <div className="text-lg font-semibold text-gray-800 mb-4">Lịch khởi hành & Số chỗ</div>
                <div className="w-full bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <Row gutter={16}>
                    <Col xs={24} md={14}>
                      <Form.Item
                        name="departure_date"
                        label={<span className="font-medium text-gray-600">Ngày khởi hành</span>}
                        rules={[{ required: true, message: 'Chọn ngày khởi hành!' }]}
                        style={{ marginBottom: 0 }}
                      >
                        <DatePicker
                          format="DD/MM/YYYY"
                          placeholder="Chọn 1 ngày khởi hành"
                          className="w-full"
                          onChange={(v) => {
                            setSelectedDepartureDate(v);
                            const currentName = form.getFieldValue('name') || '';
                            const base = (rawTourName || currentName || '').split('(')[0].trim();
                            setRawTourName(base);
                            if (v && base) {
                              form.setFieldsValue({ name: `${base} (${v.format('DD/MM/YYYY')})` });
                            } else if (base) {
                              form.setFieldsValue({ name: base });
                            }
                          }}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={10}>
                      <Form.Item
                        name="departure_slots"
                        label={<span className="font-medium text-gray-600">Số chỗ</span>}
                        rules={[{ required: true, message: 'Nhập số chỗ!' }]}
                        style={{ marginBottom: 0 }}
                      >
                        <InputNumber min={1} placeholder="VD: 25" className="w-full" />
                      </Form.Item>
                    </Col>
                  </Row>
                  {selectedDepartureDate ? (
                    <div className="text-xs text-gray-500 mt-3">
                      Admin hiển thị: <b>{rawTourName || form.getFieldValue('name')}</b> — Khách hàng chỉ thấy tên gốc.
                    </div>
                  ) : null}
                </div>
              </Card>
            </Col>

            <Col xs={24} lg={8}>
              <Card className="modern-card rounded-2xl shadow-sm border border-gray-100 mb-6" bordered={false}>
                <div className="text-lg font-semibold text-gray-800 mb-4">Thiết lập chung</div>
                <Form.Item name="status" label={<span className="font-medium text-gray-600">Trạng thái</span>}>
                  <Select size="large" className="rounded-lg">
                    <Option value="active">Đang hoạt động</Option>
                    <Option value="draft">Bản nháp</Option>
                    <Option value="hidden">Tạm ẩn</Option>
                  </Select>
                </Form.Item>
                <Form.Item name="suppliers" label={<span className="font-medium text-gray-600">Nhà cung cấp</span>} style={{marginBottom: 0}}>
                   <Select
                     mode="multiple"
                     size="large" placeholder="Chọn nhà cung cấp" allowClear
                     loading={isProvidersLoading} optionFilterProp="label"
                     className="rounded-lg"
                     options={providers.map((p: any) => ({ value: p.id || p._id, label: p.name }))}
                   />
                </Form.Item>
              </Card>

              <Card className="modern-card rounded-2xl shadow-sm border border-gray-100 mb-6" bordered={false}>
                <div className="text-lg font-semibold text-gray-800 mb-4">Giá bán mặc định</div>
                <Form.Item name="price" label={<span className="font-medium text-gray-600">Giá gốc (VNĐ) </span>} rules={[{ required: true }]}>
                  <InputNumber 
                    className="w-full rounded-lg" size="large" placeholder="VD: 500,000"
                    formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} 
                    parser={(value: any) => value.replace(/\$\s?|(,*)/g, '')} 
                  />
                </Form.Item>
                
                <Divider />
                <div className="text-sm font-medium text-gray-500 mb-3">Cấu hình giá chi tiết </div>
                
                <Form.List name="prices">
                  {(fields, { add, remove }) => (
                    <div className="space-y-3">
                      {fields.map(({ key, name, ...restField }, index) => {
                        const isDefault = index < 2;
                        return (
                          <Row gutter={8} key={key} className="items-center">
                            <Col span={10}>
                              <Form.Item {...restField} name={[name, 'name']} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                                <Input readOnly={isDefault} bordered={!isDefault} className={`rounded-lg ${isDefault ? 'bg-transparent text-gray-600 font-medium px-1 cursor-default' : ''}`} />
                              </Form.Item>
                            </Col>
                            <Col span={isDefault ? 14 : 11}>
                              <Form.Item {...restField} name={[name, 'price']} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                                <InputNumber 
                                  className="w-full rounded-lg" placeholder="Nhập số tiền" 
                                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} 
                                  parser={(value: any) => value.replace(/\$\s?|(,*)/g, '')}
                                />
                              </Form.Item>
                            </Col>
                            {!isDefault && (
                              <Col span={3} className="text-center">
                                <MinusCircleOutlined onClick={() => remove(name)} className="text-gray-400 hover:text-red-500 cursor-pointer" />
                              </Col>
                            )}
                          </Row>
                        );
                      })}
                      
                    </div>
                  )}
                </Form.List>
              </Card>

              <Card className="modern-card rounded-2xl shadow-sm border border-gray-100 mb-6" bordered={false}>
                <div className="text-lg font-semibold text-gray-800 mb-4">Media & Bổ sung</div>
                <Form.Item label={<span className="font-medium text-gray-600">Hình ảnh</span>}>
                  <Upload
                    multiple
                    listType="picture-card"
                    fileList={imageFileList}
                    accept="image/*"
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
                    onRemove={(file) => {
                      const next = imageFileList.filter((f) => f.uid !== (file as any).uid);
                      setImageFileList(next);
                      return true;
                    }}
                  >
                    {imageFileList.length >= 8 ? null : <div>+ Tải ảnh</div>}
                  </Upload>
                  {/* <div className="text-xs text-gray-500 mt-2">Tối đa 8 ảnh, mỗi ảnh &lt; 10MB.</div> */}
                </Form.Item>
                <Form.Item name="policies" label={<span className="font-medium text-gray-600">Chính sách </span>} style={{marginBottom: 0}}>
                   <Select mode="tags" placeholder="Ví dụ: Xe đưa đón..." open={false} className="rounded-lg" />
                </Form.Item>
              </Card>
            </Col>
          </Row>
        </Form>
      </div>
    </div>
  );
};

export default TourCreate;