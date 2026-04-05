import crypto from 'node:crypto';
import { Transaction } from 'sequelize';
import { UserRole } from '../types/constants';
import { generateTokenPair } from '../utils/jwt.util';
import { logger } from '../config/logger';
import { sequelize } from '../config/database';
import { BadRequestError, ConflictError } from '../shared/errors';
import { userRepository, patientRepository, doctorRepository } from '../repositories';
import { isCommonPassword } from '../utils/password.util';
import {
  RegisterUserData,
  RegisterPatientData,
  RegisterDoctorData,
  AuthResponse,
  hashToken,
} from './auth.types';
import { emailService } from './email.service';
import { sendEmailWithRetry } from '../utils/email-retry.util';

const EMAIL_VERIFICATION_EXPIRY_MS = 2 * 24 * 60 * 60 * 1000;

class RegistrationService {
  /**
   * Core registration logic shared by all register* methods.
   *
   * 1. Validates password strength and email uniqueness
   * 2. Creates user + optional profile inside a single transaction
   * 3. Generates JWT pair + email-verification token
   * 4. Sends verification email with retry
   *
   * @param data       Base user fields (email, password, names, …)
   * @param role       The role to assign
   * @param createProfile  Optional callback to create a role-specific profile inside the transaction
   */
  private async registerWithProfile(
    data: RegisterUserData,
    role: UserRole,
    createProfile?: (userId: string, t: Transaction) => Promise<void>
  ): Promise<AuthResponse> {
    const { email, password, firstName, lastName, phoneNumber } = data;

    if (isCommonPassword(password)) {
      throw new BadRequestError('This password is too common. Please choose a stronger password.');
    }

    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) throw new ConflictError('Email already registered');

    return sequelize.transaction(async t => {
      const user = await userRepository.create(
        { email, password, firstName, lastName, phoneNumber, role },
        t
      );

      if (createProfile) {
        await createProfile(user.id, t);
      }

      const tokens = generateTokenPair(user.id, user.email, user.role);
      await userRepository.update(user, { refreshToken: hashToken(tokens.refreshToken) }, t);

      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationExpiresAt = new Date(Date.now() + EMAIL_VERIFICATION_EXPIRY_MS);
      await userRepository.update(
        user,
        {
          emailVerificationTokenHash: hashToken(verificationToken),
          emailVerificationExpiresAt: verificationExpiresAt,
        },
        t
      );

      // Fire-and-forget: don't block registration on email delivery
      void sendEmailWithRetry(
        () =>
          emailService.sendEmailVerificationEmail(user.email, user.firstName, verificationToken),
        `registration userId=${user.id}`
      );

      logger.info(`User registered successfully: userId=${user.id}, role=${role}`);

      return {
        user: user.toSafeObject(),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    });
  }

  async register(data: RegisterUserData): Promise<AuthResponse> {
    return this.registerWithProfile(data, data.role || UserRole.PATIENT);
  }

  async registerPatient(data: RegisterPatientData): Promise<AuthResponse> {
    const {
      dateOfBirth,
      gender,
      bloodGroup,
      allergies,
      emergencyContactName,
      emergencyContactPhone,
    } = data;

    return this.registerWithProfile(data, UserRole.PATIENT, async (userId, t) => {
      await patientRepository.create(
        {
          userId,
          dateOfBirth: new Date(dateOfBirth),
          gender,
          bloodGroup,
          allergies,
          emergencyContactName,
          emergencyContactPhone,
        },
        t
      );
    });
  }

  async registerDoctor(data: RegisterDoctorData): Promise<AuthResponse> {
    const { specialization, licenseNumber, yearsOfExperience, consultationFee, bio, languages } =
      data;

    const existingLicense = await doctorRepository.findByLicenseNumber(licenseNumber);
    if (existingLicense) throw new ConflictError('License number already registered');

    return this.registerWithProfile(data, UserRole.DOCTOR, async (userId, t) => {
      await doctorRepository.create(
        {
          userId,
          specialization,
          licenseNumber,
          yearsOfExperience,
          consultationFee,
          bio,
          languages,
        },
        t
      );
    });
  }
}

export const registrationService = new RegistrationService();
