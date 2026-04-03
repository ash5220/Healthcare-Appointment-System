import { z } from 'zod';
import { UserRole, Gender } from '../types/constants';
import { MAX_PASSWORD_LENGTH } from '../config/constants';

// ── Reusable field schemas ──────────────────────────────────────────────

/**
 * Password schema applying all strength rules.
 * Capped at MAX_PASSWORD_LENGTH (bcrypt's 72-byte limit) to avoid silent truncation.
 */
const passwordSchema = z
  .string()
  .min(8, 'Password must be between 8 and 128 characters')
  .max(MAX_PASSWORD_LENGTH, `Password must not exceed ${MAX_PASSWORD_LENGTH} characters`)
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character');

const baseRegisterFields = {
  email: z
    .string()
    .email('Please provide a valid email address')
    .max(255, 'Email must not exceed 255 characters'),
  password: passwordSchema,
  confirmPassword: z.string(),
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(100, 'First name must be between 1 and 100 characters')
    .regex(
      /^[a-zA-Z\s'-]+$/,
      'First name can only contain letters, spaces, hyphens, and apostrophes'
    ),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(100, 'Last name must be between 1 and 100 characters')
    .regex(
      /^[a-zA-Z\s'-]+$/,
      'Last name can only contain letters, spaces, hyphens, and apostrophes'
    ),
  phoneNumber: z.string().optional(),
};

// ── Validation schemas ──────────────────────────────────────────────────

export const registerValidation = z.object({
  body: z
    .strictObject({
      ...baseRegisterFields,
      role: z
        .enum([UserRole.PATIENT, UserRole.DOCTOR], {
          message: `Role must be one of: ${UserRole.PATIENT}, ${UserRole.DOCTOR}`,
        })
        .optional(),
    })
    .refine(data => data.password === data.confirmPassword, {
      message: 'Password confirmation does not match password',
      path: ['confirmPassword'],
    }),
});

/**
 * Combined patient registration schema.
 * Merges base registration fields with patient-specific fields into ONE
 * z.strictObject so the request body is validated in a single pass.
 * (Two sequential z.strictObject validators would always reject the request
 * because each sees the other's fields as unknown keys.)
 */
export const registerPatientValidation = z.object({
  body: z
    .strictObject({
      ...baseRegisterFields,
      // patient-specific
      dateOfBirth: z
        .string()
        .datetime({ message: 'Please provide a valid date of birth' })
        .refine(
          val => {
            const dob = new Date(val);
            const today = new Date();
            return dob < today;
          },
          { message: 'Date of birth must be in the past' }
        )
        .refine(
          val => {
            const dob = new Date(val);
            const maxAge = new Date();
            maxAge.setFullYear(maxAge.getFullYear() - 150);
            return dob >= maxAge;
          },
          { message: 'Please provide a valid date of birth' }
        ),
      gender: z.nativeEnum(Gender, {
        message: `Gender must be one of: ${Object.values(Gender).join(', ')}`,
      }),
      bloodGroup: z
        .enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as [string, ...string[]], {
          message: 'Invalid blood group',
        })
        .optional(),
      allergies: z.array(z.string({ message: 'Each allergy must be a string' })).optional(),
      emergencyContactName: z
        .string()
        .max(100, 'Emergency contact name must not exceed 100 characters')
        .optional(),
      emergencyContactPhone: z.string().optional(),
    })
    .refine(data => data.password === data.confirmPassword, {
      message: 'Password confirmation does not match password',
      path: ['confirmPassword'],
    }),
});

/**
 * Combined doctor registration schema (same principle as registerPatientValidation).
 */
export const registerDoctorValidation = z.object({
  body: z
    .strictObject({
      ...baseRegisterFields,
      // doctor-specific
      specialization: z
        .string()
        .min(2, 'Specialization is required')
        .max(100, 'Specialization must be between 2 and 100 characters'),
      licenseNumber: z
        .string()
        .min(5, 'License number is required')
        .max(50, 'License number must be between 5 and 50 characters'),
      yearsOfExperience: z
        .number()
        .int()
        .min(0, 'Years of experience must be between 0 and 70')
        .max(70, 'Years of experience must be between 0 and 70')
        .optional(),
      consultationFee: z.number().positive('Consultation fee must be a positive number').optional(),
      bio: z.string().max(2000, 'Bio must not exceed 2000 characters').optional(),
      languages: z.array(z.string({ message: 'Each language must be a string' })).optional(),
    })
    .refine(data => data.password === data.confirmPassword, {
      message: 'Password confirmation does not match password',
      path: ['confirmPassword'],
    }),
});

export const loginValidation = z.object({
  body: z.strictObject({
    email: z.string().email('Please provide a valid email address'),
    password: z.string().min(1, 'Password is required'),
    rememberMe: z.boolean().optional(),
  }),
});

export const refreshTokenValidation = z.object({
  cookies: z.object({
    refreshToken: z.string().optional(),
  }),
});

export const changePasswordValidation = z.object({
  body: z
    .strictObject({
      currentPassword: z.string().min(1, 'Current password is required'),
      newPassword: passwordSchema,
      confirmNewPassword: z.string(),
    })
    .superRefine((data, ctx) => {
      if (data.newPassword === data.currentPassword) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'New password must be different from current password',
          path: ['newPassword'],
        });
      }
      if (data.newPassword !== data.confirmNewPassword) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Password confirmation does not match new password',
          path: ['confirmNewPassword'],
        });
      }
    }),
});

