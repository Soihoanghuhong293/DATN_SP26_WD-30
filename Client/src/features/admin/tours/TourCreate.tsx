import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { getProviders } from '../../../services/api';
import { 
  Form, Input, InputNumber, Button, Card, Row, Col, 
  Space, Typography, message, Select, Divider, Spin, 
  DatePicker
} from 'antd';
import { 
  MinusCircleOutlined, PlusOutlined, 
  ArrowLeftOutlined, SaveOutlined 
} from '@ant-design/icons';
import './TourCreate.css'; 

const { Title, Text } = Typography;
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

  // Đã fix lỗi TS: Thêm (error: any)
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

  // Đã fix lỗi TS: Thêm (values: any) và (season: any)
  const onFinish = (values: any) => {
    const finalValues = { ...values };
    finalValues.suppliers = values.suppliers ? [values.suppliers] : [];

    if (finalValues.seasonalPrices?.length > 0) {
      finalValues.seasonalPrices = finalValues.seasonalPrices.map((season: any) => ({
        title: season.title,
        startDate: season.dateRange?.[0]?.format('YYYY-MM-DD'),
        endDate: season.dateRange?.[1]?.format('YYYY-MM-DD'),
        prices: season.prices || []
      }));
    }

    mutation.mutate(finalValues);
  };

  return (
    <div className="p-4 md:p-8 bg-[#f8fafc] min-h-screen font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
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
            Lưu & Xuất bản
          </Button>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ 
            status: 'draft', 
            duration_days: 1,
            schedule: [{ day: 1, title: '', activities: [] }],
            prices: DEFAULT_PRICE_CATEGORIES
          }}
          requiredMark="optional" // Ẩn dấu sao đỏ mặc định để nhìn thoáng hơn
        >
          <Row gutter={24}>
            {/* Cột Trái */}
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
                <div className="text-lg font-semibold text-gray-800 mb-4">Lịch trình chi tiết</div>
                <Form.List name="schedule">
                  {(fields, { add, remove }) => (
                    <div className="space-y-4">
                      {fields.map(({ key, name, ...restField }, index) => (
                        <div key={key} className="p-4 rounded-xl bg-gray-50 border border-gray-100 relative group">
                          <Button 
                            type="text" danger icon={<MinusCircleOutlined />} 
                            onClick={() => remove(name)}
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          />
                          <div className="font-semibold text-purple-600 mb-3">Ngày {index + 1}</div>
                          <Form.Item {...restField} name={[name, 'day']} hidden><InputNumber /></Form.Item>
                          <Row gutter={16}>
                            <Col span={8}>
                              <Form.Item {...restField} name={[name, 'title']} rules={[{ required: true }]} style={{marginBottom: 0}}>
                                <Input placeholder="Tiêu đề (VD: Hà Nội - Sapa)" className="rounded-lg" />
                              </Form.Item>
                            </Col>
                            <Col span={16}>
                              <Form.Item {...restField} name={[name, 'activities']} style={{marginBottom: 0}}>
                                <Select mode="tags" placeholder="Nhập hoạt động & Enter" open={false} className="rounded-lg" />
                              </Form.Item>
                            </Col>
                          </Row>
                        </div>
                      ))}
                      <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />} className="h-10 rounded-xl text-purple-600 border-purple-200 hover:border-purple-400 hover:bg-purple-50">
                        Thêm ngày mới
                      </Button>
                    </div>
                  )}
                </Form.List>
              </Card>

              <Card className="modern-card rounded-2xl shadow-sm border border-gray-100 mb-6" bordered={false}>
                <div className="text-lg font-semibold text-gray-800 mb-4">Cấu hình giá Mùa cao điểm / Lễ Tết</div>
                <Form.List name="seasonalPrices">
                  {(seasonFields, { add: addSeason, remove: removeSeason }) => (
                    <div className="space-y-6">
                      {seasonFields.map(({ key: seasonKey, name: seasonName, ...seasonRestField }) => (
                        <div key={seasonKey} className="p-5 rounded-xl border border-gray-200 bg-white shadow-sm relative">
                          <div className="flex justify-between items-center mb-4">
                            <span className="font-medium text-gray-800">Cấu hình dịp đặc biệt</span>
                            <Button danger size="small" type="text" onClick={() => removeSeason(seasonName)}>Xóa</Button>
                          </div>
                          <Row gutter={16}>
                            <Col span={12}>
                              <Form.Item {...seasonRestField} name={[seasonName, 'title']} rules={[{ required: true }]} label="Tên dịp">
                                <Input placeholder="VD: Lễ 30/4, Tết Âm Lịch..." className="rounded-lg" />
                              </Form.Item>
                            </Col>
                            <Col span={12}>
                              <Form.Item {...seasonRestField} name={[seasonName, 'dateRange']} rules={[{ required: true }]} label="Thời gian áp dụng">
                                <DatePicker.RangePicker format="DD/MM/YYYY" className="w-full rounded-lg" />
                              </Form.Item>
                            </Col>
                          </Row>

                          <Divider className="my-2" />
                          <div className="text-sm text-gray-500 mb-3 font-medium">Bảng giá áp dụng</div>
                          
                          <Form.List name={[seasonName, 'prices']}>
                            {(priceFields, { add: addPrice, remove: removePrice }) => (
                              <div className="space-y-2">
                                {priceFields.map(({ key: priceKey, name: priceName, ...priceRestField }, index) => {
                                  const isDefault = index < 2;
                                  return (
                                    <Row gutter={12} key={priceKey} className="items-center">
                                      <Col span={10}>
                                        <Form.Item {...priceRestField} name={[priceName, 'name']} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                                          <Input readOnly={isDefault} bordered={!isDefault} className={`rounded-lg ${isDefault ? 'bg-transparent text-gray-600 font-medium px-1 cursor-default' : ''}`} placeholder="Phân loại" />
                                        </Form.Item>
                                      </Col>
                                      <Col span={isDefault ? 14 : 12}>
                                        <Form.Item {...priceRestField} name={[priceName, 'price']} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                                          <InputNumber 
                                            className="w-full rounded-lg" placeholder="Nhập mức giá" 
                                            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} 
                                            parser={(value: any) => value.replace(/\$\s?|(,*)/g, '')}
                                          />
                                        </Form.Item>
                                      </Col>
                                      {!isDefault && (
                                        <Col span={2} className="text-right">
                                          <MinusCircleOutlined onClick={() => removePrice(priceName)} className="text-gray-400 hover:text-red-500 cursor-pointer" />
                                        </Col>
                                      )}
                                    </Row>
                                  );
                                })}
                                <Button type="link" onClick={() => addPrice()} icon={<PlusOutlined />} className="p-0 mt-2 text-purple-600">
                                  Thêm phân loại giá khác
                                </Button>
                              </div>
                            )}
                          </Form.List>
                        </div>
                      ))}
                      <Button type="dashed" onClick={() => addSeason({ prices: DEFAULT_PRICE_CATEGORIES })} block icon={<PlusOutlined />} className="h-10 rounded-xl text-purple-600 border-purple-200 hover:border-purple-400">
                        Thêm thời điểm đặc biệt
                      </Button>
                    </div>
                  )}
                </Form.List>
              </Card>
            </Col>

            {/* Cột Phải */}
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
                     size="large" placeholder="Chọn nhà cung cấp" allowClear
                     loading={isProvidersLoading} optionFilterProp="label"
                     className="rounded-lg"
                     options={providers.map((p: any) => ({ value: p.id || p._id, label: p.name }))}
                   />
                </Form.Item>
              </Card>

              <Card className="modern-card rounded-2xl shadow-sm border border-gray-100 mb-6" bordered={false}>
                <div className="text-lg font-semibold text-gray-800 mb-4">Giá bán mặc định</div>
                <Form.Item name="price" label={<span className="font-medium text-gray-600">Giá gốc (Hiển thị nổi bật)</span>} rules={[{ required: true }]}>
                  <InputNumber 
                    className="w-full rounded-lg" size="large" 
                    formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} 
                    parser={(value: any) => value.replace(/\$\s?|(,*)/g, '')} 
                  />
                </Form.Item>
                
                <Divider />
                <div className="text-sm font-medium text-gray-500 mb-3">Cấu hình giá chi tiết</div>
                
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
                      <Button type="link" onClick={() => add()} icon={<PlusOutlined />} className="p-0 text-purple-600">
                        Thêm phân loại giá
                      </Button>
                    </div>
                  )}
                </Form.List>
              </Card>

              <Card className="modern-card rounded-2xl shadow-sm border border-gray-100 mb-6" bordered={false}>
                <div className="text-lg font-semibold text-gray-800 mb-4">Media & Bổ sung</div>
                <Form.Item name="images" label={<span className="font-medium text-gray-600">Link Hình ảnh (Enter)</span>}>
                   <Select mode="tags" placeholder="Nhập link..." open={false} className="rounded-lg" />
                </Form.Item>
                <Form.Item name="policies" label={<span className="font-medium text-gray-600">Chính sách nổi bật (Enter)</span>} style={{marginBottom: 0}}>
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