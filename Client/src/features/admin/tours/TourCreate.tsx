import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { getCategoryTree, getProviders, getRestaurants, getProviderTickets } from '../../../services/api';
import type { IRestaurant, IProviderTicket } from '../../../types/provider.types';
import { 
  Form, Input, InputNumber, Button, Card, Row, Col, 
  Space, Typography, message, Select, Divider, 
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

const mealRefId = (v: any): string | undefined => {
  if (v == null || v === '') return undefined;
  if (typeof v === 'object' && v != null && v._id != null) return String(v._id);
  return String(v);
};

const normalizeTicketIdsFromTemplate = (arr: unknown): string[] => {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((t) => (typeof t === 'object' && t != null && (t as any)._id != null ? String((t as any)._id) : String(t)))
    .filter(Boolean);
};

/** Options dự phòng từ API populate — tránh Select hiển thị raw ObjectId khi query NCC chưa kịp tải. */
const buildPickerExtrasFromTemplateSchedule = (sched: any[] | undefined) => {
  const restaurants: { value: string; label: string }[] = [];
  const tickets: { value: string; label: string }[] = [];
  const seenR = new Set<string>();
  const seenT = new Set<string>();
  if (!Array.isArray(sched)) return { restaurants, tickets };
  const pushRest = (r: any) => {
    if (r == null || typeof r !== 'object') return;
    const id = r._id ?? r.id;
    if (id == null || !r.name) return;
    const value = String(id);
    if (seenR.has(value)) return;
    seenR.add(value);
    restaurants.push({ value, label: String(r.name) });
  };
  const pushTicket = (t: any) => {
    if (t == null || typeof t !== 'object') return;
    const id = t._id ?? t.id;
    if (id == null || !t.name) return;
    const value = String(id);
    if (seenT.has(value)) return;
    seenT.add(value);
    const modeLabel = t.application_mode === 'included_in_tour' ? 'Bao gồm' : 'Mua thêm';
    tickets.push({
      value,
      label: `${t.name} — ${t.ticket_type} [${modeLabel}]`,
    });
  };
  for (const s of sched) {
    pushRest(s?.lunch_restaurant_id);
    pushRest(s?.dinner_restaurant_id);
    if (Array.isArray(s?.ticket_ids)) for (const x of s.ticket_ids) pushTicket(x);
  }
  return { restaurants, tickets };
};

/** NCC gửi lên API: suy ra từ nhà hàng / vé đã chọn trong lịch. */
const deriveSupplierIdsFromSchedule = (
  schedule: any[] | undefined,
  restaurants: IRestaurant[],
  tickets: IProviderTicket[]
): string[] => {
  const ids = new Set<string>();
  const restById = new Map<string, IRestaurant>();
  for (const r of restaurants) {
    const id = r.id || r._id;
    if (id) restById.set(String(id), r);
  }
  const ticketById = new Map<string, IProviderTicket>();
  for (const t of tickets) {
    const id = t.id || t._id;
    if (id) ticketById.set(String(id), t);
  }
  for (const day of schedule || []) {
    for (const key of ['lunch_restaurant_id', 'dinner_restaurant_id'] as const) {
      const rid = day?.[key];
      if (rid == null || rid === '') continue;
      const r = restById.get(String(rid));
      const pid = r?.provider_id;
      if (pid != null && pid !== '') ids.add(String(pid));
    }
    const tids = day?.ticket_ids;
    if (Array.isArray(tids)) {
      for (const tid of tids) {
        if (tid == null || tid === '') continue;
        const t = ticketById.get(String(tid));
        const pid = t?.provider_id;
        if (pid != null && pid !== '') ids.add(String(pid));
      }
    }
  }
  return [...ids];
};

/** Chuẩn hoá schedule từ template (hỗ trợ lunch/dinner và legacy restaurant_ids) */
const normalizeScheduleFromTemplate = (sched: any[] | undefined) => {
  if (!Array.isArray(sched) || !sched.length) {
    return [
      {
        day: 1,
        title: '',
        activities: [],
        lunch_restaurant_id: undefined,
        dinner_restaurant_id: undefined,
        ticket_ids: [] as string[],
      },
    ];
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
      ticket_ids: normalizeTicketIdsFromTemplate(s.ticket_ids),
    };
  });
};

