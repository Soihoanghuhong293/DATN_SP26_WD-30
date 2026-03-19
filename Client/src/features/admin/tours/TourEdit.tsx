import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { getProviders } from '../../../services/api';
import { 
  Form, Input, InputNumber, Button, Card, Row, Col, 
  Space, Typography, message, Select, Divider, Spin, DatePicker, Upload
} from 'antd';
import { 
  MinusCircleOutlined, PlusOutlined, 
  ArrowLeftOutlined, SaveOutlined 
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const TourEdit = () => {
  const { id } = useParams();
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

  const { data: tour, isLoading: isTourLoading } = useQuery({
    queryKey: ['tour', id],
    queryFn: async () => {
      const res = await axios.get(`http://localhost:5000/api/v1/tours/${id}`);
      return res.data?.data?.tour || res.data?.data;
    },
    enabled: !!id, 
  });

  useEffect(() => {
    if (tour) {
      const suppliers = Array.isArray(tour.suppliers) ? tour.suppliers.filter((s: string) => s && s.length > 0) : [];
      const formattedData = {
        ...tour,
        category_id: tour.category_id?._id || tour.category_id,
        suppliers: suppliers,
        departure_schedule: tour.departure_schedule?.map((item: any) => ({
          ...item,
          date: item.date ? dayjs(item.date) : null
        })) || []
      };
      form.setFieldsValue(formattedData);

      const existingImages: string[] = Array.isArray(tour.images) ? tour.images : [];
      setImageFileList(
        existingImages.map((url, idx) => ({
          uid: `existing-${idx}`,
          name: `image-${idx + 1}`,
          status: 'done',
          url,
        }))
      );
    }
  }, [tour, form]);

  const uploadEndpoint = useMemo(() => 'http://localhost:5000/api/v1/uploads/images', []);

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      return await axios.put(`http://localhost:5000/api/v1/tours/${id}`, values);
    },
    onSuccess: () => {
      message.success('Cập nhật tour thành công!');
      queryClient.invalidateQueries({ queryKey: ['tours'] }); 
      queryClient.invalidateQueries({ queryKey: ['tour', id] }); 
      navigate('/admin/tours'); 
    },
    onError: (error: any) => {
      console.error("Lỗi:", error.response?.data);
      message.error(error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật!');
    }
  });

  const onFinish = (values: any) => {
    const payload = {
      ...values,
      suppliers: Array.isArray(values.suppliers) ? values.suppliers : (values.suppliers ? [values.suppliers] : []),
      departure_schedule: values.departure_schedule?.map((item: any) => ({
        ...item,
        date: item.date ? item.date.format('YYYY-MM-DD') : null
      })).filter((item: any) => item.date) || []
    };
    const imageUrls = imageFileList
      .filter((f) => f.status === 'done' && (f.url || f.response?.data?.url))
      .map((f) => f.url || f.response?.data?.url)
      .filter(Boolean);
    if (imageUrls.length === 0) {
      message.error('Vui lòng upload ít nhất 1 ảnh!');
      return;
    }
    payload.images = imageUrls;
    mutation.mutate(payload);
  };

  if (isTourLoading) {
    return <div className="flex justify-center items-center h-screen"><Spin size="large" tip="Đang tải dữ liệu tour..." /></div>;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <Space className="mb-6">
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/tours')}>
          Quay lại
        </Button>
        <Title level={3} style={{ margin: 0 }}>Chỉnh sửa Tour</Title>
      </Space>

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
      >
        <Row gutter={24}>
          <Col xs={24} lg={16}>
            <Card title="Thông tin cơ bản" className="mb-6 shadow-sm">
              <Form.Item name="name" label="Tên Tour" rules={[{ required: true, message: 'Vui lòng nhập tên tour!' }]}>
                <Input placeholder="Ví dụ: Tour Đà Nẵng - Hội An 3 Ngày 2 Đêm" size="large" />
              </Form.Item>

              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item name="category_id" label="Danh mục Tour" rules={[{ required: true, message: 'Vui lòng chọn danh mục!' }]}>
                    <Select size="large" placeholder="Chọn danh mục" loading={isCategoriesLoading}>
                      {Array.isArray(categories) && categories.map((cat: any) => (
                        <Option key={cat._id} value={cat._id}>{cat.name}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="duration_days" label="Thời lượng (Ngày)" rules={[{ required: true }]}>
                    <InputNumber min={1} className="w-full" size="large" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="status" label="Trạng thái">
                    <Select size="large">
                      <Option value="active">Đang hoạt động</Option>
                      <Option value="draft">Bản nháp</Option>
                      <Option value="hidden">Tạm ẩn</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="description" label="Mô tả giới thiệu" rules={[{ required: true, message: 'Vui lòng nhập mô tả!' }]}>
                <TextArea rows={5} placeholder="Nhập bài viết giới thiệu..." />
              </Form.Item>
            </Card>

            <Card title="Lịch trình chi tiết" className="mb-6 shadow-sm">
              <Form.List name="schedule">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }, index) => (
                      <Card key={key} size="small" title={`Ngày ${index + 1}`} className="mb-4 bg-gray-50" extra={<MinusCircleOutlined onClick={() => remove(name)} className="text-red-500" />}>
                        <Form.Item {...restField} name={[name, 'day']} hidden><InputNumber /></Form.Item>
                        <Form.Item {...restField} name={[name, 'title']} label="Tiêu đề ngày" rules={[{ required: true }]}><Input placeholder="Ví dụ: Hà Nội - Sapa" /></Form.Item>
                        <Form.Item {...restField} name={[name, 'activities']} label="Các hoạt động"><Select mode="tags" placeholder="Nhập hoạt động và nhấn Enter..." open={false} /></Form.Item>
                      </Card>
                    ))}
                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>Thêm ngày lịch trình</Button>
                  </>
                )}
              </Form.List>
            </Card>

            <Card title="Lịch khởi hành & Số chỗ" className="mb-6 shadow-sm">
              <Form.List name="departure_schedule">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }) => (
                      <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                        <Form.Item
                          {...restField}
                          name={[name, 'date']}
                          rules={[{ required: true, message: 'Vui lòng chọn ngày!' }]}
                        >
                          <DatePicker format="DD/MM/YYYY" placeholder="Ngày khởi hành" />
                        </Form.Item>
                        <Form.Item
                          {...restField}
                          name={[name, 'slots']}
                          rules={[{ required: true, message: 'Vui lòng nhập số chỗ!' }]}
                        >
                          <InputNumber min={1} placeholder="Số chỗ" />
                        </Form.Item>
                        <MinusCircleOutlined onClick={() => remove(name)} className="text-red-500" />
                      </Space>
                    ))}
                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>Thêm ngày khởi hành</Button>
                  </>
                )}
              </Form.List>
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            <Card title="Giá & Cấu hình" className="mb-6 shadow-sm border-t-4 border-t-blue-500">
              <Form.Item name="price" label="Giá cơ bản (VNĐ)" rules={[{ required: true, message: 'Vui lòng nhập giá!' }]}>
                <InputNumber className="w-full" size="large" formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={(value) => value!.replace(/\$\s?|(,*)/g, '')} />
              </Form.Item>
              <Divider>Bảng giá chi tiết</Divider>
              <Form.List name="prices">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }) => (
                      <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                        <Form.Item {...restField} name={[name, 'name']} rules={[{ required: true }]}><Input placeholder="Tên: Trẻ em" /></Form.Item>
                        <Form.Item {...restField} name={[name, 'price']} rules={[{ required: true }]}>
                          <InputNumber placeholder="Giá tiền" formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={(value) => value!.replace(/\$\s?|(,*)/g, '')}/>
                        </Form.Item>
                        <MinusCircleOutlined onClick={() => remove(name)} className="text-red-500" />
                      </Space>
                    ))}
                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>Thêm loại giá</Button>
                  </>
                )}
              </Form.List>
            </Card>

            <Card title="Hình ảnh & Khác" className="mb-6 shadow-sm">
              <Form.Item label="Hình ảnh">
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
                <div className="text-xs text-gray-500 mt-2">Tối đa 8 ảnh, mỗi ảnh &lt; 10MB.</div>
              </Form.Item>
              <Form.Item name="policies" label="Chính sách">
                 <Select mode="tags" placeholder="Vé máy bay khứ hồi..." open={false} />
              </Form.Item>
              <Form.Item name="suppliers" label="Nhà cung cấp">
                 <Select
                   mode="multiple"
                   placeholder="Chọn nhà cung cấp"
                   allowClear
                   loading={isProvidersLoading}
                   notFoundContent={isProvidersLoading ? <Spin size="small" /> : 'Chưa có nhà cung cấp nào'}
                   optionFilterProp="label"
                   options={providers.map((p: any) => ({ value: p.id || p._id, label: p.name }))}
                 />
              </Form.Item>
            </Card>

            <Button 
              type="primary" htmlType="submit" block size="large" icon={<SaveOutlined />}
              loading={mutation.isPending} className="bg-orange-500 hover:bg-orange-600 border-none h-12 text-lg font-bold"
            >
              CẬP NHẬT TOUR
            </Button>
          </Col>
        </Row>
      </Form>
    </div>
  );
};

export default TourEdit;