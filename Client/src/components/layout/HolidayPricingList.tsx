import { Table, Button, Space, Typography, Popconfirm, message, Tag } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

const { Title } = Typography;

const HolidayPricingList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  //  danh sách 
  const { data, isLoading } = useQuery({
    queryKey: ['holiday-pricings'],
    queryFn: async () => {
      const response = await axios.get('http://localhost:5000/api/v1/holiday-pricings');
      return response.data.data;
    },
  });

  // xóa 
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`http://localhost:5000/api/v1/holiday-pricings/${id}`);
    },
    onSuccess: () => {
      message.success('Xóa thành công cấu hình ngày lễ!');
      queryClient.invalidateQueries({ queryKey: ['holiday-pricings'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Lỗi khi xóa cấu hình!');
    },
  });

  const columns = [
    {
      title: 'Tên Dịp Lễ',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <strong className="text-blue-600">{text}</strong>,
    },
    {
      title: 'Áp dụng cho Tour',
      dataIndex: 'tour_id',
      key: 'tour_id',
      render: (tour: any) => (
        tour ? <Tag color="geekblue">{tour.name}</Tag> : <Tag color="green">Tất cả các Tour</Tag>
      ),
    },
    {
      title: 'Thời gian áp dụng',
      key: 'time',
      render: (_: any, record: any) => (
        <span>
          {dayjs(record.start_date).format('DD/MM/YYYY')} - {dayjs(record.end_date).format('DD/MM/YYYY')}
        </span>
      ),
    },
    {
      title: 'Mức Giá (Thay đổi)',
      key: 'pricing',
      render: (_: any, record: any) => {
        if (record.fixed_price) {
          return <Tag color="magenta">Giá Cố Định: {record.fixed_price.toLocaleString('vi-VN')} đ</Tag>;
        }
        return <Tag color="cyan">Hệ Số Nhân: x{record.price_multiplier}</Tag>;
      },
    },
    {
      title: 'Độ Ưu Tiên',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority: number) => <Tag color={priority > 0 ? "orange" : "default"}>{priority}</Tag>
    },
    {
      title: 'Hành Động',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space size="middle">
          <Button 
            type="primary" 
            icon={<EditOutlined />} 
            onClick={() => navigate(`/admin/holiday-pricing/edit/${record._id}`)}
          />
          <Popconfirm
            title="Bạn có chắc chắn muốn xóa cấu hình này?"
            onConfirm={() => deleteMutation.mutate(record._id)}
            okText="Đồng ý"
            cancelText="Hủy"
          >
            <Button type="primary" danger icon={<DeleteOutlined />} loading={deleteMutation.isPending} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24, background: '#fff', borderRadius: 8, minHeight: '80vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>Danh Sách Giá Ngày Lễ</Title>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={() => navigate('/admin/holiday-pricing/create')}
        >
          Thêm Ngày Lễ Mới
        </Button>
      </div>

      <Table 
        columns={columns} 
        dataSource={data} 
        rowKey="_id" 
        loading={isLoading}
        pagination={{ pageSize: 10 }}
        bordered
      />
    </div>
  );
};

export default HolidayPricingList;