import { Request, Response } from 'express';
import { doctorService, availabilityService } from '../services';
import { successResponse, paginatedResponse } from '../utils/response.util';
import { asyncHandler } from '../middleware';
import { AuthenticatedRequest } from '../types/express.d';


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

export const updateDoctorProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const updateData = req.body;

    const doctor = await doctorService.updateDoctorProfile(req.user!.userId, updateData);

    successResponse(res, { doctor }, 'Profile updated successfully');
});

export const getDoctorAvailability = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const availability = await availabilityService.getByDoctorId(id);

    successResponse(res, { availability });
});

export const getMyAvailability = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // Get doctor ID from authenticated user
    const doctor = await doctorService.getDoctorByUserId(req.user!.userId);

    const availability = await availabilityService.getByDoctorId(doctor.id);

    successResponse(res, { availability });
});

export const createAvailability = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { dayOfWeek, startTime, endTime, slotDuration, effectiveFrom, effectiveTo } = req.body;

    // Get doctor ID from authenticated user
    const doctor = await doctorService.getDoctorByUserId(req.user!.userId);

    const availability = await availabilityService.create({
        doctorId: doctor.id,
        dayOfWeek,
        startTime,
        endTime,
        slotDuration,
        effectiveFrom,
        effectiveTo,
    });

    successResponse(res, { availability }, 'Availability created successfully');
});

export const updateAvailability = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const updateData = req.body;

    const availability = await availabilityService.update(id, updateData);

    successResponse(res, { availability }, 'Availability updated successfully');
});

export const deleteAvailability = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    await availabilityService.delete(id);

    successResponse(res, null, 'Availability deleted successfully');
});

export const setWeeklySchedule = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { schedule, effectiveFrom } = req.body;

    // Get doctor ID from authenticated user
    const doctor = await doctorService.getDoctorByUserId(req.user!.userId);

    const availabilities = await availabilityService.setWeeklySchedule(
        doctor.id,
        schedule,
        effectiveFrom
    );

    successResponse(res, { availabilities }, 'Weekly schedule set successfully');
});
