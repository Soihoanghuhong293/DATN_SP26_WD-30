import { Router } from 'express';
import {
  createHolidayPricing,
  getHolidayPricings,
  getHolidayPricingById,
  updateHolidayPricing,
  deleteHolidayPricing,
  calculatePrice
} from '../controllers/holidayPricing.controller';

const router = Router();

router.post('/calculate', calculatePrice); // API tính toán giá
router.get('/', getHolidayPricings);
router.get('/:id', getHolidayPricingById);
router.post('/', createHolidayPricing);
router.put('/:id', updateHolidayPricing);
router.delete('/:id', deleteHolidayPricing);

export default router;