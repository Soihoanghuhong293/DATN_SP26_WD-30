import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Button,
  Calendar,
  Card,
  Checkbox,
  Col,
  DatePicker,
  Divider,
  Empty,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Spin,
  Steps,
  Tag,
  Typography,
  message,
} from "antd";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import axios from "axios";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getTour } from "../services/api";
import type { ITour } from "../types/tour.types";
import { ArrowLeftOutlined } from "@ant-design/icons";
import "./styles/DepartureCalendar.css";
import { tourImagePlaceholder } from "../constants/tourImagePlaceholder";

type PassengerGender = "male" | "female" | "other";

type ScheduleTicketRef = {
  _id: string;
  name?: string;
  ticket_type?: string;
  application_mode?: "included_in_tour" | "optional_addon";
  price_adult?: number;
  price_child?: number;
  status?: string;
};

type BookingFormValues = {
  customerName: string;
  phone: string;
  email: string;
  address?: string;
  note?: string;
  paymentMethod: "full" | "deposit" | "later";
  optionalTicketIds?: string[];
  adultPassengers?: Array<{
    fullName?: string;
    gender?: PassengerGender;
    birthDate?: Dayjs;
    phone?: string;
  }>;
  childPassengers?: Array<{
    fullName?: string;
    gender?: PassengerGender;
    birthDate?: Dayjs;
    phone?: string;
  }>;
  termsAccepted: boolean;
  adults: number;
  children: number;
};

const { Title, Text } = Typography;

const normalizeDate = (dateVal: string) => {
  if (!dateVal) return "";
  const raw = String(dateVal).trim();
  if (!raw) return "";

  // ISO date-time
  if (raw.includes("T")) return raw.split("T")[0];

  // DD/MM/YYYY
  const slash = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    const dd = slash[1].padStart(2, "0");
    const mm = slash[2].padStart(2, "0");
    const yyyy = slash[3];
    return `${yyyy}-${mm}-${dd}`;
  }

  const d = dayjs(raw);
  return d.isValid() ? d.format("YYYY-MM-DD") : "";
};

const BookingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get("date");

  const [tour, setTour] = useState<ITour | null>(null);
  const [loadingTour, setLoadingTour] = useState(true);
  const [tourError, setTourError] = useState<string | null>(null);

  const [holidayRules, setHolidayRules] = useState<any[]>([]);
  const [loadingHolidayRules, setLoadingHolidayRules] = useState(false);
  const [bookedSlotsByDate, setBookedSlotsByDate] = useState<Record<string, number>>({});

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [calculatedAdultPrice, setCalculatedAdultPrice] = useState<number>(0);
  const [calculatedChildPrice, setCalculatedChildPrice] = useState<number>(0);
  const [loadingPrice, setLoadingPrice] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<BookingFormValues>();
  const watchedAdults = Form.useWatch("adults", form);
  const watchedChildren = Form.useWatch("children", form);
  const watchedCustomerName = Form.useWatch("customerName", form);
  const watchedPhone = Form.useWatch("phone", form);
  const watchedEmail = Form.useWatch("email", form);
  const watchedTermsAccepted = Form.useWatch("termsAccepted", form);
  const watchedPaymentMethod = Form.useWatch("paymentMethod", form);
  const watchedAdultPassengers = Form.useWatch("adultPassengers", form);
  const watchedChildPassengers = Form.useWatch("childPassengers", form);
  const watchedOptionalTicketIds = Form.useWatch("optionalTicketIds", form);
  const lastSlotsWarnRef = useRef<number | null>(null);

  const { includedTickets, optionalTickets } = useMemo(() => {
    const schedule = (tour as any)?.schedule || [];
    const byId = new Map<string, ScheduleTicketRef>();
    for (const day of schedule) {
      const ticks = (day as any)?.ticket_ids || [];
      for (const t of ticks) {
        if (!t || typeof t !== "object") continue;
        if ((t as ScheduleTicketRef).status && (t as ScheduleTicketRef).status !== "active") continue;
        const id = String((t as any)._id || (t as any).id || "");
        if (!id) continue;
        if (!byId.has(id)) {
          byId.set(id, {
            _id: id,
            name: (t as any).name,
            ticket_type: (t as any).ticket_type,
            application_mode: (t as any).application_mode,
            price_adult: Number((t as any).price_adult ?? 0),
            price_child: Number((t as any).price_child ?? 0),
            status: (t as any).status,
          });
        }
      }
    }
    const all = Array.from(byId.values());
    return {
      includedTickets: all.filter((x) => x.application_mode === "included_in_tour"),
      optionalTickets: all.filter((x) => x.application_mode === "optional_addon"),
    };
  }, [tour]);

  useEffect(() => {
    const fetchTourDetail = async () => {
      if (!id) {
        setTourError("Không tìm thấy ID tour");
        setLoadingTour(false);
        return;
      }
      try {
        setLoadingTour(true);
        const data = await getTour(id);
        if (data?.data && typeof data.data === "object") {
          if ("tour" in data.data) setTour((data.data as any).tour as ITour);
          else setTour(data.data as ITour);
        } else {
          setTourError("Không thể tải chi tiết tour");
        }
      } catch (err) {
        console.error(err);
        setTourError("Tải chi tiết tour thất bại");
      } finally {
        setLoadingTour(false);
      }
    };
    fetchTourDetail();
  }, [id]);

  useEffect(() => {
    const dateParam = searchParams.get("date");
    if (!dateParam || !tour) return;
    const isValid = dayjs(dateParam, "YYYY-MM-DD", true).isValid();
    if (!isValid) return;
    if (selectedDate === dateParam) return;
    handleDateSelect(dateParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, tour]);

  useEffect(() => {
    const fetchHolidayRules = async () => {
      setLoadingHolidayRules(true);
      try {
        const res = await axios.get("http://localhost:5000/api/v1/holiday-pricings");
        setHolidayRules(res.data?.data || []);
      } catch (err) {
        console.error("Lỗi khi tải giá ngày lễ:", err);
      } finally {
        setLoadingHolidayRules(false);
      }
    };
    fetchHolidayRules();
  }, []);

  useEffect(() => {
    const fetchBookedSlots = async () => {
      if (!tour) return;
      try {
        const tourId = (tour as any)?._id || (tour as any)?.id;
        if (!tourId) return;

        const res = await axios.get("http://localhost:5000/api/v1/bookings");
        const bookings = Array.isArray(res.data?.data) ? res.data.data : [];

        const grouped: Record<string, number> = {};
        bookings.forEach((b: any) => {
          if (!b) return;
          const bookingTourId = b?.tour_id?._id || b?.tour_id;
          if (String(bookingTourId) !== String(tourId)) return;
          if (b?.status === "cancelled") return;

          const dateStr = normalizeDate(String(b?.startDate || ""));
          if (!dateStr) return;

          const size = Number(b?.groupSize || 0);
          grouped[dateStr] = (grouped[dateStr] || 0) + (Number.isFinite(size) ? size : 0);
        });

        setBookedSlotsByDate(grouped);
      } catch (error) {
        console.error("Lỗi khi tải số chỗ đã đặt:", error);
        setBookedSlotsByDate({});
      }
    };

    fetchBookedSlots();
  }, [tour]);

  const departureSchedule = useMemo(() => (tour as any)?.departure_schedule || [], [tour]);

  const selectableDepartureDates = useMemo(() => {
    const map = new Map<string, number>();
    const arr = Array.isArray(departureSchedule) ? departureSchedule : [];
    for (const s of arr) {
      const dateStr = normalizeDate(String((s as any)?.date || ""));
      if (!dateStr) continue;
      const baseSlots = Number((s as any)?.slots ?? 0);
      const bookedSlots = Number(bookedSlotsByDate[dateStr] || 0);
      const remainingSlots = Math.max(0, baseSlots - bookedSlots);
      map.set(dateStr, remainingSlots);
    }
    return map;
  }, [departureSchedule, bookedSlotsByDate]);

  const availableSlotsForSelectedDate = useMemo(() => {
    if (!selectedDate) return null;
    const v = selectableDepartureDates.get(selectedDate);
    return typeof v === "number" ? v : null;
  }, [selectableDepartureDates, selectedDate]);

  const isSelectableDate = (dateStr: string) => {
    const slots = selectableDepartureDates.get(dateStr);
    return typeof slots === "number" && slots > 0;
  };

  const basePrices = useMemo(() => {
    const pricesArr = ((tour as any)?.prices || []) as any[];
    const getAmount = (x: any) => {
      const v = x?.amount ?? x?.price ?? x?.value;
      return typeof v === "number" ? v : Number(v || 0);
    };
    const adultItem =
      pricesArr.find((p) => String(p?.name || p?.title || "").toLowerCase().includes("người lớn")) || null;
    const childItem =
      pricesArr.find((p) => String(p?.name || p?.title || "").toLowerCase().includes("trẻ")) || null;

    const adult = adultItem ? getAmount(adultItem) : Number((tour as any)?.price || 0);
    const child = childItem ? getAmount(childItem) : Math.round(adult * 0.8);

    return { adult: Number(adult || 0), child: Number(child || 0) };
  }, [tour]);

  const getPriceForDate = (dateStr: string) => {
    const basePrice = (tour as any)?.price || 0;
    const targetTime = new Date(`${dateStr}T12:00:00Z`).getTime();

    const applicableRules = holidayRules.filter((rule) => {
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
      applicableRules.sort((a, b) => (b.priority || 0) - (a.priority || 0));
      const rule = applicableRules[0];
      if (rule.fixed_price) return rule.fixed_price;
      return basePrice * (rule.price_multiplier || 1);
    }
    return basePrice;
  };

  const calculatePriceForBase = async (dateStr: string, basePrice: number) => {
    try {
      const res = await axios.post("http://localhost:5000/api/v1/holiday-pricings/calculate", {
        tour_id: (tour as any)?._id || (tour as any)?.id,
        basePrice: basePrice || 0,
        departureDate: dateStr,
      });
      return Number(res.data?.data ?? basePrice ?? 0);
    } catch (error) {
      console.error("Lỗi khi tính giá:", error);
      return Number(basePrice || 0);
    }
  };

  const handleDateSelect = async (dateStr: string) => {
    setSelectedDate(dateStr);
    // optimistic update from frontend rules (adult uses tour.price, child uses ratio)
    const optimisticAdult = getPriceForDate(dateStr);
    const ratio = basePrices.adult > 0 ? basePrices.child / basePrices.adult : 0.8;
    setCalculatedAdultPrice(optimisticAdult);
    setCalculatedChildPrice(Math.round(optimisticAdult * ratio));

    setLoadingPrice(true);
    try {
      const [adult, child] = await Promise.all([
        calculatePriceForBase(dateStr, basePrices.adult || (tour as any)?.price || 0),
        calculatePriceForBase(dateStr, basePrices.child || Math.round(Number((tour as any)?.price || 0) * 0.8)),
      ]);
      setCalculatedAdultPrice(adult);
      setCalculatedChildPrice(child);
    } finally {
      setLoadingPrice(false);
    }
  };

  const totals = useMemo(() => {
    const adults = Number.isFinite(watchedAdults as any) ? Number(watchedAdults) : 1;
    const children = Number.isFinite(watchedChildren as any) ? Number(watchedChildren) : 0;
    const groupSize = Math.max(0, adults + children);
    const adultUnit = selectedDate ? calculatedAdultPrice : basePrices.adult || (tour as any)?.price || 0;
    const childUnit = selectedDate ? calculatedChildPrice : basePrices.child || Math.round(adultUnit * 0.8);
    const total = adults * adultUnit + children * childUnit;
    return { adults, children, groupSize, adultUnit, childUnit, total };
  }, [basePrices.adult, basePrices.child, calculatedAdultPrice, calculatedChildPrice, selectedDate, tour, watchedAdults, watchedChildren]);

  const ticketsAddonTotal = useMemo(() => {
    const adults = Number.isFinite(watchedAdults as any) ? Number(watchedAdults) : 1;
    const children = Number.isFinite(watchedChildren as any) ? Number(watchedChildren) : 0;
    const ids = Array.isArray(watchedOptionalTicketIds) ? watchedOptionalTicketIds : [];
    const ticketById = new Map(optionalTickets.map((t) => [t._id, t]));
    let sum = 0;
    for (const raw of ids) {
      const t = ticketById.get(String(raw));
      if (!t) continue;
      sum += adults * Number(t.price_adult || 0) + children * Number(t.price_child || 0);
    }
    return sum;
  }, [optionalTickets, watchedAdults, watchedChildren, watchedOptionalTicketIds]);

  const grandTotal = useMemo(() => Number(totals.total || 0) + Number(ticketsAddonTotal || 0), [totals.total, ticketsAddonTotal]);

  const submitButtonLabel = useMemo(() => {
    const adults = Number.isFinite(watchedAdults as any) ? Number(watchedAdults) : 0;
    const children = Number.isFinite(watchedChildren as any) ? Number(watchedChildren) : 0;

    const hasCore =
      !!String(watchedCustomerName || "").trim() &&
      !!String(watchedPhone || "").trim() &&
      !!String(watchedEmail || "").trim() &&
      !!watchedTermsAccepted &&
      !!selectedDate &&
      adults >= 1 &&
      children >= 0;

    const adultsFilled =
      Array.isArray(watchedAdultPassengers) &&
      watchedAdultPassengers.length === adults &&
      watchedAdultPassengers.every(
        (p: any) => !!String(p?.fullName || "").trim() && !!p?.gender && !!p?.birthDate && !!String(p?.phone || "").trim()
      );

    const childrenFilled =
      children <= 0
        ? true
        : Array.isArray(watchedChildPassengers) &&
          watchedChildPassengers.length === children &&
          watchedChildPassengers.every(
            (p: any) => !!String(p?.fullName || "").trim() && !!p?.gender && !!p?.birthDate
          );

    const hasErrors = form.getFieldsError().some((f) => (f.errors || []).length > 0);

    const ready = hasCore && adultsFilled && childrenFilled && !hasErrors;
    return ready ? "Đặt ngay" : "Nhập thông tin để đặt tour";
  }, [
    form,
    selectedDate,
    watchedAdults,
    watchedChildPassengers,
    watchedChildren,
    watchedCustomerName,
    watchedEmail,
    watchedPhone,
    watchedTermsAccepted,
    watchedAdultPassengers,
  ]);

  const fullCellRender = (value: Dayjs) => {
    const dateStr = value.format("YYYY-MM-DD");
    const schedule = departureSchedule.find((s: any) => normalizeDate(s.date) === dateStr);
    const hasSchedule = !!schedule;
    const remainingSlots = selectableDepartureDates.get(dateStr);
    const isAvailable = hasSchedule && typeof remainingSlots === "number" && remainingSlots > 0;
    const isSelected = selectedDate === dateStr;
    const displayPrice = hasSchedule ? getPriceForDate(dateStr) : 0;

    return (
      <div
        className={[
          "departure-cell",
          isAvailable ? "departure-cell--available" : "",
          isSelected ? "departure-cell--selected" : "",
          !hasSchedule ? "departure-cell--muted" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={(e) => {
          e.stopPropagation();
          if (isAvailable) handleDateSelect(dateStr);
        }}
        style={{ cursor: isAvailable ? "pointer" : "default" }}
      >
        <div className="departure-cell__day">{value.date()}</div>
        {hasSchedule ? (
          <>
            <div className="departure-cell__price">{Number(displayPrice || 0).toLocaleString("vi-VN")}đ</div>
            <div className={isAvailable ? "departure-cell__slots" : "departure-cell__slots departure-cell__slots--empty"}>
              {isAvailable
                ? `Còn ${typeof remainingSlots === "number" ? remainingSlots : schedule?.slots ?? 0}`
                : "Hết"}
            </div>
          </>
        ) : (
          <>
            <div className="departure-cell__price">&nbsp;</div>
            <div className="departure-cell__slots">&nbsp;</div>
          </>
        )}
      </div>
    );
  };

  const syncAdultPassengers = (adults: number) => {
    const current = form.getFieldValue("adultPassengers") || [];
    const next = Array.from({ length: Math.max(0, adults) }).map((_, idx) => current[idx] || {});
    form.setFieldsValue({ adultPassengers: next });
  };

  const syncChildPassengers = (children: number) => {
    const current = form.getFieldValue("childPassengers") || [];
    const next = Array.from({ length: Math.max(0, children) }).map((_, idx) => current[idx] || {});
    form.setFieldsValue({ childPassengers: next });
  };

  const getDepartureDay = () => {
    const d = selectedDate ? dayjs(selectedDate, "YYYY-MM-DD", true) : null;
    return d && d.isValid() ? d.startOf("day") : null;
  };

  const isAgeInRange = (birth: Dayjs | undefined, min: number, max: number) => {
    if (!birth) return false;
    const dep = getDepartureDay();
    const base = dep || dayjs().startOf("day");
    const age = base.diff(birth.startOf("day"), "year");
    return age >= min && age <= max;
  };

  const onSubmit = async (values: BookingFormValues) => {
    if (!tour) return;
    if (!selectedDate) return message.error("Vui lòng chọn ngày khởi hành trên lịch!");

    const groupSize = Math.max(0, (values.adults || 0) + (values.children || 0));
    if (groupSize <= 0) return message.error("Số lượng khách phải lớn hơn 0.");
    const slots = selectableDepartureDates.get(selectedDate);
    if (typeof slots === "number" && groupSize > slots) {
      return message.error(`Rất tiếc! Tour hiện tại số chỗ còn nhận chỉ còn: ${slots} chỗ.`);
    }

    if (values.paymentMethod === "deposit") {
      const today = dayjs().startOf("day");
      const selectedD = dayjs(selectedDate).startOf("day");
      if (selectedD.isSame(today) || selectedD.isBefore(today.add(1, "day"))) {
        return message.error("Không thể đặt cọc cho tour khởi hành trong ngày hôm nay hoặc ngày mai.");
      }
    }

    setSubmitting(true);
    try {
      const adultPassengers = Array.isArray(values.adultPassengers) ? values.adultPassengers : [];
      const childPassengers = Array.isArray(values.childPassengers) ? values.childPassengers : [];

      // Dữ liệu hiển thị trong `BookingDetail` là mảng `passengers`
      const passengers = [
        ...adultPassengers.slice(0, Number(values.adults || 0)).map((p) => ({
          name: p?.fullName || "",
          gender: p?.gender || "",
          type: "Người lớn",
          // Lưu dạng YYYY-MM-DD để hiển thị dễ (không phụ thuộc timezone)
          birthDate: p?.birthDate ? dayjs(p.birthDate).format("YYYY-MM-DD") : undefined,
          phone: p?.phone || "",
        })),
        ...childPassengers.slice(0, Number(values.children || 0)).map((p) => ({
          name: p?.fullName || "",
          gender: p?.gender || "",
          type: "Trẻ em",
          birthDate: p?.birthDate ? dayjs(p.birthDate).format("YYYY-MM-DD") : undefined,
          phone: p?.phone || "",
        })),
      ];

      const payload = {
        tour_id: (tour as any)?._id || (tour as any)?.id,
        customerName: values.customerName,
        phone: values.phone,
        email: values.email,
        startDate: selectedDate,
        groupSize,
        paymentMethod: values.paymentMethod || "full",
        customer_note: values.note,
        totalPrice: totals.total,
        optional_ticket_ids: Array.isArray(values.optionalTicketIds) ? values.optionalTicketIds : [],
        passengers,
      };

      const token = localStorage.getItem("token");
      const res = await axios.post("http://localhost:5000/api/v1/bookings", payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const created = (res.data && (res.data.data || res.data)) || null;
      const bookingId = created?._id || created?.id;

      message.success("Đặt tour thành công!");

      if (bookingId) {
        // Điều hướng sang trang thanh toán/hoàn tất để giả lập thanh toán
        navigate(`/booking/success/${bookingId}`);
      } else {
        // Fallback: quay lại trang chi tiết tour nếu không lấy được id
        navigate(`/tours/${(tour as any)?.id || id}`);
      }
    } catch (error: any) {
      const data = error?.response?.data;
      console.error("Lỗi đặt tour:", data || error);
      const msg = typeof data?.message === "string" ? data.message : "Lỗi khi đặt tour!";
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleManualSubmit = async () => {
    try {
      const values = await form.validateFields();
      await onSubmit(values);
    } catch (err: any) {
      const fields = err?.errorFields || [];
      console.warn("Manual booking submit failed:", fields);
      message.error("Vui lòng kiểm tra lại các trường bắt buộc trong form.");
    }
  };

  useEffect(() => {
    form.setFieldsValue({ adults: 1, children: 0, termsAccepted: false, paymentMethod: "full", optionalTicketIds: [] });
    syncAdultPassengers(1);
    syncChildPassengers(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!tour) return;
    form.setFieldsValue({ optionalTicketIds: [] });
  }, [tour, form]);

  // Đồng bộ số form khách với số chỗ khi chọn ngày hoặc slots thay đổi (tránh lỗi 16 form khi chỉ có 15 chỗ)
  useEffect(() => {
    if (!selectedDate) return;
    const slots = selectableDepartureDates.get(selectedDate);
    if (typeof slots !== "number") return;
    const adults = Number(form.getFieldValue("adults") || 0);
    const children = Number(form.getFieldValue("children") || 0);
    if (adults + children <= slots) return;
    const cappedAdults = Math.max(1, slots - children);
    const cappedChildren = Math.max(0, slots - cappedAdults);
    form.setFieldsValue({ adults: cappedAdults, children: cappedChildren });
    syncAdultPassengers(cappedAdults);
    syncChildPassengers(cappedChildren);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, selectableDepartureDates]);

  if (loadingTour) {
    return (
      <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
        <Spin size="large" spinning tip="Đang tải thông tin tour...">
          <div style={{ minHeight: 240 }} />
        </Spin>
      </div>
    );
  }

  if (tourError || !tour) {
    return (
      <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
        <Empty description={tourError || "Tour không tìm thấy"} />
        <div style={{ marginTop: 16 }}>
          <Button type="primary" onClick={() => navigate("/tours")}>
            Quay lại
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => {
            if (window.history.length > 1) navigate(-1);
            else navigate(`/tours/${(tour as any)?.id || id}`);
          }}
        >
          Quay lại
        </Button>
        <div />
      </div>
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <Title level={2} style={{ marginBottom: 6 }}>
          ĐẶT TOUR
        </Title>
        <Text type="secondary">Hoàn tất thông tin để đặt tour nhanh chóng</Text>
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
        <Steps
          current={0}
          items={[
            { title: "Nhập thông tin" },
            { title: "Thanh toán" },
            { title: "Hoàn tất" },
          ]}
          style={{ maxWidth: 700, width: "100%" }}
        />
      </div>

      <Form<BookingFormValues>
        form={form}
        layout="vertical"
        onFinish={onSubmit}
        onFinishFailed={({ errorFields }) => {
          console.warn('Booking form validation failed:', errorFields);
          message.error("Vui lòng kiểm tra lại các trường được đánh dấu đỏ trong form.");
        }}
        onValuesChange={(changed) => {
          if ("adults" in changed) {
            let adults = Number((changed as any).adults || 0);
            // Giới hạn theo số chỗ còn lại để tránh render dư form (ví dụ: 16 form khi chọn 15 khách)
            if (selectedDate) {
              const slots = selectableDepartureDates.get(selectedDate);
              const children = Number(form.getFieldValue("children") || 0);
              if (typeof slots === "number" && adults + children > slots) {
                adults = Math.max(1, slots - children);
                form.setFieldsValue({ adults });
              }
            }
            syncAdultPassengers(adults);
          }
          if ("children" in changed) {
            let children = Number((changed as any).children || 0);
            if (selectedDate) {
              const slots = selectableDepartureDates.get(selectedDate);
              const adults = Number(form.getFieldValue("adults") || 0);
              if (typeof slots === "number" && adults + children > slots) {
                children = Math.max(0, slots - adults);
                form.setFieldsValue({ children });
              }
            }
            syncChildPassengers(children);
          }
        }}
      >
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={16}>
            <Card style={{ borderRadius: 12 }}>
              <Title level={4} style={{ marginBottom: 8 }}>
                Thông tin liên lạc
              </Title>
              <Alert
                type="info"
                showIcon
                message="Đăng nhập để nhận ưu đãi, lịch trình và quản lý đơn hàng dễ dàng hơn!"
                style={{ marginBottom: 16 }}
              />
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Họ tên"
                    name="customerName"
                    rules={[
                      { required: true, message: "Vui lòng nhập họ tên!" },
                      { whitespace: true, message: "Họ tên không được chỉ chứa khoảng trắng!" },
                    ]}
                  >
                    <Input placeholder="Nhập họ tên" size="large" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Điện thoại"
                    name="phone"
                    rules={[
                      { required: true, message: "Vui lòng nhập số điện thoại!" },
                      { pattern: /^(\+84|0)[3|5|7|8|9][0-9]{8}$/, message: "Số điện thoại không hợp lệ!" },
                    ]}
                  >
                    <Input placeholder="Nhập số điện thoại" size="large" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Email"
                    name="email"
                    rules={[
                      { required: true, message: "Vui lòng nhập email!" },
                      { type: "email", message: "Email không hợp lệ!" },
                    ]}
                  >
                    <Input placeholder="Nhập email" size="large" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label="Địa chỉ" name="address">
                    <Input placeholder="Nhập địa chỉ" size="large" />
                  </Form.Item>
                </Col>
              </Row>

              <Divider style={{ margin: "12px 0 16px" }} />

              <Title level={4} style={{ marginBottom: 12 }}>
                Hành khách
              </Title>

              <Row gutter={16}>
                <Col xs={24} md={8}>
                  <Form.Item
                    label="Người lớn"
                    name="adults"
                    rules={[
                      { required: true },
                      {
                        validator: async (_, v) => {
                          if (!selectedDate) return;
                          const adults = Number(v || 0);
                          const children = Number(form.getFieldValue("children") || 0);
                          const slots = selectableDepartureDates.get(selectedDate);
                          if (typeof slots !== "number") return;
                          if (adults + children > slots) throw new Error(`Rất tiếc! Tour hiện tại số chỗ còn nhận chỉ còn: ${slots} chỗ.`);
                        },
                      },
                    ]}
                  >
                    <InputNumber
                      min={1}
                      style={{ width: "100%" }}
                      size="large"
                      onChange={(val) => {
                        const slots = availableSlotsForSelectedDate;
                        if (typeof slots !== "number") return;
                        const nextAdults = Number(val || 0);
                        const children = Number(form.getFieldValue("children") || 0);
                        const sum = nextAdults + children;
                        if (sum > slots) {
                          const allowedAdults = Math.max(1, slots - children);
                          form.setFieldsValue({ adults: allowedAdults });
                          if (lastSlotsWarnRef.current !== slots) {
                            message.error(`Rất tiếc! Tour hiện tại số chỗ còn nhận chỉ còn: ${slots} chỗ.`);
                            lastSlotsWarnRef.current = slots;
                          }
                        }
                      }}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item
                    label="Trẻ em (0-10 tuổi)"
                    name="children"
                    rules={[
                      {
                        validator: async (_, v) => {
                          if (!selectedDate) return;
                          const adults = Number(form.getFieldValue("adults") || 0);
                          const children = Number(v || 0);
                          const slots = selectableDepartureDates.get(selectedDate);
                          if (typeof slots !== "number") return;
                          if (adults + children > slots) throw new Error(`Rất tiếc! Tour hiện tại số chỗ còn nhận chỉ còn: ${slots} chỗ.`);
                        },
                      },
                    ]}
                  >
                    <InputNumber
                      min={0}
                      style={{ width: "100%" }}
                      size="large"
                      onChange={(val) => {
                        const slots = availableSlotsForSelectedDate;
                        if (typeof slots !== "number") return;
                        const adults = Number(form.getFieldValue("adults") || 0);
                        const nextChildren = Number(val || 0);
                        const sum = adults + nextChildren;
                        if (sum > slots) {
                          const allowedChildren = Math.max(0, slots - adults);
                          form.setFieldsValue({ children: allowedChildren });
                          if (lastSlotsWarnRef.current !== slots) {
                            message.error(`Rất tiếc! Tour hiện tại số chỗ còn nhận chỉ còn: ${slots} chỗ.`);
                            lastSlotsWarnRef.current = slots;
                          }
                        }
                      }}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <div style={{ marginBottom: 16 }}>
                <Text type="secondary">
                  Tổng số khách: <b>{totals.groupSize}</b>
                </Text>
                {typeof availableSlotsForSelectedDate === "number" && selectedDate && (
                  <div style={{ marginTop: 6 }}>
                    <Text type="secondary">
                      Số chỗ còn lại cho ngày <b>{dayjs(selectedDate).format("DD/MM/YYYY")}</b>:{" "}
                      <b style={{ color: totals.groupSize >= availableSlotsForSelectedDate ? "#d90429" : undefined }}>
                        {availableSlotsForSelectedDate}
                      </b>
                      {totals.groupSize >= availableSlotsForSelectedDate ? (
                        <span style={{ marginLeft: 8, color: "#d90429", fontWeight: 700 }}>
                          (Đã đạt tối đa)
                        </span>
                      ) : null}
                    </Text>
                  </div>
                )}
              </div>

              {!dateParam && (
                <>
                  <Title level={4} style={{ marginBottom: 12 }}>
                    Chọn ngày khởi hành
                  </Title>
                  <div className="departure-calendar" style={{ border: "1px solid #f0f0f0", borderRadius: 12, padding: 8 }}>
                    <Calendar
                      fullscreen={false}
                      fullCellRender={fullCellRender}
                      disabledDate={(current) => {
                        if (!current) return false;
                        const dateStr = current.format("YYYY-MM-DD");
                        return !isSelectableDate(dateStr);
                      }}
                    />
                  </div>

                  {selectedDate && (
                    <div style={{ marginTop: 12, padding: 12, background: "#e6f7ff", border: "1px solid #91d5ff", borderRadius: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                        <Text>
                          Ngày khởi hành: <b>{dayjs(selectedDate).format("DD/MM/YYYY")}</b>
                        </Text>
                        <Text>
                          Giá áp dụng:{" "}
                          <b style={{ color: "#f5222d" }}>
                            {loadingPrice ? "..." : `${Number(totals.adultUnit).toLocaleString("vi-VN")}đ / khách`}
                          </b>
                        </Text>
                        <Text>
                          Tổng tiền dự kiến:{" "}
                          <b style={{ color: "#f5222d" }}>
                            {loadingPrice ? "..." : `${Number(grandTotal).toLocaleString("vi-VN")}đ`}
                          </b>
                        </Text>
                      </div>
                    </div>
                  )}
                </>
              )}

              <Divider style={{ margin: "16px 0" }} />

              {(includedTickets.length > 0 || optionalTickets.length > 0) && (
                <div style={{ marginBottom: 20 }}>
                  <Title level={4} style={{ marginBottom: 12 }}>
                    Vé theo lịch trình
                  </Title>
                  <Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
                    Vé <b>đã bao gồm</b> trong giá tour; vé <b>mua thêm</b> được tính theo số người lớn và trẻ em đã chọn.
                  </Text>

                  {includedTickets.length > 0 && (
                    <Card size="small" style={{ borderRadius: 12, marginBottom: 12, background: "#f6ffed", borderColor: "#b7eb8f" }}>
                      <Text strong style={{ display: "block", marginBottom: 8 }}>
                        Đã bao gồm trong giá tour
                      </Text>
                      <ul style={{ margin: 0, paddingLeft: 20 }}>
                        {includedTickets.map((t) => (
                          <li key={t._id}>
                            <Text>
                              {t.name || "Vé"}{" "}
                              {t.ticket_type ? (
                                <Text type="secondary">({t.ticket_type})</Text>
                              ) : null}
                            </Text>
                          </li>
                        ))}
                      </ul>
                    </Card>
                  )}

                  {optionalTickets.length > 0 && (
                    <Card size="small" style={{ borderRadius: 12, marginBottom: 12 }}>
                      <Text strong style={{ display: "block", marginBottom: 8 }}>
                        Vé mua thêm (tùy chọn)
                      </Text>
                      <Form.Item name="optionalTicketIds" style={{ marginBottom: 0 }}>
                        <Checkbox.Group style={{ width: "100%" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {optionalTickets.map((t) => {
                              const pa = Number(t.price_adult || 0);
                              const pc = Number(t.price_child || 0);
                              return (
                                <Checkbox key={t._id} value={t._id}>
                                  <span>
                                    {t.name || "Vé"}{" "}
                                    {t.ticket_type ? <Text type="secondary">({t.ticket_type})</Text> : null}
                                    <Text type="secondary" style={{ marginLeft: 6 }}>
                                      — NL: {pa.toLocaleString("vi-VN")}₫ · TE: {pc.toLocaleString("vi-VN")}₫ / khách
                                    </Text>
                                  </span>
                                </Checkbox>
                              );
                            })}
                          </div>
                        </Checkbox.Group>
                      </Form.Item>
                    </Card>
                  )}
                </div>
              )}

              <Title level={4} style={{ marginBottom: 12 }}>
                Thông tin người lớn
              </Title>

              <Form.List name="adultPassengers">
                {(fields) => (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {fields.map((field, idx) => (
                      <Card key={field.key} size="small" style={{ borderRadius: 12 }}>
                        <Title level={5} style={{ margin: 0, marginBottom: 12 }}>
                          Người lớn {idx + 1}
                        </Title>
                        <Row gutter={16}>
                          <Col xs={24} md={10}>
                            <Form.Item label="Họ tên" name={[field.name, "fullName"]} rules={[{ required: true, message: "Nhập họ tên!" }]}>
                              <Input placeholder="Họ tên" />
                            </Form.Item>
                          </Col>
                          <Col xs={24} md={7}>
                            <Form.Item label="Giới tính" name={[field.name, "gender"]} rules={[{ required: true, message: "Chọn giới tính!" }]}>
                              <Select
                                placeholder="Chọn"
                                options={[
                                  { label: "Nam", value: "male" },
                                  { label: "Nữ", value: "female" },
                                  { label: "Khác", value: "other" },
                                ]}
                              />
                            </Form.Item>
                          </Col>
                          <Col xs={24} md={7}>
                            <Form.Item
                              label="Ngày sinh"
                              name={[field.name, "birthDate"]}
                              rules={[
                                { required: true, message: "Chọn ngày sinh!" },
                                {
                                  validator: async (_, v) => {
                                    if (!v) return;
                                    if (!isAgeInRange(v, 11, 120)) throw new Error("Người lớn phải trên 10 tuổi.");
                                  },
                                },
                              ]}
                            >
                              <DatePicker
                                style={{ width: "100%" }}
                                placeholder="dd/mm/yyyy"
                                format={["DD/MM/YYYY", "D/M/YYYY"]}
                                inputReadOnly={false}
                                disabledDate={(d) => !!d && d > dayjs().endOf("day")}
                              />
                            </Form.Item>
                          </Col>
                        </Row>

                        <Form.Item
                          label="SĐT khách"
                          name={[field.name, "phone"]}
                          rules={[
                            { required: true, message: "Vui lòng nhập SĐT!" },
                            { pattern: /^(\+84|0)[3|5|7|8|9][0-9]{8}$/, message: "Số điện thoại không hợp lệ!" },
                          ]}
                        >
                          <Input placeholder="09xxxxxxxx" />
                        </Form.Item>
                      </Card>
                    ))}
                  </div>
                )}
              </Form.List>

              {totals.children > 0 && (
                <>
                  <Divider style={{ margin: "16px 0" }} />
                  <Title level={4} style={{ marginBottom: 12 }}>
                    Thông tin trẻ em (0-10 tuổi)
                  </Title>

                  <Form.List name="childPassengers">
                    {(fields) => (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {fields.map((field, idx) => (
                          <Card key={field.key} size="small" style={{ borderRadius: 12 }}>
                            <Title level={5} style={{ margin: 0, marginBottom: 12 }}>
                              Trẻ em {idx + 1}
                            </Title>
                            <Row gutter={16}>
                              <Col xs={24} md={10}>
                                <Form.Item label="Họ tên" name={[field.name, "fullName"]} rules={[{ required: true, message: "Nhập họ tên!" }]}>
                                  <Input placeholder="Họ tên" />
                                </Form.Item>
                              </Col>
                              <Col xs={24} md={7}>
                                <Form.Item label="Giới tính" name={[field.name, "gender"]} rules={[{ required: true, message: "Chọn giới tính!" }]}>
                                  <Select
                                    placeholder="Chọn"
                                    options={[
                                      { label: "Nam", value: "male" },
                                      { label: "Nữ", value: "female" },
                                      { label: "Khác", value: "other" },
                                    ]}
                                  />
                                </Form.Item>
                              </Col>
                              <Col xs={24} md={7}>
                                <Form.Item
                                  label="Ngày sinh"
                                  name={[field.name, "birthDate"]}
                                  rules={[
                                    { required: true, message: "Chọn ngày sinh!" },
                                    {
                                      validator: async (_, v) => {
                                        if (!v) return;
                                        if (!isAgeInRange(v, 0, 10)) throw new Error("Trẻ em phải trong độ tuổi 0-10.");
                                      },
                                    },
                                  ]}
                                >
                                  <DatePicker
                                    style={{ width: "100%" }}
                                    placeholder="dd/mm/yyyy"
                                    format={["DD/MM/YYYY", "D/M/YYYY"]}
                                    inputReadOnly={false}
                                    disabledDate={(d) => !!d && d > dayjs().endOf("day")}
                                  />
                                </Form.Item>
                              </Col>
                            </Row>

                            <Form.Item
                              label="SĐT khách"
                              name={[field.name, "phone"]}
                              rules={[
                                {
                                  validator: async (_, v) => {
                                    if (!v) return;
                                    const value = String(v).trim();
                                    if (!value) return;
                                    const ok = /^(\+84|0)[3|5|7|8|9][0-9]{8}$/.test(value);
                                    if (!ok) throw new Error("Số điện thoại không hợp lệ!");
                                  },
                                },
                              ]}
                            >
                              <Input placeholder="09xxxxxxxx" />
                            </Form.Item>
                          </Card>
                        ))}
                      </div>
                    )}
                  </Form.List>
                </>
              )}

              <Divider style={{ margin: "16px 0" }} />

              <Title level={4} style={{ marginBottom: 12 }}>
                Ghi chú
              </Title>
              <Form.Item name="note">
                <Input.TextArea rows={4} placeholder="Vui lòng nhập nội dung lời nhắn bằng tiếng Anh hoặc tiếng Việt" />
              </Form.Item>
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            <Card style={{ borderRadius: 12 }}>
            <Title level={4} style={{ marginBottom: 12 }}>
              Tóm tắt chuyến đi
            </Title>

            <div style={{ display: "flex", gap: 12 }}>
              <img
                src={(tour as any)?.images?.[0] || tourImagePlaceholder(120, 80)}
                alt={(tour as any)?.name || "tour"}
                style={{ width: 120, height: 80, objectFit: "cover", borderRadius: 10 }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = tourImagePlaceholder(120, 80);
                }}
              />
              <div style={{ flex: 1 }}>
                <Text style={{ fontWeight: 700, display: "block" }}>{(tour as any)?.name}</Text>
                <Text type="secondary" style={{ display: "block" }}>
                  Mã tour: {(tour as any)?.code || (tour as any)?.id || id}
                </Text>
              </div>
            </div>

            <Divider />

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <Text>Ngày khởi hành</Text>
              <Text style={{ fontWeight: 700 }}>
                {selectedDate ? dayjs(selectedDate).format("DD/MM/YYYY") : "Chưa chọn"}
              </Text>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <Text>Số khách</Text>
              <Text style={{ fontWeight: 700 }}>{totals.groupSize}</Text>
            </div>

            <Divider style={{ margin: "12px 0" }} />

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <Text>Người lớn</Text>
              <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                <Text type="secondary" style={{ fontWeight: 700 }}>
                  {totals.adults} x
                </Text>
                <Text style={{ fontWeight: 800, color: "#f5222d" }}>
                  {Number(totals.adultUnit || 0).toLocaleString("vi-VN")} ₫
                </Text>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <Text>Trẻ em</Text>
              <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                <Text type="secondary" style={{ fontWeight: 700 }}>
                  {totals.children} x
                </Text>
                <Text style={{ fontWeight: 800, color: "#f5222d" }}>
                  {Number(totals.childUnit || 0).toLocaleString("vi-VN")} ₫
                </Text>
              </div>
            </div>

            {ticketsAddonTotal > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <Text>Phụ phí vé mua thêm</Text>
                <Text style={{ fontWeight: 800, color: "#f5222d" }}>
                  {Number(ticketsAddonTotal || 0).toLocaleString("vi-VN")} ₫
                </Text>
              </div>
            )}

            <Divider style={{ margin: "12px 0" }} />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <Title level={5} style={{ margin: 0 }}>
                Tổng tiền
              </Title>
              <Title level={4} style={{ margin: 0, color: "#f5222d" }}>
                {Number(grandTotal || 0).toLocaleString("vi-VN")}đ
              </Title>
            </div>

            <Divider style={{ margin: "12px 0" }} />

            <Form.Item
              name="paymentMethod"
              label="Phương thức thanh toán"
              rules={[{ required: true, message: "Vui lòng chọn phương thức thanh toán!" }]}
              style={{ marginBottom: 12 }}
            >
              <Select
                size="large"
                options={[
                  { label: "Thanh toán toàn bộ (100%)", value: "full" },
                  { label: "Đặt cọc 30%", value: "deposit" },
                  { label: "Thanh toán sau", value: "later" },
                ]}
              />
            </Form.Item>

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <Text>Thanh toán ngay</Text>
              <Text strong style={{ color: "#f5222d" }}>
                {(() => {
                  const method = watchedPaymentMethod || "full";
                  if (method === "later") return "0đ";
                  const base = Number(grandTotal || 0);
                  const due = method === "deposit" ? Math.round(base * 0.3) : base;
                  return `${due.toLocaleString("vi-VN")}đ`;
                })()}
              </Text>
            </div>

            <Form.Item
              name="termsAccepted"
              valuePropName="checked"
              style={{ marginBottom: 10 }}
              rules={[
                {
                  validator: async (_, v) => {
                    if (v) return;
                    throw new Error("Vui lòng đồng ý với điều khoản.");
                  },
                },
              ]}
            >
              <Checkbox>
                Tôi đồng ý với{" "}
                <a href="#" onClick={(e) => e.preventDefault()}>
                  chính sách
                </a>{" "}
                bảo vệ dữ liệu cá nhân và các điều khoản.
              </Checkbox>
            </Form.Item>

            <Button
              type="primary"
              onClick={handleManualSubmit}
              block
              size="large"
              loading={submitting}
              disabled={loadingHolidayRules || loadingPrice}
              style={{ height: 48, fontWeight: 700 }}
            >
              {submitButtonLabel}
            </Button>

            <div style={{ marginTop: 10, textAlign: "center" }}>
              <Text type="secondary">Giá ngày lễ: {loadingHolidayRules ? "đang tải..." : "đã sẵn sàng"}</Text>
            </div>
          </Card>
          </Col>
        </Row>
      </Form>
    </div>
  );
};

export default BookingPage;
