import { Response } from 'express';
import { appointmentService } from '../services';
import { successResponse, createdResponse, paginatedResponse } from '../utils/response.util';
import { asyncHandler } from '../middleware';
import { AuthenticatedRequest } from '../types/express-augment';
import { AppointmentStatus } from '../types/constants';
import { BadRequestError } from '../shared/errors';
import type { UpdateAppointmentData } from '../services/appointment.service';
import type { Prescription } from '../models/Appointment.model';

export const createAppointment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { doctorId, appointmentDate, startTime, endTime, reasonForVisit } = req.body as {
    doctorId: string;
    appointmentDate: string;
    startTime: string;
    endTime: string;
    reasonForVisit?: string;
  };

  if (!reasonForVisit) {
    throw new BadRequestError('reasonForVisit is required and must be at least 10 characters');
  }

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

  const { appointments, total } = await appointmentService.getAll(
    {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      status: status as AppointmentStatus,
      startDate: startDate as string,
      endDate: endDate as string,
      doctorId: doctorId as string,
      patientId: patientId as string,
    },
    req.user.userId,
    req.user.role
  );

  paginatedResponse(
    res,
    appointments,
    total,
    page ? parseInt(page as string) : 1,
    limit ? parseInt(limit as string) : 10
  );
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
