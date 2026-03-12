import { Router } from 'express';
import {
  createContactMessage,
  getAllContactMessages,
  markAsRead,
  deleteContactMessage,
} from '../controllers/contactMessage.controller.js';

const router = Router();

router.get('/', getAllContactMessages);
router.post('/', createContactMessage);
router.patch('/:id/read', markAsRead);
router.delete('/:id', deleteContactMessage);

export default router;
