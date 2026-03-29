import { Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware';
import { paginatedResponse, successResponse, createdResponse } from '../utils/response.util';
import { adminService } from '../services/admin.service';
import { UserRole } from '../types/constants';
import { BadRequestError } from '../shared/errors';
import { AuthenticatedRequest } from '../types/express.d';
import { MAX_PASSWORD_LENGTH } from '../config/constants';

const adminUsersQuerySchema = z.object({
  role: z.nativeEnum(UserRole).optional(),
  isActive: z
    .enum(['true', 'false'])
    .optional()
    .transform(v => (v === undefined ? undefined : v === 'true')),
  search: z.string().optional(),
  page: z
    .string()
    .optional()
    .transform(v => (v ? Number(v) : 1)),
  limit: z
    .string()
    .optional()
    .transform(v => (v ? Number(v) : 10)),
});

const adminUserPatchSchema = z
  .object({
    isActive: z.boolean().optional(),
    role: z.nativeEnum(UserRole).optional(),
  })
  .refine(data => data.isActive !== undefined || data.role !== undefined, {
    message: 'At least one field is required: isActive or role',
  });

const adminCreateUserSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(MAX_PASSWORD_LENGTH),
  role: z.nativeEnum(UserRole).optional().default(UserRole.PATIENT),
});

export const getStats = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  const stats = await adminService.getStats();
  successResponse(res, { stats });
});

export const getUsers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const parsed = adminUsersQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new BadRequestError(parsed.error.issues.map(issue => issue.message).join(', '));
  }

  const { role, isActive, search, page, limit } = parsed.data;

  if (!Number.isFinite(page) || page < 1) {
    throw new BadRequestError('page must be a positive integer');
  }
  if (!Number.isFinite(limit) || limit < 1 || limit > 100) {
    throw new BadRequestError('limit must be between 1 and 100');
  }

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
  const parsed = adminUserPatchSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new BadRequestError(parsed.error.issues.map(issue => issue.message).join(', '));
  }

  await adminService.updateUser(id, parsed.data);
  successResponse(res, null, 'User updated successfully');
});

export const createUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const parsed = adminCreateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new BadRequestError(parsed.error.issues.map(issue => issue.message).join(', '));
  }
  const user = await adminService.createUser(parsed.data);
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
  const page = Number(req.query['page']) || 1;
  const limit = Number(req.query['limit']) || 10;
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
