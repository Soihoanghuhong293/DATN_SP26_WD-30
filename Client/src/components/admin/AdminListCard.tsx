import { Card } from 'antd';
import type { CSSProperties, ReactNode } from 'react';

type AdminListCardProps = {
  toolbar?: ReactNode;
  children: ReactNode;
  style?: CSSProperties;
};

export default function AdminListCard({ toolbar, children, style }: AdminListCardProps) {
  return (
    <Card
      styles={{ body: { padding: 16 } }}
      style={{
        borderRadius: 10,
        border: '1px solid #eef2f7',
        boxShadow: 'none',
        ...style,
      }}
    >
      {toolbar ? <div style={{ marginBottom: 12 }}>{toolbar}</div> : null}
      {children}
    </Card>
  );
}
