import { UserRole } from './constants';

export interface LoginCredentials {
    email: string;
    password: string;
}

// ── Base registration fields shared by all registration types ─────────────

interface BaseRegisterData {
    email: string;
    password: string;
    confirmPassword: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
}

export interface PatientRegisterData extends BaseRegisterData {
    role: 'patient';
    dateOfBirth: string;
    gender: string;
    bloodGroup?: string;
    allergies?: string[];
    emergencyContactName?: string;
    emergencyContactPhone?: string;
}

export interface DoctorRegisterData extends BaseRegisterData {
    role: 'doctor';
    specialization: string;
    licenseNumber: string;
    yearsOfExperience?: number;
    consultationFee?: number;
    bio?: string;
    languages?: string[];
}

/**
 * Discriminated union for type-safe registration forms.
 * Use PatientRegisterData or DoctorRegisterData directly when the role is known.
 */
export type RegisterData = BaseRegisterData | PatientRegisterData | DoctorRegisterData;

/**
 * Access token returned in the response body.
 * The refresh token is kept in an HttpOnly cookie and never exposed to JS.
 */
export interface AuthTokens {
    accessToken: string;
}

