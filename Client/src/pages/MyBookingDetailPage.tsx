import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, Descriptions, Divider, Empty, Spin, Tag, Timeline, Typography, Button, Space, message, Rate, Input, Modal, Select, Upload, Popconfirm } from "antd";
import axios from "axios";
import dayjs from "dayjs";
import type { UploadFile } from "antd";
import type { RcFile } from "antd/es/upload";
import { createTourReview, deleteTourReview, getMyTourReviewByBooking, updateTourReview } from "../services/api";

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

    // cancel_request status
    approved: "Đã duyệt",
    rejected: "Từ chối",

    // misc
    done: "Hoàn tất",
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
  const [reviewScore, setReviewScore] = useState<number>(5);
  const [guideRating, setGuideRating] = useState<number>(0);
  const [reviewComment, setReviewComment] = useState<string>("");
  const [reviewImages, setReviewImages] = useState<string>("");
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [cancelBankName, setCancelBankName] = useState<string>("Vietcombank");
  const [cancelBankAccountNumber, setCancelBankAccountNumber] = useState<string>("");
  const [cancelBankAccountName, setCancelBankAccountName] = useState<string>("");
  const [cancelQrFileList, setCancelQrFileList] = useState<UploadFile[]>([]);
  const [cancelQrDataUrl, setCancelQrDataUrl] = useState<string>("");
  const cancelFormError = useMemo(() => {
    if (!cancelReason.trim()) return "Vui lòng nhập lý do hủy";
    if (!cancelBankName.trim()) return "Vui lòng chọn ngân hàng";
    if (!cancelBankAccountNumber.trim()) return "Vui lòng nhập số tài khoản";
    if (!cancelBankAccountName.trim()) return "Vui lòng nhập chủ tài khoản";
    if (!cancelQrDataUrl) return "Vui lòng upload QR ngân hàng";
    return "";
  }, [cancelBankAccountName, cancelBankAccountNumber, cancelBankName, cancelQrDataUrl, cancelReason]);

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
        const res = await getMyTourReviewByBooking(id);
        setMyReview(res?.data || null);
      } catch {
        setMyReview(null);
      }
    };
    fetchMyReview();
  }, [id]);

  const tourName = booking?.tour_id?.name || "Tour";
  const pay = paymentStatusInfo(booking?.payment_status || "unpaid");
  const st = bookingStatusInfo(booking?.status || "confirmed");

  const total = Number(booking?.total_price || booking?.totalPrice || 0);
  const deposit = Number(booking?.deposit_amount || Math.round(total * 0.3));
  const remaining = Math.max(0, total - deposit);
  const tourStage = String(booking?.tour_stage || "scheduled");
  const paymentStatusRaw = String(booking?.payment_status || "unpaid");
  const hasPendingCancel = Boolean(booking?.cancel_request?.status === "pending");
  const startDate = booking?.startDate ? new Date(booking.startDate) : null;
  const isPastOrOnStart = startDate ? Date.now() >= startDate.getTime() : false;
  const canCancel =
    String(booking?.status || "") !== "cancelled" &&
    !hasPendingCancel &&
    tourStage !== "in_progress" &&
    tourStage !== "completed" &&
    !isPastOrOnStart;
  const daysBeforeStart = startDate ? Math.floor((startDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)) : 0;
  const timeRefundPercent = daysBeforeStart > 7 ? 100 : daysBeforeStart >= 3 ? 50 : 0;
  const paidAmount = paymentStatusRaw === "paid" ? total : paymentStatusRaw === "deposit" ? Math.max(0, deposit) : 0;
  const refundPercent = timeRefundPercent;
  const refundAmount = Math.max(0, Math.round((paidAmount * refundPercent) / 100));
  const canReview =
    String(booking?.status || "") !== "cancelled" &&
    tourStage === "completed";

  const reviewStatusInfo = (status: string) => {
    const s = String(status || "pending");
    if (s === "approved") return { color: "green" as const, label: "Đã duyệt" };
    if (s === "hidden") return { color: "red" as const, label: "Đã ẩn" };
    return { color: "gold" as const, label: "Chờ duyệt" };
  };

  const parseImages = (value: string) =>
    value
      .split(/\r?\n|,/g)
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 8);

  const fillFormFromReview = (review: any) => {
    setReviewScore(Number(review?.rating || 5));
    setGuideRating(Number(review?.guide_rating || 0));
    setReviewComment(String(review?.comment || ""));
    setReviewImages(Array.isArray(review?.images) ? review.images.join("\n") : "");
  };

  useEffect(() => {
    if (myReview) fillFormFromReview(myReview);
    else {
      setReviewScore(5);
      setGuideRating(0);
      setReviewComment("");
      setReviewImages("");
    }
  }, [myReview]);

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
              danger
              disabled={!canCancel}
              onClick={() => setCancelOpen(true)}
            >
              {hasPendingCancel ? "Đang chờ hủy" : "Hủy tour"}
            </Button>
            <Button
              type="primary"
              disabled={String(booking?.status || "") === "cancelled" || (pay.label !== "Đã thanh toán đủ" && isPastOrOnStart)}
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
                    : "Bạn có thể đánh giá tour sau khi tour kết thúc."
                }
              />
            ) : myReview ? (
              <Card style={{ borderRadius: 10, border: "1px solid #eef2f7" }}>
                <Space direction="vertical" size={10} style={{ width: "100%" }}>
                  <Space style={{ justifyContent: "space-between", width: "100%" }}>
                    <Text strong>Đánh giá của bạn</Text>
                    <Tag color={reviewStatusInfo(myReview?.status).color}>{reviewStatusInfo(myReview?.status).label}</Tag>
                  </Space>
                  <div>
                    <Text type="secondary">Điểm tour</Text>
                    <div><Rate value={reviewScore} onChange={setReviewScore} /></div>
                  </div>
                  <div>
                    <Text type="secondary">Điểm hướng dẫn viên (tùy chọn)</Text>
                    <div><Rate value={guideRating} onChange={setGuideRating} /></div>
                  </div>
                  <Input.TextArea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Viết đánh giá tour của bạn..."
                    autoSize={{ minRows: 3, maxRows: 6 }}
                    maxLength={1000}
                    showCount
                  />
                  <Input.TextArea
                    value={reviewImages}
                    onChange={(e) => setReviewImages(e.target.value)}
                    placeholder="Ảnh review (mỗi dòng 1 URL, tối đa 8 ảnh)"
                    autoSize={{ minRows: 2, maxRows: 4 }}
                  />
                  {Array.isArray(myReview?.images) && myReview.images.length > 0 ? (
                    <Text type="secondary">Đã đính kèm {myReview.images.length} ảnh.</Text>
                  ) : null}
                  <Space wrap>
                    <Button
                      type="primary"
                      loading={submittingReview}
                      onClick={async () => {
                        if (!myReview?._id) return;
                        setSubmittingReview(true);
                        try {
                          const res = await updateTourReview(String(myReview._id), {
                            rating: reviewScore,
                            guide_rating: guideRating > 0 ? guideRating : undefined,
                            comment: reviewComment,
                            images: parseImages(reviewImages),
                          });
                          setMyReview(res?.data || null);
                          message.success("Đã cập nhật đánh giá");
                        } catch (e: any) {
                          message.error(e?.response?.data?.message || "Cập nhật đánh giá thất bại");
                        } finally {
                          setSubmittingReview(false);
                        }
                      }}
                    >
                      Cập nhật đánh giá
                    </Button>
                    <Popconfirm
                      title="Xóa đánh giá này?"
                      okText="Xóa"
                      cancelText="Hủy"
                      onConfirm={async () => {
                        if (!myReview?._id) return;
                        setSubmittingReview(true);
                        try {
                          await deleteTourReview(String(myReview._id));
                          setMyReview(null);
                          message.success("Đã xóa đánh giá");
                        } catch (e: any) {
                          message.error(e?.response?.data?.message || "Xóa đánh giá thất bại");
                        } finally {
                          setSubmittingReview(false);
                        }
                      }}
                    >
                      <Button danger loading={submittingReview}>Xóa đánh giá</Button>
                    </Popconfirm>
                  </Space>
                </Space>
              </Card>
            ) : (
              <Card style={{ borderRadius: 10, border: "1px solid #eef2f7" }}>
                <Space direction="vertical" size={10} style={{ width: "100%" }}>
                  <div>
                    <Text type="secondary">Điểm tour</Text>
                    <div><Rate value={reviewScore} onChange={(v) => setReviewScore(v)} /></div>
                  </div>
                  <div>
                    <Text type="secondary">Điểm hướng dẫn viên (tùy chọn)</Text>
                    <div><Rate value={guideRating} onChange={(v) => setGuideRating(v)} /></div>
                  </div>
                  <Input.TextArea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Viết đánh giá của bạn về tour..."
                    autoSize={{ minRows: 3, maxRows: 6 }}
                    maxLength={1000}
                    showCount
                  />
                  <Input.TextArea
                    value={reviewImages}
                    onChange={(e) => setReviewImages(e.target.value)}
                    placeholder="Ảnh review (mỗi dòng 1 URL, tối đa 8 ảnh)"
                    autoSize={{ minRows: 2, maxRows: 4 }}
                  />
                  <Button
                    type="primary"
                    loading={submittingReview}
                    onClick={async () => {
                      if (!id) return;
                      setSubmittingReview(true);
                      try {
                        const res = await createTourReview({
                          booking_id: id,
                          rating: reviewScore,
                          guide_rating: guideRating > 0 ? guideRating : undefined,
                          comment: reviewComment,
                          images: parseImages(reviewImages),
                        });
                        setMyReview(res?.data || null);
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

      <Modal
        open={cancelOpen}
        title="Xác nhận hủy tour"
        okText="Xác nhận"
        cancelText="Đóng"
        okButtonProps={{ danger: true, loading: cancelSubmitting, disabled: !canCancel || !!cancelFormError }}
        onCancel={() => {
          if (cancelSubmitting) return;
          setCancelOpen(false);
          setCancelReason("");
          setCancelBankName("Vietcombank");
          setCancelBankAccountNumber("");
          setCancelBankAccountName("");
          setCancelQrFileList([]);
          setCancelQrDataUrl("");
        }}
        onOk={async () => {
          if (!id) return;
          if (cancelFormError) {
            message.error(cancelFormError);
            return;
          }
          setCancelSubmitting(true);
          try {
            const res = await axios.post(
              `${API_V1}/bookings/me/${id}/cancel-request`,
              {
                reason: cancelReason || "",
                bank_name: cancelBankName || "",
                bank_account_number: cancelBankAccountNumber || "",
                bank_account_name: cancelBankAccountName || "",
                qr_image_data_url: cancelQrDataUrl || "",
              },
              getAuthHeader()
            );
            const cr = res.data?.data?.cancel_request;
            setBooking((prev: any) => (prev ? { ...prev, cancel_request: cr } : prev));
            message.success("Đã tạo yêu cầu hủy");
            setCancelOpen(false);
            setCancelReason("");
            setCancelBankName("Vietcombank");
            setCancelBankAccountNumber("");
            setCancelBankAccountName("");
            setCancelQrFileList([]);
            setCancelQrDataUrl("");
          } catch (e: any) {
            message.error(e?.response?.data?.message || "Không thể tạo yêu cầu hủy");
          } finally {
            setCancelSubmitting(false);
          }
        }}
      >
        <Space direction="vertical" size={10} style={{ width: "100%" }}>
          <div>
            <Text strong>Số tiền được hoàn:</Text>{" "}
            <Text strong style={{ color: "#d90429" }}>
              {refundAmount.toLocaleString("vi-VN")}đ
            </Text>{" "}
            <Text type="secondary">({refundPercent}%)</Text>
          </div>
          <div>
            <Text type="secondary">
              Trạng thái thanh toán: <b>{pay.label}</b>
            </Text>
          </div>
          <Input.TextArea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Lý do hủy"
            autoSize={{ minRows: 3, maxRows: 6 }}
            maxLength={500}
            showCount
          />

          <Divider style={{ margin: "4px 0" }} />

          <Text strong>Thông tin nhận hoàn tiền</Text>
          <Select
            value={cancelBankName}
            onChange={(v) => setCancelBankName(String(v))}
            options={[
              { label: "Vietcombank", value: "Vietcombank" },
              { label: "Techcombank", value: "Techcombank" },
              { label: "BIDV", value: "BIDV" },
              { label: "Agribank", value: "Agribank" },
              { label: "ACB", value: "ACB" },
              { label: "MB Bank", value: "MB Bank" },
            ]}
          />
          <Input
            value={cancelBankAccountNumber}
            onChange={(e) => setCancelBankAccountNumber(e.target.value)}
            placeholder="Số tài khoản"
          />
          <Input
            value={cancelBankAccountName}
            onChange={(e) => setCancelBankAccountName(e.target.value)}
            placeholder="Chủ tài khoản"
          />

          <Upload
            listType="picture"
            fileList={cancelQrFileList}
            maxCount={1}
            accept="image/*"
            beforeUpload={async (file: RcFile) => {
              try {
                const dataUrl = await new Promise<string>((resolve) => {
                  const reader = new FileReader();
                  reader.onload = () => resolve(String(reader.result || ""));
                  reader.onerror = () => resolve("");
                  reader.readAsDataURL(file);
                });
                if (!dataUrl) {
                  message.error("Không đọc được ảnh QR. Vui lòng thử ảnh khác.");
                  return false;
                }
                setCancelQrDataUrl(dataUrl);
                setCancelQrFileList([
                  {
                    uid: file.uid,
                    name: file.name,
                    status: "done",
                    url: dataUrl,
                  },
                ]);
              } catch {
                message.error("Upload QR thất bại. Vui lòng thử lại.");
              }
              return false;
            }}
            onRemove={() => {
              setCancelQrFileList([]);
              setCancelQrDataUrl("");
            }}
          >
            <Button>Upload QR</Button>
          </Upload>

          {cancelFormError ? <Text type="danger">{cancelFormError}</Text> : null}
        </Space>
      </Modal>
    </div>
  );
};

export default MyBookingDetailPage;

