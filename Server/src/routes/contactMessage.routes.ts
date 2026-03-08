import { Router } from 'express';
import { createContactMessage } from '../controllers/contactMessage.controller.js';

const router = Router();

router.post('/', createContactMessage);

export default router;
