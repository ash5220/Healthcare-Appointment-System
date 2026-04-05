import { Response } from 'express';
import { medicalRecordService } from '../services/medical-record.service';
import { asyncHandler } from '../middleware';
import { AuthenticatedRequest } from '../types/express-augment';
import { successResponse, paginatedResponse } from '../utils/response.util';
import { NotFoundError } from '../middleware/error.middleware';
import { patientRepository } from '../repositories';

export const getMyRecords = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user.userId;
  const { page, limit } = req.query;
  const parsedPage = page !== undefined ? (page as unknown as number) : 1;
  const parsedLimit = limit !== undefined ? (limit as unknown as number) : 10;

  const patient = await patientRepository.findByUserId(userId);

  if (!patient) {
    throw new NotFoundError('Patient profile not found');
  }

  const { records, total } = await medicalRecordService.findAllByPatientId(
    patient.id,
    parsedPage,
    parsedLimit
  );
  paginatedResponse(res, records, total, parsedPage, parsedLimit);
});

export const exportMyRecordsCsv = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user.userId;
  const patient = await patientRepository.findByUserId(userId);

  if (!patient) {
    throw new NotFoundError('Patient profile not found');
  }

  // Fetch all records for export (no pagination — intentional for full export)
  const { records } = await medicalRecordService.findAllByPatientId(patient.id, 1, 10000);
  const csvData = medicalRecordService.convertToCsv(records);

  res.header('Content-Type', 'text/csv');
  res.attachment(`medical_records_${patient.id}_${new Date().toISOString().split('T')[0]}.csv`);
  res.send(csvData);
});

export const exportMyRecordsPdf = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user.userId;
  const patient = await patientRepository.findByUserId(userId, { withUser: true });

  if (!patient) {
    throw new NotFoundError('Patient profile not found');
  }

  // Fetch all records for export (no pagination — intentional for full export)
  const { records } = await medicalRecordService.findAllByPatientId(patient.id, 1, 10000);

  const patientName = patient.user
    ? `${patient.user.firstName} ${patient.user.lastName}`
    : 'Unknown';

  res.header('Content-Type', 'application/pdf');
  res.header(
    'Content-Disposition',
    `attachment; filename=medical_records_${patient.id}_${new Date().toISOString().split('T')[0]}.pdf`
  );

  medicalRecordService.generatePdf(records, patientName, res);
});
