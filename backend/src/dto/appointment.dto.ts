import { z } from 'zod';
import { AppointmentStatus } from '../types/constants';

export const createAppointmentValidation = z.object({
  body: z.strictObject({
    doctorId: z.uuid('Doctor ID must be a valid UUID'),
    appointmentDate: z
      .string()
      .refine(val => !isNaN(Date.parse(val)), { message: 'Please provide a valid date' })
      .refine(
        val => {
          const appointmentDate = new Date(val);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return appointmentDate >= today;
        },
        { message: 'Appointment date cannot be in the past' }
      )
      .refine(
        val => {
          const appointmentDate = new Date(val);
          const maxDate = new Date();
          maxDate.setDate(maxDate.getDate() + 90);
          return appointmentDate <= maxDate;
        },
        { message: 'Cannot book appointments more than 90 days in advance' }
      ),
    startTime: z
      .string()
      .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be in HH:MM format'),
    endTime: z
      .string()
      .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'End time must be in HH:MM format')
      .optional(),
    reasonForVisit: z
      .string()
      .min(10, 'Reason for visit must be between 10 and 1000 characters')
      .max(1000, 'Reason for visit must be between 10 and 1000 characters'),
  }),
});

export const updateAppointmentValidation = z.object({
  params: z.strictObject({
    id: z.uuid('Appointment ID must be a valid UUID'),
  }),
  body: z.strictObject({
    appointmentDate: z
      .string()
      .refine(val => !isNaN(Date.parse(val)), { message: 'Please provide a valid date' })
      .refine(
        val => {
          const appointmentDate = new Date(val);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return appointmentDate >= today;
        },
        { message: 'Appointment date cannot be in the past' }
      )
      .optional(),
    startTime: z
      .string()
      .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be in HH:MM format')
      .optional(),
    endTime: z
      .string()
      .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'End time must be in HH:MM format')
      .optional(),
    reasonForVisit: z
      .string()
      .min(10, 'Reason for visit must be between 10 and 1000 characters')
      .max(1000, 'Reason for visit must be between 10 and 1000 characters')
      .optional(),
    status: z
      .nativeEnum(AppointmentStatus, {
        message: `Status must be one of: ${Object.values(AppointmentStatus).join(', ')}`,
      })
      .optional(),
  }),
});

export const cancelAppointmentValidation = z.object({
  params: z.strictObject({
    id: z.uuid('Appointment ID must be a valid UUID'),
  }),
  body: z.strictObject({
    cancellationReason: z
      .string()
      .min(10, 'Cancellation reason must be between 10 and 500 characters')
      .max(500, 'Cancellation reason must be between 10 and 500 characters'),
  }),
});

export const completeAppointmentValidation = z.object({
  params: z.strictObject({
    id: z.uuid('Appointment ID must be a valid UUID'),
  }),
  body: z.strictObject({
    notes: z.string().max(2000, 'Notes must not exceed 2000 characters').optional(),
    prescriptions: z
      .array(
        z
          .strictObject({
            medication: z.string().min(1, 'Medication name is required'),
            dosage: z.string().min(1, 'Dosage is required'),
            frequency: z.string().min(1, 'Frequency is required'),
            duration: z.string().min(1, 'Duration is required'),
          })
          .partial()
          .refine(
            p =>
              p.medication || p.dosage || p.frequency || p.duration
                ? !!(p.medication && p.dosage && p.frequency && p.duration)
                : true,
            { message: 'All prescription fields are required if one is provided' }
          )
      )
      .optional(),
  }),
});

export const getAppointmentsQueryValidation = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1, 'Page must be a positive integer').optional(),
    limit: z.coerce
      .number()
      .int()
      .min(1, 'Limit must be between 1 and 100')
      .max(100, 'Limit must be between 1 and 100')
      .optional(),
    status: z
      .nativeEnum(AppointmentStatus, {
        message: `Status must be one of: ${Object.values(AppointmentStatus).join(', ')}`,
      })
      .optional(),
    startDate: z
      .string()
      .refine(val => !isNaN(Date.parse(val)), { message: 'Start date must be a valid date' })
      .optional(),
    endDate: z
      .string()
      .refine(val => !isNaN(Date.parse(val)), { message: 'End date must be a valid date' })
      .optional(),
    doctorId: z.uuid('Doctor ID must be a valid UUID').optional(),
    patientId: z.uuid('Patient ID must be a valid UUID').optional(),
  }),
});

export const appointmentIdValidation = z.object({
  params: z.strictObject({
    id: z.uuid('Appointment ID must be a valid UUID'),
  }),
});
