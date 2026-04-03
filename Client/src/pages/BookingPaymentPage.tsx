import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Card, Typography, Button, Spin, message, Result, Alert, Divider } from "antd";
import axios from "axios";

const { Title, Text } = Typography;

const API_V1 =
  (import.meta.env?.VITE_API_URL as string | undefined) || "http://localhost:5000/api/v1";
const SERVER_ORIGIN = API_V1.replace(/\/api\/v1\/?$/, "");

const getPaymentStatus = (booking: any): "unpaid" | "deposit" | "paid" | "refunded" => {
  const s =
    booking?.payment_status ||
    (booking?.status === "paid"
      ? "paid"
      : booking?.status === "deposit"
        ? "deposit"
        : booking?.status === "refunded"
          ? "refunded"
          : "unpaid");
  return s as "unpaid" | "deposit" | "paid" | "refunded";
};

/** xử lí nhận tiền */
const pollPaymentReached = (baseline: string, next: string): boolean => {
  if (next === "paid") return true;
  if (baseline === "unpaid" && next === "deposit") return true;
  if (baseline === "deposit" && next === "paid") return true;
  return false;
};

type SepayQrPayload = {
  qrUrl: string;
  amount: number;
  transferContent: string;
  bankId?: string;
  accountNo?: string;
  accountName?: string;
};

const POLL_MS = 4000;

const BookingPaymentPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const gateway = (searchParams.get("gateway") || "bank").toLowerCase();
  const useMomoMock = gateway === "momo";

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const baselinePaymentRef = useRef<string | null>(null);

  const [qrLoading, setQrLoading] = useState(false);
  const [qrData, setQrData] = useState<SepayQrPayload | null>(null);

  const [processing, setProcessing] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [pollHint, setPollHint] = useState<string | null>(null);

  const refreshBooking = async () => {
    if (!id) return null;
    const res = await axios.get(`${API_V1}/bookings/${id}`, {
      params: { _t: new Date().getTime() },
    });
    const b = res.data.data || res.data;
    setBooking(b);
    return b;
  };

  useEffect(() => {
    const fetchBooking = async () => {
      if (!id) return;
      try {
        await refreshBooking();
      } catch {
        message.error("Không tìm thấy thông tin đơn hàng để thanh toán.");
      } finally {
        setLoading(false);
      }
    };
    fetchBooking();
  }, [id]);

  useEffect(() => {
    if (!booking || baselinePaymentRef.current !== null) return;
    baselinePaymentRef.current = getPaymentStatus(booking);
  }, [booking]);

  const totalPrice = booking?.total_price || booking?.totalPrice || 0;
  const paymentMethod = booking?.paymentMethod || "full";
  const paymentStatus = booking ? getPaymentStatus(booking) : "unpaid";

  const breakdown = useMemo(() => {
    const total = Number(totalPrice || 0);
    const depositAmount = Number(booking?.deposit_amount || Math.round(total * 0.3));
    const remaining = Math.max(0, total - depositAmount);

    if (paymentStatus === "paid") return { payType: "full" as const, amount: 0, label: "Đã thanh toán đủ" };
    if (paymentStatus === "deposit")
      return { payType: "remaining" as const, amount: remaining, label: "Thanh toán phần còn lại" };
    if (paymentMethod === "deposit")
      return { payType: "deposit" as const, amount: depositAmount, label: "Thanh toán đặt cọc (30%)" };
    return { payType: "full" as const, amount: total, label: "Thanh toán toàn bộ (100%)" };
  }, [booking?.deposit_amount, paymentMethod, paymentStatus, totalPrice]);

  const paymentAmountRaw = Number((breakdown as any)?.amount);
  const paymentAmount = Number.isFinite(paymentAmountRaw) ? paymentAmountRaw : 0;
  const payType = (breakdown as any)?.payType as "full" | "deposit" | "remaining";

  // tải qr
  useEffect(() => {
    if (useMomoMock || !id || !booking || paymentStatus === "paid" || paymentAmount <= 0) {
      setQrData(null);
      return;
    }

    let cancelled = false;
    (async () => {
      setQrLoading(true);
      try {
        const res = await axios.get<{ success?: boolean; data?: SepayQrPayload }>(
          `${SERVER_ORIGIN}/sepay/qr/${id}`,
          { params: { pay_type: payType } }
        );
        const data = res.data?.data;
        if (!cancelled && data?.qrUrl) {
          setQrData(data);
        } else if (!cancelled) {
          message.error("Không nhận được mã QR từ máy chủ.");
        }
      } catch {
        if (!cancelled) message.error("Không tải được mã QR thanh toán. Kiểm tra SePay/VietQR trên server.");
      } finally {
        if (!cancelled) setQrLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, booking, payType, paymentAmount, paymentStatus, useMomoMock]);

  // chuyển khoản không redirect được như ví
  useEffect(() => {
    if (useMomoMock || !id || paymentStatus === "paid") return;

    const tick = async () => {
      const baseline = baselinePaymentRef.current || "unpaid";
      try {
        const b = await refreshBooking();
        if (!b) return;
        const next = getPaymentStatus(b);
        if (pollPaymentReached(baseline, next)) {
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
          message.success("Thanh toán đã được xác nhận!");
          navigate(`/booking/success/${id}`);
          return;
        }
        setPollHint(`Chưa ghi nhận thanh toán (trạng thái: ${next}).`);
      } catch {
        setPollHint("Không kiểm tra được trạng thái, sẽ thử lại…");
      }
    };

    pollRef.current = setInterval(tick, POLL_MS);
    void tick();

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [id, navigate, paymentStatus, useMomoMock]);

  const handleConfirmScanned = async () => {
    if (!id) return;
    setProcessing(true);
    try {
      if (paymentStatus === "paid" || paymentAmount <= 0) {
        message.info("Đơn hàng đã thanh toán hoặc không còn số tiền cần thanh toán.");
        navigate(`/booking/success/${id}`);
        return;
      }

      const res = await axios.post(`${API_V1}/bookings/${id}/payments/momo`, {
        orderInfo: `${String((breakdown as any)?.label || "Thanh toán")} tour ${booking.tour_id?.name || ""}`.trim(),
        pay_type: (breakdown as any)?.payType || "full",
      });

      if (res.data?.status === "success") {
        message.success("Thanh toán giả lập thành công!");
        navigate(`/booking/success/${id}`);
      } else {
        message.error(res.data?.message || "Không nhận được phản hồi hợp lệ từ API thanh toán");
      }
    } catch {
      message.error("Lỗi khi xác nhận thanh toán. Vui lòng thử lại sau.");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", marginTop: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div style={{ textAlign: "center", marginTop: 100 }}>
        Không tìm thấy đơn hàng.
      </div>
    );
  }

  if (paymentStatus === "paid") {
    return (
      <div style={{ padding: "40px 20px", backgroundColor: "#f5f5f5", minHeight: "100vh" }}>
        <Card style={{ maxWidth: 600, margin: "0 auto", borderRadius: 12, textAlign: "center" }}>
          <Result
            status="success"
            title="Đơn hàng đã thanh toán đủ"
            subTitle="Bạn không cần thực hiện thêm thanh toán."
            extra={[
              <Button key="back" type="primary" size="large" onClick={() => navigate(`/booking/success/${id}`)}>
                Quay lại đơn hàng
              </Button>,
            ]}
          />
        </Card>
      </div>
    );
  }

  if (useMomoMock) {
    return (
      <div style={{ padding: "40px 20px", backgroundColor: "#f5f5f5", minHeight: "100vh" }}>
        <Card
          style={{
            maxWidth: 600,
            margin: "0 auto",
            borderRadius: 12,
            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
            textAlign: "center",
          }}
        >
          <Title level={3} style={{ marginBottom: 8 }}>
            Thanh toán MoMo (giả lập)
          </Title>
          <Text type="secondary">
            Vui lòng quét mã QR bên dưới bằng ứng dụng MoMo (mô phỏng), sau đó nhấn &quot;Xác nhận đã quét&quot;.
          </Text>

          <div style={{ marginTop: 12 }}>
            <Text type="secondary">
              Hình thức: <b>{breakdown.label}</b>
            </Text>
          </div>

          <div
            style={{
              width: 260,
              height: 260,
              margin: "24px auto 16px",
              borderRadius: 16,
              border: "1px dashed #d9d9d9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background:
                "repeating-linear-gradient(45deg, #fafafa, #fafafa 10px, #f0f0f0 10px, #f0f0f0 20px)",
            }}
          >
            <span style={{ fontSize: 16, color: "#999" }}>QR MoMo mô phỏng</span>
          </div>

          <div style={{ marginBottom: 24 }}>
            <Text>Số tiền:&nbsp;</Text>
            <Text strong type="danger" style={{ fontSize: 20 }}>
              {paymentAmount.toLocaleString("vi-VN")} ₫
            </Text>
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
            <Button onClick={() => navigate(-1)} size="large">
              Quay lại
            </Button>
            <Button
              type="primary"
              size="large"
              onClick={handleConfirmScanned}
              loading={processing}
              disabled={paymentAmount <= 0}
            >
              Xác nhận đã quét
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const paymentStatusLabel =
    paymentStatus === "deposit"
      ? "Đã nhận cọc"
      : paymentStatus === "refunded"
        ? "Đã hoàn tiền"
        : "Chưa thanh toán";

  return (
    <div style={{ padding: "40px 20px", backgroundColor: "#f5f5f5", minHeight: "100vh" }}>
      <Card
        style={{
          maxWidth: 560,
          margin: "0 auto",
          borderRadius: 12,
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
          textAlign: "center",
        }}
      >
        <Title level={3} style={{ marginBottom: 8 }}>
          Chuyển khoản ngân hàng
        </Title>
        <Text type="secondary">
          Quét mã QR bằng app ngân hàng (ví dụ MBBank). Hệ thống sẽ tự xác nhận sau khi tiền vào 
        </Text>

        <div style={{ marginTop: 12 }}>
          <Text type="secondary">
            Hình thức: <b>{breakdown.label}</b>
          </Text>
        </div>

        <Divider style={{ margin: "16px 0" }} />

        <div style={{ marginBottom: 10 }}>
          <Text type="secondary">Trạng thái hiện tại: </Text>
          <Text strong>{paymentStatusLabel}</Text>
        </div>

        {paymentAmount <= 0 ? (
          <Alert type="info" message="Không có số tiền cần thanh toán." showIcon />
        ) : qrLoading ? (
          <div style={{ padding: 32 }}>
            <Spin tip="Đang tạo mã QR..." />
          </div>
        ) : qrData?.qrUrl ? (
          <>
            <div
              style={{
                margin: "16px auto",
                padding: 12,
                background: "#fff",
                borderRadius: 16,
                border: "1px solid #f0f0f0",
                display: "inline-block",
              }}
            >
              <img
                src={qrData.qrUrl}
                alt="QR chuyển khoản"
                style={{ width: 260, height: 260, objectFit: "contain", display: "block" }}
              />
            </div>

            <div style={{ textAlign: "left", maxWidth: 400, margin: "0 auto 16px", fontSize: 14 }}>
              {qrData.accountNo ? (
                <div>
                  <Text type="secondary">Số tài khoản: </Text>
                  <Text strong>{qrData.accountNo}</Text>
                </div>
              ) : null}
              {qrData.accountName ? (
                <div>
                  <Text type="secondary">Chủ TK: </Text>
                  <Text strong>{qrData.accountName}</Text>
                </div>
              ) : null}
              {qrData.bankId ? (
                <div>
                  <Text type="secondary">Ngân hàng: </Text>
                  <Text strong>{qrData.bankId}</Text>
                </div>
              ) : null}
              <div style={{ marginTop: 8 }}>
                <Text type="secondary">Số tiền: </Text>
                <Text strong type="danger" style={{ fontSize: 18 }}>
                  {Number(qrData.amount || paymentAmount).toLocaleString("vi-VN")} ₫
                </Text>
              </div>
              <div style={{ marginTop: 8 }}>
                <Text type="secondary">Nội dung CK (bắt buộc giữ nguyên): </Text>
                <br />
                <Text strong copyable>
                  {qrData.transferContent}
                </Text>
              </div>
            </div>

            <Alert
              type="info"
              showIcon
              message={`Đang kiểm tra thanh toán mỗi ${POLL_MS / 1000} giây…`}
              description={pollHint || "Sau khi chuyển khoản thành công, trang sẽ chuyển sang xác nhận đơn hàng."}
              style={{ textAlign: "left", marginBottom: 16 }}
            />
          </>
        ) : (
          <Alert type="warning" message="Chưa có mã QR. Thử tải lại trang hoặc kiểm tra cấu hình SePay trên server." />
        )}

        <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
          <Button onClick={() => navigate(-1)} size="large">
            Quay lại
          </Button>
          <Button size="large" onClick={() => navigate(`/booking/success/${id}`)}>
            Xem đơn hàng
          </Button>
          
        </div>
      </Card>
    </div>
  );
};

export default BookingPaymentPage;
