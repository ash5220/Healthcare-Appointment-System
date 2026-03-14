import { PaymentStatus, PaymentMethod } from './constants';
import { Appointment } from './appointment.model';

export interface Payment {
    id: string;
    appointmentId: string;
    patientId: string;
    amount: number;
    currency: string;
    paymentMethod: PaymentMethod;
    paymentStatus: PaymentStatus;
    stripePaymentIntentId?: string;
    stripeChargeId?: string;
    paypalOrderId?: string;
    paypalCaptureId?: string;
    insuranceCoveredAmount?: number;
    patientResponsibility?: number;
    refundAmount?: number;
    refundReason?: string;
    refundedAt?: Date;
    paidAt?: Date;
    failureReason?: string;
    appointment?: Appointment;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreatePaymentData {
    appointmentId: string;
    amount: number;
    paymentMethod: PaymentMethod;
    currency?: string;
    insuranceCoveredAmount?: number;
}

export interface StripePaymentResult {
    clientSecret: string;
    paymentIntentId: string;
    amount: number;
    currency: string;
}

export interface PaypalPaymentResult {
    orderId: string;
    approvalUrl: string;
    amount: number;
    currency: string;
}

export interface PaymentResponse {
    success: boolean;
    data: {
        payment: Payment;
        stripe?: StripePaymentResult;
        paypal?: PaypalPaymentResult;
    };
    message?: string;
}

export interface PaymentListResponse {
    success: boolean;
    data: {
        payments: Payment[];
    };
}
