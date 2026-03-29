/* AUTO-GENERATED FILE. Do not edit directly.
 * Source: contracts/api-contracts.ts
 * Run: npm run contracts:sync
 */

export type ContractUserRole = "patient" | "doctor" | "admin";
export type ContractGender = "male" | "female" | "other";

export interface ApiPaginationMetadata {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiUserContract {
  id: string;
  email: string;
  role: ContractUserRole;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  lastLoginAt?: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface AdminUsersResponseContract {
  success: boolean;
  data: ApiUserContract[];
  metadata: ApiPaginationMetadata;
  message?: string;
}

export interface PatientRegistrationRequestContract {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  dateOfBirth: string;
  gender: ContractGender;
  bloodGroup?: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";
  allergies?: string[];
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

export interface DoctorRegistrationRequestContract {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  specialization: string;
  licenseNumber: string;
  yearsOfExperience?: number;
  consultationFee?: number;
  bio?: string;
  languages?: string[];
}
