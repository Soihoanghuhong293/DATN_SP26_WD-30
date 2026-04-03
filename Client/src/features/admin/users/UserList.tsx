import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // 👈 IMPORT THÊM NÀY
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Table, Button, Space, Tag, Popconfirm, message, Typography, Select, Tooltip, Radio, Input } from 'antd';
import { DeleteOutlined, LockOutlined, UnlockOutlined, CrownOutlined, UserOutlined, PlusOutlined, IdcardOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import AdminPageHeader from '../../../components/admin/AdminPageHeader';
import AdminListCard from '../../../components/admin/AdminListCard';

const { Title, Text } = Typography;
const { Option } = Select;

//commit

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
  const [searchText, setSearchText] = useState<string>('');

  const getAuthHeader = () => {
    const token = localStorage.getItem('token') || localStorage.getItem('admin_token');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

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
    if (roleFilter === 'guide') return user.role === 'guide' || user.role === 'hdv';
    return user.role === roleFilter;
  }).filter((user: IUser) => {
    if (!searchText) return true;
    const lower = searchText.toLowerCase();
    return (user.name || '').toLowerCase().includes(lower) || (user.email || '').toLowerCase().includes(lower);
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
        const uiRole = record.role === 'hdv' ? 'guide' : record.role;
        let textColor = 'text-blue-600';
        if (uiRole === 'admin') textColor = 'text-red-600 font-bold';
        if (uiRole === 'guide') textColor = 'text-green-600 font-medium';

        return (
          <Select
            value={uiRole}
            onChange={(newRole) => updateRoleMutation.mutate({ id: record._id, role: newRole })}
            style={{ width: 160 }}
            className={textColor}
            disabled={updateRoleMutation.isPending}
          >
            <Option value="admin"><Space><CrownOutlined className="text-red-500" /> Quản trị viên</Space></Option>
            <Option value="guide"><Space><IdcardOutlined className="text-green-500" /> Hướng dẫn viên</Space></Option>
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
    <div>
      <AdminPageHeader
        title="Tài khoản"
        subtitle="Quản lý tài khoản và phân quyền."
        extra={
          <Space wrap>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/admin/users/create')}>
              Thêm tài khoản
            </Button>
            <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['users'] })}>Tải lại</Button>
          </Space>
        }
      />

      <AdminListCard
        toolbar={
          <Space wrap>
            <Input
              prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
              placeholder="Tìm theo tên hoặc email..."
              allowClear
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 320 }}
            />
            <Text strong>Lọc:</Text>
            <Radio.Group
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              buttonStyle="solid"
            >
              <Radio.Button value="all">Tất cả ({users.length})</Radio.Button>
              <Radio.Button value="admin">Quản trị viên</Radio.Button>
              <Radio.Button value="guide">Hướng dẫn viên</Radio.Button>
              <Radio.Button value="user">Khách hàng</Radio.Button>
            </Radio.Group>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={filteredUsers}
          rowKey="_id"
          loading={isLoading}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          scroll={{ x: 1100 }}
        />
      </AdminListCard>
      
    </div>
  );
};

export default UserList;