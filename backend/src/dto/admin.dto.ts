import { z } from 'zod';
import { UserRole } from '../types/constants';
import { MAX_PASSWORD_LENGTH } from '../config/constants';

export const adminUsersQueryValidation = z.object({
  query: z.object({
    role: z.nativeEnum(UserRole).optional(),
    isActive: z
      .enum(['true', 'false'])
      .optional()
      .transform(v => (v === undefined ? undefined : v === 'true')),
    search: z.string().optional(),
    page: z.coerce.number().int().min(1, 'Page must be a positive integer').optional().default(1),
    limit: z.coerce
      .number()
      .int()
      .min(1, 'Limit must be between 1 and 100')
      .max(100, 'Limit must be between 1 and 100')
      .optional()
      .default(10),
  }),
});

export const adminUserPatchValidation = z.object({
  params: z.strictObject({
    id: z.uuid('User ID must be a valid UUID'),
  }),
  body: z
    .object({
      isActive: z.boolean().optional(),
      role: z.nativeEnum(UserRole).optional(),
    })
    .refine(data => data.isActive !== undefined || data.role !== undefined, {
      message: 'At least one field is required: isActive or role',
    }),
});

export const adminCreateUserValidation = z.object({
  body: z.strictObject({
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    email: z.string().email().max(255),
    password: z.string().min(8, 'Password must be at least 8 characters').max(MAX_PASSWORD_LENGTH),
    role: z.nativeEnum(UserRole).optional().default(UserRole.PATIENT),
  }),
});

export const adminPendingDoctorsQueryValidation = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1, 'Page must be a positive integer').optional().default(1),
    limit: z.coerce
      .number()
      .int()
      .min(1, 'Limit must be between 1 and 100')
      .max(100, 'Limit must be between 1 and 100')
      .optional()
      .default(10),
  }),
});
