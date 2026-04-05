import { User, Patient } from '../models';
import { logger } from '../config/logger';
import { NotFoundError } from '../shared/errors';
import { userRepository, UserFilters } from '../repositories/user.repository';
import { patientRepository } from '../repositories/patient.repository';
import { Gender } from '../types/constants';

export { UserFilters } from '../repositories/user.repository';

/**
 * Fields a user is permitted to update on their own profile.
 * Role, isActive, loginAttempts, refreshToken and other security fields
 * are deliberately excluded to prevent privilege-escalation attacks.
 */
export interface SafeUserUpdateData {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string | null;
}

/**
 * Fields a patient is permitted to update on their own profile.
 * Sensitive medical fields (userId, etc.) are deliberately excluded.
 */
export interface SafePatientUpdateData {
  dateOfBirth?: string;
  gender?: Gender;
  bloodGroup?: string;
  allergies?: string[];
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

class UserService {
  async getUsers(filters: UserFilters): Promise<{ users: User[]; total: number }> {
    return userRepository.findAll(filters);
  }

  async getUserById(id: string): Promise<User> {
    const user = await userRepository.findById(id, { withProfiles: true });
    if (!user) throw new NotFoundError('User not found');
    return user;
  }

  async updateUser(id: string, rawData: SafeUserUpdateData): Promise<User> {
    const user = await userRepository.findById(id);
    if (!user) throw new NotFoundError('User not found');

    // Only allow the explicitly whitelisted fields through.
    // Using destructuring instead of delete ensures TypeScript proves
    // the restricted fields never reach the repository layer.
    const { firstName, lastName, phoneNumber } = rawData;
    const safeData: SafeUserUpdateData = {};
    if (firstName !== undefined) safeData.firstName = firstName;
    if (lastName !== undefined) safeData.lastName = lastName;
    if (phoneNumber !== undefined) safeData.phoneNumber = phoneNumber;

    await userRepository.update(user, safeData);
    logger.info(`User updated: ${user.id}`);
    return this.getUserById(id);
  }

  /** Alias used by the profile controller — same whitelist as updateUser. */
  async updateProfile(id: string, rawData: SafeUserUpdateData): Promise<User> {
    return this.updateUser(id, rawData);
  }

  async deactivateUser(id: string): Promise<void> {
    const user = await userRepository.findById(id);
    if (!user) throw new NotFoundError('User not found');
    await userRepository.update(user, { isActive: false, refreshToken: null });
    logger.info(`User deactivated: ${user.id}`);
  }

  async activateUser(id: string): Promise<void> {
    const user = await userRepository.findById(id);
    if (!user) throw new NotFoundError('User not found');
    await userRepository.update(user, { isActive: true });
    logger.info(`User activated: ${user.id}`);
  }

  async getPatientById(id: string): Promise<Patient> {
    const patient = await patientRepository.findById(id, { withUser: true });
    if (!patient) throw new NotFoundError('Patient not found');
    return patient;
  }

  async updatePatientProfile(userId: string, rawData: SafePatientUpdateData): Promise<Patient> {
    const patient = await patientRepository.findByUserId(userId, { withUser: true });
    if (!patient) throw new NotFoundError('Patient profile not found');

    // Whitelist only the fields a patient is allowed to self-update.
    const safeData: Partial<Patient> = {};
    if (rawData.dateOfBirth !== undefined) safeData.dateOfBirth = new Date(rawData.dateOfBirth);
    if (rawData.gender !== undefined) safeData.gender = rawData.gender;
    if (rawData.bloodGroup !== undefined) safeData.bloodGroup = rawData.bloodGroup;
    if (rawData.allergies !== undefined) safeData.allergies = rawData.allergies;
    if (rawData.emergencyContactName !== undefined)
      safeData.emergencyContactName = rawData.emergencyContactName;
    if (rawData.emergencyContactPhone !== undefined)
      safeData.emergencyContactPhone = rawData.emergencyContactPhone;

    await patientRepository.update(patient, safeData);
    logger.info(`Patient profile updated: userId=${userId}`);
    return this.getPatientById(patient.id);
  }
}

export const userService = new UserService();
