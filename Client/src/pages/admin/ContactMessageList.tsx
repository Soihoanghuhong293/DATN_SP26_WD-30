import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  Button,
  Typography,
  Select,
  Input,
  Modal,
  Popconfirm,
  message,
  Space,
  Descriptions,
  Table,
  Tag,
  Tooltip,
  Empty,
} from 'antd';
import {
  MessageOutlined,
  CheckOutlined,
  DeleteOutlined,
  PhoneOutlined,
  UserOutlined,
  SearchOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminListCard from '../../components/admin/AdminListCard';
import { ADMIN_UNREAD_CONTACT_MESSAGE_COUNT_KEY } from '../../components/layout/AdminSidebar';
import type { ColumnsType } from 'antd/es/table';
import './ContactMessageList.css';

const { Text } = Typography;

const API_URL = (import.meta as any)?.env?.VITE_API_URL || 'http://localhost:5000/api/v1';

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token') || localStorage.getItem('admin_token')}` },
});

interface IContactMessage {
  _id: string;
  name: string;
  phone: string;
  content: string;
  status: 'unread' | 'read';
  created_at: string;
}

const ContactMessageList = () => {
  const queryClient = useQueryClient();
  type FilterState = {
    status: 'all' | 'unread' | 'read';
    search: string;
  };

  const emptyFilters = (): FilterState => ({
    status: 'all',
    search: '',
  });

  const [draft, setDraft] = useState<FilterState>(() => emptyFilters());
  const [applied, setApplied] = useState<FilterState>(() => emptyFilters());
  const [selectedMsg, setSelectedMsg] = useState<IContactMessage | null>(null);

  const { data: messages = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ['contact-messages', applied],
    queryFn: async () => {
      const params = applied.status !== 'all' ? { status: applied.status } : {};
      const res = await axios.get(`${API_URL}/contact-messages`, { ...getAuthHeader(), params });
      return res.data?.data || [];
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.patch(`${API_URL}/contact-messages/${id}/read`, null, getAuthHeader());
    },
    onSuccess: () => {
      message.success('Đã đánh dấu đã đọc');
      queryClient.invalidateQueries({ queryKey: ['contact-messages'] });
      queryClient.invalidateQueries({ queryKey: ADMIN_UNREAD_CONTACT_MESSAGE_COUNT_KEY });
      setSelectedMsg((prev) => (prev ? { ...prev, status: 'read' as const } : null));
    },
    onError: () => message.error('Cập nhật thất bại'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`${API_URL}/contact-messages/${id}`, getAuthHeader());
    },
    onSuccess: () => {
      message.success('Đã xóa tin nhắn');
      queryClient.invalidateQueries({ queryKey: ['contact-messages'] });
      queryClient.invalidateQueries({ queryKey: ADMIN_UNREAD_CONTACT_MESSAGE_COUNT_KEY });
      setSelectedMsg(null);
    },
    onError: () => message.error('Xóa thất bại'),
  });

  const filteredMessages = useMemo(() => {
    const list = messages as IContactMessage[];
    const q = applied.search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((m) => {
      return (
        (m.name || '').toLowerCase().includes(q) ||
        (m.phone || '').toLowerCase().includes(q) ||
        (m.content || '').toLowerCase().includes(q)
      );
    });
  }, [messages, applied.search]);

  const appliedTags = useMemo(() => {
    const tags: { key: keyof FilterState; label: string }[] = [];
    if (applied.search.trim()) tags.push({ key: 'search', label: `Từ khóa: ${applied.search.trim()}` });
    if (applied.status !== 'all') tags.push({ key: 'status', label: `Trạng thái: ${applied.status === 'unread' ? 'Chưa đọc' : 'Đã đọc'}` });
    return tags;
  }, [applied]);

  const columns: ColumnsType<IContactMessage> = [
    {
      title: 'Thời gian',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      sorter: (a: IContactMessage, b: IContactMessage) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      render: (val: string) => (
        <Text type="secondary" className="contact-list-time">
          {dayjs(val).format('DD/MM/YYYY HH:mm')}
        </Text>
      ),
    },
    {
      title: 'Khách hàng',
      key: 'customer',
      width: 240,
      render: (_: unknown, record: IContactMessage) => (
        <div className="contact-list-customer">
          <div className="contact-list-customer-name">{record.name}</div>
          <a
            href={`tel:${record.phone}`}
            className="contact-list-customer-phone"
            onClick={(e) => e.stopPropagation()}
          >
            <PhoneOutlined /> {record.phone}
          </a>
        </div>
      ),
    },
    {
      title: 'Nội dung',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
      render: (content: string) => (
        <Tooltip title={content}>
          <div className="contact-list-content">{content}</div>
        </Tooltip>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status: string) => {
        const unread = status === 'unread';
        return (
          <span className={`contact-list-status ${unread ? 'contact-list-status--unread' : 'contact-list-status--read'}`}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: unread ? '#f59e0b' : '#10b981' }} />
            {unread ? 'Chưa đọc' : 'Đã đọc'}
          </span>
        );
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 140,
      align: 'right',
      fixed: 'right',
      render: (_: unknown, record: IContactMessage) => (
        <Space size={6} className="contact-list-actions">
          {record.status === 'unread' && (
            <Tooltip title="Đánh dấu đã đọc">
              <Button
                type="text"
                icon={<CheckOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  markReadMutation.mutate(record._id);
                }}
                loading={markReadMutation.isPending && markReadMutation.variables === record._id}
              />
            </Tooltip>
          )}
          <Popconfirm
            title="Xóa tin nhắn này?"
            description="Thao tác không thể hoàn tác."
            onConfirm={() => deleteMutation.mutate(record._id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Xóa">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                loading={deleteMutation.isPending && deleteMutation.variables === record._id}
                onClick={(e) => e.stopPropagation()}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="contact-list-page">
      <AdminPageHeader
        title={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <MessageOutlined style={{ color: '#6366f1' }} />
            Tin nhắn offline
          </span>
        }
        subtitle="Tin nhắn từ form chat khi hệ thống offline."
        extra={
          <Space wrap>
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
          <div className="contact-filterbar">
            <div className="contact-filterbar-grid" onClick={(e) => e.stopPropagation()}>
              <div className="contact-filterbar-item">
                <div className="contact-filterbar-label">Tìm kiếm</div>
                <Input
                  allowClear
                  size="middle"
                  prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                  placeholder="Tìm theo tên, SĐT hoặc nội dung..."
                  value={draft.search}
                  onChange={(e) => setDraft((p) => ({ ...p, search: e.target.value }))}
                />
              </div>

              <div className="contact-filterbar-item">
                <div className="contact-filterbar-label">Trạng thái</div>
                <Select
                  value={draft.status}
                  onChange={(v) => setDraft((p) => ({ ...p, status: v }))}
                  size="middle"
                  options={[
                    { value: 'all', label: 'Tất cả' },
                    { value: 'unread', label: 'Chưa đọc' },
                    { value: 'read', label: 'Đã đọc' },
                  ]}
                />
              </div>

              <div className="contact-filterbar-item contact-filterbar-actions">
                <div className="contact-filterbar-label">&nbsp;</div>
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

            <div className="contact-filterbar-footer">
              <div className="contact-filterbar-tags">
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
                        } else if (t.key === 'status') {
                          nextDraft.status = 'all';
                          nextApplied.status = 'all';
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
                {filteredMessages.length} mục
              </Text>
            </div>
          </div>
        }
      >
        <Table
          className="contact-list-table"
          columns={columns}
          dataSource={filteredMessages}
          rowKey="_id"
          loading={isLoading}
          locale={{ emptyText: <Empty description="Chưa có tin nhắn" /> }}
          pagination={{
            pageSize: 10,
            showSizeChanger: false,
            showTotal: (t) => `Tổng ${t} tin nhắn`,
          }}
          scroll={{ x: 980 }}
          onRow={(record) => ({
            onClick: () => setSelectedMsg(record),
          })}
        />
      </AdminListCard>

      <Modal
        title="Chi tiết tin nhắn"
        open={!!selectedMsg}
        onCancel={() => setSelectedMsg(null)}
        footer={
          selectedMsg ? (
            <Space>
              {selectedMsg.status === 'unread' && (
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={() => markReadMutation.mutate(selectedMsg._id)}
                  loading={markReadMutation.isPending}
                >
                  Đánh dấu đã đọc
                </Button>
              )}
              <Button href={`tel:${selectedMsg.phone}`} icon={<PhoneOutlined />}>
                Gọi {selectedMsg.phone}
              </Button>
              <Popconfirm
                title="Xóa tin nhắn?"
                onConfirm={() => deleteMutation.mutate(selectedMsg._id)}
                okText="Xóa"
                cancelText="Hủy"
                okButtonProps={{ danger: true }}
              >
                <Button danger icon={<DeleteOutlined />}>
                  Xóa
                </Button>
              </Popconfirm>
            </Space>
          ) : null
        }
        width={560}
      >
        {selectedMsg && (
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label={<><UserOutlined /> Họ và tên</>}>
              {selectedMsg.name}
            </Descriptions.Item>
            <Descriptions.Item label={<><PhoneOutlined /> Số điện thoại</>}>
              <a href={`tel:${selectedMsg.phone}`}>{selectedMsg.phone}</a>
            </Descriptions.Item>
            <Descriptions.Item label="Thời gian">
              {dayjs(selectedMsg.created_at).format('DD/MM/YYYY HH:mm')}
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <Tag color={selectedMsg.status === 'unread' ? 'orange' : 'green'}>
                {selectedMsg.status === 'unread' ? 'Chưa đọc' : 'Đã đọc'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Nội dung">
              <div style={{ whiteSpace: 'pre-wrap' }}>{selectedMsg.content}</div>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default ContactMessageList;
