import { Response } from 'express';
import { z } from 'zod';
import { userService } from '../services';
import { successResponse } from '../utils/response.util';
import { asyncHandler } from '../middleware';
import { AuthenticatedRequest } from '../types/express-augment';
import { patientProfileValidation } from '../dto/auth.dto';

type PatientProfileUpdateBody = z.infer<typeof patientProfileValidation>['body'];

export const getPatientProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // After validate middleware, params are validated by userIdValidation schema
  const patientId = req.params['id'] as unknown as string;
  const patient = await userService.getPatientById(patientId);

  successResponse(res, { patient });
});

export const updatePatientProfile = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const updateData = req.body as PatientProfileUpdateBody;

    const patient = await userService.updatePatientProfile(req.user.userId, updateData);

    successResponse(res, { patient }, 'Profile updated successfully');
  }
);

export const getMyProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = await userService.getUserById(req.user.userId);

  successResponse(res, { user });
});
