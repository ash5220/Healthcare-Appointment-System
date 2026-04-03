import { Request, Response } from 'express';
import { authService } from '../services';
import { successResponse, createdResponse } from '../utils/response.util';
import { asyncHandler } from '../middleware';
import { AuthenticatedRequest } from '../types/express-augment';
import { z } from 'zod';
import {
  registerValidation,
  registerPatientValidation,
  registerDoctorValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  verifyEmailValidation,
  resendVerificationValidation,
  mfaLoginValidation,
  changePasswordValidation,
  setupMfaVerifyValidation,
  updateProfileValidation,
  requestEmailChangeValidation,
  confirmEmailChangeValidation,
} from '../dto/auth.dto';
import { UserRole } from '../types/constants';
import {
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  REFRESH_TOKEN_COOKIE,
} from '../utils/cookie.util';
import { UnauthorizedError, BadRequestError } from '../shared/errors';
import { userService } from '../services';
// ── Registration Endpoints ─────────────────────────────────────────────

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, firstName, lastName, phoneNumber, role } = req.body as z.infer<
    typeof registerValidation
  >['body'];

  const result = await authService.register({
    email,
    password,
    firstName,
    lastName,
    phoneNumber,
    role: role || UserRole.PATIENT,
  });

  // Refresh token → secure HttpOnly cookie (not in response body)
  setRefreshTokenCookie(res, result.refreshToken!);

  createdResponse(
    res,
    { user: result.user, accessToken: result.accessToken },
    'Registration successful'
  );
});

export const registerPatient = asyncHandler(async (req: Request, res: Response) => {
  const {
    email,
    password,
    firstName,
    lastName,
    phoneNumber,
    dateOfBirth,
    gender,
    bloodGroup,
    allergies,
    emergencyContactName,
    emergencyContactPhone,
  } = req.body as z.infer<typeof registerPatientValidation>['body'];

  if (!dateOfBirth || !gender) {
    throw new BadRequestError(
      'dateOfBirth and gender are required fields for patient registration'
    );
  }

  const result = await authService.registerPatient({
    email,
    password,
    firstName,
    lastName,
    phoneNumber,
    dateOfBirth,
    gender,
    bloodGroup,
    allergies,
    emergencyContactName,
    emergencyContactPhone,
  });

  setRefreshTokenCookie(res, result.refreshToken!);

  createdResponse(
    res,
    { user: result.user, accessToken: result.accessToken },
    'Patient registration successful'
  );
});

export const registerDoctor = asyncHandler(async (req: Request, res: Response) => {
  const {
    email,
    password,
    firstName,
    lastName,
    phoneNumber,
    specialization,
    licenseNumber,
    yearsOfExperience,
    consultationFee,
    bio,
    languages,
  } = req.body as z.infer<typeof registerDoctorValidation>['body'];

  const result = await authService.registerDoctor({
    email,
    password,
    firstName,
    lastName,
    phoneNumber,
    specialization,
    licenseNumber,
    yearsOfExperience,
    consultationFee,
    bio,
    languages,
  });

  setRefreshTokenCookie(res, result.refreshToken!);

  createdResponse(
    res,
    { user: result.user, accessToken: result.accessToken },
    'Doctor registration successful'
  );
});

// ── Login / Logout ─────────────────────────────────────────────────────

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as z.infer<typeof loginValidation>['body'];

  const result = await authService.login({ email, password });

  if (result.mfaRequired) {
    // Return 200 OK with mfaRequired flag, frontend will navigate to MFA screen
    successResponse(res, { mfaRequired: true, tempToken: result.tempToken }, 'MFA token required');
    return;
  }

  // Refresh token → secure HttpOnly cookie
  setRefreshTokenCookie(res, result.refreshToken!);

  successResponse(res, { user: result.user, accessToken: result.accessToken }, 'Login successful');
});

