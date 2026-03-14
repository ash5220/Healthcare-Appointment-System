import { UserRole, Gender } from './constants';

export interface User {
    id: string;
    email: string;
    role: UserRole;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    isActive: boolean;
    isEmailVerified: boolean;
    lastLoginAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    patientProfile?: Patient;
    doctorProfile?: Doctor;
}

export interface Doctor {
    id: string;
    userId: string;
    user?: User;
    specialization: string;
    licenseNumber: string;
    yearsOfExperience: number;
    consultationFee: number;
    bio?: string;
    qualifications: DoctorQualification[];
    languages: string[];
    rating: number;
    totalPatients: number;
}

export interface DoctorQualification {
    degree: string;
    institution: string;
    year: number;
}

export interface Patient {
    id: string;
    userId: string;
    user?: User;
    dateOfBirth: Date;
    gender: Gender;
    bloodGroup?: string;
    allergies: string[];
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    address?: Address;
    insuranceInfo?: InsuranceInfo;
}

export interface Address {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
}

export interface InsuranceInfo {
    provider: string;
    policyNumber: string;
    groupNumber?: string;
    expiryDate?: string;
}
