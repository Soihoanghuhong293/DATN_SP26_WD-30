import React, { useMemo, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../components/styles/tourDetailU.css";
import {
  Spin,
  Empty,
  Button,
  Tag,
  Divider,
  message,
  Modal,
  Rate,
  Radio,
  Space,
} from "antd";
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  TeamOutlined,
  LeftOutlined,
  RightOutlined,
  ClockCircleOutlined,
  UsergroupAddOutlined,
  StarFilled,
} from "@ant-design/icons";
import axios from "axios";
import dayjs from "dayjs";
import { getTour } from "../services/api";
import { ITour } from "../types/tour.types";
import "./styles/TourDetail.css";
import "./styles/DepartureCalendar.css";
import "./styles/SchedulePicker.css";

const API_V1 =
  (import.meta.env?.VITE_API_URL as string | undefined) || "http://localhost:5000/api/v1";

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
});

/** Chuẩn hoá date từ API/schedule (trùng logic normalizedSchedule) → YYYY-MM-DD */
function normalizeDepartureDateRaw(raw: string): string {
  if (!raw) return "";
  const trimmed = String(raw).trim();
  if (!trimmed) return "";
  if (trimmed.includes("T")) return trimmed.split("T")[0];
  const slash = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    const dd = slash[1].padStart(2, "0");
    const mm = slash[2].padStart(2, "0");
    const yyyy = slash[3];
    return `${yyyy}-${mm}-${dd}`;
  }
  const parsed = dayjs(trimmed);
  return parsed.isValid() ? parsed.format("YYYY-MM-DD") : "";
}

const TourDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [tour, setTour] = useState<ITour | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [selectedDepartureDate, setSelectedDepartureDate] = useState<string | null>(null);
  const [holidayRules, setHolidayRules] = useState<any[]>([]);
  const [groupInstances, setGroupInstances] = useState<any[]>([]);

  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [eligibleBookingId, setEligibleBookingId] = useState<string | null>(null);
  const [loadingEligibility, setLoadingEligibility] = useState(false);
  const [tourStars, setTourStars] = useState<number>(5);
  const [tourSatisfaction, setTourSatisfaction] = useState<"very_satisfied" | "satisfied" | "normal" | "dissatisfied">(
    "very_satisfied"
  );
  const [submittingTourReview, setSubmittingTourReview] = useState(false);
  const [guestName, setGuestName] = useState<string>("");

  const normalizeGroupName = (name?: string) => {
    const n = String(name || "").trim();
    if (!n) return "";
    return n
      .replace(/\s*\(\s*\d{1,2}\/\d{1,2}\/\d{4}\s*\)\s*$/i, "")
      .replace(/\s*\(\s*copy\s*\)\s*$/i, "")
      .trim();
  };

  useEffect(() => {
    const fetchTourDetail = async () => {
      if (!id) {
        setError("Tour ID not found");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await getTour(id);

        if (data.data && typeof data.data === "object") {
          if ("tour" in data.data) {
            setTour(data.data.tour);
          } else {
            setTour(data.data as ITour);
          }
        } else {
          setError("Could not load tour details");
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load tour details");
        message.error("Lỗi khi tải thông tin tour");
      } finally {
        setLoading(false);
      }
    };

    fetchTourDetail();
  }, [id]);

  useEffect(() => {
    const fetchEligibility = async () => {
      const tourId = (tour as any)?._id || (tour as any)?.id || id;
      const token = localStorage.getItem("token");
      if (!tourId || !token) {
        setEligibleBookingId(null);
        return;
      }
      setLoadingEligibility(true);
      try {
        const res = await axios.get(`${API_V1}/bookings/me`, getAuthHeader());
        const bookings = Array.isArray(res.data?.data) ? res.data.data : [];
        const completed = bookings.filter((b: any) => {
          const btourId = String(b?.tour_id?._id || b?.tour_id || "");
          const okTour = btourId === String(tourId);
          const okStage = String(b?.tour_stage || "scheduled") === "completed";
          const okStatus = String(b?.status || "") !== "cancelled";
          return okTour && okStage && okStatus;
        });

        // chọn booking completed gần nhất mà chưa đánh giá tour
        for (const b of completed) {
          const bid = String(b?._id || b?.id || "");
          if (!bid) continue;
          try {
            const check = await axios.get(`${API_V1}/tour-reviews/me`, {
              ...getAuthHeader(),
              params: { booking_id: bid },
            });
            const existing = check.data?.data;
            if (!existing) {
              setEligibleBookingId(bid);
              return;
            }
          } catch {
            // nếu lỗi check thì bỏ qua
          }
        }
        setEligibleBookingId(null);
      } catch {
        setEligibleBookingId(null);
      } finally {
        setLoadingEligibility(false);
      }
    };
    fetchEligibility();
  }, [tour?._id, (tour as any)?.id, id]);

  const satisfactionLabel = (s: string) => {
    if (s === "very_satisfied") return "Rất hài lòng";
    if (s === "satisfied") return "Hài lòng";
    if (s === "normal") return "Bình thường";
    if (s === "dissatisfied") return "Không hài lòng";
    return s;
  };

  // Fetch all tour instances cùng tên để gộp lịch khởi hành (khách hàng chỉ thấy 1 tour)
  useEffect(() => {
    const fetchInstancesByName = async () => {
      const groupKey = normalizeGroupName(tour?.name);
      if (!groupKey) return;
      try {
        // Lấy rộng (limit lớn) rồi lọc theo tên gốc ở client để tránh miss do search/status
        const res = await axios.get('http://localhost:5000/api/v1/tours', {
          params: { page: 1, limit: 2000 },
        });
        const arr = res.data?.data || [];
        const instances = Array.isArray(arr)
          ? arr.filter((t: any) => normalizeGroupName(String(t?.name || "")) === groupKey)
          : [];
        setGroupInstances(instances);
      } catch (e) {
        // ignore, fallback to single tour
      }
    };
    fetchInstancesByName();
  }, [tour?.name]);

  useEffect(() => {
    const fetchHolidayRules = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/v1/holiday-pricings");
        setHolidayRules(res.data?.data || []);
      } catch (err) {
        console.error("Lỗi khi tải giá ngày lễ:", err);
      }
    };
    fetchHolidayRules();
  }, []);

  const tourImages = useMemo(() => {
    const imgs = (tour?.images || []).filter(Boolean);
    return Array.isArray(imgs) ? imgs : [];
  }, [tour]);

  const departureSchedule = useMemo(() => {
    // gộp departure_schedule của tất cả instances cùng tên
    const base = (tour as any)?.departure_schedule || [];
    const instances = Array.isArray(groupInstances) && groupInstances.length ? groupInstances : [];
    if (!instances.length) return base;
    const merged: any[] = [];
    for (const inst of instances) {
      const sch = inst?.departure_schedule || [];
      for (const s of sch) {
        merged.push(s);
      }
    }
    return merged.length ? merged : base;
  }, [tour, groupInstances]);

  const { tourIdByDate, priceByDate } = useMemo(() => {
    const idMap: Record<string, string> = {};
    const priceMap: Record<string, number> = {};

    const applyInstance = (inst: any) => {
      const pid = inst?.id || inst?._id;
      if (!pid) return;
      const instPrice = Number((inst as any)?.price ?? 0);
      const sch = inst?.departure_schedule || [];
      for (const row of sch) {
        const raw = row?.date ? String(row.date).trim() : "";
        const d = normalizeDepartureDateRaw(raw);
        if (!d) continue;
        idMap[d] = String(pid);
        priceMap[d] = instPrice;
      }
    };

    const instances = Array.isArray(groupInstances) && groupInstances.length ? groupInstances : [];
    if (instances.length) {
      for (const inst of instances) applyInstance(inst);
    } else if (tour) {
      applyInstance(tour);
    }

    return { tourIdByDate: idMap, priceByDate: priceMap };
  }, [groupInstances, tour]);

  const normalizedSchedule = useMemo(() => {
    const arr = Array.isArray(departureSchedule) ? departureSchedule : [];
    return arr
      .map((s: any) => {
        const raw = s?.date ? String(s.date).trim() : "";
        let date = "";
        if (raw) {
          if (raw.includes("T")) {
            date = raw.split("T")[0];
          } else {
            const slash = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
            if (slash) {
              const dd = slash[1].padStart(2, "0");
              const mm = slash[2].padStart(2, "0");
              const yyyy = slash[3];
              date = `${yyyy}-${mm}-${dd}`;
            } else {
              const parsed = dayjs(raw);
              date = parsed.isValid() ? parsed.format("YYYY-MM-DD") : "";
            }
          }
        }
        return { ...s, _date: date };
      })
      .filter((s: any) => !!s._date);
  }, [departureSchedule]);

  const isSelectableDepartureDate = useMemo(() => {
    const map = new Map<string, { slots: number }>();
    for (const s of normalizedSchedule) {
      const slots = Number((s as any)?.slots ?? 0);
      map.set((s as any)._date, { slots });
    }
    return (dateStr: string) => {
      const v = map.get(dateStr);
      return !!v && v.slots > 0;
    };
  }, [normalizedSchedule]);

  const defaultDepartureDate = useMemo(() => {
    const today = dayjs().startOf("day");
    const available = normalizedSchedule
      .filter((s: any) => (s?.slots ?? 0) > 0)
      .map((s: any) => s._date)
      .filter((d: string) => dayjs(d).isSame(today) || dayjs(d).isAfter(today))
      .sort((a: string, b: string) => dayjs(a).valueOf() - dayjs(b).valueOf());
    return available[0] || null;
  }, [normalizedSchedule]);

  useEffect(() => {
    setSelectedDepartureDate((prev) => prev || defaultDepartureDate);
  }, [defaultDepartureDate]);

  const monthKeys = useMemo(() => {
    const start = dayjs().startOf("month");
    return Array.from({ length: 12 }).map((_, i) => start.add(i, "month").format("YYYY-MM"));
  }, []);

  const [activeMonth, setActiveMonth] = useState<string>(() => dayjs().format("YYYY-MM"));

  useEffect(() => {
    if (selectedDepartureDate) setActiveMonth(selectedDepartureDate.slice(0, 7));
  }, [selectedDepartureDate]);

  const scheduleMap = useMemo(() => {
    const map = new Map<string, { slots: number }>();
    for (const s of normalizedSchedule) {
      map.set((s as any)._date, { slots: Number((s as any)?.slots ?? 0) });
    }
    return map;
  }, [normalizedSchedule]);

  const getSlotsForSelectedDate = () => {
    if (!selectedDepartureDate) return null;
    const v = scheduleMap.get(selectedDepartureDate);
    return typeof v?.slots === "number" ? v.slots : null;
  };

  const getPriceForDate = (dateStr: string) => {
    const mapped =
      dateStr && Object.prototype.hasOwnProperty.call(priceByDate, dateStr)
        ? Number(priceByDate[dateStr])
        : NaN;
    const basePrice =
      dateStr && !Number.isNaN(mapped) ? mapped : Number((tour as any)?.price ?? 0) || 0;
    if (!dateStr) return basePrice;
    const targetTime = new Date(`${dateStr}T12:00:00Z`).getTime();

    const applicableRules = holidayRules.filter((rule: any) => {
      const tourId = (tour as any)?._id || (tour as any)?.id;
      const isForTour = !rule.tour_id || rule.tour_id?._id === tourId || rule.tour_id === tourId;
      if (!isForTour) return false;

      let end = new Date(rule.end_date).getTime();
      const endHr = new Date(rule.end_date).getUTCHours();
      if (endHr === 17 || endHr === 0) end += 24 * 60 * 60 * 1000 - 1;

      const start = new Date(rule.start_date).getTime();
      return targetTime >= start && targetTime <= end;
    });

    if (applicableRules.length > 0) {
      applicableRules.sort((a: any, b: any) => (b.priority || 0) - (a.priority || 0));
      const rule = applicableRules[0];
      if (rule.fixed_price) return rule.fixed_price;
      return basePrice * (rule.price_multiplier || 1);
    }
    return basePrice;
  };

  const formatPriceK = (price: number) => {
    if (!price) return "";
    const k = Math.round(price / 1000);
    return `${k.toLocaleString("vi-VN")}K`;
  };

  const buildMonthGrid = (month: string) => {
    const start = dayjs(month + "-01");
    const startDow = (start.day() + 6) % 7; // 0=Mon ... 6=Sun
    const daysInMonth = start.daysInMonth();
    const cells: Array<{ date: dayjs.Dayjs; inMonth: boolean }> = [];

    const firstCell = start.subtract(startDow, "day");
    for (let i = 0; i < 42; i++) {
      const d = firstCell.add(i, "day");
      cells.push({ date: d, inMonth: d.month() === start.month() });
    }
    return { start, cells, daysInMonth };
  };

  const handleBookNow = () => {
    const date = selectedDepartureDate || defaultDepartureDate;
    const fallbackId = (tour as any)?.id || (tour as any)?._id || id;
    const instanceId = date && tourIdByDate[date] ? tourIdByDate[date] : fallbackId;
    const basePath = `/order/booking/${instanceId}`;
    navigate(date ? `${basePath}?date=${encodeURIComponent(date)}` : basePath);
  };

  useEffect(() => {
    setActiveImageIndex(0);
  }, [id]);

  const handleGoBack = () => {
    navigate("/tours");
  };

  const durationDays = tour?.duration_days ?? tour?.duration_;

  if (loading) {
    return (
      <div className="tour-detail-loading">
        <Spin size="large" tip="Đang tải thông tin tour..." fullscreen />
      </div>
    );
  }

  if (error || !tour) {
    return (
      <div className="tour-detail-error">
        <Empty description={error || "Tour không tìm thấy"} />
        <Button
          type="primary"
          icon={<ArrowLeftOutlined />}
          onClick={handleGoBack}
          style={{ marginTop: 20 }}
        >
          Quay lại
        </Button>
      </div>
    );
  }

  return (
    <div className="tour-detail-page">
      {/* HEADER */}
      <div className="tour-detail-header">
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={handleGoBack}>
          Quay lại
        </Button>

        <h1>{tour.name}</h1>

        <Tag color={tour.status === "active" ? "green" : "orange"}>
          {tour.status === "active" ? "Hoạt động" : "Tạm dừng"}
        </Tag>
      </div>

      {/* HERO + SIDEBAR */}
      {tourImages.length > 0 && (
        <div className="tour-hero">
          {/* LEFT: GALLERY */}
          <div className="tour-gallery">
            <div className="tour-gallery-thumbs">
              {tourImages.map((src, idx) => (
                <button
                  key={`${src}-${idx}`}
                  className={`tour-thumb ${
                    idx === activeImageIndex ? "is-active" : ""
                  }`}
                  onClick={() => setActiveImageIndex(idx)}
                >
                  <img src={src} alt="thumb" />
                </button>
              ))}
            </div>

            <div className="tour-gallery-main">
              <img
                src={
                  tourImages[
                    Math.min(activeImageIndex, tourImages.length - 1)
                  ]
                }
                alt="main"
              />
            </div>
          </div>

          {/* RIGHT: SIDEBAR */}
         {/* RIGHT: SIDEBAR */}
          <div className="tour-detail-sidebar">
            <div className="sidebar-card">
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>GIÁ TOUR</h3>
              <div style={{ marginBottom: 10 }}>
                <span style={{ fontSize: 36, fontWeight: 900, color: "#d90429", lineHeight: 1 }}>
                  {getPriceForDate(selectedDepartureDate || defaultDepartureDate || "").toLocaleString()}đ
                </span>
                <span style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginLeft: 6 }}>/ khách</span>
              </div>

              <div style={{ margin: "10px 0 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <CalendarOutlined style={{ color: "#6b7280" }} />
                  <span style={{ color: "#111827" }}>
                    <b>Ngày khởi hành:</b>{" "}
                    <span style={{ color: "#1d4ed8", fontWeight: 800 }}>
                      {selectedDepartureDate ? dayjs(selectedDepartureDate).format("DD-MM-YYYY") : "Chưa chọn"}
                    </span>
                  </span>
                </div>

                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <ClockCircleOutlined style={{ color: "#6b7280" }} />
                  <span style={{ color: "#111827" }}>
                    <b>Thời gian:</b>{" "}
                    <span style={{ color: "#1d4ed8", fontWeight: 800 }}>
                      {(() => {
                        const days =
                          (tour as any)?.duration_days ??
                          (tour as any)?.durationDays ??
                          (tour as any)?.duration_ ??
                          null;
                        if (!days || Number(days) <= 0) return "Chưa cập nhật";
                        const d = Number(days);
                        return `${d}N${Math.max(0, d - 1)}Đ`;
                      })()}
                    </span>
                  </span>
                </div>

                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <UsergroupAddOutlined style={{ color: "#6b7280" }} />
                  <span style={{ color: "#111827" }}>
                    <b>Số chỗ còn:</b>{" "}
                    <span style={{ color: "#1d4ed8", fontWeight: 800 }}>
                      {getSlotsForSelectedDate() ?? "—"}
                    </span>
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <Button block onClick={() => setScheduleModalOpen(true)}>
                  Ngày khác
                </Button>
                <Button
                  type="primary"
                  block
                  onClick={handleBookNow}
                  style={{
                    background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                    borderColor: "#dc2626",
                    fontWeight: 800,
                    boxShadow: "0 8px 18px rgba(220, 38, 38, 0.35)",
                  }}
                >
                  Đặt ngay
                </Button>
              </div>

              <Button block style={{ marginTop: 10 }}>
                Liên hệ tư vấn
              </Button>

              {/* MÔ TẢ TOUR ĐƯỢC CHUYỂN LÊN ĐÂY */}
              <Divider />

              <div className="tour-description-sidebar">
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>MÔ TẢ</h3>
                <p style={{ color: '#4b5563', lineHeight: '1.6', fontSize: '14px', margin: 0 }}>
                  {tour.description}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTENT */}
      <div className="tour-detail-container">
        <div>
          {/* QUICK INFO */}
          <div className="tour-detail-quick-info">
            <div className="info-card">
              <CalendarOutlined />
              <div>
                <p>Thời gian</p>
                <b>
                  {(() => {
                    const days =
                      (tour as any)?.duration_days ??
                      (tour as any)?.durationDays ??
                      (tour as any)?.duration_ ??
                      null;
                    if (!days || Number(days) <= 0) return "Chưa cập nhật";
                    return `${Number(days)} ngày`;
                  })()}
                </b>
                <b>{durationDays ? `${durationDays} ngày` : "Chưa cập nhật"}</b>
              </div>
            </div>

            <div className="info-card">
              <DollarOutlined />
              <div>
                <p>Giá từ</p>
                <b style={{ color: "#d90429" }}>
                  {getPriceForDate(selectedDepartureDate || defaultDepartureDate || "").toLocaleString()}đ / khách
                </b>
              </div>
            </div>

            
          </div>

        
          <Divider />

          {tour.schedule?.length > 0 && (
            <section className="detail-section">
              <h2>Lịch trình</h2>

              {tour.schedule.map((item, index) => (
                <div key={index} className="schedule-item">
                  <div className="schedule-day">Ngày {item.day}</div>

                  <div className="schedule-content">
                    <h3>{item.title}</h3>
                    <ul>
                      {item.activities?.map((act, i) => (
                        <li key={i}>
                          <CheckCircleOutlined /> {act}
                        </li>
                      ))}
                    </ul>
                    {(() => {
                      const day = item as any;
                      const lunch = day.lunch_restaurant_id?.name;
                      const dinner = day.dinner_restaurant_id?.name;
                      if (!lunch && !dinner) return null;
                      return (
                        <div style={{ marginTop: 10, fontSize: 14, color: '#555' }}>
                          {lunch ? (
                            <div>
                              <b>Buổi trưa:</b> {lunch}
                            </div>
                          ) : null}
                          {dinner ? (
                            <div>
                              <b>Buổi tối:</b> {dinner}
                            </div>
                          ) : null}
                        </div>
                      );
                    })()}
                    {Array.isArray((item as any).ticket_ids) && (item as any).ticket_ids.length > 0 ? (
                      <div style={{ marginTop: 10, fontSize: 14, color: '#555' }}>
                        <b>Vé:</b>{' '}
                        {(item as any).ticket_ids
                          .map((tk: any) => {
                            if (typeof tk === 'object' && tk?.name) {
                              const mode =
                                tk.application_mode === 'included_in_tour' ? ' (bao gồm)' : ' (mua thêm)';
                              return `${tk.name}${tk.ticket_type ? ` — ${tk.ticket_type}` : ''}${mode}`;
                            }
                            return String(tk);
                          })
                          .join('; ')}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </section>
          )}
        </div>

        <div style={{ position: "sticky", top: 100, height: "fit-content" }}>
          <div
            style={{
              borderRadius: 14,
              border: "1px solid #eef2f7",
              background: "#ffffff",
              padding: 16,
              boxShadow: "0 6px 18px rgba(15, 23, 42, 0.06)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 900, color: "#0f172a" }}>Đánh giá tour</div>
                <div style={{ marginTop: 2, color: "#64748b", fontSize: 13, fontWeight: 600 }}>
                  Tổng quan từ khách đã trải nghiệm
                </div>
              </div>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "#e6f4ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <StarFilled style={{ color: "#1677ff", fontSize: 18 }} />
              </div>
            </div>

            <Divider style={{ margin: "12px 0" }} />

            {(() => {
              const avg = Number((tour as any)?.rating?.average ?? 0);
              const count = Number((tour as any)?.rating?.totalReviews ?? 0);
              const has = count > 0 && avg > 0;
              return (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ fontSize: 40, fontWeight: 900, lineHeight: 1, color: "#0f172a" }}>
                      {has ? avg.toFixed(1) : "0.0"}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <Rate disabled allowHalf value={has ? avg : 0} />
                      <div style={{ color: "#64748b", fontSize: 13, fontWeight: 700 }}>
                        {count > 0 ? `${count} lượt đánh giá` : "Chưa có đánh giá"}
                      </div>
                    </div>
                  </div>

                  <Button
                    block
                    type="primary"
                    style={{ marginTop: 14, fontWeight: 900 }}
                    loading={loadingEligibility}
                    onClick={() => {
                      if (!eligibleBookingId) {
                        // khách vãng lai vẫn đánh giá được
                      }
                      setReviewModalOpen(true);
                    }}
                  >
                    Đánh giá tour
                  </Button>
                  {!localStorage.getItem("token") ? (
                    <div style={{ marginTop: 8, color: "#94a3b8", fontSize: 12 }}>
                      Bạn có thể đánh giá nhanh (khách vãng lai) hoặc đăng nhập để liên kết với booking.
                    </div>
                  ) : null}
                </>
              );
            })()}
          </div>
        </div>
      </div>

      <Modal
        title="Lịch khởi hành"
        open={scheduleModalOpen}
        onCancel={() => setScheduleModalOpen(false)}
        onOk={() => setScheduleModalOpen(false)}
        okText="Xong"
        cancelText="Đóng"
        width={820}
      >
        <div className="schedule-picker">
          <div className="schedule-months">
            <div className="schedule-months__title">Chọn tháng</div>
            <div className="schedule-months__list">
              {monthKeys.map((m) => {
                const label = `${Number(m.slice(5, 7))}/${m.slice(0, 4)}`;
                return (
                  <button
                    key={m}
                    type="button"
                    className={`schedule-month-btn ${activeMonth === m ? "is-active" : ""}`}
                    onClick={() => setActiveMonth(m)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="schedule-cal">
            {(() => {
              const { start, cells } = buildMonthGrid(activeMonth);
              const title = `THÁNG ${start.format("M/YYYY")}`;
              const idx = monthKeys.indexOf(activeMonth);
              const canPrev = idx > 0;
              const canNext = idx >= 0 && idx < monthKeys.length - 1;

              return (
                <>
                  <div className="schedule-cal__header">
                    <button
                      type="button"
                      className="schedule-cal__nav"
                      disabled={!canPrev}
                      onClick={() => canPrev && setActiveMonth(monthKeys[idx - 1])}
                      aria-label="Prev month"
                    >
                      <LeftOutlined />
                    </button>
                    <div className="schedule-cal__title">{title}</div>
                    <button
                      type="button"
                      className="schedule-cal__nav"
                      disabled={!canNext}
                      onClick={() => canNext && setActiveMonth(monthKeys[idx + 1])}
                      aria-label="Next month"
                    >
                      <RightOutlined />
                    </button>
                  </div>

                  <div className="schedule-dow">
                    <div>T2</div>
                    <div>T3</div>
                    <div>T4</div>
                    <div>T5</div>
                    <div>T6</div>
                    <div style={{ color: "#dc2626" }}>T7</div>
                    <div style={{ color: "#dc2626" }}>CN</div>
                  </div>

                  <div className="schedule-grid">
                    {cells.map(({ date, inMonth }, i) => {
                      const dateStr = date.format("YYYY-MM-DD");
                      const s = scheduleMap.get(dateStr);
                      const selectable = inMonth && !!s && s.slots > 0;
                      const selected = selectedDepartureDate === dateStr;
                      const showPrice = inMonth && !!s;

                      return (
                        <div
                          key={`${dateStr}-${i}`}
                          className={[
                            "schedule-cell",
                            !inMonth ? "is-muted" : "",
                            selectable ? "is-selectable" : "",
                            selected ? "is-selected" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          onClick={() => {
                            if (selectable) setSelectedDepartureDate(dateStr);
                          }}
                        >
                          <div className="schedule-cell__day">{inMonth ? date.date() : ""}</div>
                          {showPrice ? <div className="schedule-cell__price">{formatPriceK(getPriceForDate(dateStr))}</div> : <div />}
                        </div>
                      );
                    })}
                  </div>

                  <div className="schedule-note">Quý khách vui lòng chọn ngày phù hợp</div>
                </>
              );
            })()}
          </div>
        </div>

        <div style={{ marginTop: 12, color: "#4b5563" }}>
          {selectedDepartureDate ? (
            <>Bạn đang chọn: <b>{dayjs(selectedDepartureDate).format("DD/MM/YYYY")}</b></>
          ) : (
            <>Vui lòng chọn một ngày có lịch khởi hành (còn chỗ).</>
          )}
        </div>
      </Modal>

      <Modal
        title="Đánh giá tour"
        open={reviewModalOpen}
        onCancel={() => setReviewModalOpen(false)}
        footer={null}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {!localStorage.getItem("token") ? (
            <div>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Tên của bạn (không bắt buộc)</div>
              <input
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="VD: Minh"
                style={{
                  width: "100%",
                  height: 40,
                  borderRadius: 10,
                  border: "1px solid #d9d9d9",
                  padding: "0 12px",
                  outline: "none",
                }}
              />
            </div>
          ) : null}
          <div>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Bạn đánh giá tour này bao nhiêu sao?</div>
            <Space size={10} wrap>
              {[1, 2, 3, 4, 5].map((n) => {
                const active = n <= tourStars;
                return (
                  <Button
                    key={n}
                    onClick={() => setTourStars(n)}
                    aria-label={`${n} sao`}
                    style={{
                      width: 54,
                      height: 40,
                      borderRadius: 10,
                      border: active ? "1px solid #f59e0b" : "1px solid #d9d9d9",
                      background: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 0,
                    }}
                  >
                    <StarFilled style={{ color: active ? "#f59e0b" : "#cbd5e1", fontSize: 18 }} />
                  </Button>
                );
              })}
            </Space>
          </div>

          {eligibleBookingId && localStorage.getItem("token") ? (
            <div>
              <div style={{ fontWeight: 800, marginBottom: 8 }}>Bạn có hài lòng với chuyến đi không?</div>
              <Radio.Group value={tourSatisfaction} onChange={(e) => setTourSatisfaction(e.target.value)} style={{ width: "100%" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
                  {[
                    { value: "very_satisfied", label: "Rất hài lòng", emoji: "😄" },
                    { value: "satisfied", label: "Hài lòng", emoji: "🙂" },
                    { value: "normal", label: "Bình thường", emoji: "😐" },
                    { value: "dissatisfied", label: "Không hài lòng", emoji: "😞" },
                  ].map((opt) => {
                    const selected = tourSatisfaction === (opt.value as any);
                    return (
                      <Radio.Button
                        key={opt.value}
                        value={opt.value}
                        style={{
                          height: 48,
                          borderRadius: 10,
                          border: selected ? "1px solid #1677ff" : "1px solid #d9d9d9",
                          background: selected ? "#e6f4ff" : "#fff",
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "0 14px",
                          fontWeight: 800,
                          color: selected ? "#0958d9" : "#111827",
                        }}
                      >
                        <span style={{ fontSize: 18, lineHeight: 1 }}>{opt.emoji}</span>
                        <span>{opt.label}</span>
                      </Radio.Button>
                    );
                  })}
                </div>
              </Radio.Group>
            </div>
          ) : null}

          <Button
            type="primary"
            block
            loading={submittingTourReview}
            onClick={async () => {
              setSubmittingTourReview(true);
              try {
                const tourId = (tour as any)?._id || (tour as any)?.id || id;
                if (!tourId) throw new Error("Thiếu tour id");

                if (eligibleBookingId && localStorage.getItem("token")) {
                  await axios.post(
                    `${API_V1}/tour-reviews`,
                    { booking_id: eligibleBookingId, stars: tourStars, satisfaction: tourSatisfaction },
                    getAuthHeader()
                  );
                } else {
                  await axios.post(`${API_V1}/tour-reviews/public`, {
                    tour_id: tourId,
                    stars: tourStars,
                    guest_name: guestName,
                  });
                }
                message.success("Đã gửi đánh giá tour");
                setReviewModalOpen(false);

                // refresh tour rating
                if (tourId) {
                  const data = await getTour(String(tourId));
                  if (data.data && typeof data.data === "object") {
                    if ("tour" in data.data) setTour((data.data as any).tour);
                    else setTour(data.data as any);
                  }
                }
                setEligibleBookingId(null);
              } catch (e: any) {
                message.error(e?.response?.data?.message || "Gửi đánh giá thất bại");
              } finally {
                setSubmittingTourReview(false);
              }
            }}
          >
            Gửi đánh giá
          </Button>
        </div>
      </Modal>

    </div>
  );
};

export default TourDetailPage;