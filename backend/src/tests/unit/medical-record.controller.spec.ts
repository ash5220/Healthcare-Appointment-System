/* eslint-disable @typescript-eslint/await-thenable */
jest.mock('../../services/medical-record.service', () => ({
  medicalRecordService: {
    findAllByPatientId: jest.fn(),
    convertToCsv: jest.fn(),
    generatePdf: jest.fn(),
  },
}));

jest.mock('../../repositories', () => ({
  patientRepository: {
    findByUserId: jest.fn(),
  },
}));

jest.mock('../../config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// The controller imports asyncHandler from the middleware barrel, which
// transitively imports rateLimit and auth middleware that connect to the DB.
// We provide a targeted mock to avoid real DB connections.
jest.mock('../../middleware', () => ({
  asyncHandler:
    (fn: (...args: unknown[]) => Promise<unknown>) =>
    (req: unknown, res: unknown, next: (err?: unknown) => void) =>
      Promise.resolve(fn(req, res, next)).catch(next),
}));

jest.mock('../../middleware/error.middleware', () => {
  class HttpError extends Error {
    statusCode: number;
    constructor(message: string, statusCode: number) {
      super(message);
      this.statusCode = statusCode;
    }
  }
  class NotFoundError extends HttpError {
    constructor(message = 'Not found') {
      super(message, 404);
    }
  }
  return {
    HttpError,
    NotFoundError,
    asyncHandler:
      (fn: (...args: unknown[]) => Promise<unknown>) =>
      (req: unknown, res: unknown, next: (err?: unknown) => void) =>
        Promise.resolve(fn(req, res, next)).catch(next),
  };
});

import { Response } from 'express';
import { AuthenticatedRequest } from '../../types/express-augment';
import {
  getMyRecords,
  exportMyRecordsCsv,
  exportMyRecordsPdf,
} from '../../controllers/medical-record.controller';
import { medicalRecordService } from '../../services/medical-record.service';
import { patientRepository } from '../../repositories';
import { UserRole } from '../../types/constants';

const mockRes = (): Response => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.header = jest.fn().mockReturnValue(res);
  res.attachment = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

const mockReq = (userId = 'user-1'): AuthenticatedRequest =>
  ({
    user: { userId, email: 'test@test.com', role: UserRole.PATIENT },
    params: {},
    query: {},
    body: {},
  }) as unknown as AuthenticatedRequest;

const mockNext = jest.fn();

describe('MedicalRecord Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getMyRecords', () => {
    it('returns records for authenticated patient', async () => {
      const patient = { id: 'patient-1' };
      const records = [{ id: 'rec-1', diagnosis: 'Flu' }];

      (patientRepository.findByUserId as jest.Mock).mockResolvedValue(patient);
      (medicalRecordService.findAllByPatientId as jest.Mock).mockResolvedValue({
        records,
        total: records.length,
      });

      const req = mockReq();
      const res = mockRes();

      await getMyRecords(req, res, mockNext);

      expect(patientRepository.findByUserId).toHaveBeenCalledWith('user-1');
      expect(medicalRecordService.findAllByPatientId).toHaveBeenCalledWith('patient-1', 1, 10);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('throws NotFoundError when patient profile missing', async () => {
      (patientRepository.findByUserId as jest.Mock).mockResolvedValue(null);

      const req = mockReq();
      const res = mockRes();

      await getMyRecords(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('Patient profile not found') })
      );
    });
  });

  describe('exportMyRecordsCsv', () => {
    it('sends CSV download', async () => {
      const patient = { id: 'patient-1' };
      const records = [{ id: 'rec-1' }];
      const csvData = 'id,diagnosis\nrec-1,Flu';

      (patientRepository.findByUserId as jest.Mock).mockResolvedValue(patient);
      (medicalRecordService.findAllByPatientId as jest.Mock).mockResolvedValue({
        records,
        total: records.length,
      });
      (medicalRecordService.convertToCsv as jest.Mock).mockReturnValue(csvData);

      const req = mockReq();
      const res = mockRes();

      await exportMyRecordsCsv(req, res, mockNext);

      expect(res.header).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(res.send).toHaveBeenCalledWith(csvData);
    });
  });

  describe('exportMyRecordsPdf', () => {
    it('uses patient repository with withUser option', async () => {
      const patient = {
        id: 'patient-1',
        user: { firstName: 'John', lastName: 'Doe' },
      };
      const records = [{ id: 'rec-1' }];

      (patientRepository.findByUserId as jest.Mock).mockResolvedValue(patient);
      (medicalRecordService.findAllByPatientId as jest.Mock).mockResolvedValue({
        records,
        total: records.length,
      });
      (medicalRecordService.generatePdf as jest.Mock).mockImplementation(() => {});

      const req = mockReq();
      const res = mockRes();

      await exportMyRecordsPdf(req, res, mockNext);

      expect(patientRepository.findByUserId).toHaveBeenCalledWith('user-1', { withUser: true });
      expect(medicalRecordService.generatePdf).toHaveBeenCalledWith(records, 'John Doe', res);
    });

    it('uses "Unknown" when patient has no user association', async () => {
      const patient = { id: 'patient-1', user: null };
      const records: unknown[] = [];

      (patientRepository.findByUserId as jest.Mock).mockResolvedValue(patient);
      (medicalRecordService.findAllByPatientId as jest.Mock).mockResolvedValue({
        records,
        total: records.length,
      });
      (medicalRecordService.generatePdf as jest.Mock).mockImplementation(() => {});

      const req = mockReq();
      const res = mockRes();

      await exportMyRecordsPdf(req, res, mockNext);

      expect(medicalRecordService.generatePdf).toHaveBeenCalledWith(records, 'Unknown', res);
    });
  });
});
