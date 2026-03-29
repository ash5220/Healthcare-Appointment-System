import { AuthenticatedRequest } from '../types/express.d';
import { insuranceService } from '../services/insurance.service';
import type {
  CreateInsuranceInput,
  UpdateInsuranceInput,
  VerifyInsuranceInput,
} from '../services/insurance.service';
import { asyncHandler } from '../middleware/error.middleware';
import { successResponse, createdResponse } from '../utils/response.util';

// POST /api/v1/insurance
export const createInsurance = asyncHandler<AuthenticatedRequest>(async (req, res) => {
  const insurance = await insuranceService.create(
    req.user.userId,
    req.body as CreateInsuranceInput
  );
  createdResponse(res, { insurance }, 'Insurance record created successfully');
});

// GET /api/v1/insurance
export const getMyInsurance = asyncHandler<AuthenticatedRequest>(async (req, res) => {
  const insurances = await insuranceService.getAll(req.user.userId);
  successResponse(res, { insurances });
});

// GET /api/v1/insurance/active
export const getActiveInsurance = asyncHandler<AuthenticatedRequest>(async (req, res) => {
  const insurance = await insuranceService.getActive(req.user.userId);
  successResponse(res, { hasActiveInsurance: !!insurance, insurance: insurance ?? null });
});

// GET /api/v1/insurance/:id
export const getInsuranceById = asyncHandler(async (req, res) => {
  const insurance = await insuranceService.getById(req.params['id']);
  successResponse(res, { insurance });
});

// PUT /api/v1/insurance/:id
export const updateInsurance = asyncHandler<AuthenticatedRequest>(async (req, res) => {
  const insurance = await insuranceService.update(
    req.params['id'],
    req.user.userId,
    req.body as UpdateInsuranceInput
  );
  successResponse(res, { insurance }, 'Insurance record updated successfully');
});

// POST /api/v1/insurance/:id/verify  (admin only)
export const verifyInsurance = asyncHandler(async (req, res) => {
  const insurance = await insuranceService.verify(
    req.params['id'],
    req.body as VerifyInsuranceInput
  );
  successResponse(
    res,
    { insurance },
    `Insurance verification status updated to: ${insurance.verificationStatus}`
  );
});

// POST /api/v1/insurance/:id/deactivate
export const deactivateInsurance = asyncHandler<AuthenticatedRequest>(async (req, res) => {
  const insurance = await insuranceService.deactivate(req.params['id'], req.user.userId);
  successResponse(res, { insurance }, 'Insurance record deactivated');
});

// DELETE /api/v1/insurance/:id
export const deleteInsurance = asyncHandler<AuthenticatedRequest>(async (req, res) => {
  await insuranceService.delete(req.params['id'], req.user.userId);
  successResponse(res, undefined, 'Insurance record deleted');
});

// GET /api/v1/insurance/patient/:patientId  (admin only)
export const getPatientInsurance = asyncHandler(async (req, res) => {
  const insurances = await insuranceService.getByPatientId(req.params['patientId']);
  successResponse(res, { insurances });
});
