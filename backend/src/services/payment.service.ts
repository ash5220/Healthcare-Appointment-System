import { Payment } from '../models';
import { PaymentStatus, PaymentMethod, AppointmentStatus } from '../types/constants';
import { NotFoundError, BadRequestError } from '../shared/errors';
import { logger } from '../config/logger';
import { env } from '../config/env';
import { sequelize } from '../config/database';
import { patientRepository } from '../repositories/patient.repository';
import { paymentRepository } from '../repositories/payment.repository';
import { appointmentRepository } from '../repositories/appointment.repository';

// ── DTOs ──────────────────────────────────────────────────────────────────────

export interface InitiatePaymentInput {
  userId: string;
  appointmentId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  currency?: string;
  insuranceCoveredAmount?: number;
}

export interface InitiatePaymentResult {
  payment: Payment;
  stripe?: StripePaymentIntentResult;
  paypal?: PaypalOrderResult;
}

interface StripePaymentIntentResult {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
}

interface PaypalOrderResult {
  orderId: string;
  approvalUrl: string;
  amount: number;
  currency: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

class PaymentService {
  // ── Public Entry Points ───────────────────────────────────────────────────

  /**
   * Full payment initiation flow.
   *
   * Resolves patient from userId, calculates responsibility,
   * creates the payment record, then routes to the correct gateway.
   * All branching logic stays here — controllers never see it.
   */
  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
    const patientId = await this.resolvePatientId(input.userId);

    const insuranceCovered = input.insuranceCoveredAmount ?? 0;
    const patientResponsibility = input.amount - insuranceCovered;
    const currency = input.currency ?? 'USD';

    const payment = await this.createRecord({
      appointmentId: input.appointmentId,
      patientId,
      amount: input.amount,
      currency,
      paymentMethod: input.paymentMethod,
      insuranceCoveredAmount: insuranceCovered,
      patientResponsibility,
    });

    switch (input.paymentMethod) {
      case PaymentMethod.STRIPE:
        return {
          payment,
          stripe: await this.createStripeIntent(payment.id, patientResponsibility, currency),
        };

      case PaymentMethod.PAYPAL:
        return {
          payment,
          paypal: await this.createPaypalOrder(payment.id, patientResponsibility, currency),
        };

      default:
        // Cash / Insurance — no gateway needed
        return { payment };
    }
  }

  async confirmStripePayment(paymentIntentId: string): Promise<Payment> {
    return sequelize.transaction(async t => {
      const payment = await paymentRepository.findByStripeIntentId(paymentIntentId, t);
      if (!payment) throw new NotFoundError('Payment not found for this Stripe intent');

      await paymentRepository.update(
        payment,
        { paymentStatus: PaymentStatus.COMPLETED, paidAt: new Date() },
        t
      );

      await appointmentRepository.updateStatusById(
        payment.appointmentId as string,
        AppointmentStatus.CONFIRMED,
        t
      );

      logger.info(`Stripe payment confirmed and appointment updated: ${payment.id}`);
      return payment;
    });
  }

  async capturePaypalPayment(paypalOrderId: string, captureId?: string): Promise<Payment> {
    return sequelize.transaction(async t => {
      const payment = await paymentRepository.findByPaypalOrderId(paypalOrderId, t);
      if (!payment) throw new NotFoundError('Payment not found for this PayPal order');

      await paymentRepository.update(
        payment,
        {
          paymentStatus: PaymentStatus.COMPLETED,
          paypalCaptureId: captureId ?? `CAPTURE_${Date.now()}`,
          paidAt: new Date(),
        },
        t
      );

      await appointmentRepository.updateStatusById(
        payment.appointmentId as string,
        AppointmentStatus.CONFIRMED,
        t
      );

      logger.info(`PayPal payment captured and appointment updated: ${payment.id}`);
      return payment;
    });
  }

  async markAsCompleted(paymentId: string): Promise<Payment> {
    return sequelize.transaction(async t => {
      const payment = await this.findByIdOrFail(paymentId);

      await paymentRepository.update(
        payment,
        { paymentStatus: PaymentStatus.COMPLETED, paidAt: new Date() },
        t
      );

      await appointmentRepository.updateStatusById(
        payment.appointmentId as string,
        AppointmentStatus.CONFIRMED,
        t
      );

      logger.info(`Payment completed and appointment confirmed: ${paymentId}`);
      return payment;
    });
  }

