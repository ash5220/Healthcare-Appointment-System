import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { validate } from '../middleware/validate.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import {
    loginRateLimitMiddleware,
    registrationRateLimitMiddleware,
} from '../middleware/rateLimit.middleware';
import {
    registerValidation,
    loginValidation,
    refreshTokenValidation,
    changePasswordValidation,
    mfaLoginValidation,
    setupMfaVerifyValidation,
    registerPatientValidation,
    registerDoctorValidation,
} from '../dto/auth.dto';

const router = Router();

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
    '/register',
    registrationRateLimitMiddleware,
    validate(registerValidation),
    authController.register
);

/**
 * @route   POST /api/v1/auth/register/patient
 * @desc    Register a new patient with profile
 * @access  Public
 */
router.post(
    '/register/patient',
    registrationRateLimitMiddleware,
    validate(registerPatientValidation),
    authController.registerPatient
);

/**
 * @route   POST /api/v1/auth/register/doctor
 * @desc    Register a new doctor with profile
 * @access  Public
 */
router.post(
    '/register/doctor',
    registrationRateLimitMiddleware,
    validate(registerDoctorValidation),
    authController.registerDoctor
);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
    '/login',
    loginRateLimitMiddleware,
    validate(loginValidation),
    authController.login
);

/**
 * @route   POST /api/v1/auth/verify-mfa
 * @desc    Verify MFA token for login
 * @access  Public
 */
router.post(
    '/verify-mfa',
    loginRateLimitMiddleware,
    validate(mfaLoginValidation),
    authController.verifyMfaLogin
);

/**
 * @route   POST /api/v1/auth/refresh-token
 * @desc    Refresh access token
 * @access  Public
 */
router.post(
    '/refresh-token',
    validate(refreshTokenValidation),
    authController.refreshToken
);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authMiddleware, authController.logout);

/**
 * @route   POST /api/v1/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post(
    '/change-password',
    authMiddleware,
    validate(changePasswordValidation),
    authController.changePassword
);

/**
 * @route   GET /api/v1/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', authMiddleware, authController.getProfile);

/**
 * @route   POST /api/v1/auth/setup-mfa
 * @desc    Initialize MFA setup
 * @access  Private
 */
router.post('/setup-mfa', authMiddleware, authController.setupMfa);

/**
 * @route   POST /api/v1/auth/verify-setup-mfa
 * @desc    Verify token to finalize MFA setup
 * @access  Private
 */
router.post('/verify-setup-mfa', authMiddleware, validate(setupMfaVerifyValidation), authController.verifySetupMfa);

export default router;
