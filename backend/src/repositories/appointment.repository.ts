import { Op, WhereOptions, Transaction } from 'sequelize';
import { Appointment, Patient, Doctor, User } from '../models';
import { AppointmentStatus } from '../types/constants';
import { Prescription } from '../models/Appointment.model';

export interface CreateAppointmentData {
  patientId: string;
  doctorId: string;
  appointmentDate: Date;
  startTime: string;
  endTime: string;
  reasonForVisit: string;
  status: AppointmentStatus;
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

export interface UpdateAppointmentData {
  appointmentDate?: Date;
  startTime?: string;
  endTime?: string;
  reasonForVisit?: string;
  notes?: string;
  status?: AppointmentStatus;
  prescriptions?: Prescription[];
  cancelledBy?: string;
  cancellationReason?: string;
}

/** Shared include for patient + doctor + their user profiles. */
const fullIncludes = [
  {
    model: Patient,
    as: 'patient',
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'email', 'phoneNumber'],
      },
    ],
  },
  {
    model: Doctor,
    as: 'doctor',
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'email', 'phoneNumber'],
      },
    ],
  },
];

class AppointmentRepository {
  async findById(id: string): Promise<Appointment | null> {
    return Appointment.findByPk(id, { include: fullIncludes });
  }

  async findConflicting(
    doctorId: string,
    appointmentDate: string,
    startTime: string,
    endTime: string,
    excludeId?: string
  ): Promise<Appointment | null> {
    const where: WhereOptions<Appointment> = {
      doctorId,
      appointmentDate,
      status: { [Op.notIn]: [AppointmentStatus.CANCELLED] },
      [Op.or]: [{ startTime: { [Op.lt]: endTime }, endTime: { [Op.gt]: startTime } }],
    };

    if (excludeId) {
      (where as Record<string, unknown>).id = { [Op.ne]: excludeId };
    }

    return Appointment.findOne({ where });
  }

  /**
   * Fetch paginated appointments from pre-resolved filters.
   * The service is responsible for resolving role-based IDs before calling this.
   */
  async findAll(
    filters: AppointmentFilters
  ): Promise<{ appointments: Appointment[]; total: number }> {
    const { patientId, doctorId, status, startDate, endDate, page = 1, limit = 10 } = filters;
    const where: WhereOptions<Appointment> = {};

    if (patientId) where.patientId = patientId;
    if (doctorId) where.doctorId = doctorId;
    if (status) where.status = status;

    if (startDate) {
      const current = (where.appointmentDate as object) || {};
      where.appointmentDate = { ...current, [Op.gte]: startDate };
    }

    if (endDate) {
      const current = (where.appointmentDate as object) || {};
      where.appointmentDate = { ...current, [Op.lte]: endDate };
    }

    const offset = (page - 1) * limit;
    const { rows: appointments, count: total } = await Appointment.findAndCountAll({
      where,
      include: fullIncludes,
      order: [
        ['appointmentDate', 'ASC'],
        ['startTime', 'ASC'],
      ],
      limit,
      offset,
    });

    return { appointments, total };
  }

  /** All non-cancelled appointments for a doctor on a given date (for slot calculation). */
  async findBookedByDoctorAndDate(
    doctorId: string,
    appointmentDate: string
  ): Promise<Appointment[]> {
    return Appointment.findAll({
      where: {
        doctorId,
        appointmentDate,
        status: { [Op.notIn]: [AppointmentStatus.CANCELLED] },
      },
      attributes: ['startTime', 'endTime'],
    });
  }

  async create(data: CreateAppointmentData, transaction?: Transaction): Promise<Appointment> {
    return Appointment.create(data as Appointment['_creationAttributes'], { transaction });
  }

  async update(
    appointment: Appointment,
    data: UpdateAppointmentData,
    transaction?: Transaction
  ): Promise<Appointment> {
    return appointment.update(data, { transaction });
  }

  /** Targeted status update by id — used by payment confirmations. */
  async updateStatusById(
    id: string,
    status: AppointmentStatus,
    transaction?: Transaction
  ): Promise<void> {
    await Appointment.update({ status }, { where: { id }, transaction });
  }
}

export const appointmentRepository = new AppointmentRepository();
