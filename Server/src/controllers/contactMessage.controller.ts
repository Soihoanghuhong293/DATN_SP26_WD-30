import { Request, Response } from 'express';
import ContactMessage from '../models/ContactMessage.js';

/**
 * POST /api/v1/contact-messages
 * Body: { name, phone, content }
 * Lưu tin nhắn từ form offline, status mặc định: unread
 */
export const createContactMessage = async (req: Request, res: Response) => {
  try {
    const { name, phone, content } = req.body;

    if (!name?.trim() || !phone?.trim() || !content?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ họ tên, số điện thoại và nội dung',
      });
    }

    const msg = await ContactMessage.create({
      name: name.trim(),
      phone: phone.trim(),
      content: content.trim(),
      status: 'unread',
    });

    res.status(201).json({
      success: true,
      message: 'Gửi tin nhắn thành công. Chúng tôi sẽ liên hệ sớm nhất!',
      data: { id: msg._id },
    });
  } catch (error) {
    console.error('Create contact message error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi gửi tin nhắn',
    });
  }
};
