import { Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware';
import { paginatedResponse, successResponse, createdResponse } from '../utils/response.util';
import { adminService } from '../services/admin.service';
import { BadRequestError } from '../shared/errors';
import { AuthenticatedRequest } from '../types/express-augment';
import {
  adminUsersQueryValidation,
  adminUserPatchValidation,
  adminCreateUserValidation,
  adminPendingDoctorsQueryValidation,
} from '../dto/admin.dto';

type UsersQuery = z.infer<typeof adminUsersQueryValidation>['query'];
type UserPatchBody = z.infer<typeof adminUserPatchValidation>['body'];
type CreateUserBody = z.infer<typeof adminCreateUserValidation>['body'];
type PendingDoctorsQuery = z.infer<typeof adminPendingDoctorsQueryValidation>['query'];

export const getStats = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  const stats = await adminService.getStats();
  successResponse(res, { stats });
});

export const getUsers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // Query validated and coerced by validate(adminUsersQueryValidation) middleware
  const { role, isActive, search, page, limit } = req.query as unknown as UsersQuery;

  const { users, total } = await adminService.getUsers({
    role,
    isActive,
    search,
    page,
    limit,
  });

  paginatedResponse(
    res,
    users.map(user => user.toSafeObject()),
    total,
    page,
    limit,
    'Users retrieved'
  );
});

export const updateUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  // Body validated by validate(adminUserPatchValidation) middleware
  const data = req.body as UserPatchBody;

  await adminService.updateUser(id, data);
  successResponse(res, null, 'User updated successfully');
});

export const createUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // Body validated by validate(adminCreateUserValidation) middleware
  const data = req.body as CreateUserBody;

  const user = await adminService.createUser(data);
  createdResponse(res, { user: user.toSafeObject() }, 'User created successfully');
});

export const deleteUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  if (req.user.userId === id) {
    throw new BadRequestError('You cannot delete your own account');
  }
  await adminService.deleteUser(id);
  successResponse(res, null, 'User deleted successfully');
});

export const getPendingDoctors = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // Query validated and coerced by validate(adminPendingDoctorsQueryValidation) middleware
  const { page, limit } = req.query as unknown as PendingDoctorsQuery;

  const { doctors, total } = await adminService.getPendingDoctors(page, limit);
  paginatedResponse(res, doctors, total, page, limit, 'Pending doctors retrieved');
});

export const approveDoctor = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  await adminService.approveDoctor(id);
  successResponse(res, null, 'Doctor approved successfully');
});

export const rejectDoctor = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  await adminService.rejectDoctor(id);
  successResponse(res, null, 'Doctor registration rejected');
});
