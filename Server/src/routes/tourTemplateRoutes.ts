import express from 'express';
import * as tourTemplateController from '../controllers/tourTemplateController';

const router = express.Router();

router
  .route('/')
  .get(tourTemplateController.getAllTourTemplates)
  .post(tourTemplateController.createTourTemplate);

router
  .route('/:id')
  .get(tourTemplateController.getTourTemplate)
  .put(tourTemplateController.updateTourTemplate)
  .delete(tourTemplateController.deleteTourTemplate);

export default router;

