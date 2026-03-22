import { z } from 'zod';

export const userIdValidation = z.object({
  params: z.strictObject({
    id: z.uuid('User ID must be a valid UUID'),
  }),
});

export const getUsersQueryValidation = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1, 'Page must be a positive integer').optional(),
    limit: z.coerce
      .number()
      .int()
      .min(1, 'Limit must be between 1 and 100')
      .max(100, 'Limit must be between 1 and 100')
      .optional(),
    role: z
      .enum(['patient', 'doctor', 'admin'] as [string, ...string[]], {
        message: 'Role must be one of: patient, doctor, admin',
      })
      .optional(),
    isActive: z.coerce.boolean({ message: 'isActive must be a boolean' }).optional(),
    search: z
      .string()
      .min(1, 'Search term must be between 1 and 100 characters')
      .max(100, 'Search term must be between 1 and 100 characters')
      .optional(),
  }),
});

export const getDoctorsQueryValidation = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1, 'Page must be a positive integer').optional(),
    limit: z.coerce
      .number()
      .int()
      .min(1, 'Limit must be between 1 and 100')
      .max(100, 'Limit must be between 1 and 100')
      .optional(),
    specialization: z
      .string()
      .min(1, 'Specialization must be between 1 and 100 characters')
      .max(100, 'Specialization must be between 1 and 100 characters')
      .optional(),
    search: z
      .string()
      .min(1, 'Search term must be between 1 and 100 characters')
      .max(100, 'Search term must be between 1 and 100 characters')
      .optional(),
    minRating: z.coerce
      .number()
      .min(0, 'Minimum rating must be between 0 and 5')
      .max(5, 'Minimum rating must be between 0 and 5')
      .optional(),
  }),
});
