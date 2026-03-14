import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { requirePatient, requireAdmin, requirePatientOrAdmin } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';
import { idParamValidation } from '../dto/common.dto';
import {
  createPayment,
  confirmStripePayment,
  capturePaypalPayment,
  completePayment,
  refundPayment,
  getMyPayments,
  getPaymentById,
  getAppointmentPayments,
} from '../controllers/payment.controller';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Patient routes
router.post('/', requirePatient, createPayment);
router.get('/', requirePatient, getMyPayments);
router.get('/:id', requirePatientOrAdmin, validate(idParamValidation), getPaymentById);
router.get('/appointment/:appointmentId', requirePatientOrAdmin, getAppointmentPayments);

// Payment confirmation routes
router.post('/stripe/confirm', requirePatient, confirmStripePayment);
router.post('/paypal/capture', requirePatient, capturePaypalPayment);

// Admin routes
router.post('/:id/complete', requireAdmin, validate(idParamValidation), completePayment);
router.post('/:id/refund', requireAdmin, validate(idParamValidation), refundPayment);

export default router;
