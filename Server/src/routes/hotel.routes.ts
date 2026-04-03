import express from 'express';
import { getHotels, createHotel, updateHotel, deleteHotel } from '../controllers/hotel.controller';

const router = express.Router();

router.route('/').get(getHotels).post(createHotel);

router.route('/:id').patch(updateHotel).delete(deleteHotel);

export default router;
