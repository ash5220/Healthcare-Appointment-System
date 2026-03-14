import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { verifyMfaToken, generateTokenPair } from '../utils/jwt.util';
import { logger } from '../config/logger';
import { BadRequestError, UnauthorizedError, NotFoundError } from '../shared/errors';
import { userRepository } from '../repositories';
import { encrypt, decrypt, isEncrypted } from '../utils/crypto.util';
import { AuthResponse, hashToken } from './auth.types';

class MfaService {
  async setupMfa(userId: string): Promise<{ qrCodeUrl: string; secret: string }> {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError('User not found');

    const secretInfo = speakeasy.generateSecret({ name: `HealthcareApp (${user.email})` });

    const encryptedSecret = encrypt(secretInfo.base32);
    await userRepository.update(user, { mfaSecret: encryptedSecret });

    const qrCodeUrl = await QRCode.toDataURL(secretInfo.otpauth_url!);
    return { qrCodeUrl, secret: secretInfo.base32 };
  }

  async verifySetupMfa(userId: string, token: string): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user || !user.mfaSecret) throw new BadRequestError('MFA setup not initiated');

    const decryptedSecret = isEncrypted(user.mfaSecret) ? decrypt(user.mfaSecret) : user.mfaSecret;

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

    const decryptedSecret = isEncrypted(user.mfaSecret) ? decrypt(user.mfaSecret) : user.mfaSecret;

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

export const mfaService = new MfaService();
