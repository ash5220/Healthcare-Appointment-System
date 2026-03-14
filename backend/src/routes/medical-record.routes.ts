import { Router } from 'express';
import * as medicalRecordController from '../controllers/medical-record.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requirePatient } from '../middleware/role.middleware';

const router = Router();

router.use(authMiddleware);

/**
 * @route   GET /api/v1/medical-records/my-records
 * @desc    Get current patient's medical records
 * @access  Private (Patient)
 */
router.get('/my-records', requirePatient, medicalRecordController.getMyRecords);

/**
 * @route   GET /api/v1/medical-records/export/csv
 * @desc    Export current patient's medical records as CSV
 * @access  Private (Patient)
 */
router.get('/export/csv', requirePatient, medicalRecordController.exportMyRecordsCsv);

/**
 * @route   GET /api/v1/medical-records/export/pdf
 * @desc    Export current patient's medical records as PDF
 * @access  Private (Patient)
 */
router.get('/export/pdf', requirePatient, medicalRecordController.exportMyRecordsPdf);

export default router;
