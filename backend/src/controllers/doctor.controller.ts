import { Request, Response } from 'express';
import { doctorService, availabilityService } from '../services';
import { successResponse, paginatedResponse } from '../utils/response.util';
import { asyncHandler, ForbiddenError } from '../middleware';
import { AuthenticatedRequest } from '../types/express-augment';
import type { UpdateAvailabilityData } from '../services/availability.service';
import type { DayOfWeek } from '../types/constants';
import type { Doctor } from '../models';

export const getDoctors = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, specialization, search, minRating } = req.query;

  const { doctors, total } = await doctorService.getDoctors({
    page: page ? parseInt(page as string) : undefined,
    limit: limit ? parseInt(limit as string) : undefined,
    specialization: specialization as string,
    search: search as string,
    minRating: minRating ? parseFloat(minRating as string) : undefined,
  });

  paginatedResponse(
    res,
    doctors,
    total,
    page ? parseInt(page as string) : 1,
    limit ? parseInt(limit as string) : 10
  );
});

export const getDoctorById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const doctor = await doctorService.getDoctorById(id);

  successResponse(res, { doctor });
});

export const updateDoctorProfile = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const updateData = req.body as Partial<Doctor>;

    const doctor = await doctorService.updateDoctorProfile(req.user.userId, updateData);

    successResponse(res, { doctor }, 'Profile updated successfully');
  }
);

export const getDoctorAvailability = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const availability = await availabilityService.getByDoctorId(id);

  successResponse(res, { availability });
});

export const getMyAvailability = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // Get doctor ID from authenticated user
  const doctor = await doctorService.getDoctorByUserId(req.user.userId);

  const availability = await availabilityService.getByDoctorId(doctor.id);

  successResponse(res, { availability });
});

export const createAvailability = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { dayOfWeek, startTime, endTime, slotDuration, effectiveFrom, effectiveTo } = req.body as {
    dayOfWeek: DayOfWeek;
    startTime: string;
    endTime: string;
    slotDuration?: number;
    effectiveFrom?: string;
    effectiveTo?: string;
  };

  // Get doctor ID from authenticated user
  const doctor = await doctorService.getDoctorByUserId(req.user.userId);

  const availability = await availabilityService.create({
    doctorId: doctor.id,
    dayOfWeek,
    startTime,
    endTime,
    slotDuration,
    effectiveFrom: effectiveFrom ?? new Date().toISOString().split('T')[0],
    effectiveTo,
  });

  successResponse(res, { availability }, 'Availability created successfully');
});

export const updateAvailability = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const updateData = req.body as UpdateAvailabilityData;

  // Ownership check: verify the availability belongs to the authenticated doctor
  const doctor = await doctorService.getDoctorByUserId(req.user.userId);
  const availability = await availabilityService.getById(id);
  if (availability.doctorId !== doctor.id) {
    throw new ForbiddenError('You do not have permission to modify this availability slot');
  }

  const updated = await availabilityService.update(id, updateData);

  successResponse(res, { availability: updated }, 'Availability updated successfully');
});

export const deleteAvailability = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  // Ownership check: verify the availability belongs to the authenticated doctor
  const doctor = await doctorService.getDoctorByUserId(req.user.userId);
  const availability = await availabilityService.getById(id);
  if (availability.doctorId !== doctor.id) {
    throw new ForbiddenError('You do not have permission to delete this availability slot');
  }

  await availabilityService.delete(id);

  successResponse(res, null, 'Availability deleted successfully');
});

export const setWeeklySchedule = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { schedule, effectiveFrom } = req.body as {
    schedule: { dayOfWeek: DayOfWeek; startTime: string; endTime: string; slotDuration?: number }[];
    effectiveFrom: string;
  };

  // Get doctor ID from authenticated user
  const doctor = await doctorService.getDoctorByUserId(req.user.userId);

  const availabilities = await availabilityService.setWeeklySchedule(
    doctor.id,
    schedule,
    effectiveFrom
  );

  successResponse(res, { availabilities }, 'Weekly schedule set successfully');
});

export const getDoctorPatients = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { page, limit } = req.query;
  const parsedPage = page !== undefined ? (page as unknown as number) : 1;
  const parsedLimit = limit !== undefined ? (limit as unknown as number) : 25;

  const { patients, total } = await doctorService.getDoctorPatients(
    req.user.userId,
    parsedPage,
    parsedLimit
  );

  paginatedResponse(res, patients, total, parsedPage, parsedLimit);
});
