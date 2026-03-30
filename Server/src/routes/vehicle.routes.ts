import express from 'express';
import { getVehicles, createVehicle, updateVehicle, deleteVehicle } from '../controllers/vehicle.controller';

const router = express.Router();

router
  .route('/')
  .get(getVehicles)
  .post(createVehicle);

router
  .route('/:id')
  .patch(updateVehicle)
  .delete(deleteVehicle);

export default router;

