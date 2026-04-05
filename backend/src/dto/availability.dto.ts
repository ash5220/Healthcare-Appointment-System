/**
 * Zod validation schemas for Doctor Availability routes.
 *
 * Ensures all time values, day enumeration, and durations are validated
 * before reaching the service layer.
 */
import { z } from 'zod';
import { DayOfWeek } from '../types/constants';

const timeString = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be in HH:MM format (24-hour)');

/** POST /api/v1/doctors/availability */
export const createAvailabilityValidation = z.object({
  body: z
    .strictObject({
      dayOfWeek: z.enum(
        Object.values(DayOfWeek) as [string, ...string[]],
        { message: 'dayOfWeek must be a valid day (monday–sunday)' }
      ),
      startTime: timeString,
      endTime: timeString,
      slotDuration: z
        .number()
        .int()
        .min(5, 'Slot duration must be at least 5 minutes')
        .max(240, 'Slot duration cannot exceed 240 minutes'),
      effectiveFrom: z.string().datetime({ message: 'effectiveFrom must be a valid ISO date' }),
      effectiveTo: z
        .string()
        .datetime({ message: 'effectiveTo must be a valid ISO date' })
        .optional(),
      isActive: z.boolean().optional(),
    })
    .refine(data => data.startTime < data.endTime, {
      message: 'startTime must be before endTime',
      path: ['endTime'],
    }),
});

/** PUT /api/v1/doctors/availability/:id */
export const updateAvailabilityValidation = z.object({
  params: z.object({
    id: z.uuid('ID must be a valid UUID'),
  }),
  body: z
    .strictObject({
      dayOfWeek: z
        .enum(Object.values(DayOfWeek) as [string, ...string[]])
        .optional(),
      startTime: timeString.optional(),
      endTime: timeString.optional(),
      slotDuration: z
        .number()
        .int()
        .min(5)
        .max(240)
        .optional(),
      effectiveFrom: z
        .string()
        .datetime({ message: 'effectiveFrom must be a valid ISO date' })
        .optional(),
      effectiveTo: z
        .string()
        .datetime({ message: 'effectiveTo must be a valid ISO date' })
        .optional(),
      isActive: z.boolean().optional(),
    })
    .refine(
      data =>
        data.startTime === undefined ||
        data.endTime === undefined ||
        data.startTime < data.endTime,
      {
        message: 'startTime must be before endTime',
        path: ['endTime'],
      }
    ),
});

/** DELETE /api/v1/doctors/availability/:id */
export const deleteAvailabilityValidation = z.object({
  params: z.object({
    id: z.uuid('ID must be a valid UUID'),
  }),
});

/** POST /api/v1/doctors/schedule (weekly schedule batch upsert) */
export const weeklyScheduleValidation = z.object({
  body: z.object({
    schedule: z
      .array(
        z
          .object({
            dayOfWeek: z.enum(Object.values(DayOfWeek) as [string, ...string[]]),
            startTime: timeString,
            endTime: timeString,
            slotDuration: z.number().int().min(5).max(240),
            effectiveFrom: z.string().datetime(),
            effectiveTo: z.string().datetime().optional(),
          })
          .refine(d => d.startTime < d.endTime, {
            message: 'startTime must be before endTime',
            path: ['endTime'],
          })
      )
      .min(1, 'At least one schedule entry is required'),
  }),
});
