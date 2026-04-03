import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  Descriptions,
  Popconfirm,
  Spin,
  Tag,
  Typography,
  Breadcrumb,
  Space,
  message,
  Table,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Row,
  Col,
} from 'antd';
import type { ColumnsType, TableProps } from 'antd/es/table';
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  EditOutlined,
  HomeOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  ContactsOutlined,
  FileTextOutlined,
  DollarOutlined,
  CalendarOutlined,
  CarOutlined,
  BankOutlined,
  IdcardOutlined,
} from '@ant-design/icons';
import {
  getProvider,
  deleteProvider,
  getVehicles,
  createVehicle,
  deleteVehicle,
  getHotels,
  createHotel,
  deleteHotel,
  getRooms,
  createRoom,
  deleteRoom,
  getRestaurants,
  createRestaurant,
  deleteRestaurant,
  getProviderTickets,
  createProviderTicket,
  deleteProviderTicket,
} from '../../../services/api';
import type {
  IProvider,
  IVehicle,
  IHotel,
  IRoom,
  IRestaurant,
  IProviderTicket,
  TicketApplicationMode,
} from '../../../types/provider.types';

const { Title, Text } = Typography;

const statusColor = (status?: string) => (status === 'active' ? 'green' : 'red');
const statusLabel = (status?: string) => (status === 'active' ? 'Hoạt động' : 'Không hoạt động');

const renderActiveInactiveTag = (value?: 'active' | 'inactive' | string) => {
  const inactive = value === 'inactive';
  return (
    <Tag color={inactive ? 'error' : 'success'} bordered={false}>
      {inactive ? 'Ngưng' : 'Hoạt động'}
    </Tag>
  );
};

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(d);
};

const formatVnd = (n?: number) => {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return `${new Intl.NumberFormat('vi-VN').format(Number(n))} đ`;
};

const applicationModeLabel = (m?: TicketApplicationMode) =>
  m === 'included_in_tour' ? 'Bao gồm trong tour' : 'Khách mua thêm';

const ProviderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [vehicleForm] = Form.useForm();
  const [hotelModalOpen, setHotelModalOpen] = useState(false);
  const [hotelForm] = Form.useForm();
  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [roomForm] = Form.useForm();
  const [restaurantModalOpen, setRestaurantModalOpen] = useState(false);
  const [restaurantForm] = Form.useForm();
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [ticketForm] = Form.useForm();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['provider', id],
    queryFn: () => getProvider(id || ''),
    enabled: Boolean(id),
  });

  const { data: vehiclesData, isLoading: isVehiclesLoading } = useQuery({
    queryKey: ['vehicles', id],
    queryFn: () => getVehicles({ provider_id: id }),
    enabled: Boolean(id),
  });

  const vehicles: IVehicle[] = vehiclesData?.data?.vehicles || [];

  const { data: hotelsData, isLoading: isHotelsLoading } = useQuery({
    queryKey: ['hotels', id],
    queryFn: () => getHotels({ provider_id: id }),
    enabled: Boolean(id),
  });

  const { data: roomsData, isLoading: isRoomsLoading } = useQuery({
    queryKey: ['rooms', id],
    queryFn: () => getRooms({ provider_id: id }),
    enabled: Boolean(id),
  });

  const { data: restaurantsData, isLoading: isRestaurantsLoading } = useQuery({
    queryKey: ['restaurants', id],
    queryFn: () => getRestaurants({ provider_id: id }),
    enabled: Boolean(id),
  });

  const hotels: IHotel[] = hotelsData?.data?.hotels || [];
  const rooms: IRoom[] = roomsData?.data?.rooms || [];
  const restaurants: IRestaurant[] = restaurantsData?.data?.restaurants || [];

  const { data: ticketsData, isLoading: isTicketsLoading } = useQuery({
    queryKey: ['provider-tickets', id],
    queryFn: () => getProviderTickets({ provider_id: id }),
    enabled: Boolean(id),
  });

  const tickets: IProviderTicket[] = ticketsData?.data?.tickets || [];

  const provider: IProvider | undefined = data?.data?.provider;

  const { mutate: mutateDelete, isPending: isDeleting } = useMutation({
    mutationFn: () => deleteProvider(id || ''),
    onSuccess: () => {
      message.success('Đã xoá nhà cung cấp');
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      navigate('/admin/providers');
    },
    onError: () => message.error('Xoá nhà cung cấp thất bại'),
  });

  const { mutate: mutateCreateVehicle, isPending: isCreatingVehicle } = useMutation({
    mutationFn: (values: { plate: string; capacity: number; status: 'active' | 'inactive' }) =>
      createVehicle({
        ...values,
        provider_id: provider?.id || provider?._id,
      }),
    onSuccess: () => {
      message.success('Đã thêm xe cho nhà cung cấp');
      queryClient.invalidateQueries({ queryKey: ['vehicles', id] });
      setVehicleModalOpen(false);
      vehicleForm.resetFields();
    },
    onError: () => message.error('Thêm xe thất bại'),
  });

  const { mutate: mutateDeleteVehicle, isPending: isDeletingVehicle } = useMutation({
    mutationFn: (vehicleId: string) => deleteVehicle(vehicleId),
    onSuccess: () => {
      message.success('Đã xoá xe');
      queryClient.invalidateQueries({ queryKey: ['vehicles', id] });
    },
    onError: () => message.error('Xoá xe thất bại'),
  });

  const { mutate: mutateCreateHotel, isPending: isCreatingHotel } = useMutation({
    mutationFn: (values: { name: string; address?: string; status: 'active' | 'inactive' }) =>
      createHotel({
        ...values,
        provider_id: provider?.id || provider?._id,
      }),
    onSuccess: () => {
      message.success('Đã thêm khách sạn');
      queryClient.invalidateQueries({ queryKey: ['hotels', id] });
      setHotelModalOpen(false);
      hotelForm.resetFields();
    },
    onError: () => message.error('Thêm khách sạn thất bại'),
  });

  const { mutate: mutateDeleteHotel, isPending: isDeletingHotel } = useMutation({
    mutationFn: (hotelId: string) => deleteHotel(hotelId),
    onSuccess: () => {
      message.success('Đã xoá khách sạn và phòng thuộc khách sạn');
      queryClient.invalidateQueries({ queryKey: ['hotels', id] });
      queryClient.invalidateQueries({ queryKey: ['rooms', id] });
    },
    onError: () => message.error('Xoá khách sạn thất bại'),
  });

  const { mutate: mutateCreateRoom, isPending: isCreatingRoom } = useMutation({
    mutationFn: (values: { hotel_id: string; room_number: string; max_occupancy: number; status: 'active' | 'inactive' }) =>
      createRoom({
        ...values,
        provider_id: provider?.id || provider?._id,
      }),
    onSuccess: () => {
      message.success('Đã thêm phòng');
      queryClient.invalidateQueries({ queryKey: ['rooms', id] });
      setRoomModalOpen(false);
      roomForm.resetFields();
    },
    onError: () => message.error('Thêm phòng thất bại'),
  });

  const { mutate: mutateDeleteRoom, isPending: isDeletingRoom } = useMutation({
    mutationFn: (roomId: string) => deleteRoom(roomId),
    onSuccess: () => {
      message.success('Đã xoá phòng');
      queryClient.invalidateQueries({ queryKey: ['rooms', id] });
    },
    onError: () => message.error('Xoá phòng thất bại'),
  });

  const { mutate: mutateCreateRestaurant, isPending: isCreatingRestaurant } = useMutation({
    mutationFn: (values: { name: string; phone?: string; capacity: number; location?: string; status: 'active' | 'inactive' }) =>
      createRestaurant({
        ...values,
        provider_id: provider?.id || provider?._id,
      }),
    onSuccess: () => {
      message.success('Đã thêm nhà hàng');
      queryClient.invalidateQueries({ queryKey: ['restaurants', id] });
      setRestaurantModalOpen(false);
      restaurantForm.resetFields();
    },
    onError: () => message.error('Thêm nhà hàng thất bại'),
  });

  const { mutate: mutateDeleteRestaurant, isPending: isDeletingRestaurant } = useMutation({
    mutationFn: (restaurantId: string) => deleteRestaurant(restaurantId),
    onSuccess: () => {
      message.success('Đã xoá nhà hàng');
      queryClient.invalidateQueries({ queryKey: ['restaurants', id] });
    },
    onError: () => message.error('Xoá nhà hàng thất bại'),
  });

  const { mutate: mutateCreateTicket, isPending: isCreatingTicket } = useMutation({
    mutationFn: (values: {
      name: string;
      ticket_type: string;
      price_adult: number;
      price_child: number;
      application_mode: TicketApplicationMode;
      status: 'active' | 'inactive';
    }) =>
      createProviderTicket({
        ...values,
        provider_id: provider?.id || provider?._id,
      }),
    onSuccess: () => {
      message.success('Đã thêm vé');
      queryClient.invalidateQueries({ queryKey: ['provider-tickets', id] });
      setTicketModalOpen(false);
      ticketForm.resetFields();
    },
    onError: () => message.error('Thêm vé thất bại'),
  });

  const { mutate: mutateDeleteTicket, isPending: isDeletingTicket } = useMutation({
    mutationFn: (ticketId: string) => deleteProviderTicket(ticketId),
    onSuccess: () => {
      message.success('Đã xoá vé');
      queryClient.invalidateQueries({ queryKey: ['provider-tickets', id] });
    },
    onError: () => message.error('Xoá vé thất bại'),
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (isError || !provider) {
    return (
      <div style={{ padding: 24 }}>
        <Text type="danger">Không tìm thấy nhà cung cấp: {(error as any)?.message || 'Unknown error'}</Text>
        <div style={{ marginTop: 16 }}>
          <Button onClick={() => navigate('/admin/providers')}>Quay lại danh sách</Button>
        </div>
      </div>
    );
  }

  const subTableProps: Partial<TableProps<any>> = {
    size: 'small',
    pagination: false,
    tableLayout: 'fixed',
    scroll: { x: true },
  };

  const vehicleColumns: ColumnsType<IVehicle> = [
    { title: 'Biển số', dataIndex: 'plate', width: '33%', ellipsis: true, render: (v) => <Text strong>{v}</Text> },
    { title: 'Số chỗ', dataIndex: 'capacity', width: '33%', align: 'right', render: (v) => v ?? '—' },
    { title: 'Trạng thái', dataIndex: 'status', width: '34%', align: 'center', render: (v) => renderActiveInactiveTag(v) },
    {
      title: 'Hành động',
      key: 'actions',
      width: 110,
      align: 'center',
      render: (_, record) => (
        <Popconfirm title="Xoá xe này?" okText="Xoá" cancelText="Huỷ" onConfirm={() => mutateDeleteVehicle(record.id || record._id || '')}>
          <Button danger size="small" loading={isDeletingVehicle}>
            Xoá
          </Button>
        </Popconfirm>
      ),
    },
  ];

  const hotelColumns: ColumnsType<IHotel> = [
    { title: 'Tên khách sạn', dataIndex: 'name', width: '33%', ellipsis: true, render: (v) => <Text strong>{v}</Text> },
    { title: 'Địa chỉ', dataIndex: 'address', width: '33%', ellipsis: true, render: (v) => v || '—' },
    { title: 'Trạng thái', dataIndex: 'status', width: '34%', align: 'center', render: (v) => renderActiveInactiveTag(v) },
    {
      title: 'Hành động',
      key: 'actions',
      width: 110,
      align: 'center',
      render: (_, record) => (
        <Popconfirm
          title="Xoá khách sạn và toàn bộ phòng?"
          okText="Xoá"
          cancelText="Huỷ"
          onConfirm={() => mutateDeleteHotel(record.id || record._id || '')}
        >
          <Button danger size="small" loading={isDeletingHotel}>
            Xoá
          </Button>
        </Popconfirm>
      ),
    },
  ];

  const roomColumns: ColumnsType<IRoom> = [
    {
      title: 'Khách sạn',
      key: 'hotel',
      width: '25%',
      ellipsis: true,
      render: (_, record) => {
        const h = record.hotel_id as any;
        const name = typeof h === 'object' && h?.name ? h.name : '—';
        return <Text>{name}</Text>;
      },
    },
    { title: 'Số phòng', dataIndex: 'room_number', width: '25%', ellipsis: true, render: (v) => <Text strong>{v}</Text> },
    { title: 'Sức chứa', dataIndex: 'max_occupancy', width: '25%', align: 'right', render: (v) => v ?? 2 },
    { title: 'Trạng thái', dataIndex: 'status', width: '25%', align: 'center', render: (v) => renderActiveInactiveTag(v) },
    {
      title: 'Hành động',
      key: 'actions',
      width: 110,
      align: 'center',
      render: (_, record) => (
        <Popconfirm title="Xoá phòng này?" okText="Xoá" cancelText="Huỷ" onConfirm={() => mutateDeleteRoom(record.id || record._id || '')}>
          <Button danger size="small" loading={isDeletingRoom}>
            Xoá
          </Button>
        </Popconfirm>
      ),
    },
  ];

  const restaurantColumns: ColumnsType<IRestaurant> = [
    { title: 'Tên nhà hàng', dataIndex: 'name', width: '20%', ellipsis: true, render: (v) => <Text strong>{v}</Text> },
    { title: 'SĐT', dataIndex: 'phone', width: '20%', ellipsis: true, render: (v) => v || '—' },
    { title: 'Sức chứa', dataIndex: 'capacity', width: '20%', align: 'right', render: (v) => v ?? '—' },
    { title: 'Địa điểm', dataIndex: 'location', width: '20%', ellipsis: true, render: (v) => v || '—' },
    { title: 'Trạng thái', dataIndex: 'status', width: '20%', align: 'center', render: (v) => renderActiveInactiveTag(v) },
    {
      title: 'Hành động',
      key: 'actions',
      width: 110,
      align: 'center',
      render: (_, record) => (
        <Popconfirm title="Xoá nhà hàng này?" okText="Xoá" cancelText="Huỷ" onConfirm={() => mutateDeleteRestaurant(record.id || record._id || '')}>
          <Button danger size="small" loading={isDeletingRestaurant}>
            Xoá
          </Button>
        </Popconfirm>
      ),
    },
  ];

  const ticketColumns: ColumnsType<IProviderTicket> = [
    { title: 'Tên vé', dataIndex: 'name', width: '18%', ellipsis: true, render: (v) => <Text strong>{v}</Text> },
    { title: 'Loại vé', dataIndex: 'ticket_type', width: '18%', ellipsis: true, render: (v) => v || '—' },
    { title: 'Giá NL', dataIndex: 'price_adult', width: '18%', align: 'right', render: (v) => formatVnd(v) },
    { title: 'Giá TE', dataIndex: 'price_child', width: '18%', align: 'right', render: (v) => formatVnd(v) },
    {
      title: 'Áp dụng',
      dataIndex: 'application_mode',
      width: '18%',
      align: 'center',
      render: (m: TicketApplicationMode) => (
        <Tag color={m === 'included_in_tour' ? 'blue' : 'orange'} bordered={false}>
          {applicationModeLabel(m)}
        </Tag>
      ),
    },
    { title: 'Trạng thái', dataIndex: 'status', width: '10%', align: 'center', render: (v) => renderActiveInactiveTag(v) },
    {
      title: 'Hành động',
      key: 'actions',
      width: 110,
      align: 'center',
      render: (_, record) => (
        <Popconfirm title="Xoá vé này?" okText="Xoá" cancelText="Huỷ" onConfirm={() => mutateDeleteTicket(record.id || record._id || '')}>
          <Button danger size="small" loading={isDeletingTicket}>
            Xoá
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <Breadcrumb
        items={[
          { title: <Link to="/admin"><HomeOutlined /> Trang chủ</Link> },
          { title: <Link to="/admin/providers">Nhà cung cấp</Link> },
          { title: provider.name },
        ]}
        style={{ marginBottom: 16 }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            {provider.name}
          </Title>
          <Space style={{ marginTop: 8 }}>
            <Tag color={statusColor(provider.status)}>{statusLabel(provider.status)}</Tag>
            <Text type="secondary">ID: {provider.id || provider._id}</Text>
          </Space>
        </div>
        <Space>
          <Button icon={<EditOutlined />} type="primary" onClick={() => navigate(`/admin/providers/edit/${id}`)}>
            Sửa
          </Button>
          <Popconfirm
            title="Xoá nhà cung cấp này?"
            description="Thao tác này không thể hoàn tác."
            okText="Xoá"
            cancelText="Huỷ"
            okButtonProps={{ danger: true }}
            onConfirm={() => mutateDelete()}
          >
            <Button icon={<DeleteOutlined />} danger loading={isDeleting}>
              Xoá
            </Button>
          </Popconfirm>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/providers')}>
            Quay lại
          </Button>
        </Space>
      </div>

      <Card title="Thông tin cơ bản" style={{ marginBottom: 16 }}>
        {provider.description ? (
          <div style={{ whiteSpace: 'pre-line', lineHeight: 1.6, marginBottom: 16 }}>{provider.description}</div>
        ) : (
          <Text type="secondary">Chưa có mô tả</Text>
        )}
      </Card>

      <Card title="Thông tin liên hệ" style={{ marginBottom: 16 }}>
        <Descriptions column={{ xs: 1, sm: 1, md: 2 }} bordered size="small">
          <Descriptions.Item label={<><PhoneOutlined /> Số điện thoại</>}>
            {provider.phone || '-'}
          </Descriptions.Item>
          <Descriptions.Item label={<><MailOutlined /> Email</>}>
            {provider.email || '-'}
          </Descriptions.Item>
          <Descriptions.Item label={<><EnvironmentOutlined /> Địa chỉ</>} span={2}>
            {provider.address || '-'}
          </Descriptions.Item>
          <Descriptions.Item label={<><ContactsOutlined /> Liên hệ khẩn cấp</>} span={2}>
            <Text type="danger">{provider.emergency_contact || '-'}</Text>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Hợp đồng & Giá ưu đãi" style={{ marginBottom: 16 }}>
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label={<><FileTextOutlined /> Thông tin hợp đồng</>}>
            {provider.contract_info ? (
              <div style={{ whiteSpace: 'pre-line' }}>{provider.contract_info}</div>
            ) : (
              '-'
            )}
          </Descriptions.Item>
          <Descriptions.Item label={<><DollarOutlined /> Mức giá ưu đãi</>}>
            {provider.preferred_pricing ? (
              <div style={{ whiteSpace: 'pre-line' }}>{provider.preferred_pricing}</div>
            ) : (
              '-'
            )}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card
        title={
          <Space>
            <CarOutlined />
            <span>Danh sách xe</span>
          </Space>
        }
        style={{ marginBottom: 16 }}
        extra={
          <Button type="primary" size="small" onClick={() => setVehicleModalOpen(true)}>
            Thêm xe
          </Button>
        }
      >
        <Table
          loading={isVehiclesLoading}
          dataSource={vehicles}
          rowKey={(v) => v.id || v._id || v.plate}
          locale={{ emptyText: 'Chưa khai báo xe cho nhà cung cấp này' }}
          columns={vehicleColumns}
          {...subTableProps}
        />
      </Card>

      <Card
        title={
          <Space>
            <BankOutlined />
            <span>Danh sách khách sạn</span>
          </Space>
        }
        style={{ marginBottom: 16 }}
        extra={
          <Button type="primary" size="small" onClick={() => setHotelModalOpen(true)}>
            Thêm khách sạn
          </Button>
        }
      >
        <Table
          loading={isHotelsLoading}
          dataSource={hotels}
          rowKey={(h) => h.id || h._id || h.name}
          locale={{ emptyText: 'Chưa khai báo khách sạn' }}
          columns={hotelColumns}
          {...subTableProps}
        />
      </Card>

      <Card
        title={
          <Space>
            <HomeOutlined />
            <span>Danh sách phòng</span>
          </Space>
        }
        style={{ marginBottom: 16 }}
        extra={
          <Button
            type="primary"
            size="small"
            disabled={hotels.length === 0}
            onClick={() => {
              roomForm.setFieldsValue({ hotel_id: hotels[0]?.id || hotels[0]?._id });
              setRoomModalOpen(true);
            }}
          >
            Thêm phòng
          </Button>
        }
      >
        <Table
          loading={isRoomsLoading}
          dataSource={rooms}
          rowKey={(r) => r.id || r._id || `${r.room_number}`}
          locale={{ emptyText: 'Chưa có phòng — thêm khách sạn rồi khai báo số phòng' }}
          columns={roomColumns}
          {...subTableProps}
        />
      </Card>

      <Card
        title={
          <Space>
            <BankOutlined />
            <span>Danh sách nhà hàng</span>
          </Space>
        }
        style={{ marginBottom: 16 }}
        extra={
          <Button type="primary" size="small" onClick={() => setRestaurantModalOpen(true)}>
            Thêm nhà hàng
          </Button>
        }
      >
        <Table
          loading={isRestaurantsLoading}
          dataSource={restaurants}
          rowKey={(r) => r.id || r._id || r.name}
          locale={{ emptyText: 'Chưa khai báo nhà hàng' }}
          columns={restaurantColumns}
          {...subTableProps}
        />
      </Card>

      <Card
        title={
          <Space>
            <IdcardOutlined />
            <span>Danh sách vé</span>
          </Space>
        }
        style={{ marginBottom: 16 }}
        extra={
          <Button type="primary" size="small" onClick={() => setTicketModalOpen(true)}>
            Thêm vé
          </Button>
        }
      >
        <Table
          loading={isTicketsLoading}
          dataSource={tickets}
          rowKey={(t) => t.id || t._id || t.name}
          locale={{ emptyText: 'Chưa khai báo vé' }}
          columns={ticketColumns}
          {...subTableProps}
        />
        <div style={{ marginTop: 8 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Bao gồm trong tour: vé đã trong giá tour — hệ thống có thể tự cấp theo số khách. Khách mua thêm: khách tick
            khi đặt chỗ, tính phụ thu.
          </Text>
        </div>
      </Card>

      <Card>
        <Descriptions column={{ xs: 1, sm: 2 }} size="small">
          <Descriptions.Item label={<><CalendarOutlined /> Ngày tạo</>}>
            {formatDateTime(provider.created_at)}
          </Descriptions.Item>
          <Descriptions.Item label="Ngày cập nhật">
            {formatDateTime(provider.update_at)}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Modal
        title="Thêm xe cho nhà cung cấp"
        open={vehicleModalOpen}
        onOk={() => {
          vehicleForm
            .validateFields()
            .then((values) => mutateCreateVehicle(values))
            .catch(() => undefined);
        }}
        onCancel={() => {
          setVehicleModalOpen(false);
          vehicleForm.resetFields();
        }}
        okText="Lưu"
        cancelText="Huỷ"
        confirmLoading={isCreatingVehicle}
        destroyOnClose
      >
        <Form form={vehicleForm} layout="vertical">
          <Form.Item
            name="plate"
            label="Biển số"
            rules={[{ required: true, message: 'Nhập biển số xe' }]}
          >
            <Input placeholder="VD: 51A-12345" />
          </Form.Item>
          <Form.Item
            name="capacity"
            label="Số chỗ"
            rules={[{ required: true, message: 'Nhập số chỗ ngồi' }]}
          >
            <InputNumber min={1} className="w-full" />
          </Form.Item>
          <Form.Item name="status" label="Trạng thái" initialValue="active">
            <Select
              options={[
                { value: 'active', label: 'Hoạt động' },
                { value: 'inactive', label: 'Ngưng sử dụng' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Thêm khách sạn"
        open={hotelModalOpen}
        onOk={() => {
          hotelForm
            .validateFields()
            .then((values) => mutateCreateHotel(values))
            .catch(() => undefined);
        }}
        onCancel={() => {
          setHotelModalOpen(false);
          hotelForm.resetFields();
        }}
        okText="Lưu"
        cancelText="Huỷ"
        confirmLoading={isCreatingHotel}
        destroyOnClose
      >
        <Form form={hotelForm} layout="vertical">
          <Form.Item name="name" label="Tên khách sạn" rules={[{ required: true, message: 'Nhập tên' }]}>
            <Input placeholder="VD: Khách sạn Đà Lạt Xanh" />
          </Form.Item>
          <Form.Item name="address" label="Địa chỉ">
            <Input.TextArea rows={2} placeholder="Địa chỉ (tuỳ chọn)" />
          </Form.Item>
          <Form.Item name="status" label="Trạng thái" initialValue="active">
            <Select
              options={[
                { value: 'active', label: 'Hoạt động' },
                { value: 'inactive', label: 'Ngưng' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Thêm phòng"
        open={roomModalOpen}
        onOk={() => {
          roomForm
            .validateFields()
            .then((values) => mutateCreateRoom(values))
            .catch(() => undefined);
        }}
        onCancel={() => {
          setRoomModalOpen(false);
          roomForm.resetFields();
        }}
        okText="Lưu"
        cancelText="Huỷ"
        confirmLoading={isCreatingRoom}
        destroyOnClose
      >
        <Form form={roomForm} layout="vertical">
          <Form.Item name="hotel_id" label="Khách sạn" rules={[{ required: true, message: 'Chọn khách sạn' }]}>
            <Select
              placeholder="Chọn khách sạn"
              options={hotels.map((h) => ({
                value: h.id || h._id,
                label: h.name,
              }))}
            />
          </Form.Item>
          <Form.Item name="room_number" label="Số phòng" rules={[{ required: true, message: 'Nhập số phòng' }]}>
            <Input placeholder="VD: 301, A-12" />
          </Form.Item>
          <Form.Item name="max_occupancy" label="Sức chứa tối đa (người/phòng)" initialValue={2}>
            <InputNumber min={1} className="w-full" />
          </Form.Item>
          <Form.Item name="status" label="Trạng thái" initialValue="active">
            <Select
              options={[
                { value: 'active', label: 'Hoạt động' },
                { value: 'inactive', label: 'Ngưng' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Thêm nhà hàng"
        open={restaurantModalOpen}
        onOk={() => {
          restaurantForm
            .validateFields()
            .then((values) => mutateCreateRestaurant(values))
            .catch(() => undefined);
        }}
        onCancel={() => {
          setRestaurantModalOpen(false);
          restaurantForm.resetFields();
        }}
        okText="Lưu"
        cancelText="Huỷ"
        confirmLoading={isCreatingRestaurant}
        destroyOnClose
      >
        <Form form={restaurantForm} layout="vertical" initialValues={{ status: 'active', capacity: 50 }}>
          <Form.Item name="name" label="Tên nhà hàng" rules={[{ required: true, message: 'Nhập tên nhà hàng' }]}>
            <Input placeholder="VD: Nhà hàng ABC" />
          </Form.Item>
          <Form.Item name="phone" label="SĐT">
            <Input placeholder="VD: 0901234567" />
          </Form.Item>
          <Form.Item name="capacity" label="Sức chứa" rules={[{ required: true, message: 'Nhập sức chứa' }]}>
            <InputNumber min={1} className="w-full" />
          </Form.Item>
          <Form.Item name="location" label="Địa điểm">
            <Input.TextArea rows={2} placeholder="Địa điểm/địa chỉ" />
          </Form.Item>
          <Form.Item name="status" label="Trạng thái">
            <Select
              options={[
                { value: 'active', label: 'Hoạt động' },
                { value: 'inactive', label: 'Ngưng' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Thêm vé"
        open={ticketModalOpen}
        onOk={() => {
          ticketForm
            .validateFields()
            .then((values) => mutateCreateTicket(values))
            .catch(() => undefined);
        }}
        onCancel={() => {
          setTicketModalOpen(false);
          ticketForm.resetFields();
        }}
        okText="Lưu"
        cancelText="Huỷ"
        confirmLoading={isCreatingTicket}
        destroyOnClose
        width={520}
      >
        <Form
          form={ticketForm}
          layout="vertical"
          initialValues={{
            status: 'active',
            application_mode: 'optional_addon' as TicketApplicationMode,
            price_adult: 0,
            price_child: 0,
          }}
        >
          <Form.Item name="name" label="Tên vé" rules={[{ required: true, message: 'Nhập tên vé' }]}>
            <Input placeholder="VD: Vé Bà Nà Hills" />
          </Form.Item>
          <Form.Item name="ticket_type" label="Loại vé" rules={[{ required: true, message: 'Nhập loại vé' }]}>
            <Input placeholder="VD: Vé tham quan chính, Vé trò chơi…" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="price_adult" label="Giá người lớn (VNĐ)" rules={[{ required: true }]}>
                <InputNumber min={0} className="w-full" placeholder="0" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="price_child" label="Giá trẻ em (VNĐ)" rules={[{ required: true }]}>
                <InputNumber min={0} className="w-full" placeholder="0" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="application_mode" label="Áp dụng khi" rules={[{ required: true }]}>
            <Select
              options={[
                {
                  value: 'included_in_tour',
                  label: 'Bao gồm trong tour — đã trong giá tour, không cần chọn, auto theo số khách',
                },
                {
                  value: 'optional_addon',
                  label: 'Khách mua thêm (optional) — tick khi booking, tính thêm tiền',
                },
              ]}
            />
          </Form.Item>
          <Form.Item name="status" label="Trạng thái">
            <Select
              options={[
                { value: 'active', label: 'Hoạt động' },
                { value: 'inactive', label: 'Ngưng' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProviderDetail;
