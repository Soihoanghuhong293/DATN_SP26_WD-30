import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Button,
  Card,
  Descriptions,
  Spin,
  Tag,
  Typography,
  Breadcrumb,
  Space,
} from 'antd';
import {
  ArrowLeftOutlined,
  HomeOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  ContactsOutlined,
  FileTextOutlined,
  DollarOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import { getProvider } from '../../../services/api';
import type { IProvider } from '../../../types/provider.types';

const { Title, Text } = Typography;

const statusColor = (status?: string) => (status === 'active' ? 'green' : 'red');
const statusLabel = (status?: string) => (status === 'active' ? 'Hoạt động' : 'Không hoạt động');

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(d);
};

const ProviderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['provider', id],
    queryFn: () => getProvider(id || ''),
    enabled: Boolean(id),
  });

  const provider: IProvider | undefined = data?.data?.provider;

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
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/providers')}>
          Quay lại
        </Button>
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
    </div>
  );
};

export default ProviderDetail;
