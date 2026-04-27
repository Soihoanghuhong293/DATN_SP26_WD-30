import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, Descriptions, Divider, Empty, Spin, Tag, Timeline, Typography, Button, Space, message, Rate, Radio } from "antd";
import axios from "axios";
import dayjs from "dayjs";

const { Title, Text } = Typography;

const API_V1 =
  (import.meta.env?.VITE_API_URL as string | undefined) || "http://localhost:5000/api/v1";

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
});

const paymentStatusInfo = (payment: string) => {
  const p = String(payment || "unpaid");
  if (p === "paid") return { color: "green" as const, label: "Đã thanh toán đủ" };
  if (p === "deposit") return { color: "orange" as const, label: "Đã đặt cọc" };
  if (p === "refunded") return { color: "default" as const, label: "Đã hoàn tiền" };
  return { color: "blue" as const, label: "Chưa thanh toán" };
};

const bookingStatusInfo = (status: string) => {
  const s = ["pending", "confirmed", "cancelled"].includes(String(status)) ? String(status) : "confirmed";
  if (s === "pending") return { color: "gold" as const, label: "Chờ xử lý" };
  if (s === "cancelled") return { color: "red" as const, label: "Đã hủy" };
  return { color: "green" as const, label: "Đã xác nhận" };
};

const toVietnameseLogValue = (raw: unknown) => {
  const s = String(raw ?? "").trim();
  if (!s) return "";

  const map: Record<string, string> = {
    // tour_stage
    scheduled: "Chưa bắt đầu",
    in_progress: "Đang diễn ra",
    completed: "Đã kết thúc",

    // payment_status
    unpaid: "Chưa thanh toán",
    deposit: "Đã đặt cọc",
    paid: "Đã thanh toán",
    refunded: "Đã hoàn tiền",

    // booking status
    pending: "Chờ xử lý",
    confirmed: "Đã xác nhận",
    cancelled: "Đã hủy",
  };

  // nếu log lưu dạng "scheduled" hoặc "unpaid"...
  if (map[s]) return map[s];

  // nếu log lưu dạng "scheduled -> in_progress" hoặc "scheduled - in_progress"
  const normalized = s.replace(/\s+→\s+/g, "→").replace(/\s*-\s*/g, "→");
  if (normalized.includes("→")) {
    const parts = normalized.split("→").map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const left = map[parts[0]] || parts[0];
      const right = map[parts[1]] || parts[1];
      return `${left} → ${right}`;
    }
  }

  return s;
};

const MyBookingDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<any>(null);
  const [myReview, setMyReview] = useState<any>(null);
  const [myTourReview, setMyTourReview] = useState<any>(null);
  const [reviewScore, setReviewScore] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>("");
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);
  const [tourStars, setTourStars] = useState<number>(5);
  const [tourSatisfaction, setTourSatisfaction] = useState<"very_satisfied" | "satisfied" | "normal" | "dissatisfied">(
    "very_satisfied"
  );
  const [submittingTourReview, setSubmittingTourReview] = useState<boolean>(false);

  useEffect(() => {
    const fetchDetail = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const res = await axios.get(`${API_V1}/bookings/me/${id}`, getAuthHeader());
        setBooking(res.data?.data || res.data);
      } catch (e: any) {
        message.error(e?.response?.data?.message || "Không tải được chi tiết đơn.");
        setBooking(null);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  useEffect(() => {
    const fetchMyReview = async () => {
      if (!id) return;
      try {
        const res = await axios.get(`${API_V1}/guide-reviews/me`, {
          ...getAuthHeader(),
          params: { booking_id: id },
        });
        setMyReview(res.data?.data || null);
      } catch {
        setMyReview(null);
      }
    };
    fetchMyReview();
  }, [id]);

  useEffect(() => {
    const fetchMyTourReview = async () => {
      if (!id) return;
      try {
        const res = await axios.get(`${API_V1}/tour-reviews/me`, {
          ...getAuthHeader(),
          params: { booking_id: id },
        });
        setMyTourReview(res.data?.data || null);
      } catch {
        setMyTourReview(null);
      }
    };
    fetchMyTourReview();
  }, [id]);

  const tourName = booking?.tour_id?.name || "Tour";
  const pay = paymentStatusInfo(booking?.payment_status || "unpaid");
  const st = bookingStatusInfo(booking?.status || "confirmed");

  const total = Number(booking?.total_price || booking?.totalPrice || 0);
  const deposit = Number(booking?.deposit_amount || Math.round(total * 0.3));
  const remaining = Math.max(0, total - deposit);
  const tourStage = String(booking?.tour_stage || "scheduled");
  const canReview =
    String(booking?.status || "") !== "cancelled" &&
    tourStage === "completed" &&
    Boolean(booking?.guide_id);

  const canReviewTour = String(booking?.status || "") !== "cancelled" && tourStage === "completed";

  const satisfactionLabel = (s: string) => {
    if (s === "very_satisfied") return "Rất hài lòng";
    if (s === "satisfied") return "Hài lòng";
    if (s === "normal") return "Bình thường";
    if (s === "dissatisfied") return "Không hài lòng";
    return s;
  };

  const logs = useMemo(() => {
    const arr = Array.isArray(booking?.logs) ? booking.logs : [];
    return arr.map((l: any, idx: number) => ({
      key: `${idx}`,
      time: l?.time || "",
      user: l?.user || "",
      old: l?.old || "",
      next: l?.new || "",
      note: l?.note || "",
    }));
  }, [booking]);

  if (loading) {
    return (
      <div style={{ padding: 24, display: "flex", justifyContent: "center" }}>
        <Spin />
      </div>
    );
  }

  if (!booking) {
    return (
      <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
        <Empty description="Không tìm thấy đơn hàng." />
        <div style={{ marginTop: 16 }}>
          <Button type="primary" onClick={() => navigate("/my-bookings")}>
            Quay lại danh sách
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 980, margin: "0 auto" }}>
      <Space direction="vertical" size={14} style={{ width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <Title level={3} style={{ marginBottom: 0 }}>
              Chi tiết đơn
            </Title>
            <Text type="secondary">{tourName}</Text>
          </div>
          <Space>
            <Button onClick={() => navigate("/my-bookings")}>Quay lại</Button>
            <Button
              type="primary"
              onClick={() => {
                const ps = String(booking?.payment_status || "");
                if (ps === "deposit" || ps === "unpaid") {
                  navigate(`/booking/payment/${id}?gateway=bank`);
                } else {
                  navigate(`/booking/success/${id}`);
                }
              }}
            >
              {String(booking?.payment_status || "") === "paid" ? "Xem hóa đơn" : "Thanh toán / Hóa đơn"}
            </Button>
          </Space>
        </div>

        <Card style={{ borderRadius: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <Text>
              Mã booking: <Text copyable>{booking?._id || id}</Text>
            </Text>
            <Space size={8}>
              <Tag color={st.color}>{st.label}</Tag>
              <Tag color={pay.color}>{pay.label}</Tag>
            </Space>
          </div>

          <Divider />

          <Descriptions
            bordered
            column={1}
            styles={{ label: { width: 200, fontWeight: 700 } }}
          >
            <Descriptions.Item label="Ngày khởi hành">
              {booking?.startDate ? dayjs(booking.startDate).format("DD/MM/YYYY") : "---"}
            </Descriptions.Item>
            <Descriptions.Item label="Ngày kết thúc">
              {booking?.endDate ? dayjs(booking.endDate).format("DD/MM/YYYY") : "---"}
            </Descriptions.Item>
            <Descriptions.Item label="Số khách">{booking?.groupSize ?? "---"}</Descriptions.Item>
            <Descriptions.Item label="Tổng tiền">
              <Text strong style={{ color: "#d90429" }}>{total.toLocaleString("vi-VN")}đ</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Đặt cọc (30%)">
              <Text strong>{deposit.toLocaleString("vi-VN")}đ</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Còn lại">
              <Text strong>{remaining.toLocaleString("vi-VN")}đ</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Phương thức thanh toán">{booking?.paymentMethod || "---"}</Descriptions.Item>
          </Descriptions>

          <Divider />

          <Title level={4} style={{ marginBottom: 10 }}>Đánh giá tour</Title>
          <div style={{ marginTop: 12 }}>
            {!canReviewTour ? (
              <Empty
                description={
                  tourStage !== "completed"
                    ? "Tour chưa kết thúc nên chưa thể đánh giá."
                    : String(booking?.status || "") === "cancelled"
                    ? "Booking đã hủy nên không thể đánh giá."
                    : "Chưa thể đánh giá."
                }
              />
            ) : myTourReview ? (
              <Card style={{ borderRadius: 10, border: "1px solid #eef2f7" }}>
                <Space direction="vertical" size={10} style={{ width: "100%" }}>
                  <Rate disabled value={Number(myTourReview?.stars || 0)} />
                  <Tag color="blue" style={{ width: "fit-content" }}>
                    {satisfactionLabel(String(myTourReview?.satisfaction || ""))}
                  </Tag>
                </Space>
              </Card>
            ) : (
              <Card style={{ borderRadius: 10, border: "1px solid #eef2f7" }}>
                <Space direction="vertical" size={12} style={{ width: "100%" }}>
                  <div>
                    <Text strong>Bạn đánh giá tour này bao nhiêu sao?</Text>
                    <div style={{ marginTop: 6 }}>
                      <Rate value={tourStars} onChange={(v) => setTourStars(v)} />
                    </div>
                  </div>

                  <div>
                    <Text strong>Bạn có hài lòng với chuyến đi không?</Text>
                    <div style={{ marginTop: 8 }}>
                      <Radio.Group
                        value={tourSatisfaction}
                        onChange={(e) => setTourSatisfaction(e.target.value)}
                      >
                        <Space direction="vertical" size={6}>
                          <Radio value="very_satisfied">Rất hài lòng</Radio>
                          <Radio value="satisfied">Hài lòng</Radio>
                          <Radio value="normal">Bình thường</Radio>
                          <Radio value="dissatisfied">Không hài lòng</Radio>
                        </Space>
                      </Radio.Group>
                    </div>
                  </div>

                  <Button
                    type="primary"
                    loading={submittingTourReview}
                    onClick={async () => {
                      if (!id) return;
                      setSubmittingTourReview(true);
                      try {
                        const res = await axios.post(
                          `${API_V1}/tour-reviews`,
                          { booking_id: id, stars: tourStars, satisfaction: tourSatisfaction },
                          getAuthHeader()
                        );
                        setMyTourReview(res.data?.data || null);
                        message.success("Đã gửi đánh giá tour");
                      } catch (e: any) {
                        message.error(e?.response?.data?.message || "Gửi đánh giá tour thất bại");
                      } finally {
                        setSubmittingTourReview(false);
                      }
                    }}
                  >
                    Gửi đánh giá
                  </Button>
                </Space>
              </Card>
            )}
          </div>

          <Divider />

          <Title level={4} style={{ marginBottom: 10 }}>Đánh giá hướng dẫn viên</Title>
          {booking?.guide_id ? (
            <Text type="secondary">
              Hướng dẫn viên: <Text strong>{booking.guide_id?.name || "—"}</Text>
            </Text>
          ) : (
            <Text type="secondary">Chưa có hướng dẫn viên.</Text>
          )}

          <div style={{ marginTop: 12 }}>
            {!canReview ? (
              <Empty
                description={
                  tourStage !== "completed"
                    ? "Tour chưa kết thúc nên chưa thể đánh giá."
                    : String(booking?.status || "") === "cancelled"
                    ? "Booking đã hủy nên không thể đánh giá."
                    : "Booking chưa có hướng dẫn viên để đánh giá."
                }
              />
            ) : myReview ? (
              <Card style={{ borderRadius: 10, border: "1px solid #eef2f7" }}>
                <Space direction="vertical" size={6} style={{ width: "100%" }}>
                  <Rate disabled value={Number(myReview?.score || 0)} />
                  <Text>{myReview?.comment || "Không có nội dung."}</Text>
                </Space>
              </Card>
            ) : (
              <Card style={{ borderRadius: 10, border: "1px solid #eef2f7" }}>
                <Space direction="vertical" size={10} style={{ width: "100%" }}>
                  <Rate value={reviewScore} onChange={(v) => setReviewScore(v)} />
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Viết đánh giá của bạn về hướng dẫn viên..."
                    style={{
                      width: "100%",
                      minHeight: 90,
                      resize: "vertical",
                      borderRadius: 8,
                      border: "1px solid #d9d9d9",
                      padding: 10,
                      fontFamily: "inherit",
                    }}
                    maxLength={1000}
                  />
                  <Button
                    type="primary"
                    loading={submittingReview}
                    onClick={async () => {
                      if (!id) return;
                      setSubmittingReview(true);
                      try {
                        const res = await axios.post(
                          `${API_V1}/guide-reviews`,
                          { booking_id: id, score: reviewScore, comment: reviewComment },
                          getAuthHeader()
                        );
                        setMyReview(res.data?.data || null);
                        message.success("Đã gửi đánh giá");
                      } catch (e: any) {
                        message.error(e?.response?.data?.message || "Gửi đánh giá thất bại");
                      } finally {
                        setSubmittingReview(false);
                      }
                    }}
                  >
                    Gửi đánh giá
                  </Button>
                </Space>
              </Card>
            )}
          </div>

          <Divider />

          <Title level={4} style={{ marginBottom: 10 }}>Lịch sử</Title>
          {logs.length ? (
            <Timeline
              items={logs.map((l: any) => ({
                color: "#1677ff",
                children: (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <Text strong>{l.time || "---"}</Text>
                      <Text type="secondary">{l.user || ""}</Text>
                    </div>
                    <div style={{ marginTop: 4 }}>
                      <Text type="secondary">{l.old ? `${toVietnameseLogValue(l.old)} → ` : ""}</Text>
                      <Text strong>{toVietnameseLogValue(l.next) || ""}</Text>
                    </div>
                    {l.note ? <div style={{ marginTop: 4 }}><Text>{l.note}</Text></div> : null}
                  </div>
                ),
              }))}
            />
          ) : (
            <Empty description="Chưa có lịch sử." />
          )}
        </Card>
      </Space>
    </div>
  );
};

export default MyBookingDetailPage;

