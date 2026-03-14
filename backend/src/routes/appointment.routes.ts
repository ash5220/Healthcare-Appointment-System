import { Router } from 'express';
import * as appointmentController from '../controllers/appointment.controller';
import { validate } from '../middleware/validate.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { requirePatient, requireDoctorOrAdmin } from '../middleware/role.middleware';
import {
    createAppointmentValidation,
    updateAppointmentValidation,
    cancelAppointmentValidation,
    completeAppointmentValidation,
    getAppointmentsQueryValidation,
    appointmentIdValidation,
} from '../dto/appointment.dto';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * @route   GET /api/v1/appointments
 * @desc    Get all appointments (filtered by role)
 * @access  Private
 */
router.get(
    '/',
    validate(getAppointmentsQueryValidation),
    appointmentController.getAppointments
);

/**
 * @route   GET /api/v1/appointments/available-slots
 * @desc    Get available appointment slots for a doctor
 * @access  Private
 */
router.get('/available-slots', appointmentController.getAvailableSlots);

/**
 * @route   GET /api/v1/appointments/:id
 * @desc    Get appointment by ID
 * @access  Private
 */
router.get(
    '/:id',
    validate(appointmentIdValidation),
    appointmentController.getAppointmentById
);

/**
 * @route   POST /api/v1/appointments
 * @desc    Create a new appointment (patients only)
 * @access  Private (Patient)
 */
router.post(
    '/',
    requirePatient,
    validate(createAppointmentValidation),
    appointmentController.createAppointment
);

/**
 * @route   PUT /api/v1/appointments/:id
 * @desc    Update an appointment
 * @access  Private
 */
router.put(
    '/:id',
    validate(updateAppointmentValidation),
    appointmentController.updateAppointment
);

/**
 * @route   POST /api/v1/appointments/:id/cancel
 * @desc    Cancel an appointment
 * @access  Private
 */
router.post(
    '/:id/cancel',
    validate(cancelAppointmentValidation),
    appointmentController.cancelAppointment
);

/**
 * @route   POST /api/v1/appointments/:id/confirm
 * @desc    Confirm an appointment (doctors only)
 * @access  Private (Doctor)
 */
router.post(
    '/:id/confirm',
    requireDoctorOrAdmin,
    validate(appointmentIdValidation),
    appointmentController.confirmAppointment
);

/**
 * @route   POST /api/v1/appointments/:id/complete
 * @desc    Complete an appointment (doctors only)
 * @access  Private (Doctor)
 */
router.post(
    '/:id/complete',
    requireDoctorOrAdmin,
    validate(completeAppointmentValidation),
    appointmentController.completeAppointment
);

export default router;
