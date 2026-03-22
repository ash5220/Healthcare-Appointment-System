/**
 * Zod validation schemas for Insurance routes.
 *
 * Insurance previously had NO runtime validation — the body was cast with
 * `as CreateInsuranceInput`, trusting the caller completely.  These schemas
 * add proper input validation so invalid or malicious payloads are rejected
 * before reaching the service layer.
 */
import { z } from 'zod';
import { InsuranceStatus } from '../types/constants';

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

/** POST /api/v1/insurance */
export const createInsuranceValidation = z.object({
  body: z
    .object({
      providerName: z
        .string()
        .min(1, 'Provider name is required')
        .max(255, 'Provider name must not exceed 255 characters'),
      policyNumber: z
        .string()
        .min(1, 'Policy number is required')
        .max(100, 'Policy number must not exceed 100 characters'),
      groupNumber: z.string().max(100).optional(),
      subscriberName: z
        .string()
        .min(1, 'Subscriber name is required')
        .max(255),
      subscriberRelation: z.string().max(50).optional(),
      planType: z.string().max(100).optional(),
      coverageStartDate: dateString,
      coverageEndDate: dateString.optional(),
      copayAmount: z
        .number()
        .nonnegative('copayAmount must be non-negative')
        .optional(),
      deductibleAmount: z
        .number()
        .nonnegative('deductibleAmount must be non-negative')
        .optional(),
    })
    .refine(
      data =>
        !data.coverageEndDate || data.coverageEndDate >= data.coverageStartDate,
      {
        message: 'coverageEndDate must be on or after coverageStartDate',
        path: ['coverageEndDate'],
      }
    ),
});

/** PUT /api/v1/insurance/:id */
export const updateInsuranceValidation = z.object({
  params: z.object({
    id: z.uuid('ID must be a valid UUID'),
  }),
  body: z
    .object({
      providerName: z.string().min(1).max(255).optional(),
      policyNumber: z.string().min(1).max(100).optional(),
      groupNumber: z.string().max(100).optional(),
      subscriberName: z.string().min(1).max(255).optional(),
      subscriberRelation: z.string().max(50).optional(),
      planType: z.string().max(100).optional(),
      coverageStartDate: dateString.optional(),
      coverageEndDate: dateString.optional(),
      copayAmount: z.number().nonnegative().optional(),
      deductibleAmount: z.number().nonnegative().optional(),
    })
    .refine(obj => Object.keys(obj).length > 0, {
      message: 'At least one field is required for update',
    }),
});

/** POST /api/v1/insurance/:id/verify */
export const verifyInsuranceValidation = z.object({
  params: z.object({
    id: z.uuid('ID must be a valid UUID'),
  }),
  body: z.object({
    status: z.enum(
      Object.values(InsuranceStatus) as [string, ...string[]],
      { message: 'status must be a valid InsuranceStatus' }
    ),
    notes: z.string().max(1000).optional(),
  }),
});
