import express from 'express';
import { getRooms, createRoom, updateRoom, deleteRoom } from '../controllers/room.controller';

const router = express.Router();

router.route('/').get(getRooms).post(createRoom);

router.route('/:id').patch(updateRoom).delete(deleteRoom);

export default router;
