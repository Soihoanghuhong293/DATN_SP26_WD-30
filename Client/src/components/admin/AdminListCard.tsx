import { Card } from 'antd';
import type { ReactNode } from 'react';

type AdminListCardProps = {
  toolbar?: ReactNode;
  children: ReactNode;
};

export default function AdminListCard({ toolbar, children }: AdminListCardProps) {
  return (
    <Card
      styles={{ body: { padding: 16 } }}
      style={{ borderRadius: 10, borderColor: '#eef2f7' }}
    >
      {toolbar ? <div style={{ marginBottom: 12 }}>{toolbar}</div> : null}
      {children}
    </Card>
  );
}
