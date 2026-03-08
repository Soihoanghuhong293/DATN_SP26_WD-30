import { Request, Response } from 'express';
import { processMessage } from '../services/chatbot.service.js';

/**
 * POST /api/v1/chat
 * Body: { message: string }
 * Trả lời: keyword matching ưu tiên, fallback AI
 */
export const chat = async (req: Request, res: Response) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng gửi tin nhắn',
      });
    }

    const result = await processMessage(message);

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
