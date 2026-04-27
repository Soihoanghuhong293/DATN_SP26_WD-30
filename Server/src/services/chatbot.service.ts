import path from 'path';
import fs from 'fs';
import type { ChatbotIntent, KeywordMatchResult } from '../types/chatbot.types.js';

const DATA_DIR = path.join(process.cwd(), 'src', 'data');

type ChatHistoryItem = { role: 'user' | 'assistant'; content: string };

// Bảng chuyển đổi bỏ dấu tiếng Việt
const VIETNAMESE_MAP: Record<string, string> = {
  à: 'a', á: 'a', ạ: 'a', ả: 'a', ã: 'a', â: 'a', ầ: 'a', ấ: 'a', ậ: 'a', ẩ: 'a', ẫ: 'a', ă: 'a', ằ: 'a', ắ: 'a', ặ: 'a', ẳ: 'a', ẵ: 'a',
  è: 'e', é: 'e', ẹ: 'e', ẻ: 'e', ẽ: 'e', ê: 'e', ề: 'e', ế: 'e', ệ: 'e', ể: 'e', ễ: 'e',
  ì: 'i', í: 'i', ị: 'i', ỉ: 'i', ĩ: 'i',
  ò: 'o', ó: 'o', ọ: 'o', ỏ: 'o', õ: 'o', ô: 'o', ồ: 'o', ố: 'o', ộ: 'o', ổ: 'o', ỗ: 'o', ơ: 'o', ờ: 'o', ớ: 'o', ợ: 'o', ở: 'o', ỡ: 'o',
  ù: 'u', ú: 'u', ụ: 'u', ủ: 'u', ũ: 'u', ư: 'u', ừ: 'u', ứ: 'u', ự: 'u', ử: 'u', ữ: 'u',
  ỳ: 'y', ý: 'y', ỵ: 'y', ỷ: 'y', ỹ: 'y',
  đ: 'd',
};

/**
 * Bước 3: Chuẩn hóa text
 * - Chuyển về chữ thường
 * - Bỏ dấu tiếng Việt
 * - Loại bỏ ký tự đặc biệt, trim
 */
function removeVietnameseTones(str: string): string {
  return str
    .split('')
    .map((char) => VIETNAMESE_MAP[char.toLowerCase()] || char.toLowerCase())
    .join('');
}

