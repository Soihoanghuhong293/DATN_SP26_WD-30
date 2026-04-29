import React from "react";
import { Card, Empty, Skeleton } from "antd";
import styles from "./BookingList.module.css";
import type { BookingCardModel } from "./BookingCard";
import { BookingCard } from "./BookingCard";

export function BookingList(props: {
  loading: boolean;
  items: BookingCardModel[];
  onViewDetail: (id: string) => void;
  onPay: (id: string) => void;
  onInvoice: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  if (props.loading) {
    return (
      <div className={styles.container}>
        {Array.from({ length: 3 }).map((_, idx) => (
          <Card key={idx} className={styles.skeletonCard} bodyStyle={{ padding: 14 }}>
            <Skeleton active avatar paragraph={{ rows: 3 }} />
          </Card>
        ))}
      </div>
    );
  }

  if (!props.items.length) {
    return (
      <div className={styles.emptyWrap}>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Bạn chưa có đơn nào"
        />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {props.items.map((b) => (
        <BookingCard
          key={b.id}
          booking={b}
          onViewDetail={props.onViewDetail}
          onPay={props.onPay}
          onInvoice={props.onInvoice}
          onCancel={props.onCancel}
        />
      ))}
    </div>
  );
}

