import express from 'express';
import * as tourController from '../controllers/tourController';
import { optionalProtect, protect, restrictToAdmin, restrictToGuide, restrictToGuideOrAdmin } from '../middlewares/auth.middleware';

const router = express.Router();

router
  .route('/')
  .get(optionalProtect, tourController.getAllTours)
  .post(tourController.createTour);

router
  .route('/:id')
  .get(optionalProtect, tourController.getTour)
  .put(tourController.updateTour)   
  .delete(tourController.deleteTour);

router.get('/:id/trips/:date/allocations', protect, restrictToAdmin, tourController.getTripAllocations);
router.post('/:id/trips/:date/auto-allocate-cars', protect, restrictToAdmin, tourController.tripAutoAllocateCars);
router.post('/:id/trips/:date/auto-allocate-rooms', protect, restrictToAdmin, tourController.tripAutoAllocateRooms);

router.get('/:id/trips/:date/guests', protect, restrictToAdmin, tourController.getTripGuests);
router.get('/:id/trips/:date/vehicle-assignments', protect, restrictToAdmin, tourController.getTripVehicleAssignments);
router.post('/:id/trips/:date/vehicle-assignments', protect, restrictToAdmin, tourController.upsertTripVehicleAssignment);
router.delete(
  '/:id/trips/:date/vehicle-assignments/:dayNo/:guestKey',
  protect,
  restrictToAdmin,
  tourController.deleteTripVehicleAssignment
);
router.get('/:id/trips/:date/room-assignments', protect, restrictToAdmin, tourController.getTripRoomAssignments);
router.post('/:id/trips/:date/room-assignments', protect, restrictToAdmin, tourController.upsertTripRoomAssignment);
router.delete(
  '/:id/trips/:date/room-assignments/:dayNo/:guestKey',
  protect,
  restrictToAdmin,
  tourController.deleteTripRoomAssignment
);

router.get('/:id/trips/:date/passengers', protect, restrictToAdmin, tourController.getTripPassengers);
router.get('/:id/trips/:date/trip-vehicles', protect, restrictToAdmin, tourController.getTripVehicles);
router.post('/:id/trips/:date/trip-vehicles', protect, restrictToAdmin, tourController.addTripVehicle);
router.get('/:id/trips/:date/seating', protect, restrictToAdmin, tourController.getTripSeatingState);
router.post('/:id/trips/:date/seating/assign', protect, restrictToAdmin, tourController.assignSeat);
router.delete('/:id/trips/:date/seating/unassign/:passengerId', protect, restrictToAdmin, tourController.unassignSeat);

router.get('/:id/trips/:date/trip-rooms', protect, restrictToAdmin, tourController.getTripRooms);
router.post('/:id/trips/:date/trip-rooms', protect, restrictToAdmin, tourController.addTripRoom);
router.post('/:id/trips/:date/trip-rooms/bulk-by-hotel', protect, restrictToAdmin, tourController.bulkAddTripRoomsByHotel);
router.get('/:id/trips/:date/rooming', protect, restrictToAdmin, tourController.getTripRoomingState);
router.post('/:id/trips/:date/rooming/assign', protect, restrictToAdmin, tourController.assignRoom);
router.delete('/:id/trips/:date/rooming/unassign/:passengerId', protect, restrictToAdmin, tourController.unassignRoom);

// Trip status (4-state)
router.get('/:id/trips/:date/status', protect, restrictToGuideOrAdmin, tourController.getTripStatusByTourAndDate);
router.patch('/:id/trips/:date/status', protect, restrictToAdmin, tourController.updateTripStatusByTourAndDate);
router.post('/:id/trips/:date/start', protect, restrictToGuide, tourController.guideStartTrip);
router.post('/:id/trips/:date/end', protect, restrictToGuide, tourController.guideEndTrip);

// HDV/Admin: lệnh điều động (tổng hợp xe/khách sạn/rooming/seating/danh sách khách)
router.get('/:id/trips/:date/assignment', protect, restrictToGuideOrAdmin, tourController.getTripAssignment);

export default router;