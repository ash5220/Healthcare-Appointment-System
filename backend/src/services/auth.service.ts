import { User } from '../models';
import { registrationService } from './registration.service';
import { sessionService } from './session.service';
import { mfaService } from './mfa.service';
import {
  RegisterUserData,
  RegisterPatientData,
  RegisterDoctorData,
  LoginCredentials,
  AuthResponse
} from './auth.types';

class AuthService {
  async register(data: RegisterUserData): Promise<AuthResponse> {
    return registrationService.register(data);
  }

  async registerPatient(data: RegisterPatientData): Promise<AuthResponse> {
    return registrationService.registerPatient(data);
  }

  async registerDoctor(data: RegisterDoctorData): Promise<AuthResponse> {
    return registrationService.registerDoctor(data);
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    return sessionService.login(credentials);
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    return sessionService.refreshToken(refreshToken);
  }

  async logout(userId: string): Promise<void> {
    return sessionService.logout(userId);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    return sessionService.changePassword(userId, currentPassword, newPassword);
  }

  async getUserById(userId: string): Promise<User> {
    return sessionService.getUserById(userId);
  }

  async setupMfa(userId: string): Promise<{ qrCodeUrl: string; secret: string }> {
    return mfaService.setupMfa(userId);
  }

  async verifySetupMfa(userId: string, token: string): Promise<void> {
    return mfaService.verifySetupMfa(userId, token);
  }

  async verifyMfaLogin(tempToken: string, token: string): Promise<AuthResponse> {
    return mfaService.verifyMfaLogin(tempToken, token);
  }
}

export const authService = new AuthService();
