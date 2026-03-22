import { logger } from '../config/logger';
import { NotFoundError } from '../shared/errors';
import { doctorRepository, DoctorFilters } from '../repositories/doctor.repository';
import { Doctor } from '../models';

export { DoctorFilters } from '../repositories/doctor.repository';

/**
 * Fields a doctor is permitted to update on their own profile.
 * Deliberately excludes rating, totalPatients, licenseNumber and other
 * fields that should only be set by admins or system processes.
 */
export interface SafeDoctorUpdateData {
  specialization?: string;
  licenseNumber?: string;
  yearsOfExperience?: number;
  consultationFee?: number;
  bio?: string;
  languages?: string[];
}

class DoctorService {
  async getDoctors(filters: DoctorFilters): Promise<{ doctors: Doctor[]; total: number }> {
    return doctorRepository.findAll(filters);
  }

  async getDoctorById(id: string): Promise<Doctor> {
    const doctor = await doctorRepository.findById(id, { withUser: true });
    if (!doctor) throw new NotFoundError('Doctor not found');
    return doctor;
  }

  async getDoctorByUserId(userId: string): Promise<Doctor> {
    const doctor = await doctorRepository.findByUserId(userId, { withUser: true });
    if (!doctor) throw new NotFoundError('Doctor profile not found');
    return doctor;
  }

  async updateDoctorProfile(userId: string, rawData: Partial<Doctor>): Promise<Doctor> {
    const doctor = await this.getDoctorByUserId(userId);

    // Whitelist only the fields a doctor is allowed to self-update.
    // This prevents rating, totalPatients and other system-managed
    // fields from being tampered with via the update profile endpoint.
    const safeData: SafeDoctorUpdateData = {};
    if (rawData.specialization !== undefined) safeData.specialization = rawData.specialization;
    if (rawData.licenseNumber !== undefined) safeData.licenseNumber = rawData.licenseNumber;
    if (rawData.yearsOfExperience !== undefined) safeData.yearsOfExperience = rawData.yearsOfExperience;
    if (rawData.consultationFee !== undefined) safeData.consultationFee = rawData.consultationFee;
    if (rawData.bio !== undefined) safeData.bio = rawData.bio;
    if (rawData.languages !== undefined) safeData.languages = rawData.languages;

    await doctorRepository.update(doctor, safeData as Partial<Doctor>);
    logger.info(`Doctor profile updated for user: ${userId}`);
    return this.getDoctorById(doctor.id);
  }
}

export const doctorService = new DoctorService();
