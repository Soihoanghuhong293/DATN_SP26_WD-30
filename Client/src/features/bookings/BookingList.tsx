import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Button, Popconfirm, Table, Tag, message, Space } from "antd";
import { Link } from "react-router-dom";
import { DeleteOutlined, EditOutlined, EyeOutlined } from "@ant-design/icons";

// 1. Định nghĩa Interface cho Booking (Dựa trên Mongoose Schema)
export interface IBooking {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
  };
  tour: {
    _id: string;
    name: string;
    price: number;
  };
  fullName: string; // Tên người đặt (trong form booking)
  phone: string;
  guestSize: number;
  bookAt: string; // Ngày đặt
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'cancelled';
}

const BookingList = () => {
  const queryClient = useQueryClient();

  // 2. Hàm gọi API lấy danh sách (GET)
  const getBookings = async () => {
    // Lưu ý: Port 5000 là server Backend bạn đang chạy
    const response = await axios.get("http://localhost:5000/api/v1/bookings");
    // Tùy vào Backend bạn trả về format nào, thường là response.data.data
    return response.data.data; 
  };

  // 3. Sử dụng useQuery để fetch dữ liệu
  const { data, isLoading, isError } = useQuery({ 
    queryKey: ["bookings"], 
    queryFn: getBookings 
  });

  // 4. Hàm xóa Booking (DELETE)
  const deleteBooking = async (id: string) => {
    try {
      await axios.delete(`http://localhost:5000/api/v1/bookings/${id}`);
      message.success("Xóa đơn hàng thành công!");
    } catch (error) {
      message.error("Xóa thất bại!");
      throw error;
    }
  };

  // 5. Sử dụng useMutation để xử lý xóa
  const mutation = useMutation({
    mutationFn: deleteBooking,
    onSuccess: () => {
      // Refresh lại data sau khi xóa
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });

  // 6. Cấu hình cột cho bảng Antd
  const columns = [
    {
      title: "Tour",
      dataIndex: ["tour", "name"], // Lấy tour.name từ object nested
      key: "tour",
      render: (text: string) => <b style={{ color: '#1677ff' }}>{text}</b>
    },
    {
      title: "Khách hàng",
      dataIndex: "fullName",
      key: "fullName",
      render: (text: string, record: IBooking) => (
        <div>
          <div>{text}</div>
          <div style={{ fontSize: '12px', color: 'gray' }}>{record.phone}</div>
        </div>
      )
    },
    {
      title: "Ngày đi",
      dataIndex: "bookAt",
      key: "bookAt",
      render: (date: string) => new Date(date).toLocaleDateString("vi-VN")
    },
    {
      title: "Số khách",
      dataIndex: "guestSize",
      key: "guestSize",
    },
    {
      title: "Tổng tiền",
      dataIndex: "totalPrice",
      key: "totalPrice",
      render: (price: number) => 
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price)
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
        let color = status === 'confirmed' ? 'green' : status === 'pending' ? 'orange' : 'red';
        let text = status === 'confirmed' ? 'Đã xác nhận' : status === 'pending' ? 'Chờ xử lý' : 'Đã hủy';
        return (
          <Tag color={color} key={status}>
            {text.toUpperCase()}
          </Tag>
        );
      },
    },
    {
      title: "Hành động",
      key: "action",
      render: (record: IBooking) => (
        <Space size="small">
            {/* Nút Xem/Sửa */}
            <Link to={`/admin/bookings/${record._id}`}>
              <Button type="primary" ghost icon={<EyeOutlined />} />
            </Link>

            {/* Nút Xóa */}
            <Popconfirm
              title="Bạn có chắc muốn xóa đơn này?"
              description="Hành động này không thể hoàn tác"
              onConfirm={() => mutation.mutate(record._id)}
              okText="Xóa"
              cancelText="Hủy"
            >
              <Button danger icon={<DeleteOutlined />} loading={mutation.isPending} />
            </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <h2 className="text-xl font-bold mb-4">Danh sách Đặt chỗ</h2>
      <Table 
        dataSource={data} 
        columns={columns} 
        rowKey="_id" // MongoDB dùng _id làm key
        loading={isLoading}
        bordered
      />
    </div>
  );
};

export default BookingList;