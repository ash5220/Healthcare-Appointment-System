import { Response } from 'express';
import { z } from 'zod';
import { appointmentService } from '../services';
import { successResponse, createdResponse, paginatedResponse } from '../utils/response.util';
import { asyncHandler } from '../middleware';
import { AuthenticatedRequest } from '../types/express-augment';
import {
  createAppointmentValidation,
  updateAppointmentValidation,
  cancelAppointmentValidation,
  completeAppointmentValidation,
  getAppointmentsQueryValidation,
  availableSlotsQueryValidation,
} from '../dto/appointment.dto';
import type { Prescription } from '../models/Appointment.model';

type CreateAppointmentBody = z.infer<typeof createAppointmentValidation>['body'];
type UpdateAppointmentBody = z.infer<typeof updateAppointmentValidation>['body'];
type CancelAppointmentBody = z.infer<typeof cancelAppointmentValidation>['body'];
type CompleteAppointmentBody = z.infer<typeof completeAppointmentValidation>['body'];
type AppointmentsQuery = z.infer<typeof getAppointmentsQueryValidation>['query'];
type AvailableSlotsQuery = z.infer<typeof availableSlotsQueryValidation>['query'];

export const createAppointment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // Body validated by validate(createAppointmentValidation) middleware
  const { doctorId, appointmentDate, startTime, endTime, reasonForVisit } =
    req.body as CreateAppointmentBody;

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
  // Query validated and coerced by validate(getAppointmentsQueryValidation) middleware
  const { page, limit, status, startDate, endDate, doctorId, patientId } =
    req.query as unknown as AppointmentsQuery;

  const resolvedPage = page ?? 1;
  const resolvedLimit = limit ?? 10;

  const { appointments, total } = await appointmentService.getAll(
    {
      page: resolvedPage,
      limit: resolvedLimit,
      status,
      startDate,
      endDate,
      doctorId,
      patientId,
    },
    req.user.userId,
    req.user.role
  );

  paginatedResponse(res, appointments, total, resolvedPage, resolvedLimit);
});

export const getAppointmentById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  // Use role-aware lookup to prevent PHI leakage across patients/doctors
  const appointment = await appointmentService.getByIdForUser(id, req.user.userId, req.user.role);

  successResponse(res, { appointment });
});

export const updateAppointment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  // Body validated by validate(updateAppointmentValidation) middleware
  const updateData = req.body as UpdateAppointmentBody;

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
  const { cancellationReason } = req.body as CancelAppointmentBody;

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
    // Body validated by validate(completeAppointmentValidation) middleware
    const { notes, prescriptions } = req.body as CompleteAppointmentBody;

    const appointment = await appointmentService.complete(
      id,
      notes,
      // Zod .refine() guarantees all fields present if any is provided,
      // but TypeScript can't narrow through refine — safe to cast.
      prescriptions as Prescription[] | undefined,
      req.user.userId,
      req.user.role
    );

    successResponse(res, { appointment }, 'Appointment completed successfully');
  }
);

export const getAvailableSlots = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // Query validated by validate(availableSlotsQueryValidation) middleware
  const { doctorId, date } = req.query as unknown as AvailableSlotsQuery;

  const slots = await appointmentService.getAvailableSlots(doctorId, date);

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
