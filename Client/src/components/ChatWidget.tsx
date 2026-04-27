import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MessageCircle, RotateCcw, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import type { ITour } from '../types/tour.types';
import { getTours } from '../services/api';
import { sendChatMessage, submitContactMessage, type ChatHistoryItem } from '../services/chat';
import './ChatWidget.css';

type ChatMode = 'ai' | 'contact';

type ChatTourCard = Pick<ITour, 'id' | 'name' | 'price' | 'images' | 'duration_days' | 'duration_'>;

type ChatMessage = {
  id: string;
  role: 'user' | 'bot';
  text: string;
  createdAt: number;
  source?: 'keyword' | 'ai' | 'local';
  tours?: ChatTourCard[];
  feedback?: 'up' | 'down';
};

const STORAGE_KEY = 'vigo_chat_widget_history_v1';

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function normalizeVi(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseBudget(text: string): { minPrice?: number; maxPrice?: number; budgetKey?: string } {
  const n = normalizeVi(text);
  if (/(duoi|<)\s*(\d+)\s*(tr|trieu|m|mtr)/.test(n) || /duoi\s*5\s*(tr|trieu)/.test(n)) {
    return { minPrice: 0, maxPrice: 5_000_000, budgetKey: 'under-5' };
  }
  if (/(gia re|re nhat|tiet kiem)/.test(n)) return { maxPrice: 5_000_000, budgetKey: 'under-5' };
  if (/(5\s*-\s*10|tu\s*5\s*den\s*10)\s*(tr|trieu)/.test(n)) return { minPrice: 5_000_000, maxPrice: 10_000_000, budgetKey: '5-10' };
  if (/(10\s*-\s*20|tu\s*10\s*den\s*20)\s*(tr|trieu)/.test(n)) return { minPrice: 10_000_000, maxPrice: 20_000_000, budgetKey: '10-20' };
  if (/(tren|>)\s*20\s*(tr|trieu)/.test(n)) return { minPrice: 20_000_000, budgetKey: 'over-20' };
  const under = n.match(/duoi\s*(\d+)\s*(tr|trieu)/);
  if (under) return { minPrice: 0, maxPrice: Number(under[1]) * 1_000_000, budgetKey: `under-${under[1]}` };
  return {};
}

function parseDurationDays(text: string): number | null {
  const n = normalizeVi(text);
  const m2 = n.match(/(\d+)\s*ngay\s*(\d+)\s*dem/);
  if (m2) return Math.max(1, Number(m2[1]));
  const m = n.match(/(\d+)\s*ngay/);
  if (m) return Math.max(1, Number(m[1]));
  const m3 = n.match(/(\d+)\s*n\s*(\d+)\s*d/);
  if (m3) return Math.max(1, Number(m3[1]));
  return null;
}

function extractDestinationKeyword(text: string): string | null {
  const raw = text.trim();
  const n = normalizeVi(raw);
  if (!n) return null;
  const m = raw.match(/tour\s+(.+)/i);
  if (m && m[1]?.trim()) return m[1].trim();
  if (/(ha long|da nang|phu quoc|da lat|nha trang|hoi an|sapa|sa pa|hue|quy nhon)/.test(n)) return raw;
  return null;
}

function isTourSearchIntent(text: string): boolean {
  const n = normalizeVi(text);
  return /(tour|goi y|tu van|ngan sach|duoi\s*\d+|gia re|ngay\s*\d+|dem|thang\s*\d+)/.test(n);
}

function isGenericNonDestinationQuery(text: string): boolean {
  const n = normalizeVi(text);
  // If the part after "tour ..." is not a destination but a type/feature query, don't treat it as search keyword.
  return (
    /(gia re|tiet kiem|duoi\s*\d+|tren\s*\d+|ngan sach|tu van|theo so ngay|ngay|dem|gia dinh|tre em|huong dan dat|cach dat|dat tour)/.test(
      n
    )
  );
}

function isHowToBookIntent(text: string): boolean {
  const n = normalizeVi(text);
  return /(huong dan dat|cach dat|dat nhu the nao|quy trinh dat|dat tour)/.test(n);
}

function isDestinationConsultIntent(text: string): boolean {
  const n = normalizeVi(text);
  return /(tu van diem den|goi y diem den|di dau|di dau choi)/.test(n);
}

function isFamilyIntent(text: string): boolean {
  const n = normalizeVi(text);
  return /(gia dinh|tre em|be|em be|nguoi lon|bo me)/.test(n);
}

function extractToursFromGetToursResponse(payload: any): ITour[] {
  // API shapes observed across project:
  // - { data: ITour[] }
  // - { data: { tours: ITour[] } }
  // - { data: { data: { tours: ITour[] } } } (defensive)
  const direct = payload?.data;
  if (Array.isArray(direct)) return direct as ITour[];
  const tours1 = direct?.tours;
  if (Array.isArray(tours1)) return tours1 as ITour[];
  const tours2 = direct?.data?.tours;
  if (Array.isArray(tours2)) return tours2 as ITour[];
  return [];
}

function parseDepartureMonth(text: string, now = new Date()): { month: string; label: string } | null {
  const n = normalizeVi(text);
  const m = n.match(/(?:thang|th)\s*(\d{1,2})\b/) || n.match(/\bt\s*(\d{1,2})\b/);
  if (!m) return null;
  const mm = Math.max(1, Math.min(12, Number(m[1])));
  if (!mm) return null;
  const yyyy = now.getFullYear();
  const month = `${yyyy}-${String(mm).padStart(2, '0')}`;
  return { month, label: `tháng ${mm}` };
}

function parseBareMonthNumber(text: string, now = new Date()): { month: string; label: string } | null {
  const raw = String(text || '').trim();
  if (!/^\d{1,2}$/.test(raw)) return null;
  const mm = Math.max(1, Math.min(12, Number(raw)));
  if (!mm) return null;
  const yyyy = now.getFullYear();
  const month = `${yyyy}-${String(mm).padStart(2, '0')}`;
  return { month, label: `tháng ${mm}` };
}

function extractProvinceOrCity(text: string): string | null {
  const raw = text.trim();
  const n = normalizeVi(raw);
  if (!n) return null;

  const alias: Array<[RegExp, string]> = [
    [/\b(hcm|tphcm|tp hcm|ho chi minh|sai gon|saigon|sg)\b/i, 'TP. Hồ Chí Minh'],
    [/\b(ha noi|hanoi|hn)\b/i, 'Hà Nội'],
    [/\b(da nang|danang)\b/i, 'Đà Nẵng'],
  ];
  for (const [re, val] of alias) if (re.test(n)) return val;

  // Quick heuristic list (normalized) to avoid scanning huge JSON on client.
  const known = [
    'an giang','ba ria vung tau','bac lieu','bac giang','bac kan','bac ninh','ben tre','binh dinh','binh duong','binh phuoc','binh thuan',
    'ca mau','can tho','cao bang','dak lak','dak nong','dien bien','dong nai','dong thap','gia lai','ha giang','ha nam','ha tinh','hai duong',
    'hai phong','hau giang','hoa binh','hung yen','khanh hoa','kien giang','kon tum','lai chau','lam dong','lang son','lao cai','long an',
    'nam dinh','nghe an','ninh binh','ninh thuan','phu tho','phu yen','quang binh','quang nam','quang ngai','quang ninh','quang tri',
    'soc trang','son la','tay ninh','thai binh','thai nguyen','thanh hoa','tien giang','tra vinh','tuyen quang','vinh long','vinh phuc','yen bai',
    // popular destinations
    'hue','phu quoc','nha trang','da lat','ha long','hoi an','sapa','quy nhon','phan thiet','mui ne','moc chau'
  ];
  for (const k of known) {
    const re = new RegExp(`\\b${k.replace(/\\s+/g, '\\\\s+')}\\b`, 'i');
    if (re.test(n)) return raw;
  }
  return null;
}

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<ChatMode>('ai');

  const navigate = useNavigate();

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const stored = safeJsonParse<ChatMessage[]>(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(stored) ? stored : [];
  });
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<{ month: string; label: string } | null>(null);

  const hasAnyChat = messages.length > 0;

  const quickSuggestions = useMemo(
    () => [
      { id: 'cheap', label: 'Tour giá rẻ 💰', text: 'Tour giá rẻ dưới 5 triệu' },
      { id: 'days', label: 'Theo số ngày 📅', text: 'Gợi ý tour 3 ngày 2 đêm' },
      { id: 'dest', label: 'Tư vấn điểm đến 🌍', text: 'Tư vấn điểm đến phù hợp với ngân sách của tôi' },
      { id: 'family', label: 'Đi gia đình 👨‍👩‍👧', text: 'Gợi ý tour đi gia đình' },
      { id: 'book', label: 'Đặt tour ✈️', text: 'Hướng dẫn đặt tour' },
    ],
    []
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    if (!isOpen) return;
    const el = messagesRef.current;
    if (!el) return;
    queueMicrotask(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    });
  }, [isOpen, messages.length, mode]);

  const pushMessage = (msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  };

  const resetChat = () => {
    setMessages([]);
    setMode('ai');
    setSelectedProvince(null);
    setSelectedMonth(null);
  };

  const setFeedback = (messageId: string, feedback: 'up' | 'down') => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, feedback: m.feedback === feedback ? undefined : feedback } : m))
    );
  };

  const openToursPrefilled = (opts: { search?: string; budget?: string; date?: string; month?: string }) => {
    const params = new URLSearchParams();
    if (opts.search) params.set('search', opts.search);
    if (opts.budget) params.set('budget', opts.budget);
    if (opts.date) params.set('date', opts.date);
    if (opts.month) params.set('month', opts.month);
    navigate(`/tours${params.toString() ? `?${params.toString()}` : ''}`);
  };

  const buildTourCardsFromInstances = (instances: ITour[], durationDays?: number | null): ChatTourCard[] => {
    let list = instances;
    if (durationDays && durationDays > 0) {
      list = list.filter((t) => Number((t as any)?.duration_days ?? (t as any)?.duration_ ?? 0) === durationDays);
    }
    return list.slice(0, 3).map((t) => ({
      id: t.id,
      name: t.name,
      price: t.price,
      images: t.images,
      duration_days: (t as any).duration_days,
      duration_: (t as any).duration_,
    }));
  };

  const handleSend = async (rawText?: string) => {
    const text = (rawText ?? input).trim();
    if (!text || sending) return;
    setMode('ai');
    setInput('');
    setSending(true);

    const now = Date.now();
    pushMessage({ id: `u_${now}`, role: 'user', text, createdAt: now });

    try {
      const historyForApi: ChatHistoryItem[] = messages
        .slice(-10)
        .map(
          (m): ChatHistoryItem => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.text,
          })
        )
        .filter((h) => h.content && h.content.trim().length > 0);

      // Remember province/city and month to support multi-step filtering
      const provinceFromText = extractProvinceOrCity(text);
      if (provinceFromText) setSelectedProvince(provinceFromText);
      let monthFromText = parseDepartureMonth(text);
      // If user already selected a province, allow just "6" => tháng 6
      if (!monthFromText && (provinceFromText || selectedProvince)) {
        monthFromText = parseBareMonthNumber(text);
      }
      if (monthFromText) setSelectedMonth(monthFromText);

      // Province-only flow: user picks destination first -> suggest tours now + ask month
      // Only trigger when this message contains a province/city and user hasn't provided month yet.
      if (provinceFromText && !monthFromText && !selectedMonth) {
        const budget = parseBudget(text);
        const durationDays = parseDurationDays(text);

        const tourRes = await getTours({
          page: 1,
          limit: 30,
          search: provinceFromText,
          minPrice: budget.minPrice,
          maxPrice: budget.maxPrice,
        });

        let instances = extractToursFromGetToursResponse(tourRes as any);
        instances = [...instances].sort((a: any, b: any) => Number(a?.price ?? 0) - Number(b?.price ?? 0));
        const cards = buildTourCardsFromInstances(instances, durationDays);

        pushMessage({
          id: `b_${Date.now()}`,
          role: 'bot',
          createdAt: Date.now(),
          source: 'local',
          text: cards.length
            ? `Mình gợi ý vài tour “${provinceFromText}” bên dưới. Bạn dự kiến đi tháng mấy để mình lọc đúng lịch khởi hành cho bạn ạ?`
            : `Hiện tại mình chưa thấy tour “${provinceFromText}” trong hệ thống. Bạn dự kiến đi tháng mấy (ví dụ “tháng 6”) hoặc muốn mình gợi ý điểm đến tương tự ạ?`,
          tours: cards.length ? cards : undefined,
        });

        openToursPrefilled({ search: provinceFromText, budget: budget.budgetKey });
        setSending(false);
        return;
      }

      // 0) "Đặt tour ✈️" / hướng dẫn đặt: ưu tiên trả lời hướng dẫn (không fetch tour)
      if (isHowToBookIntent(text)) {
        const res = await sendChatMessage(text, historyForApi);
        const responseText =
          res.data?.data?.response || res.data?.message || 'Mình chưa nhận được phản hồi. Bạn thử lại nhé.';
        pushMessage({
          id: `b_${Date.now()}`,
          role: 'bot',
          createdAt: Date.now(),
          source: res.data?.data?.source,
          text: responseText,
        });
        setSending(false);
        return;
      }

      // Province + Month flow: MUST show tours in that province/month, else explicitly tell "no tours"
      const p = provinceFromText || selectedProvince;
      const m = monthFromText || selectedMonth;
      if (p && m) {
        const budget = parseBudget(text);
        const durationDays = parseDurationDays(text);

        const tourRes = await getTours({
          page: 1,
          limit: 50,
          search: p,
          minPrice: budget.minPrice,
          maxPrice: budget.maxPrice,
          departureMonth: m.month,
        });

        let instances = extractToursFromGetToursResponse(tourRes as any);
        instances = [...instances].sort((a: any, b: any) => Number(a?.price ?? 0) - Number(b?.price ?? 0));
        const cards = buildTourCardsFromInstances(instances, durationDays);

        if (!cards.length) {
          pushMessage({
            id: `b_${Date.now()}`,
            role: 'bot',
            createdAt: Date.now(),
            source: 'local',
            text:
              `Hiện tại mình chưa có tour “${p}” khởi hành trong ${m.label}.\n` +
              `Bạn muốn mình gợi ý tháng khác (ví dụ: “tháng 6”) hay gợi ý điểm đến tương tự ạ?`,
          });
          setSending(false);
          return;
        }

        pushMessage({
          id: `b_${Date.now()}`,
          role: 'bot',
          createdAt: Date.now(),
          source: 'local',
          text: `Mình gợi ý vài tour “${p}” khởi hành trong ${m.label} bên dưới. Bạn bấm vào card để xem chi tiết/đặt tour nhé.`,
          tours: cards,
        });

        openToursPrefilled({
          search: p,
          month: m.month,
          budget: budget.budgetKey,
        });

        setSending(false);
        return;
      }

      // 1) "Tư vấn điểm đến 🌍": hỏi thông tin để tư vấn sát hơn + gợi ý thao tác
      if (isDestinationConsultIntent(text)) {
        pushMessage({
          id: `b_${Date.now()}`,
          role: 'bot',
          createdAt: Date.now(),
          source: 'local',
          text:
            'Để mình tư vấn điểm đến sát nhất, bạn cho mình 3 thông tin nhé:\n' +
            '1) Ngân sách/khách (ví dụ: dưới 5 triệu, 5-10 triệu)\n' +
            '2) Số ngày đi (ví dụ: 3N2Đ)\n' +
            '3) Tháng khởi hành (ví dụ: tháng 5)\n\n' +
            'Bạn có thể trả lời theo mẫu: “10 triệu, 3N2Đ, tháng 5”.',
        });
        setSending(false);
        return;
      }

      if (isTourSearchIntent(text)) {
        const n = normalizeVi(text);
        const destCandidate = extractDestinationKeyword(text);
        const dest =
          isGenericNonDestinationQuery(text) ? null : isFamilyIntent(text) && !destCandidate ? null : destCandidate;
        const budget = parseBudget(text);
        const durationDays = parseDurationDays(text);

        const tourRes = await getTours({
          page: 1,
          limit: 20,
          search: dest || undefined,
          minPrice: budget.minPrice,
          maxPrice: budget.maxPrice,
        });

        let instances = extractToursFromGetToursResponse(tourRes as any);
        // Ensure deterministic: sort by price asc for "giá rẻ"
        instances = [...instances].sort((a: any, b: any) => Number(a?.price ?? 0) - Number(b?.price ?? 0));

        let cards = buildTourCardsFromInstances(instances, durationDays);

        // Fallback for "dưới 5 triệu": if none, suggest cheapest available
        if (!cards.length && budget.budgetKey === 'under-5') {
          const fallbackRes = await getTours({
            page: 1,
            limit: 20,
            search: dest || undefined,
          });
          let fallbackInstances = extractToursFromGetToursResponse(fallbackRes as any);
          fallbackInstances = [...fallbackInstances].sort((a: any, b: any) => Number(a?.price ?? 0) - Number(b?.price ?? 0));
          cards = buildTourCardsFromInstances(fallbackInstances, durationDays);
        }

        pushMessage({
          id: `b_${Date.now()}`,
          role: 'bot',
          createdAt: Date.now(),
          source: 'local',
          text: (() => {
            if (!cards.length) {
              if (budget.budgetKey === 'under-5') {
                return (
                  'Hiện tại mình chưa thấy tour dưới 5 triệu phù hợp.\n' +
                  'Mình có thể gợi ý theo 2 cách:\n' +
                  '- Bạn cho mình điểm đến + tháng đi để mình tìm đúng tour đang có giá tốt.\n' +
                  '- Hoặc bạn tăng nhẹ ngân sách (5–10 triệu) để có nhiều lựa chọn hơn.'
                );
              }
              return 'Mình chưa thấy tour khớp điều kiện này. Bạn thử đổi điểm đến hoặc nới ngân sách giúp mình nhé.';
            }
            if (isFamilyIntent(text)) {
              return (
                'Mình gợi ý một số tour phù hợp đi gia đình bên dưới.\n' +
                'Bạn cho mình biết: số người lớn + số bé + bé bao nhiêu tuổi để mình tư vấn lịch/giá phù hợp nhất nhé.'
              );
            }
            if (durationDays && durationDays > 0) {
              return `Mình gợi ý tour khoảng ${durationDays} ngày bên dưới. Bạn bấm vào card để xem chi tiết/đặt tour nhé.`;
            }
            if (budget.maxPrice || budget.minPrice) {
              return budget.budgetKey === 'under-5'
                ? 'Hiện chưa có đủ tour dưới 5 triệu, mình gợi ý một số tour có giá tốt nhất hiện có bên dưới. Bạn bấm vào card để xem chi tiết/đặt tour nhé.'
                : 'Mình đã lọc tour theo ngân sách của bạn. Bạn bấm vào card để xem chi tiết/đặt tour nhé.';
            }
            return 'Mình gợi ý vài tour phù hợp bên dưới. Bạn bấm vào card để xem chi tiết/đặt tour nhé.';
          })(),
          tours: cards.length ? cards : undefined,
        });

        openToursPrefilled({
          search: dest || undefined,
          budget:
            budget.budgetKey === 'under-5'
              ? 'under-5'
              : budget.budgetKey === '5-10'
                ? '5-10'
                : budget.budgetKey === '10-20'
                  ? '10-20'
                  : budget.budgetKey === 'over-20'
                    ? 'over-20'
                    : undefined,
        });

        setSending(false);
        return;
      }

      const res = await sendChatMessage(text, historyForApi);
      const responseText = res.data?.data?.response || res.data?.message || 'Mình chưa nhận được phản hồi. Bạn thử lại nhé.';
      const source = res.data?.data?.source;
      const isFallback = /khong thuoc pham vi|tổng đài|0364902031/i.test(responseText);

      pushMessage({
        id: `b_${Date.now()}`,
        role: 'bot',
        createdAt: Date.now(),
        source,
        text: isFallback
          ? responseText +
            '\n\nNếu bạn muốn, mình có thể chuyển bạn sang tư vấn viên hoặc bạn để lại thông tin liên hệ ngay tại đây.'
          : responseText,
      });
    } catch (err: any) {
      pushMessage({
        id: `b_${Date.now()}`,
        role: 'bot',
        createdAt: Date.now(),
        source: 'local',
        text: 'Xin lỗi, mình đang gặp lỗi kết nối. Bạn có thể thử lại hoặc bấm “Liên hệ tư vấn viên” để được hỗ trợ ngay.',
      });
    } finally {
      setSending(false);
    }
  };

  // Form offline
  const [offlineForm, setOfflineForm] = useState({ name: '', phone: '', content: '' });
  const [offlineSubmitting, setOfflineSubmitting] = useState(false);
  const [offlineSuccess, setOfflineSuccess] = useState(false);

  const handleOfflineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { name, phone, content } = offlineForm;
    if (!name.trim() || !phone.trim() || !content.trim()) return;

    setOfflineSubmitting(true);
    try {
      const res = await submitContactMessage({ name: name.trim(), phone: phone.trim(), content: content.trim() });
      if (res.data?.success) {
        setOfflineSuccess(true);
        setOfflineForm({ name: '', phone: '', content: '' });
      } else {
        alert(res.data?.message || 'Gửi thất bại');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gửi thất bại. Vui lòng thử lại hoặc gọi 0364902031.');
    } finally {
      setOfflineSubmitting(false);
    }
  };

  return (
    <>
      {/* Nút floating */}
      <button
        className="chat-widget-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Đóng chat' : 'Mở chat'}
      >
        <MessageCircle size={26} color="white" strokeWidth={2} />
        <span className="chat-widget-online-dot chat-status-offline" />
      </button>

      {/* Khung chat */}
      {isOpen && (
        <div className="chat-panel">
          {/* Header */}
          <div className="chat-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="chat-header-avatar">
                <MessageCircle size={22} />
              </div>
              <div>
                <div className="chat-header-title">Hỗ trợ khách hàng</div>
                <div className="chat-header-status">
                  <span className="chat-status-dot chat-status-offline" />
                  Tiếp nhận tin nhắn
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                className="chat-header-icon-btn"
                onClick={() => resetChat()}
                title="Reset chat"
                aria-label="Reset chat"
              >
                <RotateCcw size={18} />
              </button>
              <button className="chat-header-close" onClick={() => setIsOpen(false)} aria-label="Đóng chat">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Vùng tin nhắn */}
          <div className="chat-messages" ref={messagesRef}>
            {mode === 'ai' ? (
              <>
                {!hasAnyChat && (
                  <div className="chat-welcome">
                    <p className="chat-welcome-text">
                      Bạn muốn tìm tour theo điểm đến/ngân sách/thời gian? Chọn nhanh một gợi ý bên dưới để bắt đầu.
                    </p>
                    <div className="chat-quick-replies">
                      {quickSuggestions.map((s) => (
                        <button key={s.id} className="chat-quick-reply" onClick={() => handleSend(s.text)}>
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((m) => (
                  <div key={m.id} className={`chat-message ${m.role === 'bot' ? 'bot' : 'user'}`}>
                    <div className="chat-bubble">
                      <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>

                      {m.role === 'bot' && Array.isArray(m.tours) && m.tours.length > 0 && (
                        <div className="chat-tour-cards">
                          {m.tours.map((t) => (
                            <Link key={t.id} to={`/tours/${t.id}`} className="chat-tour-card">
                              <img
                                className="chat-tour-card-img"
                                src={t.images?.[0] || 'https://via.placeholder.com/300x200?text=Tour'}
                                alt={t.name}
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src =
                                    'https://via.placeholder.com/300x200?text=Tour';
                                }}
                              />
                              <div className="chat-tour-card-body">
                                <div className="chat-tour-card-title">{t.name}</div>
                                <div className="chat-tour-card-meta">
                                  <span>{(t.duration_days ?? t.duration_ ?? '-') + ' ngày'}</span>
                                  <span className="chat-tour-card-dot">•</span>
                                  <span className="chat-tour-card-price">{Number(t.price || 0).toLocaleString()}đ</span>
                                </div>
                                <div className="chat-tour-card-cta">Xem chi tiết</div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}

                      {m.role === 'bot' && (
                        <div className="chat-message-actions">
                          <button
                            className={`chat-feedback-btn ${m.feedback === 'up' ? 'is-active' : ''}`}
                            onClick={() => setFeedback(m.id, 'up')}
                            aria-label="Hữu ích"
                            title="Hữu ích"
                          >
                            <ThumbsUp size={16} />
                          </button>
                          <button
                            className={`chat-feedback-btn ${m.feedback === 'down' ? 'is-active' : ''}`}
                            onClick={() => setFeedback(m.id, 'down')}
                            aria-label="Không hữu ích"
                            title="Không hữu ích"
                          >
                            <ThumbsDown size={16} />
                          </button>
                          <button
                            className="chat-escalate-btn"
                            onClick={() => {
                              setMode('contact');
                              setOfflineSuccess(false);
                            }}
                            title="Liên hệ tư vấn viên"
                          >
                            Liên hệ tư vấn viên
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {sending && (
                  <div className="chat-message bot">
                    <div className="chat-bubble">Đang trả lời...</div>
                  </div>
                )}
              </>
            ) : (
              <div className="chat-welcome chat-offline-form">
                {offlineSuccess ? (
                  <div className="chat-offline-success">
                    <p className="chat-welcome-text">✓ Gửi tin nhắn thành công!</p>
                    <p style={{ fontSize: 13, color: '#64748b', marginTop: 8 }}>
                      Chúng tôi sẽ liên hệ sớm nhất. Trong lúc chờ, bạn có thể gọi{' '}
                      <a href="tel:0364902031" style={{ fontWeight: 700 }}>
                        0364902031
                      </a>
                      .
                    </p>
                    <button className="chat-secondary-btn" onClick={() => setMode('ai')}>
                      Quay lại chat AI
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="chat-welcome-text">Vui lòng để lại tin nhắn, chúng tôi sẽ liên hệ sớm nhất:</p>
                    <form onSubmit={handleOfflineSubmit} className="chat-offline-fields">
                      <input
                        type="text"
                        placeholder="Họ và tên *"
                        value={offlineForm.name}
                        onChange={(e) => setOfflineForm((f) => ({ ...f, name: e.target.value }))}
                        required
                      />
                      <input
                        type="tel"
                        placeholder="Số điện thoại *"
                        value={offlineForm.phone}
                        onChange={(e) => setOfflineForm((f) => ({ ...f, phone: e.target.value }))}
                        required
                      />
                      <textarea
                        placeholder="Nội dung câu hỏi *"
                        rows={3}
                        value={offlineForm.content}
                        onChange={(e) => setOfflineForm((f) => ({ ...f, content: e.target.value }))}
                        required
                      />
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button type="button" className="chat-secondary-btn" onClick={() => setMode('ai')}>
                          Quay lại
                        </button>
                        <button type="submit" className="chat-offline-submit" disabled={offlineSubmitting}>
                          {offlineSubmitting ? 'Đang gửi...' : 'Gửi tin nhắn'}
                        </button>
                      </div>
                    </form>
                  </>
                )}
              </div>
            )}
          </div>

          {mode === 'ai' && (
            <div className="chat-input-area">
              {!hasAnyChat && (
                <div className="chat-quick-replies chat-quick-replies-inline">
                  {quickSuggestions.map((s) => (
                    <button key={s.id} className="chat-quick-reply" onClick={() => handleSend(s.text)}>
                      {s.label}
                    </button>
                  ))}
                </div>
              )}

              <div className="chat-input-wrapper">
                <input
                  className="chat-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  disabled={sending}
                />
                <button className="chat-send-btn" onClick={() => handleSend()} disabled={sending || !input.trim()}>
                  Gửi
                </button>
              </div>
              <div className="chat-helper-links">
                <button
                  className="chat-helper-link"
                  onClick={() => openToursPrefilled({ budget: 'under-5' })}
                  type="button"
                >
                  Xem tour dưới 5 triệu
                </button>
                <button className="chat-helper-link" onClick={() => setMode('contact')} type="button">
                  Để lại tin nhắn
                </button>
                <a className="chat-helper-link" href="tel:0364902031">
                  Gọi tư vấn
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default ChatWidget;
