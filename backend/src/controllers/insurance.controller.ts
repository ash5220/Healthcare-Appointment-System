import { Response } from 'express';
import { AuthenticatedRequest } from '../types/express.d';
import { insuranceService } from '../services/insurance.service';
import { asyncHandler } from '../middleware/error.middleware';

/**
 * POST /api/v1/insurance
 */
export const createInsurance = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const insurance = await insuranceService.create(
            req.user!.userId,
            req.body
        );

        res.status(201).json({
            success: true,
            data: { insurance },
            message: 'Insurance record created successfully',
        });
    }
);

/**
 * GET /api/v1/insurance
 */
export const getMyInsurance = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const insurances = await insuranceService.getAll(req.user!.userId);

        res.json({
            success: true,
            data: { insurances },
        });
    }
);

/**
 * GET /api/v1/insurance/active
 */
export const getActiveInsurance = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const insurance = await insuranceService.getActive(req.user!.userId);

        res.json({
            success: true,
            data: {
                hasActiveInsurance: !!insurance,
                insurance: insurance ?? null,
            },
        });
    }
);

/**
 * GET /api/v1/insurance/:id
 */
export const getInsuranceById = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const insurance = await insuranceService.getById(req.params.id);

        res.json({
            success: true,
            data: { insurance },
        });
    }
);

/**
 * PUT /api/v1/insurance/:id
 */
export const updateInsurance = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const insurance = await insuranceService.update(
            req.params.id,
            req.user!.userId,
            req.body
        );

        res.json({
            success: true,
            data: { insurance },
            message: 'Insurance record updated successfully',
        });
    }
);

/**
 * POST /api/v1/insurance/:id/verify  (admin only)
 */
export const verifyInsurance = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const insurance = await insuranceService.verify(req.params.id, req.body);

        res.json({
            success: true,
            data: { insurance },
            message: `Insurance verification status updated to: ${insurance.verificationStatus}`,
        });
    }
);

/**
 * POST /api/v1/insurance/:id/deactivate
 */
export const deactivateInsurance = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const insurance = await insuranceService.deactivate(
            req.params.id,
            req.user!.userId
        );

        res.json({
            success: true,
            data: { insurance },
            message: 'Insurance record deactivated',
        });
    }
);

/**
 * DELETE /api/v1/insurance/:id
 */
export const deleteInsurance = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        await insuranceService.delete(req.params.id, req.user!.userId);

        res.json({
            success: true,
            message: 'Insurance record deleted',
        });
    }
);

/**
 * GET /api/v1/insurance/patient/:patientId  (admin only)
 */
export const getPatientInsurance = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const insurances = await insuranceService.getByPatientId(
            req.params.patientId
        );

        res.json({
            success: true,
            data: { insurances },
        });
    }
);
