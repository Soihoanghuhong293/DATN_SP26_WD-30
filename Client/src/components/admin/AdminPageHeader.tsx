import { Breadcrumb, Space, Typography } from 'antd';
import type { ReactNode } from 'react';

const { Title, Text } = Typography;

type AdminPageHeaderProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  extra?: ReactNode;
  breadcrumbItems?: { title: ReactNode; href?: string }[];
};

export default function AdminPageHeader({
  title,
  subtitle,
  extra,
  breadcrumbItems,
}: AdminPageHeaderProps) {
  return (
    <div style={{ marginBottom: 16 }}>
      {breadcrumbItems?.length ? (
        <Breadcrumb items={breadcrumbItems} style={{ marginBottom: 8 }} />
      ) : null}

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <Space direction="vertical" size={2}>
          <Title level={3} style={{ margin: 0 }}>
            {title}
          </Title>
          {subtitle ? <Text type="secondary">{subtitle}</Text> : null}
        </Space>

        {extra ? <div>{extra}</div> : null}
      </div>
    </div>
  );
}
