import crypto from 'crypto';
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
  hashToken
} from './auth.types';
import { emailService } from './email.service';

class RegistrationService {
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

      // Generate email-verification token inside the transaction so the hash
      // is persisted atomically with the user row.
      const verificationToken = crypto.randomBytes(32).toString('hex');
      await userRepository.update(
        user,
        { emailVerificationTokenHash: hashToken(verificationToken) },
        t
      );

      const tokens = generateTokenPair(user.id, user.email, user.role);
      await userRepository.update(user, { refreshToken: hashToken(tokens.refreshToken) }, t);

      // Fire-and-forget: email delivery failure should not roll back registration.
      emailService
        .sendEmailVerificationEmail(user.email, user.firstName, verificationToken)
        .catch(err => logger.error('Failed to send verification email:', err));

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

      // Generate and store email-verification token.
      const verificationToken = crypto.randomBytes(32).toString('hex');
      await userRepository.update(
        user,
        { emailVerificationTokenHash: hashToken(verificationToken) },
        t
      );

      emailService
        .sendEmailVerificationEmail(user.email, user.firstName, verificationToken)
        .catch(err => logger.error('Failed to send verification email:', err));

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

      // Generate and store email-verification token.
      const verificationToken = crypto.randomBytes(32).toString('hex');
      await userRepository.update(
        user,
        { emailVerificationTokenHash: hashToken(verificationToken) },
        t
      );

      emailService
        .sendEmailVerificationEmail(user.email, user.firstName, verificationToken)
        .catch(err => logger.error('Failed to send verification email:', err));

      logger.info(`Doctor registered successfully: ${user.email}`);

      return {
        user: user.toSafeObject(),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    });
  }
}

export const registrationService = new RegistrationService();
