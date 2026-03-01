import express from 'express';
import {
  getAllProviders,
  getProviderById,
  createProvider,
  updateProvider,
  deleteProvider,
} from '../controllers/provider.controller.js';

const router = express.Router();

router
  .route('/')
  .get(getAllProviders)
  .post(createProvider);

router
  .route('/:id')
  .get(getProviderById)
  .patch(updateProvider)
  .delete(deleteProvider);

export default router;
