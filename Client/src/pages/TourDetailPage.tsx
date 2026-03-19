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
} from "@ant-design/icons";
import dayjs from "dayjs";
import { getTour } from "../services/api";
import { ITour } from "../types/tour.types";
import "./styles/TourDetail.css";
import "./styles/DepartureCalendar.css";
import "./styles/SchedulePicker.css";

const TourDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [tour, setTour] = useState<ITour | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [selectedDepartureDate, setSelectedDepartureDate] = useState<string | null>(null);

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

  const tourImages = useMemo(() => {
    const imgs = (tour?.images || []).filter(Boolean);
    return Array.isArray(imgs) ? imgs : [];
  }, [tour]);

  const departureSchedule = useMemo(() => (tour as any)?.departure_schedule || [], [tour]);

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
    const basePath = `/order/booking/${(tour as any)?.id || (tour as any)?._id || id}`;
    navigate(date ? `${basePath}?date=${encodeURIComponent(date)}` : basePath);
  };

  useEffect(() => {
    setActiveImageIndex(0);
  }, [id]);

  const handleGoBack = () => {
    navigate("/tours");
  };

  if (loading) {
    return (
      <div className="tour-detail-loading">
        <Spin size="large" tip="Đang tải thông tin tour..." />
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
                  {tour.price?.toLocaleString()}đ
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
              </div>
            </div>

            <div className="info-card">
              <DollarOutlined />
              <div>
                <p>Giá từ</p>
                <b style={{ color: "#d90429" }}>{tour.price?.toLocaleString()}đ / khách</b>
              </div>
            </div>

            <div className="info-card">
              <TeamOutlined />
              <div>
                <p>Hướng dẫn viên</p>
                <b>{tour.suppliers?.length || 0}</b>
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
                  </div>
                </div>
              ))}
            </section>
          )}
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
                          {showPrice ? <div className="schedule-cell__price">{formatPriceK(Number((tour as any)?.price || 0))}</div> : <div />}
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

    </div>
  );
};

export default TourDetailPage;