import { Request, Response } from 'express';
import ContactMessage from '../models/ContactMessage.js';

/**
 * GET /api/v1/contact-messages
 * Lấy danh sách tin nhắn (admin)
 */
export const getAllContactMessages = async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const filter: Record<string, string> = {};
    if (status === 'unread' || status === 'read') filter.status = status as string;

    const messages = await ContactMessage.find(filter).sort({ created_at: -1 });
    res.json({ success: true, data: messages });
  } catch (error) {
    console.error('Get contact messages error:', error);
    res.status(500).json({ success: false, message: 'Lỗi tải tin nhắn' });
  }
};

/**
 * PATCH /api/v1/contact-messages/:id/read
 * Đánh dấu đã đọc
 */
export const markAsRead = async (req: Request, res: Response) => {
  try {
    const msg = await ContactMessage.findByIdAndUpdate(
      req.params.id,
      { status: 'read' },
      { new: true }
    );
    if (!msg) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
    res.json({ success: true, data: msg });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ success: false, message: 'Lỗi cập nhật' });
  }
};

/**
 * DELETE /api/v1/contact-messages/:id
 * Xóa tin nhắn
 */
export const deleteContactMessage = async (req: Request, res: Response) => {
  try {
    const msg = await ContactMessage.findByIdAndDelete(req.params.id);
    if (!msg) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
    res.json({ success: true, message: 'Đã xóa tin nhắn' });
  } catch (error) {
    console.error('Delete contact message error:', error);
    res.status(500).json({ success: false, message: 'Lỗi xóa tin nhắn' });
  }
};

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