export const patientProfileValidation = z.object({
  body: z.strictObject({
    dateOfBirth: z
      .string()
      .datetime({ message: 'Please provide a valid date of birth' })
      .refine(
        val => {
          const dob = new Date(val);
          const today = new Date();
          return dob < today;
        },
        { message: 'Date of birth must be in the past' }
      )
      .refine(
        val => {
          const dob = new Date(val);
          const maxAge = new Date();
          maxAge.setFullYear(maxAge.getFullYear() - 150);
          return dob >= maxAge;
        },
        { message: 'Please provide a valid date of birth' }
      ),
    gender: z.nativeEnum(Gender, {
      message: `Gender must be one of: ${Object.values(Gender).join(', ')}`,
    }),
    bloodGroup: z
      .enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as [string, ...string[]], {
        message: 'Invalid blood group',
      })
      .optional(),
    allergies: z.array(z.string({ message: 'Each allergy must be a string' })).optional(),
    emergencyContactName: z
      .string()
      .max(100, 'Emergency contact name must not exceed 100 characters')
      .optional(),
    emergencyContactPhone: z.string().optional(),
  }),
});

export const doctorProfileValidation = z.object({
  body: z.strictObject({
    specialization: z
      .string()
      .min(2, 'Specialization is required')
      .max(100, 'Specialization must be between 2 and 100 characters'),
    licenseNumber: z
      .string()
      .min(5, 'License number is required')
      .max(50, 'License number must be between 5 and 50 characters'),
    yearsOfExperience: z
      .number()
      .int()
      .min(0, 'Years of experience must be between 0 and 70')
      .max(70, 'Years of experience must be between 0 and 70')
      .optional(),
    consultationFee: z.number().positive('Consultation fee must be a positive number').optional(),
    bio: z.string().max(2000, 'Bio must not exceed 2000 characters').optional(),
    languages: z.array(z.string({ message: 'Each language must be a string' })).optional(),
  }),
});

export const mfaLoginValidation = z.object({
  body: z.strictObject({
    tempToken: z.string().min(1, 'Temporary token is required'),
    token: z
      .string()
      .length(6, 'MFA code must be exactly 6 digits')
      .regex(/^\d+$/, 'MFA code must be numeric'),
  }),
});

export const setupMfaVerifyValidation = z.object({
  body: z.strictObject({
    token: z
      .string()
      .length(6, 'MFA code must be exactly 6 digits')
      .regex(/^\d+$/, 'MFA code must be numeric'),
  }),
});

// ── Password Reset ──────────────────────────────────────────────────────

export const forgotPasswordValidation = z.object({
  body: z.strictObject({
    email: z
      .string()
      .email('Please provide a valid email address')
      .max(255, 'Email must not exceed 255 characters'),
  }),
});

export const resetPasswordValidation = z.object({
  body: z
    .strictObject({
      token: z.string().min(1, 'Reset token is required'),
      newPassword: passwordSchema,
      confirmNewPassword: z.string(),
    })
    .refine(data => data.newPassword === data.confirmNewPassword, {
      message: 'Password confirmation does not match new password',
      path: ['confirmNewPassword'],
    }),
});

// ── Email Verification ──────────────────────────────────────────────────

export const verifyEmailValidation = z.object({
  body: z.strictObject({
    token: z.string().min(1, 'Verification token is required'),
  }),
});

export const resendVerificationValidation = z.object({
  body: z.strictObject({
    email: z
      .string()
      .email('Please provide a valid email address')
      .max(255, 'Email must not exceed 255 characters'),
  }),
});

// ── Profile Update ──────────────────────────────────────────────────────

export const updateProfileValidation = z.object({
  body: z.strictObject({
    firstName: z
      .string()
      .min(1, 'First name is required')
      .max(100, 'First name must be between 1 and 100 characters')
      .regex(
        /^[a-zA-Z\s'-]+$/,
        'First name can only contain letters, spaces, hyphens, and apostrophes'
      )
      .optional(),
    lastName: z
      .string()
      .min(1, 'Last name is required')
      .max(100, 'Last name must be between 1 and 100 characters')
      .regex(
        /^[a-zA-Z\s'-]+$/,
        'Last name can only contain letters, spaces, hyphens, and apostrophes'
      )
      .optional(),
    phoneNumber: z.string().max(20).nullable().optional(),
  }),
});

// ── Email Change ────────────────────────────────────────────────────────

export const requestEmailChangeValidation = z.object({
  body: z.strictObject({
    newEmail: z
      .string()
      .email('Please provide a valid email address')
      .max(255, 'Email must not exceed 255 characters'),
  }),
});

export const confirmEmailChangeValidation = z.object({
  body: z.strictObject({
    token: z.string().min(1, 'Confirmation token is required'),
  }),
});
