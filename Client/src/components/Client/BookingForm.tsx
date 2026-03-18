import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, Form, Input, InputNumber, Radio, Button, message, Calendar, Tag, Row, Col, Typography, Spin, DatePicker, Select, Card } from 'antd';
import { UserOutlined, PhoneOutlined, MailOutlined, TeamOutlined, SmileOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';

interface BookingFormProps {
  visible: boolean;
  onClose: () => void;
  tour: any;
}

const BookingForm: React.FC<BookingFormProps> = ({ visible, onClose, tour }) => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const passengerDetailsRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [calendarValue, setCalendarValue] = useState<Dayjs>(dayjs());
  const [calculatedPrice, setCalculatedPrice] = useState<number>(0);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [holidayRules, setHolidayRules] = useState<any[]>([]);

  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);

  useEffect(() => {
    if (visible) {
      axios.get('http://localhost:5000/api/v1/holiday-pricings')
        .then(res => setHolidayRules(res.data.data || []))
        .catch(err => console.error('Lỗi khi tải giá ngày lễ:', err));
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      form.resetFields();
      setSelectedDate(null);
      setCalendarValue(dayjs());
      setAdults(1);
      setChildren(0);
      setInfants(0);
    }
  }, [visible]);

  const currentGroupSize = adults + children + infants;
  const totalAmount = (adults * calculatedPrice) + (children * calculatedPrice * 0.5);
  const departureSchedule = tour?.departure_schedule || [];
  const hasSchedule = departureSchedule.length > 0;

  const getPriceForDate = (dateStr: string) => {
    const basePrice = tour?.price || 0;
    const targetTime = new Date(dateStr + 'T12:00:00Z').getTime();
    const applicableRules = holidayRules.filter(rule => {
      const isForTour = !rule.tour_id || rule.tour_id?._id === (tour?._id || tour?.id) || rule.tour_id === (tour?._id || tour?.id);
      if (!isForTour) return false;
      let end = new Date(rule.end_date).getTime();
      const endHr = new Date(rule.end_date).getUTCHours();
      if (endHr === 17 || endHr === 0) end += 24 * 60 * 60 * 1000 - 1;
      const start = new Date(rule.start_date).getTime();
      return targetTime >= start && targetTime <= end;
    });
    if (applicableRules.length > 0) {
      applicableRules.sort((a, b) => (b.priority || 0) - (a.priority || 0));
      const rule = applicableRules[0];
      if (rule.fixed_price) return rule.fixed_price;
      return basePrice * (rule.price_multiplier || 1);
    }
    return basePrice;
  };

  const handleDateSelect = async (dateStr: string) => {
    setSelectedDate(dateStr);
    setCalendarValue(dayjs(dateStr));
    form.setFieldsValue({ startDate: dayjs(dateStr) });
    message.success(`Đã chọn ngày khởi hành: ${dayjs(dateStr).format('DD/MM/YYYY')}`);
    setCalculatedPrice(getPriceForDate(dateStr));
    setLoadingPrice(true);
    try {
      const res = await axios.post('http://localhost:5000/api/v1/holiday-pricings/calculate', {
        tour_id: tour?._id || tour?.id,
        basePrice: tour?.price || 0,
        departureDate: dateStr
      });
      setCalculatedPrice(res.data.data);
    } catch {
      setCalculatedPrice(tour?.price || 0);
    } finally {
      setLoadingPrice(false);
    }
  };

  const getNormalizedDate = (dateVal: string) => {
    if (!dateVal) return '';
    return dateVal.includes('T') ? dateVal.split('T')[0] : dayjs(dateVal).format('YYYY-MM-DD');
  };

  // Hàm xử lý khi click vào 1 ô ngày trên lịch
  const trySelectDate = (dateStr: string, dateDayjs: Dayjs) => {
    const isPast = dateDayjs.isBefore(dayjs(), 'day');
    if (isPast) {
      message.warning('Không thể chọn ngày trong quá khứ!');
      return;
    }

    if (!hasSchedule) {
      // Không có lịch khởi hành → cho chọn bất kỳ ngày nào
      handleDateSelect(dateStr);
      return;
    }

    // Có lịch → chỉ cho chọn ngày trong lịch và còn slot
    const schedule = departureSchedule.find((s: any) => getNormalizedDate(s.date) === dateStr);
    if (!schedule) {
      message.warning('Ngày này chưa có lịch khởi hành!');
    } else if (schedule.slots <= 0) {
      message.warning('Ngày này đã hết chỗ!');
    } else {
      handleDateSelect(dateStr);
    }
  };

  const handleSubmit = async (values: any) => {
    if (!selectedDate) {
      return message.error('Vui lòng chọn ngày khởi hành trên lịch!');
    }
    if (values.paymentMethod === 'deposit') {
      const today = dayjs().startOf('day');
      const selectedD = dayjs(selectedDate).startOf('day');
      if (selectedD.isSame(today) || selectedD.isBefore(today.add(1, 'day'))) {
        return message.error('Không thể đặt cọc cho tour khởi hành trong ngày hôm nay hoặc ngày mai.');
      }
    }

    setLoading(true);
    try {
      const formValues = values;
      const mapPassenger = (group: string, typeName: string, count: number) => {
        return Array.from({ length: count }).map((_, i) => {
          const p = formValues.passengers?.[group]?.[i];
          if (!p) return null;
          return {
            ...p,
            type: typeName,
            birthDate: p.birthDate ? dayjs(p.birthDate).format('YYYY-MM-DD') : undefined
          };
        }).filter(Boolean);
      };

      const passengers = [
        ...mapPassenger('adults', 'Người lớn', adults),
        ...mapPassenger('children', 'Trẻ em', children),
        ...mapPassenger('infants', 'Em bé', infants)
      ].filter(p => p && (p as any).name);

      const payload = {
        tour_id: tour?._id || tour?.id,
        customer_name: values.customerName,
        customer_phone: values.phone,
        customer_email: values.email,
        startDate: selectedDate,
        groupSize: currentGroupSize,
        paymentMethod: values.paymentMethod,
        total_price: totalAmount,
        passengers,
        notes: values.notes,
      };

      const res = await axios.post('http://localhost:5000/api/v1/bookings', payload);
      const data = res.data;
      const bookingData = data?.data || data?.booking || data;
      const bookingId = bookingData?._id || bookingData?.id;

      if (bookingId) {
        message.success('Đặt tour thành công!');
        navigate(`/booking/success/${bookingId}`);
        onClose();
        form.resetFields();
        setSelectedDate(null);
      } else {
        message.error('Không nhận được mã đơn hàng. Vui lòng thử lại!');
      }
    } catch (error: any) {
      message.error(`Lỗi: ${error.response?.data?.message || error.message || 'Có lỗi xảy ra'}`);
    } finally {
      setLoading(false);
    }
  };

  const onFinishFailed = (errorInfo: any) => {
    message.error('Vui lòng kiểm tra lại các thông tin còn thiếu!');
    if (errorInfo.errorFields.length > 0) {
      form.scrollToField(errorInfo.errorFields[0].name);
    }
  };

  return (
    <Modal
      title={<div style={{ fontSize: 20 }}>Đặt Tour: <span style={{ color: '#1890ff' }}>{tour?.name}</span></div>}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={900}
      style={{ top: 20, paddingBottom: 0 }}
      styles={{ body: { paddingBottom: 0 } }}
    >
      <Row gutter={24}>
        <Col xs={24} md={12}>
          <Typography.Title level={5} style={{ marginBottom: 16 }}>1. Chọn ngày khởi hành</Typography.Title>

          {!hasSchedule && (
            <div style={{ marginBottom: 8, padding: '6px 10px', background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 6, fontSize: 12, color: '#ad6800' }}>
              ⚠️ Tour chưa có lịch cố định — bạn có thể chọn bất kỳ ngày nào từ hôm nay trở đi.
            </div>
          )}

          <div style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 8 }}>
            <Calendar
              fullscreen={false}
              value={calendarValue}
              onSelect={(date, info) => {
                // FIX: chỉ xử lý khi click vào ô ngày, bỏ qua chuyển tháng/năm
                const source = (info as any)?.source;
                setCalendarValue(date);
                if (source && source !== 'date') return;
                trySelectDate(date.format('YYYY-MM-DD'), date);
              }}
              cellRender={(current, info) => {
                if (info.type !== 'date') return info.originNode;

                const dateStr = current.format('YYYY-MM-DD');
                const schedule = departureSchedule.find((s: any) => getNormalizedDate(s.date) === dateStr);
                const isAvailable = schedule && schedule.slots > 0;
                const isSelected = selectedDate === dateStr;
                const isPast = current.isBefore(dayjs(), 'day');

                // Khi không có lịch: tất cả ngày tương lai đều clickable
                const isClickable = !isPast && (!hasSchedule || isAvailable);

                return (
                  <div
                    onClick={() => {
                      // Fallback onClick để đảm bảo hoạt động trên mọi version antd
                      setCalendarValue(current);
                      trySelectDate(dateStr, current);
                    }}
                    style={{
                      height: '100%',
                      padding: '4px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      borderRadius: 4,
                      border: isSelected ? '2px solid #1890ff' : '1px solid transparent',
                      backgroundColor: isSelected
                        ? '#e6f7ff'
                        : isAvailable
                          ? '#f6ffed'
                          : (!hasSchedule && !isPast)
                            ? '#f0f5ff'  // màu nhạt cho ngày tương lai khi không có lịch
                            : 'transparent',
                      opacity: isPast ? 0.4 : 1,
                      cursor: isClickable ? 'pointer' : 'default',
                    }}
                  >
                    {schedule && (
                      <div style={{ textAlign: 'center', width: '100%' }}>
                        <div style={{ fontSize: 10, color: '#fa8c16', fontWeight: 'bold' }}>
                          {(getPriceForDate(dateStr) / 1000).toLocaleString('vi-VN')}k
                        </div>
                        <Tag
                          color={isAvailable ? 'success' : 'error'}
                          style={{ margin: '2px 0 0 0', fontSize: 10, lineHeight: '14px', padding: '0 2px' }}
                        >
                          {isAvailable ? `Còn ${schedule.slots}` : 'Hết'}
                        </Tag>
                      </div>
                    )}
                  </div>
                );
              }}
            />
          </div>

          {selectedDate && (
            <div style={{ marginTop: 16, padding: 12, backgroundColor: '#e6f7ff', borderRadius: 8, border: '1px solid #91d5ff' }}>
              <div style={{ marginBottom: 8 }}>
                <span style={{ fontWeight: 600 }}>Ngày khởi hành: </span>
                <span style={{ color: '#1890ff', fontWeight: 'bold' }}>{dayjs(selectedDate).format('DD/MM/YYYY')}</span>
              </div>
              <div>
                <span style={{ fontWeight: 600 }}>Giá áp dụng: </span>
                {loadingPrice
                  ? <Spin size="small" />
                  : <span style={{ color: '#f5222d', fontWeight: 'bold', fontSize: 16 }}>{calculatedPrice.toLocaleString('vi-VN')}đ / khách</span>
                }
              </div>
              <div style={{ marginTop: 8, borderTop: '1px dashed #91d5ff', paddingTop: 8 }}>
                <span style={{ fontWeight: 600 }}>Tổng tiền dự kiến: </span>
                {loadingPrice
                  ? <Spin size="small" />
                  : <span style={{ color: '#f5222d', fontWeight: 'bold', fontSize: 18 }}>{totalAmount.toLocaleString('vi-VN')}đ</span>
                }
              </div>
            </div>
          )}
        </Col>

        <Col xs={24} md={12}>
          <div>
            <Typography.Title level={5} style={{ marginBottom: 16 }}>2. Thông tin liên hệ</Typography.Title>
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              onFinishFailed={onFinishFailed}
              scrollToFirstError
              initialValues={{ paymentMethod: 'full' }}
            >
              <Form.Item
                name="customerName"
                label="Họ tên"
                rules={[
                  { required: true, message: 'Vui lòng nhập họ tên!' },
                  { whitespace: true, message: 'Họ tên không được chỉ chứa khoảng trắng!' }
                ]}
              >
                <Input prefix={<UserOutlined />} placeholder="Nhập họ tên" size="large" />
              </Form.Item>

              <Form.Item
                name="phone"
                label="Số điện thoại"
                rules={[
                  { required: true, message: 'Vui lòng nhập số điện thoại!' },
                  { pattern: /^(\+84|0)[3|5|7|8|9][0-9]{8}$/, message: 'Số điện thoại không hợp lệ!' }
                ]}
              >
                <Input prefix={<PhoneOutlined />} placeholder="Nhập số điện thoại" size="large" />
              </Form.Item>

              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { required: true, message: 'Vui lòng nhập email!' },
                  { type: 'email', message: 'Email không hợp lệ!' }
                ]}
              >
                <Input prefix={<MailOutlined />} placeholder="Nhập email" size="large" />
              </Form.Item>

              <div style={{ marginBottom: 24 }}>
                <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>Hành khách</Typography.Text>
                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item label="Người lớn" style={{ marginBottom: 0 }}>
                      <InputNumber min={1} value={adults} onChange={(v) => setAdults(v || 1)} style={{ width: '100%' }} prefix={<UserOutlined />} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="Trẻ em" style={{ marginBottom: 0 }}>
                      <InputNumber min={0} value={children} onChange={(v) => setChildren(v || 0)} style={{ width: '100%' }} prefix={<TeamOutlined />} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="Em bé" style={{ marginBottom: 0 }}>
                      <InputNumber min={0} value={infants} onChange={(v) => setInfants(v || 0)} style={{ width: '100%' }} prefix={<SmileOutlined />} />
                    </Form.Item>
                  </Col>
                </Row>
              </div>

              <div ref={passengerDetailsRef} style={{ maxHeight: '350px', overflowY: 'auto', marginBottom: 24, paddingRight: 4 }}>
                {[
                  { type: 'adults', count: adults, label: 'Người lớn' },
                  { type: 'children', count: children, label: 'Trẻ em' },
                  { type: 'infants', count: infants, label: 'Em bé' }
                ].map(group =>
                  Array.from({ length: group.count }).map((_, i) => (
                    <Card
                      key={`${group.type}-${i}`}
                      size="small"
                      title={<span style={{ fontWeight: 600 }}>{group.label}</span>}
                      style={{ marginBottom: 12, background: '#fafafa', borderColor: '#d9d9d9' }}
                      styles={{ body: { padding: '12px' } }}
                    >
                      <Row gutter={12}>
                        <Col span={10}>
                          <Form.Item
                            name={['passengers', group.type, i, 'name']}
                            rules={[{ required: true, message: 'Nhập tên' }]}
                            style={{ marginBottom: 0 }}
                          >
                            <Input placeholder="Họ tên" />
                          </Form.Item>
                        </Col>
                        <Col span={8}>
                          <Form.Item
                            name={['passengers', group.type, i, 'birthDate']}
                            rules={[
                              { required: true, message: 'Ngày sinh' },
                              () => ({
                                validator(_, value) {
                                  if (!value) return Promise.resolve();
                                  const age = dayjs().diff(value, 'year', true);
                                  if (group.type === 'adults' && age < 12) return Promise.reject(new Error('Phải >= 12 tuổi'));
                                  if (group.type === 'children' && (age < 2 || age >= 12)) return Promise.reject(new Error('Từ 2 đến 11 tuổi'));
                                  if (group.type === 'infants' && age >= 2) return Promise.reject(new Error('Phải < 2 tuổi'));
                                  return Promise.resolve();
                                },
                              }),
                            ]}
                            style={{ marginBottom: 0 }}
                          >
                            <DatePicker placeholder="Ngày sinh" format="DD/MM/YYYY" style={{ width: '100%' }} />
                          </Form.Item>
                        </Col>
                        <Col span={6}>
                          <Form.Item
                            name={['passengers', group.type, i, 'gender']}
                            initialValue="Nam"
                            style={{ marginBottom: 0 }}
                          >
                            <Select>
                              <Select.Option value="Nam">Nam</Select.Option>
                              <Select.Option value="Nữ">Nữ</Select.Option>
                            </Select>
                          </Form.Item>
                        </Col>
                      </Row>
                    </Card>
                  ))
                )}
              </div>

              <Form.Item name="notes" label="Ghi chú đặc biệt">
                <Input.TextArea rows={3} placeholder="Ví dụ: Ăn chay, dị ứng, phòng tầng thấp..." />
              </Form.Item>

              <Form.Item
                name="paymentMethod"
                label="Phương thức thanh toán"
                rules={[{ required: true, message: 'Vui lòng chọn phương thức thanh toán!' }]}
              >
                <Radio.Group>
                  <Radio value="full">Thanh toán toàn bộ</Radio>
                  <Radio value="deposit">Đặt cọc trước</Radio>
                  <Radio value="later">Thanh toán sau</Radio>
                </Radio.Group>
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  size="large"
                  loading={loading}
                  style={{ height: 48, fontSize: 16, fontWeight: 600 }}
                >
                  Xác nhận đặt tour
                </Button>
              </Form.Item>
            </Form>
          </div>
        </Col>
      </Row>
    </Modal>
  );
};

export default BookingForm;
