import express from 'express';
import {
  getAllCategories,
  getCategoryTree,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/category.controller.js';

const router = express.Router();

router.route('/tree').get(getCategoryTree);

router
  .route('/')
  .get(getAllCategories)
  .post(createCategory);

router
  .route('/:id')
  .get(getCategoryById)
  .patch(updateCategory)
  .delete(deleteCategory);

export default router;


