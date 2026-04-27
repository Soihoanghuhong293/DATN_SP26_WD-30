import axios from 'axios';

const API_URL = (import.meta as any)?.env?.VITE_API_URL || 'http://localhost:5000/api/v1';

export interface ChatResponse {
  success: boolean;
  data?: {
    response: string;
    source: 'keyword' | 'ai';
    intentId?: string;
  };
  message?: string;
}

export type ChatHistoryItem = { role: 'user' | 'assistant'; content: string };

export const sendChatMessage = (message: string, history?: ChatHistoryItem[]) => {
  return axios.post<ChatResponse>(`${API_URL}/chat`, { message, history });
};

export interface ContactMessagePayload {
  name: string;
  phone: string;
  content: string;
}

export interface ContactMessageResponse {
  success: boolean;
  message?: string;
}

export const submitContactMessage = (data: ContactMessagePayload) => {
  return axios.post<ContactMessageResponse>(`${API_URL}/contact-messages`, data);
};
