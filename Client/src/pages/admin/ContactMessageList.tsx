import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  Table,
  Tag,
  Button,
  Typography,
  Select,
  Modal,
  Popconfirm,
  message,
  Space,
  Card,
  Descriptions,
} from 'antd';
import {
  MessageOutlined,
  CheckOutlined,
  DeleteOutlined,
  EyeOutlined,
  PhoneOutlined,
  UserOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const API_URL = (import.meta as any)?.env?.VITE_API_URL || 'http://localhost:5000/api/v1';

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
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedMsg, setSelectedMsg] = useState<IContactMessage | null>(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['contact-messages', statusFilter],
    queryFn: async () => {
      const params = statusFilter !== 'all' ? { status: statusFilter } : {};
      const res = await axios.get(`${API_URL}/contact-messages`, { params });
      return res.data?.data || [];
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.patch(`${API_URL}/contact-messages/${id}/read`);
    },
    onSuccess: () => {
      message.success('Đã đánh dấu đã đọc');
      queryClient.invalidateQueries({ queryKey: ['contact-messages'] });
      setSelectedMsg((prev) => (prev ? { ...prev, status: 'read' as const } : null));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`${API_URL}/contact-messages/${id}`);
    },
    onSuccess: () => {
      message.success('Đã xóa tin nhắn');
      queryClient.invalidateQueries({ queryKey: ['contact-messages'] });
      setSelectedMsg(null);
    },
  });

  const columns = [
    {
      title: 'Thời gian',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      sorter: (a: IContactMessage, b: IContactMessage) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      render: (val: string) => (
        <Text type="secondary" style={{ fontSize: 13 }}>
          {dayjs(val).format('DD/MM/YYYY HH:mm')}
        </Text>
      ),
    },
    {
      title: 'Khách hàng',
      key: 'customer',
      render: (_: unknown, record: IContactMessage) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.name}</div>
          <a
            href={`tel:${record.phone}`}
            style={{ fontSize: 12, color: '#1890ff' }}
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
        <div style={{ maxWidth: 280 }} title={content}>
          {content}
        </div>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status: string) => (
        <Tag color={status === 'unread' ? 'orange' : 'green'}>
          {status === 'unread' ? 'Chưa đọc' : 'Đã đọc'}
        </Tag>
      ),
    },
    {
      title: 'Hành động',
      key: 'action',
      width: 140,
      render: (_: unknown, record: IContactMessage) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => setSelectedMsg(record)}
          >
            Chi tiết
          </Button>
          {record.status === 'unread' && (
            <Button
              type="link"
              size="small"
              icon={<CheckOutlined />}
              onClick={() => markReadMutation.mutate(record._id)}
              loading={markReadMutation.isPending}
            >
              Đã đọc
            </Button>
          )}
          <Popconfirm
            title="Xóa tin nhắn này?"
            onConfirm={() => deleteMutation.mutate(record._id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <MessageOutlined style={{ fontSize: 28, color: '#6366f1' }} />
            <div>
              <Title level={4} style={{ margin: 0 }}>
                Tin nhắn offline
              </Title>
              <Text type="secondary">Tin nhắn từ form chat khi hệ thống offline</Text>
            </div>
          </div>
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 160 }}
            options={[
              { value: 'all', label: 'Tất cả' },
              { value: 'unread', label: 'Chưa đọc' },
              { value: 'read', label: 'Đã đọc' },
            ]}
          />
        </div>
      </Card>

      <Table
        columns={columns}
        dataSource={messages}
        rowKey="_id"
        loading={isLoading}
        pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `Tổng ${t} tin nhắn` }}
      />

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
