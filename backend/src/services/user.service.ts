import { User, Patient } from '../models';
import { logger } from '../config/logger';
import { NotFoundError } from '../shared/errors';
import { userRepository, UserFilters } from '../repositories/user.repository';
import { patientRepository } from '../repositories/patient.repository';

export { UserFilters } from '../repositories/user.repository';

class UserService {
  async getUsers(filters: UserFilters): Promise<{ users: User[]; total: number }> {
    return userRepository.findAll(filters);
  }

  async getUserById(id: string): Promise<User> {
    const user = await userRepository.findById(id, { withProfiles: true, excludeSensitive: true });
    if (!user) throw new NotFoundError('User not found');
    return user;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    const user = await userRepository.findById(id);
    if (!user) throw new NotFoundError('User not found');

    // Don't allow updating password through this method
    delete data.password;

    await userRepository.update(user, data);
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

  async updatePatientProfile(userId: string, data: Partial<Patient>): Promise<Patient> {
    const patient = await patientRepository.findByUserId(userId, { withUser: true });
    if (!patient) throw new NotFoundError('Patient profile not found');
    await patientRepository.update(patient, data);
    logger.info(`Patient profile updated for user: ${userId}`);
    return this.getPatientById(patient.id);
  }
}

export const userService = new UserService();
