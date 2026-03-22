import { Router } from 'express';
import * as patientController from '../controllers/patient.controller';
import { validate } from '../middleware/validate.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { requirePatient, requireDoctorOrAdmin } from '../middleware/role.middleware';
import { patientProfileValidation } from '../dto/auth.dto';
import { userIdValidation } from '../dto/user.dto';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * @route   GET /api/v1/patients/me
 * @desc    Get current patient profile
 * @access  Private (Patient)
 */
router.get('/me', requirePatient, patientController.getMyProfile);

/**
 * @route   PUT /api/v1/patients/profile
 * @desc    Update patient profile
 * @access  Private (Patient)
 */
router.put(
    '/profile',
    requirePatient,
    validate(patientProfileValidation),
    patientController.updatePatientProfile
);

/**
 * @route   GET /api/v1/patients/:id
 * @desc    Get patient by ID (doctors and admins only)
 * @access  Private (Doctor/Admin)
 */
router.get(
    '/:id',
    requireDoctorOrAdmin,
    validate(userIdValidation),
    patientController.getPatientProfile
);

export default router;
