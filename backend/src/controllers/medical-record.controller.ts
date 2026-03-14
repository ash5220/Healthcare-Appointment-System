import { Response } from 'express';
import { medicalRecordService } from '../services/medical-record.service';
import { asyncHandler } from '../middleware';
import { AuthenticatedRequest } from '../types/express.d';
import { successResponse } from '../utils/response.util';
import { Patient, User } from '../models';
import { NotFoundError } from '../middleware/error.middleware';

export const getMyRecords = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const patient = await Patient.findOne({ where: { userId } });

    if (!patient) {
        throw new NotFoundError('Patient profile not found');
    }

    const records = await medicalRecordService.findAllByPatientId(patient.id);
    successResponse(res, { records });
});

export const exportMyRecordsCsv = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const patient = await Patient.findOne({ where: { userId } });

    if (!patient) {
        throw new NotFoundError('Patient profile not found');
    }

    const records = await medicalRecordService.findAllByPatientId(patient.id);
    const csvData = medicalRecordService.convertToCsv(records);

    res.header('Content-Type', 'text/csv');
    res.attachment(`medical_records_${patient.id}_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvData);
});

export const exportMyRecordsPdf = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    // We need user to get the name
    const patient = await Patient.findOne({
        where: { userId },
        include: [{ model: User, as: 'user' }]
    });

    if (!patient) {
        throw new NotFoundError('Patient profile not found');
    }

    const records = await medicalRecordService.findAllByPatientId(patient.id);

    // Get patient name
    const user = await User.findByPk(userId);
    const patientName = user ? `${user.firstName} ${user.lastName}` : 'Unknown';

    res.header('Content-Type', 'application/pdf');
    res.header('Content-Disposition', `attachment; filename=medical_records_${patient.id}_${new Date().toISOString().split('T')[0]}.pdf`);

    medicalRecordService.generatePdf(records, patientName, res);
});
