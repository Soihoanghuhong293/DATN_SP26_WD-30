import React, { useMemo, useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../components/styles/tourDetailU.css";
import {
  Spin,
  Empty,
  Button,
  Tag,
  Divider,
  Collapse,
  message,
  Modal,
  Rate,
} from "antd";
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  TeamOutlined,
  LeftOutlined,
  RightOutlined,
  ClockCircleOutlined,
  UsergroupAddOutlined,
  HeartOutlined,
  HeartFilled,
  EnvironmentOutlined,
  CoffeeOutlined,
  CarOutlined,
  GiftOutlined,
} from "@ant-design/icons";
import axios from "axios";
import dayjs from "dayjs";
import { addWishlistTour, getTour, getWishlistTourStatus, removeWishlistTour } from "../services/api";
import { getTourReviewsByTour, getTours } from "../services/api";
import { ITour } from "../types/tour.types";
import "./styles/TourDetail.css";
import "./styles/DepartureCalendar.css";
import "./styles/SchedulePicker.css";

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

function buildAttractionsFromSchedule(schedule: any[]): string {
  const rows = Array.isArray(schedule) ? schedule : [];

  const normalize = (s: string) =>
    String(s || "")
      .replace(/\s+/g, " ")
      .replace(/[“”"]/g, "")
      .trim();

  /** Chỉ giữ cụm giống tên riêng / tên địa điểm — không số, không ngoặc, không câu mô tả. */
  const isStrictPlaceLabel = (p: string) => {
    const t = normalize(p);
    if (t.length < 2 || t.length > 44) return false;
    if (/\d/.test(t)) return false;
    if (/[():;@#%&+=\[\]{}…]/.test(t)) return false;
    const w = t.split(/\s+/).filter(Boolean);
    if (w.length > 6) return false;
    if (!/[a-zA-ZÀ-ỹ]/i.test(t)) return false;
    const s = t.toLowerCase();
    const glue =
      /\b(xe|ô\s*tô|oto|hdv|hướng\s+dẫn|đoàn|quý\s+khách|khách\s+hàng|buffet|nhà\s+hàng|khách\s+sạn|xe\s+(đưa|đón|chở)|đưa\s+đoàn|đón\s+khách|sau\s+đó|tiếp\s+theo|một\s+trong|cùng\s+với|để\s+tự|vui\s+chơi|tự\s+do|thả\s+đèn|hoa\s+đăng|check-?in|check\s+in|cáp\s+treo|tắm\s+biển|\btắm\b|tham\s+quan|viếng\s+thăm|khám\s+phá|lên\s+xe|xuống\s+xe|nhận\s+phòng|trả\s+phòng|được|đã|sẽ|không|các|những|cho\s+đoàn|tại\s+đây|của|cùng|với|trong|ngoài|khi|nếu|theo|nhằm|nhờ|để\b|có\s+thể|sẽ\s+được|hotel|buffet|ăn\s+(trưa|tối|sáng))\b/i;
    if (glue.test(s)) return false;
    return true;
  };

  const isNonAttractionPlace = (p: string) => {
    const s = normalize(p).toLowerCase();
    if (!s || s.length < 2) return true;
    if (/\b(một trong những|nhất hành tinh|quyến rũ nhất|để tự do|để khách|quý khách|cho đoàn)\b/i.test(s)) return true;
    if (/^(sáng|trưa|chiều|tối)\s*\(/i.test(s)) return true;
    if (/^(đi\s+cáp|check-?\s*in|ăn\s+(trưa|tối|sáng|buffet))\b/i.test(s)) return true;
    if (/^\s*xe\b/i.test(s)) return true;
    if (/^\s*\(?\s*\d{1,2}:\d{2}/.test(s)) return true;
    if (/\bxe\s+(và|đưa|đón|chở|đưa đoàn)\b/i.test(s)) return true;
    if (/^\s*và\s+xe\b/i.test(s)) return true;

    const banned: RegExp[] = [
      /\bkhách sạn\b/i,
      /\bhotel\b/i,
      /\bđiểm hẹn\b/i,
      /\bđiểm đón\b/i,
      /\bđiểm trả\b/i,
      /\bđiểm tập trung\b/i,
      /\btrạm dừng\b/i,
      /\bnhà hàng\b/i,
      /\bquán ăn\b/i,
      /\băn trưa\b/i,
      /\băn tối\b/i,
      /\băn sáng\b/i,
      /\bnghỉ ngơi\b/i,
      /\bnhận phòng\b/i,
      /\btrả phòng\b/i,
      /\bbến xe\b/i,
      /\bga\b/i,
      /\bsân bay\b/i,
      /\bbến tàu\b/i,
      /\bcảng\b/i,
      /\btrên xe\b/i,
      /\bxe\s+(du lịch|đưa|đón|chở)\b/i,
      /\bhdv\s+(đưa|đón|chờ)\b/i,
      /\bquý khách\b/i,
      /\bsau đó\b/i,
      /\bđoàn\b.*\b(xe|ăn)\b/i,
      /\bthả đèn\b/i,
      /\bhoa đăng\b/i,
    ];
    if (banned.some((re) => re.test(s))) return true;
    if (/^(địa điểm|điểm|nơi|khu vực|trung tâm)\b/i.test(s)) return true;
    if (/^(ăn|nghỉ|ngủ|tự do|mua sắm|lên xe|xuống xe|trưa|tối|sáng)$/i.test(s)) return true;
    if (/^ngày\s*\d+$/i.test(s)) return true;

    return false;
  };

  /** Bỏ ghi chú ăn trong ngoặc: (Ăn: Trưa, Tối) */
  const stripMealNotes = (t: string) =>
    normalize(t).replace(/\(\s*Ăn\s*:[^)]*\)/gi, "").replace(/\(\s*ăn\s*:[^)]*\)/gi, "");

  /** Ngoặc có khung giờ: (08:00), (08:00, 11:30), (08:00 - 11:30) */
  const stripTimeParentheticals = (t: string) => {
    let s = normalize(t);
    let prev = "";
    while (s !== prev) {
      prev = s;
      s = s.replace(/\([^)]*\d{1,2}:\d{2}[^)]*\)/gi, "");
    }
    return normalize(s);
  };

  const cleanSlice = (raw: string) => {
    let s = stripMealNotes(raw);
    s = normalize(s);
    s = s.replace(/^\s*(?:NGÀY|Ngày)\s*\d+\s*:\s*/i, "");
    s = s.replace(/^[-–—:\s,.·•]+/, "").replace(/[-–—:\s,.·•]+$/, "");
    return normalize(s);
  };

  /** Rút còn tên địa điểm: bỏ giờ, ngoặc, động từ dẫn, đoạn “xe / HDV …”. */
  const polishPlaceCandidate = (raw: string): string | null => {
    let s = stripTimeParentheticals(cleanSlice(raw));
    if (!s) return null;
    s = s.replace(/^\s*(Sáng|Trưa|Chiều|Tối)\s*(\([^)]*\))?\s*[-:–—]?\s*/gi, "");
    s = stripTimeParentheticals(s);
    s = normalize(s);
    s = s.replace(
      /^(?:Tắm\s+biển|Tắm\s+|Tham\s+quan|Tham\s+viếng|Viếng\s+thăm|Viếng|Ghé\s+thăm|Ghé|Khám\s+phá|Khởi\s+hành|Check-?\s*in|Đi\s+cáp\s+treo|Đi\s+|Đến|Tới|Tại\s+đây)\s+/iu,
      ""
    );
    s = normalize(s);
    s = s.replace(/^\s*(?:\d{1,2}:\d{2}\s*(?:[-–,]\s*)?)+\s*/, "");
    s = normalize(
      s
        .replace(/\s*:\s*Xe\b[\s\S]*$/i, "")
        .replace(/\bXe\s+(và|đưa|đón|chở|đưa đoàn)\b[\s\S]*$/i, "")
    );
    const proseCut = s.search(
      /\b(một trong những|để tự do|để khách|quý khách|đoàn\s+du|cho đoàn|sau đó|tiếp theo|tham quan\s+(?:khu|di tích|danh lam))\b/i
    );
    if (proseCut >= 8) s = normalize(s.slice(0, proseCut).replace(/[-–—,;\s]+$/g, ""));
    s = normalize(s.replace(/^[-–—:;.\s]+/, "").replace(/[-–—:;.\s]+$/, ""));
    if (s.length > 44) s = normalize(s.slice(0, 42).replace(/\s+\S*$/g, ""));
    if (s.length < 2) return null;
    if (/^\s*xe\b/i.test(s) || /^\s*và\s+xe\b/i.test(s)) return null;
    if (/^\d{1,2}:\d{2}/.test(s)) return null;
    if (!isStrictPlaceLabel(s) || isNonAttractionPlace(s)) return null;
    return s;
  };

  /**
   * Tách theo: gạch ngang (có khoảng trắng), dấu giữa ·, bullet •, hoặc NGÀY n:
   */
  const splitRouteIntoNames = (text: string): string[] => {
    let t = stripTimeParentheticals(stripMealNotes(text));
    t = normalize(t);
    if (!t) return [];

    const dayBlocks = t.split(/\b(?:NGÀY|Ngày)\s*\d+\s*:/i).map((x) => cleanSlice(x)).filter(Boolean);
    const blocks = dayBlocks.length > 1 ? dayBlocks : [t];

    const parts: string[] = [];
    for (const block of blocks) {
      let subs = [cleanSlice(block)].filter(Boolean) as string[];
      subs = subs.flatMap((b) => b.split(/\s*[·•]\s*/).map(cleanSlice)).filter(Boolean);
      subs = subs.flatMap((b) => b.split(/\s+[-–—]\s+/).map(cleanSlice)).filter(Boolean);
      subs = subs.flatMap((b) => b.split(/,\s*(?=\()/).map(cleanSlice)).filter(Boolean);
      subs = subs.flatMap((b) => b.split(/,\s*(?=\d{1,2}:\d{2}\b)/).map(cleanSlice)).filter(Boolean);
      for (const sub of subs) {
        if (/^ngày\s*\d+$/i.test(sub)) continue;
        if (/^\d{1,2}:\d{2}(\s*[-–]\s*\d{1,2}:\d{2})?$/i.test(sub)) continue;
        if (sub.length >= 2) parts.push(sub);
      }
    }
    return parts;
  };

  /** Bỏ tên ngắn nếu đã có tên dài hơn chứa nó (vd "Bà Nà" khi đã có "Bà Nà Hills"). */
  const dropSubsumedNames = (names: string[]): string[] => {
    const lows = names.map((n) => n.toLowerCase());
    return names.filter((a, i) => {
      const la = lows[i];
      for (let j = 0; j < names.length; j++) {
        if (i === j) continue;
        const lb = lows[j];
        if (la.length >= lb.length) continue;
        if (lb === la || lb.startsWith(`${la} `) || lb.endsWith(` ${la}`) || lb.includes(` ${la} `)) {
          return false;
        }
      }
      return true;
    });
  };

  const collected: string[] = [];
  for (const day of rows) {
    const title = String(day?.title ?? "").trim();
    if (title) collected.push(...splitRouteIntoNames(title));

    const acts = Array.isArray(day?.activities) ? day.activities : [];
    for (const a of acts) {
      const raw = String(a ?? "").trim();
      if (raw) collected.push(...splitRouteIntoNames(raw));
    }
  }

  const refined = collected
    .flatMap((p) =>
      p.split(/,/g)
        .map((x) => cleanSlice(x))
        .filter(Boolean)
        .map((chunk) => polishPlaceCandidate(chunk))
        .filter((x): x is string => Boolean(x))
    );

  const seen = new Set<string>();
  const uniq: string[] = [];
  for (const p of refined) {
    const k = p.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    uniq.push(p);
  }

  const merged = dropSubsumedNames(uniq);
  if (!merged.length) return "Chưa cập nhật";
  const max = 8;
  const clipped = merged.slice(0, max);
  const line = clipped.join(", ");
  return merged.length > max ? `${line}, …` : line;
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
  const [wishlisted, setWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [approvedReviews, setApprovedReviews] = useState<any[]>([]);
  const [relatedTours, setRelatedTours] = useState<ITour[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [expandedScheduleKeys, setExpandedScheduleKeys] = useState<string[]>([]);
  const [hidePriceSidebar, setHidePriceSidebar] = useState(false);
  const relatedSectionRef = useRef<HTMLElement | null>(null);

  const normalizeGroupName = (name?: string) => {
    const n = String(name || "").trim();
    if (!n) return "";
    return n
      .replace(/\s*\(\s*\d{1,2}\/\d{1,2}\/\d{4}\s*\)\s*$/i, "")
      .replace(/\s*\(\s*copy\s*\)\s*$/i, "")
      .trim();
  };

  useEffect(() => {
    // Luon vao trang chi tiet tu dau trang, tranh giu vi tri cu (vd dang o muc danh gia)
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [id]);

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
    const token = localStorage.getItem("token");
    const tourId = (tour as any)?._id || (tour as any)?.id || id;
    if (!token || !tourId) {
      setWishlisted(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await getWishlistTourStatus(String(tourId));
        const isWishlisted = Boolean((res as any)?.data?.isWishlisted);
        if (!cancelled) setWishlisted(isWishlisted);
      } catch {
        if (!cancelled) setWishlisted(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, (tour as any)?._id]);

  // Fetch tours liên quan/gợi ý thêm (ưu tiên cùng category)
  useEffect(() => {
    const fetchRelated = async () => {
      const current = tour;
      const currentId = current?.id || (current as any)?._id || id;
      if (!currentId) return;

      try {
        setRelatedLoading(true);

        const normalizeText = (v: any) => String(v ?? "").trim().toLowerCase();

        const getTourLocationKey = (t: any) => {
          // support multiple backend field names
          const candidates = [
            t?.location,
            t?.destination,
            t?.province,
            t?.city,
            t?.start_location,
            t?.end_location,
            t?.place,
          ];
          const found = candidates.find((x) => normalizeText(x));
          return normalizeText(found);
        };

        const getTourServiceLevelKey = (t: any) => {
          const candidates = [
            t?.serviceLevel,
            t?.service_level,
            t?.service_level_name,
            t?.service_level_id?.name,
            t?.service_level_id,
          ];
          const found = candidates.find((x) => normalizeText(x));
          return normalizeText(found);
        };

        const pickUnique = (arr: ITour[]) => {
          const seen = new Set<string>();
          const out: ITour[] = [];
          const currentGroup = normalizeGroupName((current as any)?.name);

          for (const t of arr) {
            const tid = (t as any)?.id || (t as any)?._id;
            if (!tid) continue;
            const groupKey = normalizeGroupName((t as any)?.name);
            const key = groupKey || String(tid);

            // gom theo chương trình tour chính, tránh trùng nhiều trip cùng tên
            if (groupKey && currentGroup && groupKey === currentGroup) continue;
            if (!groupKey && key === String(currentId)) continue;
            if (seen.has(key)) continue;

            seen.add(key);
            out.push(t);
          }
          return out;
        };

        // Fetch a pool then rank by priority:
        // 1) same location 2) same serviceLevel 3) exclude current
        const poolRes = await getTours({ page: 1, limit: 200, status: "active" });
        const pool = pickUnique(Array.isArray(poolRes?.data) ? poolRes.data : []);

        const curLoc = getTourLocationKey(current);
        const curSvc = getTourServiceLevelKey(current);

        const scored = pool
          .map((t) => {
            const loc = getTourLocationKey(t as any);
            const svc = getTourServiceLevelKey(t as any);
            const sameLoc = !!curLoc && !!loc && curLoc === loc;
            const sameSvc = !!curSvc && !!svc && curSvc === svc;
            const score = (sameLoc ? 100 : 0) + (sameSvc ? 10 : 0);
            return { t, score };
          })
          .sort((a, b) => b.score - a.score);

        const top = scored
          .filter((x) => x.score > 0)
          .map((x) => x.t)
          .slice(0, 8);

        // Fallback if missing location/serviceLevel on data: use category match then latest tours
        if (top.length >= 4) {
          setRelatedTours(top);
          return;
        }

        const categoryId = (current as any)?.category_id?._id || (current as any)?.category_id;
        let fallback: ITour[] = [];
        if (categoryId) {
          const byCat = pool.filter((t: any) => {
            const cat = t?.category_id?._id || t?.category_id;
            return cat && String(cat) === String(categoryId);
          });
          fallback = byCat;
        }

        const merged = pickUnique([...top, ...fallback, ...pool]).slice(0, 8);
        setRelatedTours(merged);
      } catch (e) {
        setRelatedTours([]);
      } finally {
        setRelatedLoading(false);
      }
    };

    fetchRelated();
  }, [tour, id]);

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

  useEffect(() => {
    const fetchApprovedReviews = async () => {
      const tourId = String((tour as any)?._id || (tour as any)?.id || "").trim();
      if (!tourId) return;
      try {
        const res = await getTourReviewsByTour(tourId);
        setApprovedReviews(Array.isArray(res?.data) ? res.data : []);
      } catch {
        setApprovedReviews([]);
      }
    };
    fetchApprovedReviews();
  }, [tour?._id, tour?.id]);

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

  const hasUpcomingDeparture = useMemo(() => {
    const today = dayjs().startOf("day");
    return normalizedSchedule.some((s: any) => {
      const slots = Number(s?.slots ?? 0);
      const d = String(s?._date || "");
      if (!d) return false;
      return slots > 0 && (dayjs(d).isSame(today) || dayjs(d).isAfter(today));
    });
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

  const handleToggleWishlist = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      message.info("Vui lòng đăng nhập để dùng danh sách yêu thích");
      navigate("/login");
      return;
    }
    const tourId = (tour as any)?._id || (tour as any)?.id || id;
    if (!tourId) return;

    try {
      setWishlistLoading(true);
      if (wishlisted) {
        await removeWishlistTour(String(tourId));
        setWishlisted(false);
        message.success("Đã xoá khỏi danh sách yêu thích");
      } else {
        await addWishlistTour(String(tourId));
        setWishlisted(true);
        message.success("Đã thêm vào danh sách yêu thích");
      }
    } catch (err: any) {
      message.error(err?.response?.data?.message || "Không thể cập nhật yêu thích");
    } finally {
      setWishlistLoading(false);
    }
  };

  const handleGoToTour = (tourId: string) => {
    navigate(`/tours/${tourId}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const averageRating = Number((tour as any)?.rating?.average || 0);
  const totalReviews = Number((tour as any)?.rating?.total_reviews || approvedReviews.length || 0);
  const relatedToursDisplay = useMemo(() => relatedTours.slice(0, 3), [relatedTours]);

  const extraInfo = useMemo(() => {
    return {
      // Dựa trên lịch trình tour
      attractions: buildAttractionsFromSchedule((tour as any)?.schedule),

      // Mặc định cho tất cả tour
      cuisine: "Buffet sáng, Theo thực đơn, Đặc sản địa phương",
      suitableFor: "Người lớn tuổi, Cặp đôi, Gia đình nhiều thế hệ, Thanh niên, Trẻ em",
      bestTime: "Quanh năm",
      transport: "Xe du lịch",
      promotion: "Đã bao gồm ưu đãi trong giá tour",
    };
  }, [tour]);

  useEffect(() => {
    const el = relatedSectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setHidePriceSidebar(Boolean(entry?.isIntersecting));
      },
      { root: null, threshold: 0.06 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [relatedToursDisplay.length, relatedLoading]);



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

        <Button
          onClick={handleToggleWishlist}
          loading={wishlistLoading}
          icon={wishlisted ? <HeartFilled style={{ color: "#ef4444" }} /> : <HeartOutlined />}
        >
          {wishlisted ? "Đã yêu thích" : "Yêu thích"}
        </Button>
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
          <div className={`tour-detail-sidebar${hidePriceSidebar ? " is-hidden" : ""}`}>
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
                      {selectedDepartureDate
                        ? dayjs(selectedDepartureDate).format("DD-MM-YYYY")
                        : hasUpcomingDeparture
                          ? "Chưa chọn"
                          : "Không còn lịch"}
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
                      {(() => {
                        const slots = getSlotsForSelectedDate();
                        if (typeof slots === "number") return slots;
                        return hasUpcomingDeparture ? "—" : 0;
                      })()}
                    </span>
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <Button block onClick={() => setScheduleModalOpen(true)} disabled={!hasUpcomingDeparture}>
                  Ngày khác
                </Button>
                <Button
                  type="primary"
                  block
                  onClick={handleBookNow}
                  disabled={!hasUpcomingDeparture}
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
            </div>
          </div>
        </div>
      )}

      {/* CONTENT */}
      <div className="tour-detail-container">
        <div className="tour-detail-main">
          <Divider />

          {tour.schedule?.length > 0 && (
            <section className="detail-section">
              <h2>Lịch trình</h2>

              <Collapse
                bordered={false}
                className="tour-schedule-collapse"
                activeKey={expandedScheduleKeys}
                onChange={(keys) => setExpandedScheduleKeys(Array.isArray(keys) ? keys.map(String) : [String(keys)])}
                items={tour.schedule.map((item, index) => {
                  const key = String(index);
                  const isExpanded = expandedScheduleKeys.includes(key);
                  const preview = Array.isArray(item.activities) ? item.activities.slice(0, 2).join(" · ") : "";

                  return {
                    key,
                    label: (
                      <div className="tour-schedule-head">
                        <div className="tour-schedule-title">Ngày {item.day}: {item.title}</div>
                        {!isExpanded ? (
                          <div className="tour-schedule-preview">{preview || "Nhấn để xem chi tiết lịch trình..."}</div>
                        ) : null}
                      </div>
                    ),
                    children: (
                      <div className="schedule-content">
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
                    ),
                  };
                })}
              />
            </section>
          )}

          <section className="detail-section tour-review-section">
            <h2>Đánh giá tour</h2>

            <div className="tour-review-summary">
              <div className="tour-review-score">{averageRating.toFixed(1)}</div>
              <div>
                <Rate disabled allowHalf value={averageRating} />
                <div className="tour-review-count">{totalReviews} đánh giá đã duyệt</div>
              </div>
            </div>

            {approvedReviews.length > 0 ? (
              <div className="tour-review-list">
                {approvedReviews.map((review: any) => (
                  <div key={review?._id} className="tour-review-item">
                    <div className="tour-review-item-head">
                      <strong>{review?.user_id?.name || "Khách hàng"}</strong>
                      <span>{dayjs(review?.created_at).isValid() ? dayjs(review.created_at).format("DD/MM/YYYY") : ""}</span>
                    </div>
                    <Rate disabled value={Number(review?.rating || 0)} />
                    {review?.comment ? <p className="tour-review-comment">{review.comment}</p> : null}
                    {Number(review?.guide_rating || 0) > 0 ? (
                      <div className="tour-review-guide-rating">
                        HDV: <Rate disabled value={Number(review.guide_rating)} />
                      </div>
                    ) : null}
                    {Array.isArray(review?.images) && review.images.length > 0 ? (
                      <div className="tour-review-images">
                        {review.images.slice(0, 4).map((img: string, idx: number) => (
                          <img key={`${review?._id}-${idx}`} src={img} alt="review" />
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <Empty description="Chưa có đánh giá nào được duyệt cho tour này" />
            )}
          </section>

          <section className="tour-extra-info" aria-label="Thông tin thêm về chuyến đi">
            <h2 className="tour-extra-info__title">THÔNG TIN THÊM VỀ CHUYẾN ĐI</h2>
            <div className="tour-extra-info__grid">
              <div className="tour-extra-info__item">
                <div className="tour-extra-info__icon">
                  <EnvironmentOutlined />
                </div>
                <div className="tour-extra-info__heading">Điểm tham quan</div>
                <div className="tour-extra-info__text tour-extra-info__text--attractions">{extraInfo.attractions}</div>
              </div>

              <div className="tour-extra-info__item">
                <div className="tour-extra-info__icon">
                  <CoffeeOutlined />
                </div>
                <div className="tour-extra-info__heading">Ẩm thực</div>
                <div className="tour-extra-info__text">{extraInfo.cuisine}</div>
              </div>

              <div className="tour-extra-info__item">
                <div className="tour-extra-info__icon">
                  <TeamOutlined />
                </div>
                <div className="tour-extra-info__heading">Đối tượng thích hợp</div>
                <div className="tour-extra-info__text">{extraInfo.suitableFor}</div>
              </div>

              <div className="tour-extra-info__item">
                <div className="tour-extra-info__icon">
                  <ClockCircleOutlined />
                </div>
                <div className="tour-extra-info__heading">Thời gian lý tưởng</div>
                <div className="tour-extra-info__text">{extraInfo.bestTime}</div>
              </div>

              <div className="tour-extra-info__item">
                <div className="tour-extra-info__icon">
                  <CarOutlined />
                </div>
                <div className="tour-extra-info__heading">Phương tiện</div>
                <div className="tour-extra-info__text">{extraInfo.transport}</div>
              </div>

              <div className="tour-extra-info__item">
                <div className="tour-extra-info__icon">
                  <GiftOutlined />
                </div>
                <div className="tour-extra-info__heading">Khuyến mãi</div>
                <div className="tour-extra-info__text">{extraInfo.promotion}</div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* RELATED / CROSS-SELL - bottom horizontal */}
      {relatedLoading || relatedToursDisplay.length > 0 ? (
        <section ref={relatedSectionRef} className="tour-related tour-related--bottom" id="related-tours">
          <div className="tour-related__header">
            <h2 className="tour-related__title">CÁC CHƯƠNG TRÌNH KHÁC</h2>
          </div>

          {relatedLoading ? (
            <div className="tour-related__loading">
              <Spin />
            </div>
          ) : (
            <div className="tour-related__grid">
              {relatedToursDisplay.map((t) => {
                const tid = (t as any)?.id || (t as any)?._id;
                const img = Array.isArray((t as any)?.images) ? (t as any).images?.[0] : undefined;
                const name = (t as any)?.name || "Tour";
                const departureText =
                  (t as any)?.start_location ||
                  (t as any)?.location ||
                  (t as any)?.destination ||
                  (t as any)?.city ||
                  "Đang cập nhật";
                const codeText =
                  (t as any)?.code ||
                  (t as any)?.tour_code ||
                  (t as any)?.sku ||
                  String(tid || "").slice(-8).toUpperCase();
                const rawPrice = (t as any)?.price;
                const priceNum = rawPrice === null || rawPrice === undefined ? NaN : Number(rawPrice);
                const hasPrice = Number.isFinite(priceNum) && priceNum > 0;
                const days =
                  Number(
                    (t as any)?.duration_days ?? (t as any)?.durationDays ?? (t as any)?.duration_ ?? 0
                  ) || 0;

                return (
                  <button
                    key={String(tid)}
                    className="tour-related-card"
                    type="button"
                    onClick={() => tid && handleGoToTour(String(tid))}
                  >
                    <div className="tour-related-card__img">
                      {img ? (
                        <img src={img} alt={name} loading="lazy" />
                      ) : (
                        <div className="tour-related-card__img--empty" />
                      )}
                      <span className="tour-related-card__fav">
                        <HeartOutlined />
                      </span>
                    </div>
                    <div className="tour-related-card__body">
                      <div className="tour-related-card__name" title={name}>
                        {name}
                      </div>
                      <div className="tour-related-card__lines">
                        <div className="tour-related-card__line">Khởi hành: {departureText}</div>
                        <div className="tour-related-card__line">Mã chương trình: {codeText}{days > 0 ? ` (${days}N${Math.max(0, days - 1)}Đ)` : ""}</div>
                      </div>
                      <div className="tour-related-card__footer">
                        <div>
                          <div className="tour-related-card__label">Giá từ</div>
                          <span className="tour-related-card__price">
                            {hasPrice ? `${priceNum.toLocaleString("vi-VN")} đ` : "Liên hệ"}
                          </span>
                        </div>
                        <span className="tour-related-card__detail">Xem chi tiết →</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      ) : null}

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
                      const selectable =
                        inMonth &&
                        !!s &&
                        s.slots > 0 &&
                        (date.isSame(dayjs().startOf("day")) || date.isAfter(dayjs().startOf("day")));
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

    </div>
  );
};

export default TourDetailPage;