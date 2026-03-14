import { sequelize } from '../config/database';
import { AppointmentStatus, UserRole } from '../types/constants';
import { addMinutesToTime, getDayOfWeek, doTimesOverlap } from '../utils/date.util';
import { logger } from '../config/logger';
import { BadRequestError, NotFoundError, ForbiddenError, ConflictError } from '../shared/errors';
import { Prescription } from '../models/Appointment.model';
import { Appointment } from '../models';
import { notificationService } from './notification.service';
import { DEFAULT_SLOT_DURATION_MINUTES } from '../config/constants';
import {
  appointmentRepository,
  patientRepository,
  doctorRepository,
  availabilityRepository,
} from '../repositories';

export interface CreateAppointmentData {
  userId: string;
  doctorId: string;
  appointmentDate: string;
  startTime: string;
  endTime?: string;
  reasonForVisit: string;
}

export interface UpdateAppointmentData {
  appointmentDate?: string;
  startTime?: string;
  endTime?: string;
  reasonForVisit?: string;
  notes?: string;
  status?: AppointmentStatus;
  prescriptions?: Prescription[];
}

export interface AppointmentFilters {
  patientId?: string;
  doctorId?: string;
  status?: AppointmentStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

const DEFAULT_SLOT_DURATION = DEFAULT_SLOT_DURATION_MINUTES; // imported from config/constants — do not redeclare

class AppointmentService {
  async create(data: CreateAppointmentData): Promise<Appointment> {
    const { userId, doctorId, appointmentDate, startTime, reasonForVisit } = data;

    // Resolve patient from userId
    const patient = await patientRepository.findByUserId(userId, { withUser: true });
    if (!patient) throw new NotFoundError('Patient profile not found');
    const patientId = patient.id;

    const doctor = await doctorRepository.findById(doctorId, { withUser: true });
    if (!doctor) throw new NotFoundError('Doctor not found');

    // Check doctor availability for the requested day
    const appointmentDateObj = new Date(appointmentDate);
    const dayOfWeek = getDayOfWeek(appointmentDateObj);

    const availability = await availabilityRepository.findForDay(
      doctorId,
      dayOfWeek,
      appointmentDate
    );
    if (!availability) throw new BadRequestError('Doctor is not available on this day');

    // Determine end time
    const endTime =
      data.endTime ||
      addMinutesToTime(startTime, availability.slotDuration || DEFAULT_SLOT_DURATION);

    // Validate time is within working hours
    if (startTime < availability.startTime || endTime > availability.endTime) {
      throw new BadRequestError(
        `Doctor's working hours on this day are ${availability.startTime} - ${availability.endTime}`
      );
    }

    // Check for conflicting appointments
    const conflict = await appointmentRepository.findConflicting(
      doctorId,
      appointmentDate,
      startTime,
      endTime
    );
    if (conflict) throw new ConflictError('This time slot is already booked');

    return sequelize.transaction(async t => {
      const appointment = await appointmentRepository.create(
        {
          patientId,
          doctorId,
          appointmentDate: appointmentDateObj,
          startTime,
          endTime,
          reasonForVisit,
          status: AppointmentStatus.SCHEDULED,
        },
        t
      );

      if (doctor.user) {
        await notificationService.createAppointmentNotification(
          doctor.user.id,
          'New Appointment',
          `New appointment scheduled by ${patient.user?.fullName} on ${appointmentDate} at ${startTime}`,
          'appointment_confirmed',
          { appointmentId: appointment.id, patientId: patient.id, appointmentDate },
          t
        );
      }

      logger.info(`Appointment created: ${appointment.id}`);
      return appointment;
    });
  }

  async getById(id: string): Promise<Appointment> {
    const appointment = await appointmentRepository.findById(id);
    if (!appointment) throw new NotFoundError('Appointment not found');
    return appointment;
  }

  /**
   * Fetch a single appointment and verify the requesting user has access.
   * Patients can only see their own appointments; doctors can only see theirs.
   */
  async getByIdForUser(id: string, userId: string, userRole: UserRole): Promise<Appointment> {
    const appointment = await this.getById(id);
    await this.checkAppointmentAccess(appointment, userId, userRole);
    return appointment;
  }

  async getAll(
    filters: AppointmentFilters,
    userId: string,
    userRole: UserRole
  ): Promise<{ appointments: Appointment[]; total: number }> {
    // Role-based ID resolution — admins can pass optional patientId/doctorId from query
    const resolvedFilters = { ...filters };

    if (userRole === UserRole.PATIENT) {
      const patient = await patientRepository.findByUserId(userId);
      if (!patient) throw new NotFoundError('Patient profile not found');
      resolvedFilters.patientId = patient.id;
    } else if (userRole === UserRole.DOCTOR) {
      const doctor = await doctorRepository.findByUserId(userId);
      if (!doctor) throw new NotFoundError('Doctor profile not found');
      resolvedFilters.doctorId = doctor.id;
    }

    return appointmentRepository.findAll(resolvedFilters);
  }

  async update(
    id: string,
    data: UpdateAppointmentData,
    userId: string,
    userRole: UserRole
  ): Promise<Appointment> {
    const appointment = await this.getById(id);
    await this.checkAppointmentAccess(appointment, userId, userRole);

    const immutable: AppointmentStatus[] = [
      AppointmentStatus.CANCELLED,
      AppointmentStatus.COMPLETED,
    ];
    if (immutable.includes(appointment.status)) {
      throw new BadRequestError('Cannot update a cancelled or completed appointment');
    }

    // Conflict check only when date/time is changing
    if (data.appointmentDate || data.startTime) {
      const newDate = data.appointmentDate || appointment.appointmentDate.toString();
      const newStart = data.startTime || appointment.startTime;
      const newEnd = data.endTime || appointment.endTime;

      const conflict = await appointmentRepository.findConflicting(
        appointment.doctorId as string,
        newDate,
        newStart,
        newEnd,
        id
      );
      if (conflict) throw new ConflictError('This time slot is already booked');
    }

    const { appointmentDate, ...rest } = data;
    const payload: Record<string, unknown> = { ...rest };
    if (appointmentDate) payload.appointmentDate = new Date(appointmentDate);

    await appointmentRepository.update(appointment, payload);

    logger.info(`Appointment updated: ${appointment.id}`);
    return this.getById(id);
  }

