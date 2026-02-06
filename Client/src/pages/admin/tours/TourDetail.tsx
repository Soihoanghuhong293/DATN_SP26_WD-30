import { Button, Card, Descriptions, Divider, Image, Space, Spin, Tag, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { getCategories, getTour } from '../../../services/api';
import type { ICategory, ITour } from '../../../types/tour.types';

const { Title, Text } = Typography;

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(d);
};

const formatMoney = (value?: number) => {
  if (typeof value !== 'number') return '-';
  return value.toLocaleString('vi-VN');
};

const statusColor = (status: string) => {
  if (status === 'active') return 'green';
  if (status === 'inactive') return 'red';
  return 'gold';
};

const statusLabel = (status?: string) => {
  if (status === 'active') return 'Hoạt động';
  if (status === 'inactive') return 'Không hoạt động';
  return 'Bản nháp';
};

const TourDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['tour', id],
    queryFn: () => getTour(id || ''),
    enabled: Boolean(id),
  });

  const tour: ITour | undefined = data?.data?.tour;

  const { data: categoriesRes } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const categories: ICategory[] = categoriesRes?.data?.categories ?? [];
  const categoryName =
    tour?.category_id
      ? categories.find((c) => (c.id || c._id) === tour.category_id)?.name
      : undefined;

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Spin />
      </div>
    );
  }

  if (isError || !tour) {
    return (
      <div style={{ background: '#fff', padding: 16, border: '1px solid #eee' }}>
        <Text type="danger">Không tải được tour: {(error as any)?.message || 'Unknown error'}</Text>
      </div>
    );
  }

  return (
    <div>
      <Space style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <Title level={3} style={{ marginTop: 0 }}>
            Chi tiết Tour
          </Title>
          <Text type="secondary">ID: {tour.id || tour._id}</Text>
        </div>
        <Space>
          <Button onClick={() => navigate('/admin/tours')}>Quay lại</Button>
          <Button type="primary" onClick={() => navigate(`/admin/tours/edit/${tour.id || tour._id}`)}>
            Sửa
          </Button>
        </Space>
      </Space>

      <Card style={{ marginTop: 16 }}>
        <Descriptions bordered column={1} size="middle">
          <Descriptions.Item label="Danh mục">
            {tour.category_id ? (
              <Space wrap>
                <Tag color="blue">{categoryName || 'Chưa đặt tên danh mục'}</Tag>
                <Text type="secondary">{tour.category_id}</Text>
              </Space>
            ) : (
              '-'
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Mô tả">{tour.description}</Descriptions.Item>
          <Descriptions.Item label="Thời lượng">{tour.duration_} ngày</Descriptions.Item>
          <Descriptions.Item label="Giá">{formatMoney(tour.price)}</Descriptions.Item>
          <Descriptions.Item label="Trạng thái">
            <Tag color={statusColor(tour.status)}>{statusLabel(tour.status)}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Ngày tạo">{formatDateTime(tour.created_at)}</Descriptions.Item>
          <Descriptions.Item label="Ngày cập nhật">{formatDateTime(tour.update_at)}</Descriptions.Item>
        </Descriptions>

        <Divider />

        <Title level={5}>Ảnh</Title>
        {tour.images?.length ? (
          <Image.PreviewGroup>
            <Space wrap>
              {tour.images.map((url, idx) => (
                <Image key={`${url}-${idx}`} width={120} height={80} style={{ objectFit: 'cover' }} src={url} />
              ))}
            </Space>
          </Image.PreviewGroup>
        ) : (
          <Text type="secondary">Không có ảnh</Text>
        )}

        <Divider />

        <Title level={5}>Lịch trình</Title>
        {tour.schedule?.length ? (
          <div>
            {tour.schedule.map((s) => (
              <Card key={s.day} size="small" style={{ marginBottom: 8 }}>
                <Text strong>Ngày {s.day}:</Text> <Text>{s.title || '-'}</Text>
                <div style={{ marginTop: 8 }}>
                  {s.activities?.length ? (
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {s.activities.map((a, i) => (
                        <li key={`${s.day}-${i}`}>{a}</li>
                      ))}
                    </ul>
                  ) : (
                    <Text type="secondary">Không có hoạt động</Text>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Text type="secondary">Không có lịch trình</Text>
        )}

        <Divider />

        <Title level={5}>Bảng giá</Title>
        {tour.prices?.length ? (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {tour.prices.map((p, i) => (
              <li key={`${p.title}-${i}`}>
                <Text strong>{p.title}</Text>: {p.amount.toLocaleString('vi-VN')}
                {p.note ? <Text type="secondary"> — {p.note}</Text> : null}
              </li>
            ))}
          </ul>
        ) : (
          <Text type="secondary">Không có bảng giá gói</Text>
        )}

        <Divider />

        <Title level={5}>Chính sách</Title>
        {tour.policies?.length ? (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {tour.policies.map((p, i) => (
              <li key={`${p}-${i}`}>{p}</li>
            ))}
          </ul>
        ) : (
          <Text type="secondary">Không có chính sách</Text>
        )}

        <Divider />

        <Title level={5}>Nhà cung cấp</Title>
        {tour.suppliers?.length ? (
          <Space wrap>
            {tour.suppliers.map((s, i) => (
              <Tag key={`${s}-${i}`}>{s}</Tag>
            ))}
          </Space>
        ) : (
          <Text type="secondary">Không có nhà cung cấp</Text>
        )}
      </Card>
    </div>
  );
};

export default TourDetail;
