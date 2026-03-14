import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { requirePatient, requireDoctorOrAdmin, requireAuthenticated } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';
import { idParamValidation } from '../dto/common.dto';
import {
    createInsurance,
    getMyInsurance,
    getInsuranceById,
    updateInsurance,
    verifyInsurance,
    deactivateInsurance,
    deleteInsurance,
    getActiveInsurance,
    getPatientInsurance,
} from '../controllers/insurance.controller';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Patient routes
router.post('/', requirePatient, createInsurance);
router.get('/', requirePatient, getMyInsurance);
router.get('/active', requirePatient, getActiveInsurance);
router.get('/:id', requireAuthenticated, validate(idParamValidation), getInsuranceById);
router.put('/:id', requirePatient, validate(idParamValidation), updateInsurance);
router.post('/:id/deactivate', requirePatient, validate(idParamValidation), deactivateInsurance);
router.delete('/:id', requirePatient, validate(idParamValidation), deleteInsurance);

// Admin/Doctor routes
router.post('/:id/verify', requireDoctorOrAdmin, validate(idParamValidation), verifyInsurance);
router.get('/patient/:patientId', requireDoctorOrAdmin, getPatientInsurance);

export default router;
