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
