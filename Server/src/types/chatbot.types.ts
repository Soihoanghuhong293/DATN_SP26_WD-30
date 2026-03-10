/**
 * Cấu trúc Intent/FAQ cho chatbot keyword matching
 * PHẦN 2: CẤU TRÚC DỮ LIỆU KEYWORD
 */
export interface ChatbotIntent {
  intentId: string;
  keywords: string[];
  response: string;
  category: 'general' | 'tour' | 'booking' | 'payment' | 'contact';
}

export interface KeywordMatchResult {
  matched: boolean;
  source: 'keyword';
  response?: string;
  intentId?: string;
}
