import { Transaction } from 'sequelize';
import { Payment, Appointment, Patient } from '../models';
import { PaymentMethod, PaymentStatus } from '../types/constants';

export interface CreatePaymentData {
  appointmentId: string;
  patientId: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  insuranceCoveredAmount: number;
  patientResponsibility: number;
  paymentStatus: PaymentStatus;
}

/** Shared include list for payment queries. */
const fullIncludes = [
  { model: Appointment, as: 'appointment' },
  { model: Patient, as: 'patient' },
];

class PaymentRepository {
  async create(data: CreatePaymentData): Promise<Payment> {
    return Payment.create(data as Payment['_creationAttributes']);
  }

  async findById(id: string): Promise<Payment | null> {
    return Payment.findByPk(id, { include: fullIncludes });
  }

  async findByStripeIntentId(intentId: string, transaction?: Transaction): Promise<Payment | null> {
    return Payment.findOne({
      where: { stripePaymentIntentId: intentId },
      transaction,
    });
  }

  async findByPaypalOrderId(orderId: string, transaction?: Transaction): Promise<Payment | null> {
    return Payment.findOne({ where: { paypalOrderId: orderId }, transaction });
  }

  async findByPatientId(patientId: string): Promise<Payment[]> {
    return Payment.findAll({
      where: { patientId },
      include: [{ model: Appointment, as: 'appointment' }],
      order: [['createdAt', 'DESC']],
    });
  }

  async findByAppointmentId(appointmentId: string): Promise<Payment[]> {
    return Payment.findAll({
      where: { appointmentId },
      order: [['createdAt', 'DESC']],
    });
  }

  async update(
    payment: Payment,
    data: Partial<Payment>,
    transaction?: Transaction
  ): Promise<Payment> {
    return payment.update(data, { transaction });
  }

  /** Targeted field update by id — used to store gateway IDs after creation. */
  async updateFieldsById(id: string, data: Partial<Payment>): Promise<void> {
    await Payment.update(data, { where: { id } });
  }

  async appointmentExists(appointmentId: string): Promise<boolean> {
    const appt = await Appointment.findByPk(appointmentId, { attributes: ['id'] });
    return appt !== null;
  }
}

export const paymentRepository = new PaymentRepository();
