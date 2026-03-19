import { useState, useEffect } from 'react';
import { Form, Input, InputNumber, Button, DatePicker, Select, Card, message, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import axios from 'axios';

const { RangePicker } = DatePicker;
const { Option } = Select;

const HolidayPricingCreate = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [tours, setTours] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // lấy danh sách Tour để đưa vào thẻ select
  useEffect(() => {
    const fetchTours = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/v1/tours?limit=100');
        //  chỉnh cấu trúc dữ liệu tùy vào api tour
        const toursData = res.data?.data?.tours || res.data?.data || [];
        setTours(toursData);
      } catch (error) {
        console.error('Lỗi khi lấy danh sách tour:', error);
      }
    };
    fetchTours();
  }, []);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const payload = {
        name: values.name,
        tour_id: values.tour_id || null,
        start_date: values.dateRange[0].startOf('day').toDate(),
        end_date: values.dateRange[1].endOf('day').toDate(),
        price_multiplier: values.price_multiplier,
        fixed_price: values.fixed_price,
        priority: values.priority,
      };

      await axios.post('http://localhost:5000/api/v1/holiday-pricings', payload);
      message.success('Thêm mới cấu hình giá ngày lễ thành công!');
      navigate('/admin/holiday-pricing');
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra khi thêm mới!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Button 
        icon={<ArrowLeftOutlined />} 
        onClick={() => navigate('/admin/holiday-pricing')}
        style={{ marginBottom: 16 }}
      >
        Quay lại danh sách
      </Button>

      <Card title="Thêm Cấu Hình Giá Ngày Lễ Mới" style={{ maxWidth: 800, borderRadius: 8 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ price_multiplier: 1.0, priority: 0 }}
        >
          <Form.Item
            name="name"
            label="Tên Dịp Lễ / Chiến Dịch"
            rules={[{ required: true, message: 'Vui lòng nhập tên dịp lễ!' }]}
          >
            <Input placeholder="VD: Tết Nguyên Đán 2024, Lễ 30/4..." size="large" />
          </Form.Item>

          <Form.Item
            name="tour_id"
            label="Áp dụng cho Tour (Để trống nếu áp dụng cho TẤT CẢ các tour)"
          >
            <Select 
              placeholder="Chọn một tour cụ thể..." 
              size="large" 
              allowClear
              showSearch
              optionFilterProp="children"
            >
              {tours.map(tour => (
                <Option key={tour._id || tour.id} value={tour._id || tour.id}>
                  {tour.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="dateRange"
            label="Thời gian áp dụng (Từ ngày - Đến ngày)"
            rules={[{ required: true, message: 'Vui lòng chọn khoảng thời gian!' }]}
          >
            <RangePicker size="large" style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>

          <Space style={{ width: '100%' }} size="large" className="responsive-space">
            <Form.Item
              name="price_multiplier"
              label="Hệ số nhân giá"
              tooltip="Mặc định là 1.0. Ví dụ điền 1.2 tức là tăng giá lên 20% so với giá gốc."
            >
              <InputNumber min={0} step={0.1} size="large" style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              name="fixed_price"
              label="Giá cố định (VNĐ)"
              tooltip="Nếu điền, hệ thống sẽ lấy mức giá này và bỏ qua hệ số nhân."
            >
              <InputNumber min={0} step={10000} size="large" style={{ width: '100%' }} placeholder="VD: 1500000" />
            </Form.Item>

            <Form.Item
              name="priority"
              label="Độ ưu tiên"
              tooltip="Khi có nhiều cấu hình trùng ngày, cấu hình có độ ưu tiên cao nhất sẽ được áp dụng."
            >
              <InputNumber min={0} size="large" style={{ width: '100%' }} />
            </Form.Item>
          </Space>

          <Form.Item style={{ marginTop: 24 }}>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} size="large" loading={loading} block>
              Lưu Cấu Hình
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default HolidayPricingCreate;