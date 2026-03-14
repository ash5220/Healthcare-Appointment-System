import { Response } from 'express';
import { AuthenticatedRequest } from '../types/express.d';
import { paymentService } from '../services/payment.service';
import { asyncHandler } from '../middleware/error.middleware';

/**
 * POST /api/v1/payments
 *
 * Thin adapter: extracts request data, delegates all business logic
 * (patient lookup, responsibility calculation, gateway routing) to
 * paymentService.initiatePayment(), then formats the HTTP response.
 */
export const createPayment = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const result = await paymentService.initiatePayment({
            userId: req.user!.userId,
            appointmentId: req.body.appointmentId,
            amount: req.body.amount,
            paymentMethod: req.body.paymentMethod,
            currency: req.body.currency,
            insuranceCoveredAmount: req.body.insuranceCoveredAmount,
        });

        res.status(201).json({
            success: true,
            data: result,
            message: 'Payment initiated successfully',
        });
    }
);

/**
 * POST /api/v1/payments/stripe/confirm
 */
export const confirmStripePayment = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const payment = await paymentService.confirmStripePayment(
            req.body.paymentIntentId
        );

        res.json({
            success: true,
            data: { payment },
            message: 'Stripe payment confirmed successfully',
        });
    }
);

/**
 * POST /api/v1/payments/paypal/capture
 */
export const capturePaypalPayment = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const payment = await paymentService.capturePaypalPayment(
            req.body.orderId,
            req.body.captureId
        );

        res.json({
            success: true,
            data: { payment },
            message: 'PayPal payment captured successfully',
        });
    }
);

/**
 * POST /api/v1/payments/:id/complete  (admin)
 */
export const completePayment = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const payment = await paymentService.markAsCompleted(req.params.id);

        res.json({
            success: true,
            data: { payment },
            message: 'Payment marked as completed',
        });
    }
);

/**
 * POST /api/v1/payments/:id/refund  (admin)
 */
export const refundPayment = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const payment = await paymentService.refund(
            req.params.id,
            req.body.reason,
            req.body.amount
        );

        res.json({
            success: true,
            data: { payment },
            message: 'Payment refunded successfully',
        });
    }
);

/**
 * GET /api/v1/payments
 *
 * The userId → patient → payments resolution is now fully inside the service.
 * The controller simply passes req.user.userId through.
 */
export const getMyPayments = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const payments = await paymentService.getByUserId(req.user!.userId);

        res.json({
            success: true,
            data: { payments },
        });
    }
);

/**
 * GET /api/v1/payments/:id
 */
export const getPaymentById = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const payment = await paymentService.getById(req.params.id);

        res.json({
            success: true,
            data: { payment },
        });
    }
);

/**
 * GET /api/v1/payments/appointment/:appointmentId
 */
export const getAppointmentPayments = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const payments = await paymentService.getByAppointmentId(
            req.params.appointmentId
        );

        res.json({
            success: true,
            data: { payments },
        });
    }
);
