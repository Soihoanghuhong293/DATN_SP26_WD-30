import { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // 👈 IMPORT THÊM NÀY
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Table, Button, Space, Tag, Popconfirm, message, Typography, Select, Tooltip, Radio } from 'antd';
import { DeleteOutlined, LockOutlined, UnlockOutlined, CrownOutlined, UserOutlined, PlusOutlined, IdcardOutlined, FilterOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

interface IUser {
  _id: string;
  name: string; // 👈 THÊM NAME VÀO ĐÂY
  email: string;
  role: 'user' | 'admin' | 'guide' | 'hdv'; 
  status: 'active' | 'inactive';
  createdAt: string;
}

const UserList = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate(); // 👈 KHAI BÁO CHUYỂN TRANG
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const getAuthHeader = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await axios.get('http://localhost:5000/api/v1/users', getAuthHeader());
      return res.data?.data || res.data || [];
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      await axios.patch(`http://localhost:5000/api/v1/users/${id}/role`, { role }, getAuthHeader());
    },
    onSuccess: () => {
      message.success('Cập nhật quyền thành công!');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.patch(`http://localhost:5000/api/v1/users/${id}/status`, {}, getAuthHeader());
    },
    onSuccess: () => {
      message.success('Đã thay đổi trạng thái tài khoản!');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`http://localhost:5000/api/v1/users/${id}`, getAuthHeader());
    },
    onSuccess: () => {
      message.success('Đã xóa tài khoản thành công!');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const filteredUsers = users.filter((user: IUser) => {
    if (roleFilter === 'all') return true;
    return user.role === roleFilter;
  });

  const columns = [
    {
      title: 'Họ và Tên',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <Text strong className="text-blue-600">{name || 'Chưa cập nhật'}</Text>,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Ngày tham gia',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => <Text type="secondary">{dayjs(date).format('DD/MM/YYYY')}</Text>,
    },
    {
      title: 'Phân quyền',
      key: 'role',
      render: (_: any, record: IUser) => {
        let textColor = 'text-blue-600';
        if (record.role === 'admin') textColor = 'text-red-600 font-bold';
        if (record.role === 'guide') textColor = 'text-green-600 font-medium';
        if (record.role === 'hdv') textColor = 'text-emerald-600 font-medium';

        return (
          <Select
            value={record.role}
            onChange={(newRole) => updateRoleMutation.mutate({ id: record._id, role: newRole })}
            style={{ width: 160 }}
            className={textColor}
            disabled={updateRoleMutation.isPending}
          >
            <Option value="admin"><Space><CrownOutlined className="text-red-500" /> Quản trị viên</Space></Option>
            <Option value="guide"><Space><IdcardOutlined className="text-green-500" /> Hướng dẫn viên</Space></Option>
            <Option value="hdv"><Space><IdcardOutlined className="text-emerald-500" /> HDV</Space></Option>
            <Option value="user"><Space><UserOutlined className="text-blue-500" /> Khách hàng</Space></Option>
          </Select>
        );
      },
    },
    {
      title: 'Trạng thái',
      key: 'status',
      align: 'center' as const,
      render: (_: any, record: IUser) => (
        record.status === 'active' 
          ? <Tag color="success" className="px-3 py-1">Hoạt động</Tag> 
          : <Tag color="error" className="px-3 py-1">Đã khóa</Tag>
      ),
    },
    {
      title: 'Hành động',
      key: 'action',
      align: 'center' as const,
      render: (_: any, record: IUser) => (
        <Space size="middle">
          <Tooltip title={record.status === 'active' ? 'Khóa tài khoản' : 'Mở khóa'}>
            <Button 
              type={record.status === 'active' ? 'default' : 'primary'}
              danger={record.status === 'active'}
              icon={record.status === 'active' ? <LockOutlined /> : <UnlockOutlined />}
              onClick={() => toggleStatusMutation.mutate(record._id)}
              loading={toggleStatusMutation.isPending}
            >
              {record.status === 'active' ? 'Khóa' : 'Mở'}
            </Button>
          </Tooltip>

          <Tooltip title="Xóa vĩnh viễn">
            <Popconfirm
              title="Xóa tài khoản này?"
              onConfirm={() => deleteMutation.mutate(record._id)}
              okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}
            >
              <Button danger icon={<DeleteOutlined />} type="text" />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-lg shadow-sm">
        <div>
          <Title level={3} className="m-0 text-gray-800">Quản lý Tài Khoản</Title>
        </div>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          size="large"
          className="bg-blue-600 shadow-md"
          onClick={() => navigate('/admin/users/create')} /* 👈 ĐỔI THÀNH NÚT CHUYỂN TRANG */
        >
          Thêm Tài Khoản
        </Button>
      </div>

      <div className="mb-4 bg-white p-3 rounded-lg shadow-sm flex items-center">
        <Space>
          <FilterOutlined className="text-gray-400 text-lg mr-2" />
          <Text strong>Lọc theo đối tượng: </Text>
          <Radio.Group value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} buttonStyle="solid">
            <Radio.Button value="all">Tất cả ({users.length})</Radio.Button>
            <Radio.Button value="admin">Quản trị viên</Radio.Button>
            <Radio.Button value="guide">Hướng dẫn viên</Radio.Button>
            <Radio.Button value="hdv">HDV</Radio.Button>
            <Radio.Button value="user">Khách hàng</Radio.Button>
          </Radio.Group>
        </Space>
      </div>

      <Table 
        columns={columns} 
        dataSource={filteredUsers} 
        rowKey="_id" 
        loading={isLoading}
        pagination={{ pageSize: 10 }}
        className="shadow-sm bg-white rounded-lg overflow-hidden"
      />
    </div>
  );
};

export default UserList;