import React, { useEffect, useMemo, useState } from 'react';
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

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token') || localStorage.getItem('admin_token') || ''}`,
});

const normalizeDate = (dateVal?: string) => {
  if (!dateVal) return '';
  const raw = String(dateVal).trim();
  if (!raw) return '';
  if (raw.includes('T')) return raw.split('T')[0];
  const d = dayjs(raw);
  return d.isValid() ? d.format('YYYY-MM-DD') : '';
};

const ensureRequiredPriceRows = (prices: any[] | undefined, basePrice: number) => {
  const normalized = Array.isArray(prices)
    ? prices
        .map((p: any) => ({ name: String(p?.name || '').trim(), price: Number(p?.price || 0) }))
        .filter((p: any) => p.name)
    : [];
  const byName = new Map<string, number>();
  normalized.forEach((p) => byName.set(p.name.toLowerCase(), Number(p.price || 0)));

  const adultPrice = byName.get('người lớn') ?? Number(basePrice || 0);
  const childPrice = byName.get('trẻ em (0-10 tuổi)') ?? Math.round(Number(basePrice || 0) * 0.8);
  const singleRoomPrice = byName.get('phòng đơn (phụ thu / phòng)') ?? 0;

  return [
    { name: 'Người lớn', price: adultPrice },
    { name: 'Trẻ em (0-10 tuổi)', price: childPrice },
    { name: 'Phòng đơn (phụ thu / phòng)', price: singleRoomPrice },
    ...normalized.filter(
      (p) =>
        !['người lớn', 'trẻ em (0-10 tuổi)', 'phòng đơn (phụ thu / phòng)'].includes(String(p.name || '').toLowerCase())
    ),
  ];
};

