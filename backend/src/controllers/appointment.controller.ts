import { Response } from 'express';
import { appointmentService } from '../services';
import { successResponse, createdResponse, paginatedResponse } from '../utils/response.util';
import { asyncHandler } from '../middleware';
import { AuthenticatedRequest } from '../types/express-augment';
import { AppointmentStatus } from '../types/constants';
import type { UpdateAppointmentData } from '../services/appointment.service';
import type { Prescription } from '../models/Appointment.model';

export const createAppointment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { doctorId, appointmentDate, startTime, endTime, reasonForVisit } = req.body as {
    doctorId: string;
    appointmentDate: string;
    startTime: string;
    endTime?: string;
    reasonForVisit: string;
  };

  const appointment = await appointmentService.create({
    userId: req.user.userId,
    doctorId,
    appointmentDate,
    startTime,
    endTime,
    reasonForVisit,
  });

  createdResponse(res, { appointment }, 'Appointment created successfully');
});

export const getAppointments = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { page, limit, status, startDate, endDate, doctorId, patientId } = req.query;

  // Number() handles both raw strings ("50") and already-coerced numbers (50)
  // that the Zod validate middleware may have written back via Object.assign.
  const parsedPage = page !== undefined ? Number(page) : 1;
  const parsedLimit = limit !== undefined ? Number(limit) : 10;

  const { appointments, total } = await appointmentService.getAll(
    {
      page: parsedPage,
      limit: parsedLimit,
      status: status as AppointmentStatus,
      startDate: startDate as string,
      endDate: endDate as string,
      doctorId: doctorId as string,
      patientId: patientId as string,
    },
    req.user.userId,
    req.user.role
  );

  paginatedResponse(res, appointments, total, parsedPage, parsedLimit);
});

export const getAppointmentById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  // Use role-aware lookup to prevent PHI leakage across patients/doctors
  const appointment = await appointmentService.getByIdForUser(id, req.user.userId, req.user.role);

  successResponse(res, { appointment });
});

export const updateAppointment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const updateData = req.body as UpdateAppointmentData;

  const appointment = await appointmentService.update(
    id,
    updateData,
    req.user.userId,
    req.user.role
  );

  successResponse(res, { appointment }, 'Appointment updated successfully');
});

export const cancelAppointment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { cancellationReason } = req.body as { cancellationReason: string };

  const appointment = await appointmentService.cancel(
    id,
    cancellationReason,
    req.user.userId,
    req.user.role
  );

  successResponse(res, { appointment }, 'Appointment cancelled successfully');
});

export const confirmAppointment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const appointment = await appointmentService.confirm(id, req.user.userId, req.user.role);

  successResponse(res, { appointment }, 'Appointment confirmed successfully');
});

export const completeAppointment = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { notes, prescriptions } = req.body as { notes?: string; prescriptions?: Prescription[] };

    const appointment = await appointmentService.complete(
      id,
      notes,
      prescriptions,
      req.user.userId,
      req.user.role
    );

    successResponse(res, { appointment }, 'Appointment completed successfully');
  }
);

export const getAvailableSlots = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { doctorId, date } = req.query;

  const slots = await appointmentService.getAvailableSlots(doctorId as string, date as string);

  successResponse(res, { slots });
});

/**
 * Return pre-aggregated appointment counts per status for the patient dashboard.
 * Much lighter than fetching all appointment records just to count them.
 */
export const getDashboardStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const stats = await appointmentService.getDashboardStats(req.user.userId);
  successResponse(res, { stats });
});
