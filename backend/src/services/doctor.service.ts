import { logger } from '../config/logger';
import { NotFoundError } from '../shared/errors';
import { doctorRepository, DoctorFilters } from '../repositories/doctor.repository';
import { Doctor } from '../models';

export { DoctorFilters } from '../repositories/doctor.repository';

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

  async updateDoctorProfile(userId: string, data: Partial<Doctor>): Promise<Doctor> {
    const doctor = await this.getDoctorByUserId(userId);
    await doctorRepository.update(doctor, data);
    logger.info(`Doctor profile updated for user: ${userId}`);
    return this.getDoctorById(doctor.id);
  }
}

export const doctorService = new DoctorService();
