import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { User } from '../models';
import { SafeUser } from '../models/User.model';
import { UserRole, Gender } from '../types/constants';
import {
  generateTokenPair,
  verifyRefreshToken,
  generateMfaToken,
  verifyMfaToken,
} from '../utils/jwt.util';
import { logger } from '../config/logger';
import { sequelize } from '../config/database';
import { BadRequestError, UnauthorizedError, NotFoundError, ConflictError } from '../shared/errors';
import { userRepository, patientRepository, doctorRepository } from '../repositories';
import { encrypt, decrypt, isEncrypted } from '../utils/crypto.util';
import { isCommonPassword, hashPassword } from '../utils/password.util';
import { MAX_LOGIN_ATTEMPTS, LOCKOUT_DURATION_MINUTES } from '../config/constants';

/**
 * Hash a token using SHA-256 for safe storage.
 * Refresh tokens are random so a fast hash is sufficient (unlike passwords).
 */
const hashToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

export interface RegisterUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  role?: UserRole;
}

export interface RegisterPatientData extends RegisterUserData {
  dateOfBirth: string;
  gender: Gender;
  bloodGroup?: string;
  allergies?: string[];
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

export interface RegisterDoctorData extends RegisterUserData {
  specialization: string;
  licenseNumber: string;
  yearsOfExperience?: number;
  consultationFee?: number;
  bio?: string;
  languages?: string[];
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user?: SafeUser;
  accessToken?: string;
  refreshToken?: string; // Controller places this in an HttpOnly cookie; never in the body
  mfaRequired?: boolean;
  tempToken?: string;
}

// MAX_LOGIN_ATTEMPTS and LOCKOUT_DURATION_MINUTES are imported from config/constants

class AuthService {
  async register(data: RegisterUserData): Promise<AuthResponse> {
    const { email, password, firstName, lastName, phoneNumber, role } = data;

    if (isCommonPassword(password)) {
      throw new BadRequestError('This password is too common. Please choose a stronger password.');
    }

    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) throw new ConflictError('Email already registered');

    return sequelize.transaction(async t => {
      const user = await userRepository.create(
        { email, password, firstName, lastName, phoneNumber, role: role || UserRole.PATIENT },
        t
      );

      const tokens = generateTokenPair(user.id, user.email, user.role);
      await userRepository.update(user, { refreshToken: hashToken(tokens.refreshToken) }, t);

      logger.info(`User registered successfully: ${user.email}`);

      return {
        user: user.toSafeObject(),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    });
  }

  async registerPatient(data: RegisterPatientData): Promise<AuthResponse> {
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
    } = data;

    if (isCommonPassword(password)) {
      throw new BadRequestError('This password is too common. Please choose a stronger password.');
    }

    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) throw new ConflictError('Email already registered');

    return sequelize.transaction(async t => {
      const user = await userRepository.create(
        { email, password, firstName, lastName, phoneNumber, role: UserRole.PATIENT },
        t
      );

      await patientRepository.create(
        {
          userId: user.id,
          dateOfBirth: new Date(dateOfBirth),
          gender,
          bloodGroup,
          allergies,
          emergencyContactName,
          emergencyContactPhone,
        },
        t
      );

      const tokens = generateTokenPair(user.id, user.email, user.role);
      await userRepository.update(user, { refreshToken: hashToken(tokens.refreshToken) }, t);

      logger.info(`Patient registered successfully: ${user.email}`);

      return {
        user: user.toSafeObject(),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    });
  }

  async registerDoctor(data: RegisterDoctorData): Promise<AuthResponse> {
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
    } = data;

