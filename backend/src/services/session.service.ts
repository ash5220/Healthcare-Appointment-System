import crypto from 'crypto';
import { User } from '../models';
import {
  generateTokenPair,
  verifyRefreshToken,
  generateMfaToken
} from '../utils/jwt.util';
import { logger } from '../config/logger';
import { BadRequestError, UnauthorizedError, NotFoundError } from '../shared/errors';
import { userRepository } from '../repositories';
import { isCommonPassword, hashPassword } from '../utils/password.util';
import { MAX_LOGIN_ATTEMPTS, LOCKOUT_DURATION_MINUTES } from '../config/constants';
import { LoginCredentials, AuthResponse, hashToken } from './auth.types';

class SessionService {
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

      const incomingHash = hashToken(refreshToken);
      const storedHash = user.refreshToken ?? '';
      const isMatch =
        incomingHash.length === storedHash.length &&
        crypto.timingSafeEqual(Buffer.from(incomingHash), Buffer.from(storedHash));

      if (!isMatch) {
        await userRepository.update(user, { refreshToken: null });
        throw new UnauthorizedError('Invalid refresh token');
      }

      if (!user.isActive) throw new UnauthorizedError('Account is deactivated');

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
}

export const sessionService = new SessionService();
