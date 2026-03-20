import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { getProviders } from '../../../services/api';
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

const TourCreate = () => {
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
    }
  });

  const { data: providersData, isLoading: isProvidersLoading } = useQuery({
    queryKey: ['providers'],
    queryFn: () => getProviders({ status: 'active' }),
  });
  const providers = providersData?.data?.providers ?? [];

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

  const onFinish = (values: any) => {
    const finalValues = { ...values };
    finalValues.suppliers = Array.isArray(values.suppliers) ? values.suppliers : (values.suppliers ? [values.suppliers] : []);

    const imageUrls = imageFileList
      .filter((f) => f.status === 'done' && (f.url || f.response?.data?.url))
      .map((f) => f.url || f.response?.data?.url)
      .filter(Boolean);
    if (imageUrls.length === 0) {
      message.error('Vui lòng upload ít nhất 1 ảnh!');
      return;
    }
    finalValues.images = imageUrls;

    if (finalValues.departure_schedule) {
      finalValues.departure_schedule = finalValues.departure_schedule.map((item: any) => ({
        ...item,
        date: item.date ? item.date.format('YYYY-MM-DD') : null
      })).filter((item: any) => item.date);
    }

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
          </Button>A
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
                <Form.Item name="name" label={<span className="font-medium text-gray-600">Tên Tour</span>} rules={[{ required: true, message: 'Vui lòng nhập tên tour!' }]}>
                  <Input placeholder="Ví dụ: Khám phá Hà Giang 3N2Đ..." size="large" className="rounded-lg" />
                </Form.Item>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="category_id" label={<span className="font-medium text-gray-600">Danh mục</span>} rules={[{ required: true }]}>
                      <Select size="large" placeholder="Chọn danh mục..." loading={isCategoriesLoading} className="rounded-lg">
                        {Array.isArray(categories) && categories.map((cat: any) => (
                          <Option key={cat._id} value={cat._id}>{cat.name}</Option>
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
                <Form.List name="departure_schedule">
                  {(fields, { add, remove }) => (
                    <div className="space-y-4">
                      {fields.map(({ key, name, ...restField }) => (
                        <Space key={key} align="baseline" className="w-full bg-gray-50 p-3 rounded-lg">
                          <Form.Item
                            {...restField}
                            name={[name, 'date']}
                            rules={[{ required: true, message: 'Chọn ngày!' }]}
                            className="flex-1 mb-0"
                          >
                            <DatePicker format="DD/MM/YYYY" placeholder="Ngày khởi hành" className="w-full" />
                          </Form.Item>
                          <Form.Item
                            {...restField}
                            name={[name, 'slots']}
                            rules={[{ required: true, message: 'Nhập số chỗ!' }]}
                            className="mb-0"
                          >
                            <InputNumber min={1} placeholder="Số chỗ" />
                          </Form.Item>
                          <MinusCircleOutlined onClick={() => remove(name)} className="text-gray-400 hover:text-red-500" />
                        </Space>
                      ))}
                      <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>Thêm ngày khởi hành</Button>
                    </div>
                  )}
                </Form.List>
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