const TourEdit = () => {
  const { id } = useParams();
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [imageFileList, setImageFileList] = useState<any[]>([]);
  const [lockDeparture, setLockDeparture] = useState(false);

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
        prices: ensureRequiredPriceRows(tour.prices, Number(tour.price || 0)),
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

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        if (!id || !tour) return;
        const ds = Array.isArray((tour as any)?.departure_schedule) ? ((tour as any).departure_schedule as any[]) : [];
        const dates = ds.map((x: any) => normalizeDate(x?.date)).filter(Boolean);
        if (dates.length === 0) {
          setLockDeparture(false);
          return;
        }
        const pairs = await Promise.all(
          dates.map(async (d: string) => {
            const r = await axios.get(`http://localhost:5000/api/v1/tours/${id}/trips/${d}/status`, {
              headers: getAuthHeaders(),
              params: { _t: Date.now() },
            });
            return String(r.data?.data?.status || '').toUpperCase();
          })
        );
        const locked = pairs.some((st) => st === 'CLOSED' || st === 'COMPLETED');
        if (!cancelled) setLockDeparture(locked);
      } catch {
        if (!cancelled) setLockDeparture(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [id, tour]);

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
    const payload: any = {
      price: values.price,
      prices: Array.isArray(values.prices) ? values.prices : [],
    };
    if (!lockDeparture) {
      payload.departure_schedule =
        values.departure_schedule?.map((item: any) => ({
          date: item.date ? item.date.format('YYYY-MM-DD') : null,
          slots: Number(item.slots || 0),
        })).filter((item: any) => item.date) || [];
    }
    const imageUrls = imageFileList
      .filter((f) => f.status === 'done' && (f.url || f.response?.data?.url))
      .map((f) => f.url || f.response?.data?.url)
      .filter(Boolean);
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
                <Input placeholder="Ví dụ: Tour Đà Nẵng - Hội An 3 Ngày 2 Đêm" size="large" disabled />
              </Form.Item>

              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item name="category_id" label="Danh mục Tour" rules={[{ required: true, message: 'Vui lòng chọn danh mục!' }]}>
                    <Select size="large" placeholder="Chọn danh mục" loading={isCategoriesLoading} disabled>
                      {Array.isArray(categories) && categories.map((cat: any) => (
                        <Option key={cat._id} value={cat._id}>{cat.name}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="duration_days" label="Thời lượng (Ngày)" rules={[{ required: true }]}>
                    <InputNumber min={1} className="w-full" size="large" disabled />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="description" label="Mô tả giới thiệu" rules={[{ required: true, message: 'Vui lòng nhập mô tả!' }]}>
                <TextArea rows={5} placeholder="Nhập bài viết giới thiệu..." disabled />
              </Form.Item>
            </Card>

            <Card title="Lịch trình chi tiết" className="mb-6 shadow-sm">
              <Form.List name="schedule">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }, index) => (
                      <Card key={key} size="small" title={`Ngày ${index + 1}`} className="mb-4 bg-gray-50">
                        <Form.Item {...restField} name={[name, 'day']} hidden><InputNumber /></Form.Item>
                        <Form.Item {...restField} name={[name, 'title']} label="Tiêu đề ngày" rules={[{ required: true }]}><Input placeholder="Ví dụ: Hà Nội - Sapa" disabled /></Form.Item>
                        <Form.Item {...restField} name={[name, 'activities']} label="Các hoạt động"><Select mode="tags" placeholder="Nhập hoạt động và nhấn Enter..." open={false} disabled /></Form.Item>
                      </Card>
                    ))}
                    <Button type="dashed" disabled block icon={<PlusOutlined />}>Thêm ngày lịch trình</Button>
                  </>
                )}
              </Form.List>
            </Card>

            <Card title="Lịch khởi hành & Số chỗ" className="mb-6 shadow-sm">
              <Form.List name="departure_schedule">
                {(fields, { remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }) => (
                      <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                        <Form.Item
                          {...restField}
                          name={[name, 'date']}
                          rules={[{ required: true, message: 'Vui lòng chọn ngày!' }]}
                        >
                          <DatePicker format="DD/MM/YYYY" placeholder="Ngày khởi hành" disabled={lockDeparture} />
                        </Form.Item>
                        <Form.Item
                          {...restField}
                          name={[name, 'slots']}
                          rules={[{ required: true, message: 'Vui lòng nhập số chỗ!' }]}
                        >
                          <InputNumber min={1} placeholder="Số chỗ" disabled={lockDeparture} />
                        </Form.Item>
                        <MinusCircleOutlined
                          onClick={() => !lockDeparture && remove(name)}
                          className="text-red-500"
                          style={{ opacity: 0.4, pointerEvents: 'none' }}
                        />
                      </Space>
                    ))}
                    <Button type="dashed" disabled block icon={<PlusOutlined />}>
                      Không hỗ trợ thêm ngày khởi hành
                    </Button>
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
                    {fields.map(({ key, name, ...restField }, index) => {
                      const isDefault = index < 3;
                      return (
                        <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                          <Form.Item {...restField} name={[name, 'name']} rules={[{ required: true }]}>
                            <Input
                              placeholder="Tên: Trẻ em"
                              readOnly={isDefault}
                              bordered={!isDefault}
                              className={isDefault ? 'bg-transparent cursor-default' : ''}
                            />
                          </Form.Item>
                          <Form.Item {...restField} name={[name, 'price']} rules={[{ required: true }]}>
                            <InputNumber
                              placeholder="Giá tiền"
                              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                              parser={(value) => value!.replace(/\$\s?|(,*)/g, '')}
                            />
                          </Form.Item>
                          {!isDefault && <MinusCircleOutlined onClick={() => remove(name)} className="text-red-500" />}
                        </Space>
                      );
                    })}
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
                  disabled
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
                    return;
                    const normalized = fileList.map((f: any) => {
                      const url = f.url || f.response?.data?.url || f.response?.url;
                      return url ? { ...f, url } : f;
                    });
                    setImageFileList(normalized);
                  }}
                  onRemove={(file) => {
                    return false;
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
                 <Select mode="tags" placeholder="Vé máy bay khứ hồi..." open={false} disabled />
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
                   disabled
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