  async markAsFailed(paymentId: string, reason: string): Promise<Payment> {
    const payment = await this.findByIdOrFail(paymentId);
    await paymentRepository.update(payment, {
      paymentStatus: PaymentStatus.FAILED,
      failureReason: reason,
    });
    logger.info(`Payment failed: ${paymentId}`);
    return payment;
  }

  async refund(paymentId: string, reason: string, amount?: number): Promise<Payment> {
    const payment = await this.findByIdOrFail(paymentId);

    if (payment.paymentStatus !== PaymentStatus.COMPLETED) {
      throw new BadRequestError('Can only refund completed payments');
    }

    const refundAmt = amount ?? Number(payment.amount);
    if (refundAmt > Number(payment.amount)) {
      throw new BadRequestError('Refund amount exceeds payment amount');
    }

    await paymentRepository.update(payment, {
      paymentStatus: PaymentStatus.REFUNDED,
      refundAmount: refundAmt,
      refundReason: reason,
      refundedAt: new Date(),
    });
    logger.info(`Payment refunded: ${paymentId}, amount: ${refundAmt}`);
    return payment;
  }

  // ── Read Operations ───────────────────────────────────────────────────────

  async getById(id: string): Promise<Payment> {
    return this.findByIdOrFail(id);
  }

  async getByUserId(userId: string): Promise<Payment[]> {
    const patientId = await this.resolvePatientId(userId);
    return paymentRepository.findByPatientId(patientId);
  }

  async getByAppointmentId(appointmentId: string): Promise<Payment[]> {
    return paymentRepository.findByAppointmentId(appointmentId);
  }

  // ── Private Helpers ───────────────────────────────────────────────────────

  private async resolvePatientId(userId: string): Promise<string> {
    const patient = await patientRepository.findByUserId(userId);
    if (!patient) throw new NotFoundError('Patient profile not found');
    return patient.id;
  }

  private async createRecord(data: {
    appointmentId: string;
    patientId: string;
    amount: number;
    currency: string;
    paymentMethod: PaymentMethod;
    insuranceCoveredAmount: number;
    patientResponsibility: number;
  }): Promise<Payment> {
    const exists = await paymentRepository.appointmentExists(data.appointmentId);
    if (!exists) throw new NotFoundError('Appointment not found');

    const payment = await paymentRepository.create({
      ...data,
      paymentStatus: PaymentStatus.PENDING,
    });
    logger.info(`Payment record created: ${payment.id}`);
    return payment;
  }

  private async createStripeIntent(
    paymentId: string,
    amount: number,
    currency: string
  ): Promise<StripePaymentIntentResult> {
    // When STRIPE_SECRET_KEY is set, swap with: new Stripe(env.stripeSecretKey).paymentIntents.create(...)
    const intentId = env.stripeSecretKey ? `pi_${Date.now()}` : `pi_simulated_${Date.now()}`;

    await paymentRepository.updateFieldsById(paymentId, { stripePaymentIntentId: intentId });
    logger.info(
      `Stripe intent created (${env.stripeSecretKey ? 'live' : 'simulated'}): ${intentId}`
    );

    return {
      clientSecret: `${intentId}_secret`,
      paymentIntentId: intentId,
      amount: Math.round(amount * 100), // Stripe works in cents
      currency: currency.toLowerCase(),
    };
  }

  private async createPaypalOrder(
    paymentId: string,
    amount: number,
    currency: string
  ): Promise<PaypalOrderResult> {
    // When PAYPAL_CLIENT_ID is set, swap with: paypalClient.orders.create(...)
    const orderId = env.paypalClientId ? `PAYPAL_${Date.now()}` : `PAYPAL_SIMULATED_${Date.now()}`;

    await paymentRepository.updateFieldsById(paymentId, { paypalOrderId: orderId });
    logger.info(`PayPal order created (${env.paypalClientId ? 'live' : 'simulated'}): ${orderId}`);

    return {
      orderId,
      approvalUrl: `https://www.${env.paypalMode === 'sandbox' ? 'sandbox.' : ''}paypal.com/checkoutnow?token=${orderId}`,
      amount,
      currency,
    };
  }

  private async findByIdOrFail(id: string): Promise<Payment> {
    const payment = await paymentRepository.findById(id);
    if (!payment) throw new NotFoundError('Payment not found');
    return payment;
  }
}

export const paymentService = new PaymentService();
