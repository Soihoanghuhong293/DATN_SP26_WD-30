import { Router } from "express";
import { protect, restrictToAdmin } from "../middlewares/auth.middleware";
import {
  countUnreadContactMessagesAdmin,
  createContactMessage,
  getAllContactMessages,
  markAsRead,
  deleteContactMessage,
} from "../controllers/contactMessage.controller.js";

const router = Router();

router.get("/count", protect, restrictToAdmin, countUnreadContactMessagesAdmin);
router.get("/", getAllContactMessages);
router.post('/', createContactMessage);
router.patch('/:id/read', markAsRead);
router.delete('/:id', deleteContactMessage);

export default router;
