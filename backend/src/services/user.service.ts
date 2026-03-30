import { User, Patient } from '../models';
import { logger } from '../config/logger';
import { NotFoundError } from '../shared/errors';
import { userRepository, UserFilters } from '../repositories/user.repository';
import { patientRepository } from '../repositories/patient.repository';

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

class UserService {
  async getUsers(filters: UserFilters): Promise<{ users: User[]; total: number }> {
    return userRepository.findAll(filters);
  }

  async getUserById(id: string): Promise<User> {
    const user = await userRepository.findById(id, { withProfiles: true, excludeSensitive: true });
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
    logger.info(`User updated: ${user.email}`);
    return this.getUserById(id);
  }

  async deactivateUser(id: string): Promise<void> {
    const user = await userRepository.findById(id);
    if (!user) throw new NotFoundError('User not found');
    await userRepository.update(user, { isActive: false, refreshToken: null });
    logger.info(`User deactivated: ${user.email}`);
  }

  async activateUser(id: string): Promise<void> {
    const user = await userRepository.findById(id);
    if (!user) throw new NotFoundError('User not found');
    await userRepository.update(user, { isActive: true });
    logger.info(`User activated: ${user.email}`);
  }

  async getPatientById(id: string): Promise<Patient> {
    const patient = await patientRepository.findById(id, { withUser: true });
    if (!patient) throw new NotFoundError('Patient not found');
    return patient;
  }

  async updatePatientProfile(userId: string, rawData: Partial<Patient>): Promise<Patient> {
    const patient = await patientRepository.findByUserId(userId, { withUser: true });
    if (!patient) throw new NotFoundError('Patient profile not found');

    // Whitelist only the fields a patient is allowed to self-update.
    const { dateOfBirth, gender, bloodGroup, allergies, emergencyContactName, emergencyContactPhone } = rawData as Record<string, unknown>;
    const safeData: Partial<Patient> = {};
    if (dateOfBirth !== undefined) safeData.dateOfBirth = new Date(dateOfBirth as string);
    if (gender !== undefined) safeData.gender = gender as Patient['gender'];
    if (bloodGroup !== undefined) safeData.bloodGroup = bloodGroup as string;
    if (allergies !== undefined) safeData.allergies = allergies as string[];
    if (emergencyContactName !== undefined) safeData.emergencyContactName = emergencyContactName as string;
    if (emergencyContactPhone !== undefined) safeData.emergencyContactPhone = emergencyContactPhone as string;

    await patientRepository.update(patient, safeData);
    logger.info(`Patient profile updated for user: ${userId}`);
    return this.getPatientById(patient.id);
  }
}

export const userService = new UserService();