import type { ICategory } from '../../../types/tour.types';
import { flattenCategoryTree as flattenTree } from '../../../utils/categoryTree';

const TourCreate = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [templatePickerExtras, setTemplatePickerExtras] = useState<{
    restaurants: { value: string; label: string }[];
    tickets: { value: string; label: string }[];
  }>({ restaurants: [], tickets: [] });
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

  const { data: providersData } = useQuery({
    queryKey: ['providers'],
    queryFn: () => getProviders({ status: 'active' }),
  });
  const providers = providersData?.data?.providers ?? [];

  const { data: restaurantsRes, isLoading: restaurantsLoading } = useQuery({
    queryKey: ['restaurants', 'all'],
    queryFn: () => getRestaurants({}),
  });
  const allRestaurants: IRestaurant[] = restaurantsRes?.data?.restaurants ?? [];

  const { data: ticketsRes, isLoading: ticketsLoading } = useQuery({
    queryKey: ['provider-tickets', 'all'],
    queryFn: () => getProviderTickets({}),
  });
  const allTickets: IProviderTicket[] = ticketsRes?.data?.tickets ?? [];

  const restaurantOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    for (const r of allRestaurants) {
      const rid = r.id || r._id;
      if (!rid) continue;
      const pname =
        providers.find((p: any) => String(p.id || p._id) === String(r.provider_id))?.name?.trim() || '';
      opts.push({
        value: String(rid),
        label: pname ? `${r.name} (${pname})` : r.name,
      });
    }
    const seen = new Set<string>();
    const merged = opts.filter((o) => {
      if (seen.has(o.value)) return false;
      seen.add(o.value);
      return true;
    });
    for (const ex of templatePickerExtras.restaurants) {
      if (seen.has(ex.value)) continue;
      seen.add(ex.value);
      merged.push(ex);
    }
    return merged;
  }, [allRestaurants, providers, templatePickerExtras.restaurants]);

  const ticketOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    for (const t of allTickets) {
      if ((t.status || 'active') !== 'active') continue;
      const tid = t.id || t._id;
      if (!tid) continue;
      const pname =
        providers.find((p: any) => String(p.id || p._id) === String(t.provider_id))?.name?.trim() || '';
      const modeLabel = t.application_mode === 'included_in_tour' ? 'Bao gồm' : 'Mua thêm';
      opts.push({
        value: String(tid),
        label: `${t.name} — ${t.ticket_type} [${modeLabel}]${pname ? ` (${pname})` : ''}`,
      });
    }
    const seen = new Set<string>();
    const merged = opts.filter((o) => {
      if (seen.has(o.value)) return false;
      seen.add(o.value);
      return true;
    });
    for (const ex of templatePickerExtras.tickets) {
      if (seen.has(ex.value)) continue;
      seen.add(ex.value);
      merged.push(ex);
    }
    return merged;
  }, [allTickets, providers, templatePickerExtras.tickets]);

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
          newSchedule.push({
            day: i + 1,
            title: '',
            activities: [],
            lunch_restaurant_id: undefined,
            dinner_restaurant_id: undefined,
            ticket_ids: [],
          });
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

      setTemplatePickerExtras(buildPickerExtrasFromTemplateSchedule(tpl.schedule));

      // Không đụng departure_schedule vì tour thật sẽ set theo lịch khởi hành
      form.setFieldsValue({
        name: tpl.name ? `${tpl.name} ` : undefined,
        description: tpl.description || '',
        duration_days: Number(tpl.duration_days || 1),
        category_id: tpl.category_id?._id || tpl.category_id,
        schedule: normalizeScheduleFromTemplate(tpl.schedule),
        policies: Array.isArray(tpl.policies) ? tpl.policies : [],
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
    finalValues.suppliers = deriveSupplierIdsFromSchedule(values.schedule, allRestaurants, allTickets);

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
            schedule: [
              {
                day: 1,
                title: '',
                activities: [],
                lunch_restaurant_id: undefined,
                dinner_restaurant_id: undefined,
                ticket_ids: [],
              },
            ],
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
                      else setTemplatePickerExtras({ restaurants: [], tickets: [] });
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
                          <Row gutter={[16, 12]}>
                            <Col xs={24} md={8}>
                              <Form.Item {...restField} name={[name, 'title']} rules={[{ required: true, message: 'Vui lòng nhập tiêu đề ngày!' }]} style={{marginBottom: 0}}>
                                <Input placeholder="Tiêu đề (VD: Hà Nội - Sapa)" className="rounded-lg" />
                              </Form.Item>
                            </Col>
                            <Col xs={24} md={16}>
                              <Form.Item {...restField} name={[name, 'activities']} rules={[{ required: true, message: 'Vui lòng thêm ít nhất 1 hoạt động!' }]} style={{marginBottom: 0}}>
                                <Select mode="tags" placeholder="Nhập hoạt động & Enter" open={false} className="rounded-lg" />
                              </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                              <Form.Item
                                {...restField}
                                name={[name, 'lunch_restaurant_id']}
                                label={<span className="font-medium text-gray-600">Nhà hàng buổi trưa</span>}
                                style={{ marginBottom: 0 }}
                                tooltip="Nhãn hiển thị: Tên nhà hàng (Tên NCC)."
                              >
                                <Select
                                  allowClear
                                  showSearch
                                  className="rounded-lg"
                                  placeholder="Chọn nhà hàng trưa"
                                  loading={restaurantsLoading}
                                  options={restaurantOptions}
                                  optionFilterProp="label"
                                  notFoundContent="Chưa có nhà hàng — khai báo tại Nhà cung cấp"
                                />
                              </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                              <Form.Item
                                {...restField}
                                name={[name, 'dinner_restaurant_id']}
                                label={<span className="font-medium text-gray-600">Nhà hàng buổi tối</span>}
                                style={{ marginBottom: 0 }}
                                tooltip="Nhãn hiển thị: Tên nhà hàng (Tên NCC)."
                              >
                                <Select
                                  allowClear
                                  showSearch
                                  className="rounded-lg"
                                  placeholder="Chọn nhà hàng tối"
                                  loading={restaurantsLoading}
                                  options={restaurantOptions}
                                  optionFilterProp="label"
                                  notFoundContent="Chưa có nhà hàng — khai báo tại Nhà cung cấp"
                                />
                              </Form.Item>
                            </Col>
                            <Col span={24}>
                              <Form.Item
                                {...restField}
                                name={[name, 'ticket_ids']}
                                label={<span className="font-medium text-gray-600">Vé trong ngày</span>}
                                style={{ marginBottom: 0 }}
                                tooltip="[Bao gồm] = trong giá tour; [Mua thêm] = phụ thu khi khách chọn."
                              >
                                <Select
                                  mode="multiple"
                                  allowClear
                                  showSearch
                                  className="rounded-lg"
                                  placeholder="Chọn vé (có thể nhiều vé)"
                                  loading={ticketsLoading}
                                  options={ticketOptions}
                                  optionFilterProp="label"
                                  notFoundContent="Chưa có vé — thêm tại Nhà cung cấp"
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
                <Form.Item name="status" label={<span className="font-medium text-gray-600">Trạng thái</span>} style={{ marginBottom: 0 }}>
                  <Select size="large" className="rounded-lg">
                    <Option value="active">Đang hoạt động</Option>
                    <Option value="draft">Bản nháp</Option>
                    <Option value="hidden">Tạm ẩn</Option>
                  </Select>
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