export const verifyMfaLogin = asyncHandler(async (req: Request, res: Response) => {
  const { tempToken, token } = req.body as z.infer<typeof mfaLoginValidation>['body'];

  const result = await authService.verifyMfaLogin(tempToken, token);

  // Refresh token → secure HttpOnly cookie
  setRefreshTokenCookie(res, result.refreshToken!);

  successResponse(res, { user: result.user, accessToken: result.accessToken }, 'Login successful');
});

export const logout = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await authService.logout(req.user.userId);

  // Clear the HttpOnly cookie
  clearRefreshTokenCookie(res);

  successResponse(res, null, 'Logged out successfully');
});

// ── Token Refresh ──────────────────────────────────────────────────────

export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  // Read the refresh token from the HttpOnly cookie (not the request body)
  const token = req.cookies[REFRESH_TOKEN_COOKIE] as string | undefined;

  if (!token) {
    throw new UnauthorizedError('No refresh token provided');
  }

  const tokens = await authService.refreshToken(token);

  // Rotate: set the new refresh token as a fresh HttpOnly cookie
  setRefreshTokenCookie(res, tokens.refreshToken);

  // Return only the new access token in the body
  successResponse(res, { accessToken: tokens.accessToken }, 'Token refreshed successfully');
});

// ── Profile / Password ─────────────────────────────────────────────────

export const changePassword = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body as z.infer<typeof changePasswordValidation>['body'];

  await authService.changePassword(req.user.userId, currentPassword, newPassword);

  // Invalidate refresh token cookie too (user must re-login)
  clearRefreshTokenCookie(res);

  successResponse(res, null, 'Password changed successfully');
});

export const getProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = await authService.getUserById(req.user.userId);
  successResponse(res, user);
});

export const updateProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { firstName, lastName, phoneNumber } = req.body as z.infer<
    typeof updateProfileValidation
  >['body'];
  const updated = await userService.updateProfile(req.user.userId, {
    firstName,
    lastName,
    phoneNumber,
  });
  successResponse(res, updated, 'Profile updated successfully');
});

export const requestEmailChange = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { newEmail } = req.body as z.infer<typeof requestEmailChangeValidation>['body'];
    await authService.requestEmailChange(req.user.userId, newEmail);
    successResponse(
      res,
      null,
      `A confirmation link has been sent to ${newEmail}. Click it to complete the change.`
    );
  }
);

export const confirmEmailChange = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body as z.infer<typeof confirmEmailChangeValidation>['body'];
  await authService.confirmEmailChange(token);
  successResponse(
    res,
    null,
    'Email changed successfully. Please log in again with your new email address.'
  );
});

// ── MFA Setup ──────────────────────────────────────────────────────────

export const setupMfa = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await authService.setupMfa(req.user.userId);
  successResponse(res, result, 'MFA setup initiated');
});

export const verifySetupMfa = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { token } = req.body as z.infer<typeof setupMfaVerifyValidation>['body'];
  await authService.verifySetupMfa(req.user.userId, token);
  successResponse(res, null, 'MFA enabled successfully');
});

// ── Password Reset ──────────────────────────────────────────────────────

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body as z.infer<typeof forgotPasswordValidation>['body'];
  await authService.forgotPassword(email);
  // Always success — prevents email enumeration
  successResponse(res, null, 'If that email is registered you will receive a reset link shortly');
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, newPassword } = req.body as z.infer<typeof resetPasswordValidation>['body'];
  await authService.resetPassword(token, newPassword);
  successResponse(res, null, 'Password has been reset successfully. Please log in with your new password.');
});

// ── Email Verification ──────────────────────────────────────────────────

export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body as z.infer<typeof verifyEmailValidation>['body'];
  await authService.verifyEmail(token);
  successResponse(res, null, 'Email verified successfully. You can now log in.');
});

export const resendVerification = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body as z.infer<typeof resendVerificationValidation>['body'];
  await authService.resendVerificationEmail(email);
  // Always success — prevents email enumeration
  successResponse(res, null, 'If that email is registered and unverified, a new verification link has been sent.');
});
