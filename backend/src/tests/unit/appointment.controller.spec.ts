// ─── Mocks must be hoisted before any imports ─────────────────────────────────

jest.mock('../../services/appointment.service', () => ({
  appointmentService: {
    create: jest.fn(),
    getAll: jest.fn(),
    getById: jest.fn(),
    getByIdForUser: jest.fn(),
    update: jest.fn(),
    cancel: jest.fn(),
    confirm: jest.fn(),
    complete: jest.fn(),
    getAvailableSlots: jest.fn(),
    getDashboardStats: jest.fn(),
  },
}));

jest.mock('../../services', () => ({
  appointmentService: require('../../services/appointment.service').appointmentService,
}));

jest.mock('../../config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// ─── Now safe to import tested code ───────────────────────────────────────────

import { Response } from 'express';
import { AuthenticatedRequest } from '../../types/express-augment';
import * as appointmentController from '../../controllers/appointment.controller';
import { appointmentService } from '../../services/appointment.service';
import { UserRole, AppointmentStatus } from '../../types/constants';

// ──────────────────────────────────────────────────────────────────────────────

const mockRes = (): Response => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

const mockReq = (overrides: Partial<AuthenticatedRequest> = {}): AuthenticatedRequest =>
  ({
    user: { userId: 'patient-uuid', email: 'patient@test.com', role: UserRole.PATIENT },
    params: {},
    query: {},
    body: {},
    cookies: {},
    ...overrides,
  }) as unknown as AuthenticatedRequest;

const mockNext = jest.fn();

const makeAppointment = (overrides = {}) => ({
  id: 'appt-uuid',
  doctorId: 'doctor-uuid',
  patientId: 'patient-profile-uuid',
  appointmentDate: '2026-05-01',
  startTime: '09:00',
  endTime: '09:30',
  status: AppointmentStatus.SCHEDULED,
  reasonForVisit: 'Annual check-up routine illness',
  ...overrides,
});

// ──────────────────────────────────────────────────────────────────────────────

describe('Appointment Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── createAppointment ─────────────────────────────────────────────────

  describe('createAppointment', () => {
    const body = {
      doctorId: 'doctor-uuid',
      appointmentDate: '2026-05-01',
      startTime: '09:00',
      endTime: '09:30',
      reasonForVisit: 'Annual check-up routine illness',
    };

    it('happy path — creates appointment and returns 201', async () => {
      const appt = makeAppointment();
      (appointmentService.create as jest.Mock).mockResolvedValue(appt);
      const req = mockReq({ body });
      const res = mockRes();

      await appointmentController.createAppointment(req, res, mockNext);

      expect(appointmentService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'patient-uuid',
          doctorId: body.doctorId,
          reasonForVisit: body.reasonForVisit,
        })
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('forwards service errors to next()', async () => {
      const err = new Error('slot conflict');
      (appointmentService.create as jest.Mock).mockRejectedValue(err);
      const req = mockReq({ body });
      const res = mockRes();

      await appointmentController.createAppointment(req, res, mockNext);
      await Promise.resolve();

      expect(mockNext).toHaveBeenCalledWith(err);
    });
  });

  // ── getAppointments ───────────────────────────────────────────────────

  describe('getAppointments', () => {
    it('happy path — returns paginated appointments with 200', async () => {
      const result = { appointments: [makeAppointment()], total: 1 };
      (appointmentService.getAll as jest.Mock).mockResolvedValue(result);
      // After validate middleware, query params are coerced to proper types
      const req = mockReq({ query: { page: 1, limit: 10 } as unknown as Record<string, string> });
      const res = mockRes();

      await appointmentController.getAppointments(req, res, mockNext);

      expect(appointmentService.getAll).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 10 }),
        'patient-uuid',
        UserRole.PATIENT
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('passes status filter when provided', async () => {
      (appointmentService.getAll as jest.Mock).mockResolvedValue({ appointments: [], total: 0 });
      const req = mockReq({
        query: { status: AppointmentStatus.SCHEDULED } as Record<string, string>,
      });
      const res = mockRes();

      await appointmentController.getAppointments(req, res, mockNext);

      expect(appointmentService.getAll).toHaveBeenCalledWith(
        expect.objectContaining({ status: AppointmentStatus.SCHEDULED }),
        'patient-uuid',
        UserRole.PATIENT
      );
    });

    it('uses default pagination when page/limit not provided', async () => {
      (appointmentService.getAll as jest.Mock).mockResolvedValue({ appointments: [], total: 0 });
      const req = mockReq({ query: {} });
      const res = mockRes();

      await appointmentController.getAppointments(req, res, mockNext);

      expect(appointmentService.getAll).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 10 }),
        'patient-uuid',
        UserRole.PATIENT
      );
    });
  });

  // ── getAppointmentById ────────────────────────────────────────────────

  describe('getAppointmentById', () => {
    it('happy path — returns appointment with 200', async () => {
      const appt = makeAppointment();
      (appointmentService.getByIdForUser as jest.Mock).mockResolvedValue(appt);
      const req = mockReq({ params: { id: 'appt-uuid' } });
      const res = mockRes();

      await appointmentController.getAppointmentById(req, res, mockNext);

      expect(appointmentService.getByIdForUser).toHaveBeenCalledWith(
        'appt-uuid',
        'patient-uuid',
        UserRole.PATIENT
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('forwards ForbiddenError to next() when accessing another patient appointment', async () => {
      const err = new Error('forbidden');
      (appointmentService.getByIdForUser as jest.Mock).mockRejectedValue(err);
      const req = mockReq({ params: { id: 'other-appt-uuid' } });
      const res = mockRes();

      await appointmentController.getAppointmentById(req, res, mockNext);
      await Promise.resolve();

      expect(mockNext).toHaveBeenCalledWith(err);
    });
  });

  // ── updateAppointment ─────────────────────────────────────────────────

  describe('updateAppointment', () => {
    it('happy path — updates appointment and returns 200', async () => {
      const appt = makeAppointment();
      (appointmentService.update as jest.Mock).mockResolvedValue(appt);
      const req = mockReq({
        params: { id: 'appt-uuid' },
        body: { reasonForVisit: 'Updated reason here' },
      });
      const res = mockRes();

      await appointmentController.updateAppointment(req, res, mockNext);

      expect(appointmentService.update).toHaveBeenCalledWith(
        'appt-uuid',
        expect.objectContaining({ reasonForVisit: 'Updated reason here' }),
        'patient-uuid',
        UserRole.PATIENT
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('forwards errors to next()', async () => {
      const err = new Error('cannot update cancelled');
      (appointmentService.update as jest.Mock).mockRejectedValue(err);
      const req = mockReq({ params: { id: 'appt-uuid' }, body: {} });
      const res = mockRes();

      await appointmentController.updateAppointment(req, res, mockNext);
      await Promise.resolve();

      expect(mockNext).toHaveBeenCalledWith(err);
    });
  });

  // ── cancelAppointment ─────────────────────────────────────────────────

  describe('cancelAppointment', () => {
    it('happy path — cancels appointment and returns 200', async () => {
      const appt = makeAppointment({ status: AppointmentStatus.CANCELLED });
      (appointmentService.cancel as jest.Mock).mockResolvedValue(appt);
      const req = mockReq({
        params: { id: 'appt-uuid' },
        body: { cancellationReason: 'No longer needed' },
      });
      const res = mockRes();

      await appointmentController.cancelAppointment(req, res, mockNext);

      expect(appointmentService.cancel).toHaveBeenCalledWith(
        'appt-uuid',
        'No longer needed',
        'patient-uuid',
        UserRole.PATIENT
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('forwards already-cancelled error to next()', async () => {
      const err = new Error('already cancelled');
      (appointmentService.cancel as jest.Mock).mockRejectedValue(err);
      const req = mockReq({
        params: { id: 'appt-uuid' },
        body: { cancellationReason: 'test' },
      });
      const res = mockRes();

      await appointmentController.cancelAppointment(req, res, mockNext);
      await Promise.resolve();

      expect(mockNext).toHaveBeenCalledWith(err);
    });
  });

  // ── confirmAppointment ────────────────────────────────────────────────

  describe('confirmAppointment', () => {
    it('doctor confirms appointment — returns 200', async () => {
      const appt = makeAppointment({ status: AppointmentStatus.CONFIRMED });
      (appointmentService.confirm as jest.Mock).mockResolvedValue(appt);
      const req = mockReq({
        user: { userId: 'doctor-uuid', email: 'doc@test.com', role: UserRole.DOCTOR },
        params: { id: 'appt-uuid' },
      });
      const res = mockRes();

      await appointmentController.confirmAppointment(req, res, mockNext);

      expect(appointmentService.confirm).toHaveBeenCalledWith(
        'appt-uuid',
        'doctor-uuid',
        UserRole.DOCTOR
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('forwards ForbiddenError to next() for patient role', async () => {
      const err = new Error('forbidden');
      (appointmentService.confirm as jest.Mock).mockRejectedValue(err);
      const req = mockReq({ params: { id: 'appt-uuid' } });
      const res = mockRes();

      await appointmentController.confirmAppointment(req, res, mockNext);
      await Promise.resolve();

      expect(mockNext).toHaveBeenCalledWith(err);
    });
  });

  // ── completeAppointment ───────────────────────────────────────────────

  describe('completeAppointment', () => {
    it('doctor completes appointment with notes and returns 200', async () => {
      const appt = makeAppointment({ status: AppointmentStatus.COMPLETED });
      (appointmentService.complete as jest.Mock).mockResolvedValue(appt);
      const req = mockReq({
        user: { userId: 'doctor-uuid', email: 'doc@test.com', role: UserRole.DOCTOR },
        params: { id: 'appt-uuid' },
        body: { notes: 'Patient is healthy', prescriptions: [] },
      });
      const res = mockRes();

      await appointmentController.completeAppointment(req, res, mockNext);

      expect(appointmentService.complete).toHaveBeenCalledWith(
        'appt-uuid',
        'Patient is healthy',
        [],
        'doctor-uuid',
        UserRole.DOCTOR
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('completes without notes or prescriptions', async () => {
      (appointmentService.complete as jest.Mock).mockResolvedValue(makeAppointment());
      const req = mockReq({
        user: { userId: 'doctor-uuid', email: 'doc@test.com', role: UserRole.DOCTOR },
        params: { id: 'appt-uuid' },
        body: {},
      });
      const res = mockRes();

      await appointmentController.completeAppointment(req, res, mockNext);

      expect(appointmentService.complete).toHaveBeenCalledWith(
        'appt-uuid',
        undefined,
        undefined,
        'doctor-uuid',
        UserRole.DOCTOR
      );
    });

    it('forwards errors to next()', async () => {
      const err = new Error('not completable');
      (appointmentService.complete as jest.Mock).mockRejectedValue(err);
      const req = mockReq({
        user: { userId: 'doctor-uuid', email: 'doc@test.com', role: UserRole.DOCTOR },
        params: { id: 'appt-uuid' },
        body: {},
      });
      const res = mockRes();

      await appointmentController.completeAppointment(req, res, mockNext);
      await Promise.resolve();

      expect(mockNext).toHaveBeenCalledWith(err);
    });
  });

  // ── getAvailableSlots ─────────────────────────────────────────────────

  describe('getAvailableSlots', () => {
    it('returns available slots for a doctor on a date with 200', async () => {
      const slots = [{ startTime: '09:00', endTime: '09:30' }];
      (appointmentService.getAvailableSlots as jest.Mock).mockResolvedValue(slots);
      const req = mockReq({
        query: { doctorId: 'doctor-uuid', date: '2026-05-01' } as Record<string, string>,
      });
      const res = mockRes();

      await appointmentController.getAvailableSlots(req, res, mockNext);

      expect(appointmentService.getAvailableSlots).toHaveBeenCalledWith(
        'doctor-uuid',
        '2026-05-01'
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('forwards errors to next()', async () => {
      const err = new Error('doctor not found');
      (appointmentService.getAvailableSlots as jest.Mock).mockRejectedValue(err);
      const req = mockReq({
        query: { doctorId: 'bad', date: '2026-05-01' } as Record<string, string>,
      });
      const res = mockRes();

      await appointmentController.getAvailableSlots(req, res, mockNext);
      await Promise.resolve();

      expect(mockNext).toHaveBeenCalledWith(err);
    });
  });

  // ── getDashboardStats ─────────────────────────────────────────────────

  describe('getDashboardStats', () => {
    it('returns dashboard stats for the authenticated user with 200', async () => {
      const stats = { scheduled: 2, confirmed: 1, completed: 5, cancelled: 0 };
      (appointmentService.getDashboardStats as jest.Mock).mockResolvedValue(stats);
      const req = mockReq();
      const res = mockRes();

      await appointmentController.getDashboardStats(req, res, mockNext);

      expect(appointmentService.getDashboardStats).toHaveBeenCalledWith('patient-uuid');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('forwards NotFoundError to next()', async () => {
      const err = new Error('patient not found');
      (appointmentService.getDashboardStats as jest.Mock).mockRejectedValue(err);
      const req = mockReq();
      const res = mockRes();

      await appointmentController.getDashboardStats(req, res, mockNext);
      await Promise.resolve();

      expect(mockNext).toHaveBeenCalledWith(err);
    });
  });
});
