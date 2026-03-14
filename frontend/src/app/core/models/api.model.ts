import { Doctor, User } from './user.model';
import { DoctorAvailability, Appointment } from './appointment.model';
import { SystemStats } from './dashboard.model';
import { AuthTokens } from './auth.model';

export interface StatsResponse {
    data: {
        stats: SystemStats;
    };
}

export interface AvailabilityResponse {
    data: {
        availability: DoctorAvailability[];
    };
}

export type DoctorsResponse = PaginatedResponse<Doctor>;

export interface UserResponse {
    data: {
        users: User[];
        total: number;
    };
}



export interface AuthResponse {
    success: boolean;
    data: {
        user?: User;
        accessToken?: string;
        mfaRequired?: boolean;
        tempToken?: string;
    };
    message?: string;
}

export interface AppointmentResponse {
    success: boolean;
    data: {
        appointment: Appointment;
    };
    message?: string;
}

export interface PaginatedResponse<T> {
    success: boolean;
    data: T[];
    metadata: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
