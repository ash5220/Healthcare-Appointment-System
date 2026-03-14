import { logger } from '../config/logger';
import { NotFoundError, ConflictError } from '../shared/errors';
import {
  availabilityRepository,
  UpdateAvailabilityData as RepoUpdateData,
} from '../repositories/availability.repository';
import { DoctorAvailability } from '../models';
import { DayOfWeek } from '../types/constants';

export interface CreateAvailabilityData {
  doctorId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  slotDuration?: number;
  effectiveFrom: string;
  effectiveTo?: string;
}

export interface UpdateAvailabilityData {
  startTime?: string;
  endTime?: string;
  slotDuration?: number;
  isActive?: boolean;
  effectiveTo?: string;
}

class AvailabilityService {
  async create(data: CreateAvailabilityData): Promise<DoctorAvailability> {
    const {
      doctorId,
      dayOfWeek,
      startTime,
      endTime,
      slotDuration = 30,
      effectiveFrom,
      effectiveTo,
    } = data;

    // Verify doctor exists
    const doctorExists = await availabilityRepository.doctorExists(doctorId);
    if (!doctorExists) throw new NotFoundError('Doctor not found');

    // Check for overlapping availability
    const existing = await availabilityRepository.findOverlapping(
      doctorId,
      dayOfWeek,
      effectiveFrom,
      effectiveTo
    );
    if (existing) {
      throw new ConflictError(
        `Doctor already has availability set for ${dayOfWeek}. Please update the existing availability or set it as inactive first.`
      );
    }

    const availability = await availabilityRepository.create({
      doctorId,
      dayOfWeek,
      startTime,
      endTime,
      slotDuration,
      effectiveFrom: new Date(effectiveFrom),
      effectiveTo: effectiveTo ? new Date(effectiveTo) : undefined,
    });

    logger.info(`Availability created for doctor ${doctorId} on ${dayOfWeek}`);
    return availability;
  }

  async getByDoctorId(doctorId: string): Promise<DoctorAvailability[]> {
    return availabilityRepository.findByDoctorId(doctorId);
  }

  async getById(id: string): Promise<DoctorAvailability> {
    const availability = await availabilityRepository.findById(id);
    if (!availability) throw new NotFoundError('Availability not found');
    return availability;
  }

  async update(id: string, data: UpdateAvailabilityData): Promise<DoctorAvailability> {
    const availability = await this.getById(id);

    const { effectiveTo, ...rest } = data;
    const payload: RepoUpdateData = { ...rest };
    if (effectiveTo) payload.effectiveTo = new Date(effectiveTo);

    await availabilityRepository.update(availability, payload);
    logger.info(`Availability updated: ${id}`);
    return availability;
  }

  async delete(id: string): Promise<void> {
    const availability = await this.getById(id);
    await availabilityRepository.delete(availability);
    logger.info(`Availability deleted: ${id}`);
  }

  async setWeeklySchedule(
    doctorId: string,
    schedule: Array<{
      dayOfWeek: DayOfWeek;
      startTime: string;
      endTime: string;
      slotDuration?: number;
    }>,
    effectiveFrom: string
  ): Promise<DoctorAvailability[]> {
    const doctorExists = await availabilityRepository.doctorExists(doctorId);
    if (!doctorExists) throw new NotFoundError('Doctor not found');

    // Deactivate all existing availability
    await availabilityRepository.deactivateAll(doctorId, new Date(effectiveFrom));

    // Create new availability for each day
    const availabilities: DoctorAvailability[] = [];
    for (const slot of schedule) {
      const availability = await availabilityRepository.create({
        doctorId,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        slotDuration: slot.slotDuration || 30,
        effectiveFrom: new Date(effectiveFrom),
      });
      availabilities.push(availability);
    }

    logger.info(`Weekly schedule set for doctor ${doctorId}`);
    return availabilities;
  }
}

export const availabilityService = new AvailabilityService();
