import { Request, Response } from 'express';
import { processMessageWithHistory } from '../services/chatbot.service.js';

/**
 * POST /api/v1/chat
 * Body: { message: string, history?: { role: 'user'|'assistant', content: string }[] }
 * Trả lời: keyword matching ưu tiên, fallback AI
 */
export const chat = async (req: Request, res: Response) => {
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng gửi tin nhắn',
      });
    }

    const result = await processMessageWithHistory(message, history);

    res.json({
      success: true,
      data: {
        response: result.response,
        source: result.source,
        intentId: result.intentId,
      },
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi xử lý tin nhắn',
    });
  }
};
