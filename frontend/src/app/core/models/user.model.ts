import { UserRole, Gender } from './constants';
import { ApiUserContract } from '../contracts/generated-contracts';

/** Query parameters accepted by the admin user-list endpoint. */
export interface UserFilters {
  page: number;
  limit: number;
  role?: UserRole;
  /** Filter by active status. */
  isActive?: boolean;
  search?: string;
}

export interface User extends ApiUserContract {
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
