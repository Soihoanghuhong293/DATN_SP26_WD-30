import express from 'express';
import {
  getProviderTickets,
  createProviderTicket,
  updateProviderTicket,
  deleteProviderTicket,
} from '../controllers/providerTicket.controller';

const router = express.Router();

router.route('/').get(getProviderTickets).post(createProviderTicket);
router.route('/:id').patch(updateProviderTicket).delete(deleteProviderTicket);

export default router;
