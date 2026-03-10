import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import type { ChatbotIntent, KeywordMatchResult } from '../types/chatbot.types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  const faqPath = path.join(__dirname, '../data/chatbot-faq.json');
  const raw = fs.readFileSync(faqPath, 'utf-8');
  return JSON.parse(raw) as ChatbotIntent[];
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

  const intents = loadFAQ();
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

/**
 * Gọi OpenAI API để trả lời khi không khớp keyword
 * Cần cấu hình OPENAI_API_KEY trong .env
 */
export async function callAIFallback(userMessage: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return DEFAULT_FALLBACK;
  }

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 200,
        temperature: 0.6,
      }),
    });

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
