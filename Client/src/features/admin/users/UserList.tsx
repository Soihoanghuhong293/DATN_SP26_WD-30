import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Button, Empty, Input, Popconfirm, Radio, Select, Space, Table, Tag, Tooltip, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CrownOutlined, DeleteOutlined, IdcardOutlined, LockOutlined, PlusOutlined, ReloadOutlined, SearchOutlined, UnlockOutlined, UserOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import AdminPageHeader from '../../../components/admin/AdminPageHeader';
import AdminListCard from '../../../components/admin/AdminListCard';
import './UserList.css';

const { Text } = Typography;
const { Option } = Select;

const API_URL = (import.meta as any)?.env?.VITE_API_URL || 'http://localhost:5000/api/v1';

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
  const navigate = useNavigate();

  type RoleFilter = 'all' | 'admin' | 'guide' | 'user';

  type FilterState = {
    search: string;
    role: RoleFilter;
    status?: 'active' | 'inactive';
  };

  const emptyFilters = (): FilterState => ({
    search: '',
    role: 'all',
    status: undefined,
  });

  const [draft, setDraft] = useState<FilterState>(() => emptyFilters());
  const [applied, setApplied] = useState<FilterState>(() => emptyFilters());

  const getAuthHeader = () => {
    const token = localStorage.getItem('token') || localStorage.getItem('admin_token');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const { data: users = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ['users', applied],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/users`, getAuthHeader());
      return res.data?.data || res.data || [];
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      await axios.patch(`${API_URL}/users/${id}/role`, { role }, getAuthHeader());
    },
    onSuccess: () => {
      message.success('Cập nhật quyền thành công!');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: () => message.error('Cập nhật quyền thất bại'),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.patch(`${API_URL}/users/${id}/status`, {}, getAuthHeader());
    },
    onSuccess: () => {
      message.success('Đã thay đổi trạng thái tài khoản!');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: () => message.error('Cập nhật trạng thái thất bại'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`${API_URL}/users/${id}`, getAuthHeader());
    },
    onSuccess: () => {
      message.success('Đã xóa tài khoản thành công!');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: () => message.error('Xóa tài khoản thất bại'),
  });

  const filteredUsers = useMemo(() => {
    const list = (users || []) as IUser[];
    const q = applied.search.trim().toLowerCase();
    return list
      .filter((user) => {
        if (applied.role === 'all') return true;
        if (applied.role === 'guide') return user.role === 'guide' || user.role === 'hdv';
        return user.role === applied.role;
      })
      .filter((user) => {
        if (applied.status && user.status !== applied.status) return false;
        if (!q) return true;
        return (user.name || '').toLowerCase().includes(q) || (user.email || '').toLowerCase().includes(q) || (user._id || '').toLowerCase().includes(q);
      });
  }, [users, applied]);

  const appliedTags = useMemo(() => {
    const tags: { key: keyof FilterState; label: string }[] = [];
    if (applied.search.trim()) tags.push({ key: 'search', label: `Từ khóa: ${applied.search.trim()}` });
    if (applied.role !== 'all') {
      const map: Record<Exclude<RoleFilter, 'all'>, string> = {
        admin: 'Quản trị viên',
        guide: 'Hướng dẫn viên',
        user: 'Khách hàng',
      };
      tags.push({ key: 'role', label: `Vai trò: ${map[applied.role as Exclude<RoleFilter, 'all'>]}` });
    }
    if (applied.status) tags.push({ key: 'status', label: `Trạng thái: ${applied.status === 'active' ? 'Hoạt động' : 'Đã khóa'}` });
    return tags;
  }, [applied]);

  const columns: ColumnsType<IUser> = [
    {
      title: 'Người dùng',
      dataIndex: 'name',
      key: 'name',
      width: 260,
      render: (name: string, record) => (
        <div className="user-list-name-cell">
          <div className="user-list-name-icon" aria-hidden>
            <UserOutlined />
          </div>
          <div className="user-list-name-text">
            <Tooltip title={`ID: ${record._id}`}>
              <div className="user-list-name-title">{name || 'Chưa cập nhật'}</div>
            </Tooltip>
            <Text type="secondary" className="user-list-sub">
              {record.email}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      responsive: ['md'],
    },
    {
      title: 'Ngày tham gia',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 140,
      render: (date: string) => <Text type="secondary">{dayjs(date).format('DD/MM/YYYY')}</Text>,
    },
    {
      title: 'Phân quyền',
      key: 'role',
      width: 200,
      render: (_: any, record: IUser) => {
        const uiRole = record.role === 'hdv' ? 'guide' : record.role;
        return (
          <Select
            value={uiRole}
            onChange={(newRole) => updateRoleMutation.mutate({ id: record._id, role: newRole })}
            style={{ width: 160 }}
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
      width: 140,
      render: (_: any, record: IUser) => (
        <span className={`user-list-status ${record.status === 'active' ? 'user-list-status--active' : 'user-list-status--inactive'}`}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: record.status === 'active' ? '#10b981' : '#94a3b8' }} />
          {record.status === 'active' ? 'Hoạt động' : 'Đã khóa'}
        </span>
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 160,
      align: 'right' as const,
      fixed: 'right',
      render: (_: any, record: IUser) => (
        <Space size={6} className="user-list-actions">
          <Tooltip title={record.status === 'active' ? 'Khóa tài khoản' : 'Mở khóa'}>
            <Button 
              type="text"
              danger={record.status === 'active'}
              icon={record.status === 'active' ? <LockOutlined /> : <UnlockOutlined />}
              onClick={(e) => { e.stopPropagation(); toggleStatusMutation.mutate(record._id); }}
              loading={toggleStatusMutation.isPending && toggleStatusMutation.variables === record._id}
            />
          </Tooltip>

          <Tooltip title="Xóa vĩnh viễn">
            <Popconfirm
              title="Xóa tài khoản này?"
              description="Thao tác không thể hoàn tác."
              onConfirm={() => deleteMutation.mutate(record._id)}
              okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}
            >
              <Button
                danger
                icon={<DeleteOutlined />}
                type="text"
                loading={deleteMutation.isPending && deleteMutation.variables === record._id}
                onClick={(e) => e.stopPropagation()}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="user-list-page">
      <AdminPageHeader
        title="Tài khoản"
        subtitle="Quản lý tài khoản và phân quyền."
        extra={
          <Space wrap>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/admin/users/create')}>
              Thêm tài khoản
            </Button>
            <Button icon={<ReloadOutlined />} loading={isFetching && !isLoading} onClick={() => refetch()}>
              Tải lại
            </Button>
          </Space>
        }
      />

      <AdminListCard
        style={{
          borderRadius: 14,
          border: '1px solid #e2e8f0',
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
        }}
        toolbar={
          <div className="user-filterbar">
            <div className="user-filterbar-grid" onClick={(e) => e.stopPropagation()}>
              <div className="user-filterbar-item">
                <div className="user-filterbar-label">Tìm kiếm</div>
                <Input
                  allowClear
                  size="middle"
                  prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                  placeholder="Tìm theo tên, email hoặc mã..."
                  value={draft.search}
                  onChange={(e) => setDraft((p) => ({ ...p, search: e.target.value }))}
                />
              </div>

              <div className="user-filterbar-item">
                <div className="user-filterbar-label">Vai trò</div>
                <Radio.Group
                  value={draft.role}
                  onChange={(e) => setDraft((p) => ({ ...p, role: e.target.value }))}
                  buttonStyle="solid"
                >
                  <Radio.Button value="all">Tất cả</Radio.Button>
                  <Radio.Button value="admin">Admin</Radio.Button>
                  <Radio.Button value="guide">HDV</Radio.Button>
                  <Radio.Button value="user">Khách</Radio.Button>
                </Radio.Group>
              </div>

              <div className="user-filterbar-item">
                <div className="user-filterbar-label">Trạng thái</div>
                <Select
                  allowClear
                  size="middle"
                  placeholder="Tất cả"
                  value={draft.status}
                  onChange={(v) => setDraft((p) => ({ ...p, status: v }))}
                  options={[
                    { value: 'active', label: 'Hoạt động' },
                    { value: 'inactive', label: 'Đã khóa' },
                  ]}
                />
              </div>

              <div className="user-filterbar-item user-filterbar-actions">
                <div className="user-filterbar-label">&nbsp;</div>
                <Space wrap>
                  <Button
                    onClick={() => {
                      const cleared = emptyFilters();
                      setDraft(cleared);
                      setApplied(cleared);
                    }}
                  >
                    Xóa bộ lọc
                  </Button>
                  <Button type="primary" loading={isFetching} onClick={() => setApplied(draft)}>
                    Áp dụng
                  </Button>
                </Space>
              </div>
            </div>

            <div className="user-filterbar-footer">
              <div className="user-filterbar-tags">
                {appliedTags.length > 0 ? (
                  appliedTags.map((t) => (
                    <Tag
                      key={String(t.key) + t.label}
                      closable
                      onClose={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const nextDraft = { ...draft };
                        const nextApplied = { ...applied };
                        if (t.key === 'search') {
                          nextDraft.search = '';
                          nextApplied.search = '';
                        } else if (t.key === 'role') {
                          nextDraft.role = 'all';
                          nextApplied.role = 'all';
                        } else if (t.key === 'status') {
                          nextDraft.status = undefined;
                          nextApplied.status = undefined;
                        }
                        setDraft(nextDraft);
                        setApplied(nextApplied);
                      }}
                    >
                      {t.label}
                    </Tag>
                  ))
                ) : (
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    Chưa chọn bộ lọc
                  </Text>
                )}
              </div>
              <Text type="secondary" style={{ fontSize: 13 }}>
                {filteredUsers.length} mục
              </Text>
            </div>
          </div>
        }
      >
        <Table
          className="user-list-table"
          columns={columns}
          dataSource={filteredUsers}
          rowKey="_id"
          loading={isLoading}
          locale={{ emptyText: <Empty description="Chưa có người dùng" /> }}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          scroll={{ x: 1100 }}
        />
      </AdminListCard>
      
    </div>
  );
};

export default UserList;