    if (isCommonPassword(password)) {
      throw new BadRequestError('This password is too common. Please choose a stronger password.');
    }

    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) throw new ConflictError('Email already registered');

    const existingLicense = await doctorRepository.findByLicenseNumber(licenseNumber);
    if (existingLicense) throw new ConflictError('License number already registered');

    return sequelize.transaction(async t => {
      const user = await userRepository.create(
        { email, password, firstName, lastName, phoneNumber, role: UserRole.DOCTOR },
        t
      );

      await doctorRepository.create(
        {
          userId: user.id,
          specialization,
          licenseNumber,
          yearsOfExperience,
          consultationFee,
          bio,
          languages,
        },
        t
      );

      const tokens = generateTokenPair(user.id, user.email, user.role);
      await userRepository.update(user, { refreshToken: hashToken(tokens.refreshToken) }, t);

      logger.info(`Doctor registered successfully: ${user.email}`);

      return {
        user: user.toSafeObject(),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    });
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const { email, password } = credentials;

    const user = await userRepository.findByEmail(email);
    if (!user) throw new UnauthorizedError('Invalid email or password');

    if (user.isLocked()) {
      const lockoutRemaining = Math.ceil((user.lockoutUntil!.getTime() - Date.now()) / 60000);
      throw new UnauthorizedError(
        `Account is locked. Please try again in ${lockoutRemaining} minutes.`
      );
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account is deactivated');
    }

    // TODO: Re-enable this check once the email verification flow is implemented. Will do it later using AWS SES.
    // Currently disabled because isEmailVerified defaults to false in the DB and
    // there is no email-sending mechanism wired up yet — enabling it blocks ALL users.
    // if (!user.isEmailVerified) {
    //   throw new UnauthorizedError(
    //     'Please verify your email address before logging in. Check your inbox for a verification link.'
    //   );
    // }

    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      const loginAttempts = user.loginAttempts + 1;
      const updates: Partial<User> = { loginAttempts };

      if (loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        updates.lockoutUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60000);
        logger.warn(`Account locked due to failed login attempts: ${email}`);
      }

      await userRepository.update(user, updates);
      throw new UnauthorizedError('Invalid email or password');
    }

    await userRepository.update(user, {
      loginAttempts: 0,
      lockoutUntil: null,
      lastLoginAt: new Date(),
    });

    if (user.mfaEnabled) {
      return {
        mfaRequired: true,
        tempToken: generateMfaToken(user.id),
      };
    }

    const tokens = generateTokenPair(user.id, user.email, user.role);
    await userRepository.update(user, { refreshToken: hashToken(tokens.refreshToken) });

    logger.info(`User logged in successfully: ${user.email}`);

    return {
      user: user.toSafeObject(),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const { userId } = verifyRefreshToken(refreshToken);

      const user = await userRepository.findById(userId);
      if (!user) throw new UnauthorizedError('User not found');

      // Compare the incoming token against its stored hash (constant-time via crypto.timingSafeEqual)
      const incomingHash = hashToken(refreshToken);
      const storedHash = user.refreshToken ?? '';
      const isMatch =
        incomingHash.length === storedHash.length &&
        crypto.timingSafeEqual(Buffer.from(incomingHash), Buffer.from(storedHash));

      if (!isMatch) {
        // Possible token theft — invalidate all tokens
        await userRepository.update(user, { refreshToken: null });
        throw new UnauthorizedError('Invalid refresh token');
      }

      if (!user.isActive) throw new UnauthorizedError('Account is deactivated');

      // Token rotation: generate a brand new pair
      const tokens = generateTokenPair(user.id, user.email, user.role);
      await userRepository.update(user, { refreshToken: hashToken(tokens.refreshToken) });

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
  }

  async logout(userId: string): Promise<void> {
    const user = await userRepository.findById(userId);
    if (user) {
      await userRepository.update(user, { refreshToken: null });
      logger.info(`User logged out: ${user.email}`);
    }
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError('User not found');

    const isValidPassword = await user.comparePassword(currentPassword);
    if (!isValidPassword) throw new BadRequestError('Current password is incorrect');

    if (isCommonPassword(newPassword)) {
      throw new BadRequestError('This password is too common. Please choose a stronger password.');
    }

    // Hash the new password explicitly and bypass the beforeUpdate hook to
    // avoid double-hashing (the hook also hashes on password change).
    const hashedNewPassword = await hashPassword(newPassword);
    await userRepository.updateWithoutHooks(user, {
      password: hashedNewPassword,
      refreshToken: null,
    });

    logger.info(`Password changed for user: ${user.email}`);
  }

  async getUserById(userId: string): Promise<User> {
    const user = await userRepository.findById(userId, {
      withProfiles: true,
      excludeSensitive: true,
    });
    if (!user) throw new NotFoundError('User not found');
    return user;
  }

  async setupMfa(userId: string): Promise<{ qrCodeUrl: string; secret: string }> {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError('User not found');

    const secretInfo = speakeasy.generateSecret({ name: `HealthcareApp (${user.email})` });

    // Encrypt the MFA secret before storing in database
    const encryptedSecret = encrypt(secretInfo.base32);
    await userRepository.update(user, { mfaSecret: encryptedSecret });

    const qrCodeUrl = await QRCode.toDataURL(secretInfo.otpauth_url!);
    return { qrCodeUrl, secret: secretInfo.base32 };
  }

  async verifySetupMfa(userId: string, token: string): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user || !user.mfaSecret) throw new BadRequestError('MFA setup not initiated');

    // Decrypt the MFA secret for verification
    const decryptedSecret = isEncrypted(user.mfaSecret) ? decrypt(user.mfaSecret) : user.mfaSecret; // Backward compatibility for unencrypted secrets

    const isValid = speakeasy.totp.verify({
      secret: decryptedSecret,
      encoding: 'base32',
      token,
      window: 1, // Allow ±1 step (30 seconds) for clock skew
    });

    if (!isValid) throw new UnauthorizedError('Invalid MFA token');

    await userRepository.update(user, { mfaEnabled: true });
    logger.info(`MFA enabled for user: ${user.email}`);
  }

  async verifyMfaLogin(tempToken: string, token: string): Promise<AuthResponse> {
    let decoded;
    try {
      decoded = verifyMfaToken(tempToken);
    } catch {
      throw new UnauthorizedError('Invalid or expired MFA session');
    }

    const user = await userRepository.findById(decoded.userId);
    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      throw new UnauthorizedError('MFA is not enabled for this user');
    }

    // Decrypt the MFA secret for verification
    const decryptedSecret = isEncrypted(user.mfaSecret) ? decrypt(user.mfaSecret) : user.mfaSecret; // Backward compatibility for unencrypted secrets

    const isValid = speakeasy.totp.verify({
      secret: decryptedSecret,
      encoding: 'base32',
      token,
      window: 1, // Allow ±1 step (30 seconds) for clock skew
    });

    if (!isValid) throw new UnauthorizedError('Invalid MFA code');

    const tokens = generateTokenPair(user.id, user.email, user.role);
    await userRepository.update(user, { refreshToken: hashToken(tokens.refreshToken) });

    logger.info(`User logged in via MFA: ${user.email}`);

    return {
      user: user.toSafeObject(),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }
}

export const authService = new AuthService();
