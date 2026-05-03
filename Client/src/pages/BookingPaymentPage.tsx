import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Alert, Button, Card, Col, Divider, Result, Row, Spin, Steps, Tag, Typography, message } from "antd";
import axios from "axios";
import dayjs from "dayjs";
import { tourImagePlaceholder } from "../constants/tourImagePlaceholder";

const { Title, Text } = Typography;

const RAW_BASE = ((import.meta.env?.VITE_API_URL as string | undefined) || "").replace(/\/$/, "");
const API_V1 = RAW_BASE
  ? RAW_BASE.endsWith("/api/v1")
    ? RAW_BASE
    : `${RAW_BASE}/api/v1`
  : "http://localhost:5000/api/v1";
const SERVER_ORIGIN = API_V1.replace(/\/api\/v1\/?$/, "");

const getPaymentStatus = (booking: any): "unpaid" | "deposit" | "paid" | "refunded" => {
  const raw =
    booking?.payment_status ??
    (booking?.status === "paid"
      ? "paid"
      : booking?.status === "deposit"
        ? "deposit"
        : booking?.status === "refunded"
          ? "refunded"
          : null);
  const s = typeof raw === "string" ? raw.trim().toLowerCase() : raw;
  if (s === "paid" || s === "deposit" || s === "refunded" || s === "unpaid") return s;
  return "unpaid";
};

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
  const [fatalError, setFatalError] = useState<string | null>(null);

  const baselinePaymentRef = useRef<string | null>(null);
  const hasNavigatedToSuccessRef = useRef(false);

  const [qrLoading, setQrLoading] = useState(false);
  const [qrData, setQrData] = useState<SepayQrPayload | null>(null);

  const [processing, setProcessing] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [pollHint, setPollHint] = useState<string | null>(null);

  const refreshBooking = async () => {
    if (!id) return null;
    try {
      const res = await axios.get(`${API_V1}/bookings/${id}`, {
        params: { _t: Date.now() },
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      });
      const b = res.data.data || res.data;
      setBooking(b);
      return b;
    } catch (err: any) {
      const status = err?.response?.status;
      const msg =
        status === 400
          ? "Link thanh toán không hợp lệ (sai mã booking)."
          : status === 404
            ? "Không tìm thấy booking."
            : "Không tải được thông tin booking.";
      setFatalError(msg);
      throw err;
    }
  };

  useEffect(() => {
    baselinePaymentRef.current = null;
    hasNavigatedToSuccessRef.current = false;
  }, [id]);

  useEffect(() => {
    const fetchBooking = async () => {
      if (!id) return;
      try {
        setFatalError(null);
        await refreshBooking();
      } catch {
        message.error("Không tìm thấy thông tin đơn hàng để thanh toán.");
      } finally {
        setLoading(false);
      }
    };
    fetchBooking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const estimate30 = total > 0 ? Math.round(total * 0.3) : 0;
    const depField = Number(booking?.deposit_amount || 0);
    const paidSoFar = Number(booking?.paid_amount || 0);

    let credited = Math.max(Number.isFinite(paidSoFar) ? paidSoFar : 0, Number.isFinite(depField) ? depField : 0);
    if (paymentStatus === "deposit" && !credited && total > 0) credited = estimate30;

    const firstDepositAmount = depField > 0 ? depField : estimate30;
    const remaining = Math.max(0, total - credited);

    if (paymentStatus === "paid") return { payType: "full" as const, amount: 0, label: "Đã thanh toán đủ" };
    if (paymentStatus === "deposit") return { payType: "remaining" as const, amount: remaining, label: "Thanh toán phần còn lại" };
    if (paymentMethod === "deposit") return { payType: "deposit" as const, amount: firstDepositAmount, label: "Thanh toán đặt cọc (30%)" };
    return { payType: "full" as const, amount: total, label: "Thanh toán toàn bộ (100%)" };
  }, [booking?.deposit_amount, booking?.paid_amount, paymentMethod, paymentStatus, totalPrice]);

  const paymentAmountRaw = Number((breakdown as any)?.amount);
  const paymentAmount = Number.isFinite(paymentAmountRaw) ? paymentAmountRaw : 0;
  const payType = (breakdown as any)?.payType as "full" | "deposit" | "remaining";

  // Load QR for bank gateway
  useEffect(() => {
    if (useMomoMock || !id || !booking || paymentStatus === "paid" || paymentAmount <= 0) {
      setQrData(null);
      return;
    }

    let cancelled = false;
    (async () => {
      setQrLoading(true);
      try {
        const res = await axios.get<{ success?: boolean; data?: SepayQrPayload }>(`${SERVER_ORIGIN}/sepay/qr/${id}`, {
          params: { pay_type: payType },
        });
        const data = res.data?.data;
        if (!cancelled && data?.qrUrl) setQrData(data);
        else if (!cancelled) message.error("Không nhận được mã QR từ máy chủ.");
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

  // Poll payment status (bank gateway)
  useEffect(() => {
    if (useMomoMock || !id || loading || !booking || paymentStatus === "paid") return;

    const tick = async () => {
      try {
        const b = await refreshBooking();
        if (!b) return;
        if (baselinePaymentRef.current === null) baselinePaymentRef.current = getPaymentStatus(b);
        const baseline = baselinePaymentRef.current;
        if (baseline == null) return;
        const next = getPaymentStatus(b);
        if (pollPaymentReached(baseline, next)) {
          if (hasNavigatedToSuccessRef.current) return;
          hasNavigatedToSuccessRef.current = true;
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          message.success("Thanh toán đã được xác nhận!");
          navigate(`/booking/success/${id}?payment=success&gateway=bank`, { replace: true });
          return;
        }
        setPollHint(`Chưa ghi nhận thanh toán (trạng thái: ${next}).`);
      } catch (err: any) {
        const status = err?.response?.status;
        if (status === 400 || status === 404) {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          setPollHint(null);
          return;
        }
        setPollHint("Không kiểm tra được trạng thái, sẽ thử lại…");
      }
    };

    pollRef.current = setInterval(tick, POLL_MS);
    void tick();

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, navigate, paymentStatus, useMomoMock, loading, booking?._id]);

  const handleConfirmScanned = async () => {
    if (!id) return;
    setProcessing(true);
    try {
      if (paymentStatus === "paid" || paymentAmount <= 0) {
        message.info("Đơn hàng đã thanh toán hoặc không còn số tiền cần thanh toán.");
        navigate(`/booking/success/${id}`);
        return;
      }

      const res = await axios.post(
        `${API_V1}/bookings/${id}/payments/momo`,
        { pay_type: (breakdown as any)?.payType || "full" },
        { headers: { "Content-Type": "application/json" } }
      );

      if (res.data?.status === "success") {
        message.success("Thanh toán giả lập thành công!");
        navigate(`/booking/success/${id}?payment=success&gateway=momo`, { replace: true });
      } else {
        message.error(res.data?.message || "Không nhận được phản hồi hợp lệ từ API thanh toán");
      }
    } catch (err: any) {
      message.error(err?.response?.data?.message || "Lỗi khi xác nhận thanh toán. Vui lòng thử lại sau.");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
        <Spin size="large" spinning tip="Đang tải thông tin thanh toán...">
          <div style={{ minHeight: 240 }} />
        </Spin>
      </div>
    );
  }

  if (fatalError) {
    return (
      <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
        <Result
          status="error"
          title={fatalError}
          subTitle="Hãy mở lại từ trang đặt tour hoặc từ 'Đơn của tôi' để đảm bảo đúng mã booking."
          extra={[
            <Button key="orders" type="primary" onClick={() => navigate("/my-bookings")}>
              Đơn của tôi
            </Button>,
            <Button key="tours" onClick={() => navigate("/tours")}>
              Danh sách tour
            </Button>,
          ]}
        />
      </div>
    );
  }

  if (!booking) {
    return (
      <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
        <Result
          status="error"
          title="Không tìm thấy đơn hàng."
          extra={[
            <Button key="back" type="primary" onClick={() => navigate("/tours")}>
              Quay lại
            </Button>,
          ]}
        />
      </div>
    );
  }

  const tourInfo = booking?.tour_id && typeof booking.tour_id === "object" ? booking.tour_id : null;
  const tourName = tourInfo?.name || booking?.tour_name || booking?.tourName || "---";
  const tourCode = tourInfo?.code || booking?.tour_code || booking?.tourCode || tourInfo?._id || tourInfo?.id || "";
  const tourImage = tourInfo?.images?.[0] || booking?.tour_image || booking?.tourImage || "";

  const paymentTag =
    paymentStatus === "paid"
      ? { color: "green", label: "Đã thanh toán đủ" }
      : paymentStatus === "deposit"
        ? { color: "orange", label: "Đã đặt cọc" }
        : paymentStatus === "refunded"
          ? { color: "default", label: "Đã hoàn tiền" }
          : { color: "blue", label: "Chưa thanh toán" };

  const leftContent =
    paymentStatus === "paid" ? (
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
    ) : useMomoMock ? (
      <div style={{ textAlign: "center" }}>
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
            background: "repeating-linear-gradient(45deg, #fafafa, #fafafa 10px, #f0f0f0 10px, #f0f0f0 20px)",
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

        <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
          <Button onClick={() => navigate(-1)} size="large">
            Quay lại
          </Button>
          <Button type="primary" size="large" onClick={handleConfirmScanned} loading={processing} disabled={paymentAmount <= 0}>
            Xác nhận đã quét
          </Button>
        </div>
      </div>
    ) : (
      <div style={{ textAlign: "center" }}>
        <Title level={3} style={{ marginBottom: 8 }}>
          Chuyển khoản ngân hàng
        </Title>
        <Text type="secondary">Quét mã QR bằng app ngân hàng (ví dụ MBBank). Hệ thống sẽ tự xác nhận sau khi tiền vào</Text>

        <div style={{ marginTop: 12 }}>
          <Text type="secondary">
            Hình thức: <b>{breakdown.label}</b>
          </Text>
        </div>

        <Divider style={{ margin: "16px 0" }} />

        {paymentAmount <= 0 ? (
          <Alert type="info" message="Không có số tiền cần thanh toán." showIcon />
        ) : qrLoading ? (
          <Spin spinning tip="Đang tạo mã QR...">
            <div style={{ padding: 32, minHeight: 120 }} />
          </Spin>
        ) : qrData?.qrUrl ? (
          <>
            <div style={{ margin: "16px auto", padding: 12, background: "#fff", borderRadius: 16, border: "1px solid #f0f0f0", display: "inline-block" }}>
              <img src={qrData.qrUrl} alt="QR chuyển khoản" style={{ width: 260, height: 260, objectFit: "contain", display: "block" }} />
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
      </div>
    );

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <Title level={2} style={{ marginBottom: 6 }}>
          ĐẶT TOUR
        </Title>
        <Text type="secondary">Hoàn tất thông tin để đặt tour nhanh chóng</Text>
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
        <Steps current={1} items={[{ title: "Nhập thông tin" }, { title: "Thanh toán" }, { title: "Hoàn tất" }]} style={{ maxWidth: 700, width: "100%" }} />
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card style={{ borderRadius: 12 }}>{leftContent}</Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card style={{ borderRadius: 12 }}>
            <Title level={4} style={{ marginBottom: 12 }}>
              Tóm tắt chuyến đi
            </Title>

            <div style={{ display: "flex", gap: 12 }}>
              <img
                src={tourImage || tourImagePlaceholder(120, 80)}
                alt={tourName || "tour"}
                style={{ width: 120, height: 80, objectFit: "cover", borderRadius: 10 }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = tourImagePlaceholder(120, 80);
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontWeight: 700, display: "block" }} ellipsis={{ tooltip: tourName }}>
                  {tourName}
                </Text>
                <Text type="secondary" style={{ display: "block" }}>
                  Mã tour: {tourCode || "---"}
                </Text>
              </div>
            </div>

            <Divider />

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <Text>Ngày khởi hành</Text>
              <Text style={{ fontWeight: 700 }}>{booking?.startDate ? dayjs(booking.startDate).format("DD/MM/YYYY") : "---"}</Text>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <Text>Số khách</Text>
              <Text style={{ fontWeight: 700 }}>{Number(booking?.groupSize || 0) || "---"}</Text>
            </div>

            <Divider style={{ margin: "12px 0" }} />

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <Text>Thanh toán</Text>
              <Tag color={paymentTag.color} style={{ marginInlineEnd: 0 }}>
                {paymentTag.label}
              </Tag>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <Text>Cần thanh toán</Text>
              <Text strong style={{ color: "#f5222d" }}>
                {Number(paymentAmount || 0).toLocaleString("vi-VN")}đ
              </Text>
            </div>

            <Divider style={{ margin: "12px 0" }} />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <Title level={5} style={{ margin: 0 }}>
                Tổng tiền
              </Title>
              <Title level={4} style={{ margin: 0, color: "#f5222d" }}>
                {Number(totalPrice || 0).toLocaleString("vi-VN")}đ
              </Title>
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
              <Button block size="large" onClick={() => navigate(`/booking/success/${id}`)}>
                Xem đơn hàng
              </Button>
              <Button
                block
                type="primary"
                size="large"
                onClick={() => {
                  if (!tourInfo?._id && !tourInfo?.id) return navigate("/tours");
                  navigate(`/tours/${tourInfo?._id || tourInfo?.id}`);
                }}
              >
                Xem tour
              </Button>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default BookingPaymentPage;
