import React from "react";
import { Button, Card, Space, Tag, Tooltip, Typography } from "antd";
import {
  CalendarOutlined,
  CopyOutlined,
  EyeOutlined,
  CreditCardOutlined,
  StopOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import styles from "./BookingCard.module.css";
import { tourImagePlaceholder } from "../../../constants/tourImagePlaceholder";

const { Text } = Typography;

export type BookingCardStatus = "pending" | "confirmed" | "cancelled";
export type BookingPaymentStatus = "unpaid" | "deposit" | "paid" | "refunded";

export type BookingCardModel = {
  id: string;
  tourName: string;
  tourThumb?: string;
  startDate?: string | null;
  endDate?: string | null;
  createdAt?: string | null;
  totalPrice: number;
  bookingStatus: BookingCardStatus;
  paymentStatus: BookingPaymentStatus;
  canCancel: boolean;
  hasPendingCancel: boolean;
};

const statusTag = (status: BookingCardStatus) => {
  if (status === "pending") return { color: "gold", label: "Chờ xử lý" };
  if (status === "cancelled") return { color: "red", label: "Đã hủy" };
  return { color: "green", label: "Đã xác nhận" };
};

const paymentTag = (status: BookingPaymentStatus) => {
  if (status === "paid") return { color: "green", label: "Đã thanh toán" };
  if (status === "deposit") return { color: "orange", label: "Đã đặt cọc" };
  if (status === "refunded") return { color: "default", label: "Đã hoàn tiền" };
  return { color: "gold", label: "Chưa thanh toán" };
};

export function BookingCard(props: {
  booking: BookingCardModel;
  onViewDetail: (id: string) => void;
  onPay: (id: string) => void;
  onInvoice: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  const { booking } = props;
  const st = statusTag(booking.bookingStatus);
  const pay = paymentTag(booking.paymentStatus);

  const start = booking.startDate ? dayjs(booking.startDate).format("DD/MM/YYYY") : "---";
  const end = booking.endDate ? dayjs(booking.endDate).format("DD/MM/YYYY") : "---";

  const isPayable = booking.paymentStatus === "unpaid" || booking.paymentStatus === "deposit";
  const payButtonLabel = isPayable ? "Thanh toán" : "Hóa đơn";

  return (
    <Card className={`${styles.card} ${styles.fadeIn}`} bodyStyle={{ padding: 14 }}>
      <div className={styles.row}>
        <img
          className={styles.thumb}
          src={booking.tourThumb || tourImagePlaceholder(320, 200)}
          alt={booking.tourName || "Tour"}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = tourImagePlaceholder(320, 200);
          }}
        />

        <div className={styles.content}>
          <div className={styles.titleRow}>
            <div style={{ minWidth: 0 }}>
              <Text className={styles.title} ellipsis={{ tooltip: booking.tourName }}>
                {booking.tourName}
              </Text>
            </div>

            <Space size={8} wrap>
              <Tag color={st.color}>{st.label}</Tag>
              <Tag color={pay.color}>{pay.label}</Tag>
            </Space>
          </div>

          <div className={styles.metaRow}>
            <span className={styles.metaItem}>
              <CalendarOutlined />
              <span>
                Khởi hành: <b>{start}</b> · Kết thúc: <b>{end}</b>
              </span>
            </span>
          </div>

          <div className={styles.codeRow}>
            <span className={styles.code}>
              Mã booking:
              <Text code style={{ margin: 0 }}>
                {booking.id}
              </Text>
              <Tooltip title="Copy mã booking">
                <Button
                  size="small"
                  type="text"
                  icon={<CopyOutlined />}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(booking.id);
                    } catch {
                      // ignore
                    }
                  }}
                />
              </Tooltip>
            </span>

            <span>
              <Text type="secondary">Tổng tiền:&nbsp;</Text>
              <span className={styles.amount}>{Number(booking.totalPrice || 0).toLocaleString("vi-VN")}đ</span>
            </span>
          </div>

          <div className={styles.actions}>
            <Button
              type="primary"
              className={styles.btnPrimary}
              icon={<EyeOutlined />}
              onClick={() => props.onViewDetail(booking.id)}
            >
              Xem chi tiết
            </Button>

            <Button
              type="primary"
              className={styles.btnPay}
              icon={<CreditCardOutlined />}
              disabled={booking.bookingStatus === "cancelled" || booking.paymentStatus === "refunded"}
              onClick={() => (isPayable ? props.onPay(booking.id) : props.onInvoice(booking.id))}
            >
              {payButtonLabel}
            </Button>

            <Button
              danger
              className={styles.btnDangerSoft}
              icon={<StopOutlined />}
              disabled={!booking.canCancel}
              onClick={() => props.onCancel(booking.id)}
            >
              {booking.hasPendingCancel ? "Đang chờ hủy" : "Hủy tour"}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