function normalizeText(text: string): string {
  const trimmed = text.trim().toLowerCase();
  const noTone = removeVietnameseTones(trimmed);
  // Giữ lại chữ, số, khoảng trắng
  return noTone.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Load FAQ từ file JSON
 */
function loadFAQ(): ChatbotIntent[] {
  const faqPath = path.join(DATA_DIR, 'chatbot-faq.json');
  const raw = fs.readFileSync(faqPath, 'utf-8');
  return JSON.parse(raw) as ChatbotIntent[];
}

function loadContext(): string {
  const p = path.join(DATA_DIR, 'chatbot-context.md');
  try {
    return fs.readFileSync(p, 'utf-8').trim();
  } catch {
    return '';
  }
}

// Cache file loads (auto-refresh when file changes)
let FAQ_CACHE: ChatbotIntent[] | null = null;
let FAQ_MTIME_MS = 0;
let CONTEXT_CACHE = '';
let CONTEXT_MTIME_MS = 0;

function safeStatMtimeMs(p: string): number {
  try {
    return fs.statSync(p).mtimeMs;
  } catch {
    return 0;
  }
}

function getFAQCached(): ChatbotIntent[] {
  const faqPath = path.join(DATA_DIR, 'chatbot-faq.json');
  const m = safeStatMtimeMs(faqPath);
  if (!FAQ_CACHE || (m && m !== FAQ_MTIME_MS)) {
    FAQ_CACHE = loadFAQ();
    FAQ_MTIME_MS = m;
  }
  return FAQ_CACHE;
}

function getContextCached(): string {
  const ctxPath = path.join(DATA_DIR, 'chatbot-context.md');
  const m = safeStatMtimeMs(ctxPath);
  if (!CONTEXT_CACHE || (m && m !== CONTEXT_MTIME_MS)) {
    CONTEXT_CACHE = loadContext();
    CONTEXT_MTIME_MS = m;
  }
  return CONTEXT_CACHE;
}

/**
 * Bước 4 & 5: Thuật toán keyword matching + Output
 * - Kiểm tra từng intent
 * - Đếm số keyword xuất hiện trong câu
 * - Ưu tiên intent có nhiều keyword khớp nhất
 * - Keyword dài được ưu tiên hơn (tránh match sai)
 */
export function matchKeyword(userMessage: string): KeywordMatchResult {
  if (!userMessage || typeof userMessage !== 'string') {
    return { source: 'keyword', matched: false };
  }

  const normalizedInput = normalizeText(userMessage);
  if (!normalizedInput) {
    return { source: 'keyword', matched: false };
  }

  const intents = getFAQCached();
  let bestMatch: ChatbotIntent | null = null;
  let bestScore = 0;

  for (const intent of intents) {
    let score = 0;

    for (const keyword of intent.keywords) {
      const normalizedKeyword = normalizeText(keyword);
      if (!normalizedKeyword) continue;

      if (normalizedInput.includes(normalizedKeyword)) {
        // Ưu tiên keyword dài hơn
        score += normalizedKeyword.length;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = intent;
    }
  }

  if (bestMatch && bestScore > 0) {
    return {
      source: 'keyword',
      matched: true,
      response: bestMatch.response,
      intentId: bestMatch.intentId,
    };
  }

  return { source: 'keyword', matched: false };
}

// ========== PHẦN 4: AI FALLBACK ==========

const SYSTEM_PROMPT = `Bạn là trợ lý chatbot của website đặt tour du lịch (tour, vé máy bay, khách sạn).

PHẠM VI HỖ TRỢ: tour du lịch, vé máy bay, khách sạn, đặt tour, giá, thanh toán, chính sách, liên hệ.

KHI CÂU HỎI NGOÀI PHẠM VI (thời tiết, chính trị, y tế, cá nhân, v.v.) - trả lời ĐÚNG định dạng sau:

"Dạ, Em xin lỗi Quý khách, yêu cầu này không thuộc phạm vi dịch vụ (tour du lịch, vé máy bay, khách sạn).
Nếu Quý khách cần hỗ trợ du lịch, vui lòng cho Em:
- Điểm đến
- Tháng khởi hành
- Nơi xuất phát
Hoặc Quý khách có thể liên hệ tổng đài 0364902031 để được tư vấn nhanh ạ."

KHI CÂU HỎI THUỘC PHẠM VI: trả lời ngắn gọn, thân thiện, dưới 150 từ.`;

const DEFAULT_FALLBACK = `Dạ, Em xin lỗi Quý khách, yêu cầu này không thuộc phạm vi dịch vụ (tour du lịch, vé máy bay, khách sạn).
Nếu Quý khách cần hỗ trợ du lịch, vui lòng cho Em:
- Điểm đến
- Tháng khởi hành
- Nơi xuất phát
Hoặc Quý khách có thể liên hệ tổng đài 0364902031 để được tư vấn nhanh ạ.`;

function toHistoryMessages(history: unknown): ChatHistoryItem[] {
  if (!Array.isArray(history)) return [];
  const items: ChatHistoryItem[] = [];
  for (const h of history) {
    if (!h || typeof h !== 'object') continue;
    const role = (h as any).role;
    const content = (h as any).content;
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string') continue;
    const c = content.trim();
    if (!c) continue;
    items.push({ role, content: c.slice(0, 2000) });
  }
  return items.slice(-12);
}

/**
 * Gọi OpenAI API để trả lời khi không khớp keyword
 * Cần cấu hình OPENAI_API_KEY trong .env
 */
export async function callAIFallback(userMessage: string, history?: unknown): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return DEFAULT_FALLBACK;
  }

  try {
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const controller = new AbortController();
    const timeoutMs = Number(process.env.OPENAI_TIMEOUT_MS || 15000);
    const t = setTimeout(() => controller.abort(), timeoutMs);

    const context = getContextCached();
    const historyItems = toHistoryMessages(history);

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...(context ? [{ role: 'system', content: `CONTEXT (chỉ dùng để trả lời đúng dịch vụ):\n${context}` }] : []),
          ...historyItems,
          { role: 'user', content: userMessage },
        ],
        max_tokens: Number(process.env.OPENAI_MAX_TOKENS || 220),
        temperature: Number(process.env.OPENAI_TEMPERATURE || 0.5),
      }),
      signal: controller.signal,
    });
    clearTimeout(t);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('OpenAI API error:', err);
      return DEFAULT_FALLBACK;
    }

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data?.choices?.[0]?.message?.content?.trim();
    return content || DEFAULT_FALLBACK;
  } catch (err) {
    console.error('Chatbot AI error:', err);
    return DEFAULT_FALLBACK;
  }
}

/**
 * Xử lý tin nhắn: ưu tiên keyword, fallback AI
 */
export async function processMessage(userMessage: string): Promise<{
  response: string;
  source: 'keyword' | 'ai';
  intentId?: string;
}> {
  const keywordResult = matchKeyword(userMessage);
  if (keywordResult.matched && keywordResult.response) {
    return {
      response: keywordResult.response,
      source: 'keyword',
      intentId: keywordResult.intentId,
    };
  }

  const aiResponse = await callAIFallback(userMessage);
  return { response: aiResponse, source: 'ai' };
}

export async function processMessageWithHistory(
  userMessage: string,
  history?: unknown
): Promise<{
  response: string;
  source: 'keyword' | 'ai';
  intentId?: string;
}> {
  const keywordResult = matchKeyword(userMessage);
  if (keywordResult.matched && keywordResult.response) {
    return {
      response: keywordResult.response,
      source: 'keyword',
      intentId: keywordResult.intentId,
    };
  }

  const aiResponse = await callAIFallback(userMessage, history);
  return { response: aiResponse, source: 'ai' };
}
