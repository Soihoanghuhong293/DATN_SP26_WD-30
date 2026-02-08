import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { 
  Form, Select, DatePicker, InputNumber, Input, Button, 
  Card, Row, Col, Typography, message, Divider, Spin, Image 
} from "antd";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { ArrowLeftOutlined, SaveOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;
const { Option } = Select;

// 1. Định nghĩa kiểu dữ liệu (để code nhắc lệnh cho sướng)
interface ITour {
  _id: string;
  name: string;
  price: number;
  image: string;
  status: string;
}

interface IUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
}

const BookingCreate = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // State cục bộ để lưu giá tour đang chọn (phục vụ tính toán hiển thị)
  const [selectedTour, setSelectedTour] = useState<ITour | null>(null);
  const [guestCount, setGuestCount] = useState<number>(1);

  // ==================== CALL API ====================

  // 1. Lấy danh sách Tour (Chỉ lấy tour đang Active)
  const { data: tours, isLoading: loadingTours } = useQuery({
    queryKey: ["tours", "active"],
    queryFn: async () => {
      // Nhớ sửa URL nếu backend bạn khác port
      const res = await axios.get("http://localhost:5000/api/v1/tours"); 
      // Lọc phía client hoặc backend tùy API của bạn. Ở đây giả sử lọc client cho chắc
      return (res.data.data || []).filter((t: ITour) => t.status === 'active');
    },
  });

  // 2. Lấy danh sách User
  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await axios.get("http://localhost:5000/api/v1/users");
      // Tùy cấu trúc trả về của backend: res.data hoặc res.data.data.users
      return res.data.data.users || res.data.data || []; 
    },
  });

  // 3. API Submit Booking
  const mutation = useMutation({
    mutationFn: async (values: any) => {
      const payload = {
        ...values,
        // Format ngày tháng chuẩn YYYY-MM-DD để gửi xuống DB
        bookAt: values.bookAt ? dayjs(values.bookAt).format("YYYY-MM-DD") : null,
      };
      return await axios.post("http://localhost:5000/api/v1/bookings", payload);
    },
    onSuccess: () => {
      message.success("Tạo đơn đặt tour thành công!");
      queryClient.invalidateQueries({ queryKey: ["bookings"] }); // Reset cache danh sách
      navigate("/admin/bookings"); // Quay về trang danh sách
    },
    onError: (error: any) => {
      console.error(error);
      message.error(error.response?.data?.message || "Có lỗi xảy ra khi tạo đơn!");
    },
  });

  // ==================== HANDLERS ====================

  const handleFinish = (values: any) => {
    mutation.mutate(values);
  };

  // Khi chọn Tour -> Cập nhật giá tiền và lưu state
  const handleTourChange = (tourId: string) => {
    const tour = tours?.find((t: ITour) => t._id === tourId);
    if (tour) {
      setSelectedTour(tour);
    }
  };

  // Khi chọn User -> Tự điền tên và SĐT vào form
  const handleUserChange = (userId: string) => {
    const user = users?.find((u: IUser) => u._id === userId);
    if (user) {
      form.setFieldsValue({
        fullName: user.name,
        phone: user.phone || "",
      });
    }
  };

  // Tính tổng tiền tạm thời (Frontend display only)
  const tempTotalPrice = (selectedTour?.price || 0) * guestCount;

  if (loadingTours || loadingUsers) return <Spin size="large" className="block mx-auto mt-10" />;

  return (
    <div style={{ padding: 24 }}>
      {/* Header trang */}
      <div className="flex justify-between items-center mb-6">
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/admin/bookings")}>
          Quay lại
        </Button>
        <Title level={3} style={{ margin: 0 }}>Tạo Đơn Đặt Tour</Title>
        <div style={{ width: 88 }}></div> {/* Spacer cho cân đối */}
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        initialValues={{ guestSize: 1, bookAt: dayjs() }}
        size="large"
      >
        <Row gutter={24}>
          {/* CỘT TRÁI: THÔNG TIN TOUR */}
          <Col span={14}>
            <Card title="1. Thông tin Tour & Lịch trình" className="shadow-sm mb-6">
              <Form.Item
                label="Chọn Tour"
                name="tourId"
                rules={[{ required: true, message: "Vui lòng chọn tour!" }]}
              >
                <Select
                  placeholder="Tìm kiếm tour..."
                  showSearch
                  optionFilterProp="children"
                  onChange={handleTourChange}
                  loading={loadingTours}
                >
                  {tours?.map((tour: ITour) => (
                    <Option key={tour._id} value={tour._id}>
                      {tour.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              {/* Hiển thị chi tiết Tour sau khi chọn */}
              {selectedTour && (
                <div className="bg-blue-50 p-4 rounded-md mb-4 flex gap-4">
                  <Image 
                    width={100} 
                    src={selectedTour.image} 
                    fallback="https://placehold.co/100x70?text=No+Image"
                    className="rounded"
                  />
                  <div>
                    <Text strong className="text-blue-700">{selectedTour.name}</Text>
                    <div className="text-gray-500 mt-1">
                      Đơn giá: <span className="font-bold text-orange-600">
                        {selectedTour.price.toLocaleString()} đ
                      </span> / khách
                    </div>
                  </div>
                </div>
              )}

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="Ngày khởi hành"
                    name="bookAt"
                    rules={[{ required: true, message: "Chọn ngày đi!" }]}
                  >
                    <DatePicker 
                      className="w-full" 
                      format="DD/MM/YYYY"
                      // Không cho chọn ngày quá khứ
                      disabledDate={(current) => current && current < dayjs().startOf('day')}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="Số lượng khách"
                    name="guestSize"
                    rules={[{ required: true, message: "Nhập số khách!" }]}
                  >
                    <InputNumber
                      min={1}
                      max={50}
                      className="w-full"
                      onChange={(value) => setGuestCount(value || 1)}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Col>

          {/* CỘT PHẢI: THÔNG TIN KHÁCH & THANH TOÁN */}
          <Col span={10}>
            <Card title="2. Thông tin Khách hàng" className="shadow-sm mb-6">
              <Form.Item
                label="Tài khoản đặt (User)"
                name="userId"
                rules={[{ required: true, message: "Chọn tài khoản user!" }]}
                help="Chọn tài khoản để tích điểm cho khách"
              >
                <Select
                  placeholder="Chọn tài khoản..."
                  showSearch
                  optionFilterProp="children"
                  onChange={handleUserChange}
                  loading={loadingUsers}
                >
                  {users?.map((user: IUser) => (
                    <Option key={user._id} value={user._id}>
                      {user.name} ({user.email})
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Divider dashed style={{ margin: "12px 0" }} />

              <Form.Item
                label="Họ tên người đi (Liên hệ)"
                name="fullName"
                rules={[{ required: true, message: "Nhập tên người liên hệ!" }]}
              >
                <Input placeholder="Nguyễn Văn A" />
              </Form.Item>

              <Form.Item
                label="Số điện thoại"
                name="phone"
                rules={[
                  { required: true, message: "Nhập số điện thoại!" },
                  { pattern: /^[0-9]{10}$/, message: "SĐT không hợp lệ" }
                ]}
              >
                <Input placeholder="0901234567" />
              </Form.Item>
            </Card>

            {/* BILL SUMMARY */}
            <Card className="bg-gray-50 border-blue-200">
              <div className="flex justify-between mb-2">
                <Text>Đơn giá vé:</Text>
                <Text strong>{selectedTour?.price.toLocaleString() || 0} đ</Text>
              </div>
              <div className="flex justify-between mb-2">
                <Text>Số lượng:</Text>
                <Text strong>x {guestCount}</Text>
              </div>
              <Divider style={{ margin: "12px 0" }} />
              <div className="flex justify-between items-center">
                <Text strong style={{ fontSize: 16 }}>TỔNG TIỀN (Tạm tính):</Text>
                <Text type="danger" style={{ fontSize: 24, fontWeight: "bold" }}>
                  {tempTotalPrice.toLocaleString()} đ
                </Text>
              </div>
              
              <Button 
                type="primary" 
                htmlType="submit" 
                block 
                size="large" 
                icon={<SaveOutlined />}
                className="mt-6 h-12 text-lg font-bold bg-blue-600 hover:bg-blue-500"
                loading={mutation.isPending}
              >
                XÁC NHẬN ĐẶT TOUR
              </Button>
            </Card>
          </Col>
        </Row>
      </Form>
    </div>
  );
};

export default BookingCreate;