  async cancel(
    id: string,
    cancellationReason: string,
    userId: string,
    userRole: UserRole
  ): Promise<Appointment> {
    const appointment = await this.getById(id);
    await this.checkAppointmentAccess(appointment, userId, userRole);

    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestError('Appointment is already cancelled');
    }
    if (appointment.status === AppointmentStatus.COMPLETED) {
      throw new BadRequestError('Cannot cancel a completed appointment');
    }

    return sequelize.transaction(async t => {
      await appointmentRepository.update(
        appointment,
        { status: AppointmentStatus.CANCELLED, cancelledBy: userId, cancellationReason },
        t
      );

      const notifyUserId =
        userRole === UserRole.PATIENT
          ? appointment.doctor?.user?.id
          : appointment.patient?.user?.id;

      if (notifyUserId) {
        await notificationService.createAppointmentNotification(
          notifyUserId,
          'Appointment Cancelled',
          `Appointment scheduled for ${appointment.appointmentDate} at ${appointment.startTime} has been cancelled.`,
          'appointment_cancelled',
          { appointmentId: id },
          t
        );
      }

      logger.info(`Appointment cancelled: ${appointment.id}`);
      return appointment;
    });
  }

  async confirm(id: string, userId: string, userRole: UserRole): Promise<Appointment> {
    if (userRole !== UserRole.DOCTOR && userRole !== UserRole.ADMIN) {
      throw new ForbiddenError('Only doctors can confirm appointments');
    }

    const appointment = await this.getById(id);

    if (userRole === UserRole.DOCTOR) {
      const doctor = await doctorRepository.findByUserId(userId);
      if (!doctor || doctor.id !== appointment.doctorId) {
        throw new ForbiddenError('You can only confirm your own appointments');
      }
    }

    if (appointment.status !== AppointmentStatus.SCHEDULED) {
      throw new BadRequestError('Can only confirm scheduled appointments');
    }

    return sequelize.transaction(async t => {
      await appointmentRepository.update(appointment, { status: AppointmentStatus.CONFIRMED }, t);

      if (appointment.patient?.user?.id) {
        await notificationService.createAppointmentNotification(
          appointment.patient.user.id,
          'Appointment Confirmed',
          `Your appointment on ${appointment.appointmentDate} at ${appointment.startTime} has been confirmed.`,
          'appointment_confirmed',
          { appointmentId: id },
          t
        );
      }

      logger.info(`Appointment confirmed: ${appointment.id}`);
      return appointment;
    });
  }

  async complete(
    id: string,
    notes: string | undefined,
    prescriptions: Prescription[] | undefined,
    userId: string,
    userRole: UserRole
  ): Promise<Appointment> {
    if (userRole !== UserRole.DOCTOR && userRole !== UserRole.ADMIN) {
      throw new ForbiddenError('Only doctors can complete appointments');
    }

    const appointment = await this.getById(id);

    if (userRole === UserRole.DOCTOR) {
      const doctor = await doctorRepository.findByUserId(userId);
      if (!doctor || doctor.id !== appointment.doctorId) {
        throw new ForbiddenError('You can only complete your own appointments');
      }
    }

    const completable: AppointmentStatus[] = [
      AppointmentStatus.SCHEDULED,
      AppointmentStatus.CONFIRMED,
    ];
    if (!completable.includes(appointment.status)) {
      throw new BadRequestError('Can only complete scheduled or confirmed appointments');
    }

    await appointmentRepository.update(appointment, {
      status: AppointmentStatus.COMPLETED,
      notes,
      prescriptions,
    });

    logger.info(`Appointment completed: ${appointment.id}`);
    return this.getById(id);
  }

  async getAvailableSlots(doctorId: string, date: string): Promise<string[]> {
    const doctor = await doctorRepository.findById(doctorId);
    if (!doctor) throw new NotFoundError('Doctor not found');

    const dayOfWeek = getDayOfWeek(new Date(date));
    const availability = await availabilityRepository.findForDay(doctorId, dayOfWeek, date);
    if (!availability) return [];

    const allSlots = availability.getTimeSlots();
    const booked = await appointmentRepository.findBookedByDoctorAndDate(doctorId, date);

    return allSlots.filter(slot => {
      const slotEnd = addMinutesToTime(slot, availability.slotDuration);
      return !booked.some(apt => doTimesOverlap(slot, slotEnd, apt.startTime, apt.endTime));
    });
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private async checkAppointmentAccess(
    appointment: Appointment,
    userId: string,
    userRole: UserRole
  ): Promise<void> {
    if (userRole === UserRole.ADMIN) return;

    if (userRole === UserRole.PATIENT) {
      const patient = await patientRepository.findByUserId(userId);
      if (!patient || patient.id !== appointment.patientId) {
        throw new ForbiddenError('You can only access your own appointments');
      }
    }

    if (userRole === UserRole.DOCTOR) {
      const doctor = await doctorRepository.findByUserId(userId);
      if (!doctor || doctor.id !== appointment.doctorId) {
        throw new ForbiddenError('You can only access your own appointments');
      }
    }
  }
}

export const appointmentService = new AppointmentService();
