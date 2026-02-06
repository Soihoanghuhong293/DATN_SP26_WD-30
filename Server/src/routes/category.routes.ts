import express from 'express';
import { createCategory, getAllCategories } from '../controllers/category.controller.js';

const router = express.Router();

router.route('/').get(getAllCategories).post(createCategory);

export default router;


