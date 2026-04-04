import { Response } from 'express';
import { userService } from '../services';
import type { SafePatientUpdateData } from '../services/user.service';
import { successResponse } from '../utils/response.util';
import { asyncHandler } from '../middleware';
import { AuthenticatedRequest } from '../types/express-augment';

export const getPatientProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const patient = await userService.getPatientById(req.params['id']);

  successResponse(res, { patient });
});

export const updatePatientProfile = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const updateData = req.body as SafePatientUpdateData;

    const patient = await userService.updatePatientProfile(req.user.userId, updateData);

    successResponse(res, { patient }, 'Profile updated successfully');
  }
);

export const getMyProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = await userService.getUserById(req.user.userId);

  successResponse(res, { user });
});
