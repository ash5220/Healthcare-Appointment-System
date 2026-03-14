
// Move mocks to top
jest.mock('../../config/database', () => ({
    sequelize: {
        modelManager: {
            addModel: jest.fn(),
            getModel: jest.fn(),
        },
        connectionManager: {
            getConnection: jest.fn(),
        },
        import: jest.fn(),
    },
    initializeDatabase: jest.fn(),
    closeDatabase: jest.fn(),
}));

jest.mock('../../models', () => {
    return {
        User: {
            findOne: jest.fn(),
            create: jest.fn(),
            findByPk: jest.fn(),
            init: jest.fn(),
            hasOne: jest.fn(),
            belongsTo: jest.fn(),
            hasMany: jest.fn(),
            update: jest.fn(),
            isLocked: jest.fn(),
            comparePassword: jest.fn(),
        },
        Patient: {
            create: jest.fn(),
            init: jest.fn(),
            belongsTo: jest.fn(),
            hasMany: jest.fn(),
        },
        Doctor: {
            findOne: jest.fn(),
            create: jest.fn(),
            init: jest.fn(),
            belongsTo: jest.fn(),
            hasMany: jest.fn(),
        },
        initializeAssociations: jest.fn(),
    };
});

jest.mock('../../utils/jwt.util', () => ({
    generateTokenPair: jest.fn(),
    verifyRefreshToken: jest.fn(),
}));

jest.mock('../../config/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

import { authService } from '../../services/auth.service';
import { User, Patient, Doctor } from '../../models';
import { UserRole, Gender } from '../../types/constants';
import { generateTokenPair, verifyRefreshToken } from '../../utils/jwt.util';
import { ConflictError, UnauthorizedError, NotFoundError, BadRequestError } from '../../middleware/error.middleware';

describe('AuthService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // Helper to create mock user
    const createMockUser = (overrides = {}) => ({
        id: 'user-id',
        email: 'test@example.com',
        role: UserRole.PATIENT,
        loginAttempts: 0,
        isActive: true,
        update: jest.fn().mockResolvedValue(true),
        toSafeObject: jest.fn().mockReturnValue({ id: 'user-id', email: 'test@example.com' }),
        comparePassword: jest.fn().mockResolvedValue(true),
        isLocked: jest.fn().mockReturnValue(false),
        ...overrides,
    });

    describe('register', () => {
        const registerData = {
            email: 'test@example.com',
            password: 'password123',
            firstName: 'John',
            lastName: 'Doe',
            role: UserRole.PATIENT,
        };

        it('should register a new user successfully', async () => {
            (User.findOne as jest.Mock).mockResolvedValue(null);

            const mockUser = createMockUser();
            (User.create as jest.Mock).mockResolvedValue(mockUser);

            const mockTokens = { accessToken: 'access', refreshToken: 'refresh' };
            (generateTokenPair as jest.Mock).mockReturnValue(mockTokens);

            const result = await authService.register(registerData);

            expect(User.findOne).toHaveBeenCalledWith({ where: { email: registerData.email } });
            expect(User.create).toHaveBeenCalled();
            expect(result.tokens).toEqual(mockTokens);
        });

        it('should throw ConflictError if email already exists', async () => {
            (User.findOne as jest.Mock).mockResolvedValue({ id: 'existing-id' });

            await expect(authService.register(registerData))
                .rejects.toThrow(ConflictError);
        });
    });

    describe('registerPatient', () => {
        const patientData = {
            email: 'patient@example.com',
            password: 'password123',
            firstName: 'John',
            lastName: 'Doe',
            dateOfBirth: '1990-01-01',
            gender: Gender.MALE,
        };

        it('should register a patient successfully', async () => {
            (User.findOne as jest.Mock).mockResolvedValue(null);
            const mockUser = createMockUser({ role: UserRole.PATIENT });
            (User.create as jest.Mock).mockResolvedValue(mockUser);
            (generateTokenPair as jest.Mock).mockReturnValue({ accessToken: 'a', refreshToken: 'r' });

            await authService.registerPatient(patientData);

            expect(User.create).toHaveBeenCalledWith(expect.objectContaining({ role: UserRole.PATIENT }));
            expect(Patient.create).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-id' }));
        });

        it('should throw ConflictError if email exists', async () => {
            (User.findOne as jest.Mock).mockResolvedValue({});
            await expect(authService.registerPatient(patientData)).rejects.toThrow(ConflictError);
        });
    });

    describe('registerDoctor', () => {
        const doctorData = {
            email: 'doctor@example.com',
            password: 'password123',
            firstName: 'Dr',
            lastName: 'Who',
            specialization: 'Cardiology',
            licenseNumber: 'LIC123',
        };

        it('should register a doctor successfully', async () => {
            (User.findOne as jest.Mock).mockResolvedValue(null);
            (Doctor.findOne as jest.Mock).mockResolvedValue(null);
            const mockUser = createMockUser({ role: UserRole.DOCTOR });
            (User.create as jest.Mock).mockResolvedValue(mockUser);
            (generateTokenPair as jest.Mock).mockReturnValue({ accessToken: 'a', refreshToken: 'r' });

            await authService.registerDoctor(doctorData);

            expect(User.create).toHaveBeenCalledWith(expect.objectContaining({ role: UserRole.DOCTOR }));
            expect(Doctor.create).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-id', licenseNumber: 'LIC123' }));
        });

        it('should throw ConflictError if email exists', async () => {
            (User.findOne as jest.Mock).mockResolvedValue({});
            await expect(authService.registerDoctor(doctorData)).rejects.toThrow(ConflictError);
        });

        it('should throw ConflictError if license number exists', async () => {
            (User.findOne as jest.Mock).mockResolvedValue(null);
            (Doctor.findOne as jest.Mock).mockResolvedValue({});
            await expect(authService.registerDoctor(doctorData)).rejects.toThrow(ConflictError);
        });
    });

    describe('login', () => {
        const loginCredentials = {
            email: 'test@example.com',
            password: 'password123',
        };

        it('should login successfully', async () => {
            const mockUser = createMockUser();
            (User.findOne as jest.Mock).mockResolvedValue(mockUser);
            (generateTokenPair as jest.Mock).mockReturnValue({ accessToken: 'a', refreshToken: 'r' });

            const result = await authService.login(loginCredentials);

            expect(result.user).toBeDefined();
            expect(mockUser.update).toHaveBeenCalledWith(expect.objectContaining({ loginAttempts: 0 }));
        });

        it('should throw UnauthorizedError on invalid email', async () => {
            (User.findOne as jest.Mock).mockResolvedValue(null);
            await expect(authService.login(loginCredentials)).rejects.toThrow(UnauthorizedError);
        });

        it('should throw UnauthorizedError if account is locked', async () => {
            const mockUser = createMockUser({
                isLocked: jest.fn().mockReturnValue(true),
                lockoutUntil: new Date(Date.now() + 600000)
            });
            (User.findOne as jest.Mock).mockResolvedValue(mockUser);

            await expect(authService.login(loginCredentials)).rejects.toThrow(UnauthorizedError);
        });

        it('should throw UnauthorizedError if account is deactivated', async () => {
            const mockUser = createMockUser({ isActive: false });
            (User.findOne as jest.Mock).mockResolvedValue(mockUser);

            await expect(authService.login(loginCredentials)).rejects.toThrow(UnauthorizedError);
        });

        it('should valid password failure: increment attempts', async () => {
            const mockUser = createMockUser({
                comparePassword: jest.fn().mockResolvedValue(false),
                loginAttempts: 0
            });
            (User.findOne as jest.Mock).mockResolvedValue(mockUser);

            await expect(authService.login(loginCredentials)).rejects.toThrow(UnauthorizedError);

            expect(mockUser.update).toHaveBeenCalledWith(expect.objectContaining({ loginAttempts: 1 }));
        });

        it('should lock account after max attempts', async () => {
            const mockUser = createMockUser({
                comparePassword: jest.fn().mockResolvedValue(false),
                loginAttempts: 4 // Max is 5, so +1 = 5 -> Lock
            });
            (User.findOne as jest.Mock).mockResolvedValue(mockUser);

            await expect(authService.login(loginCredentials)).rejects.toThrow(UnauthorizedError);

            expect(mockUser.update).toHaveBeenCalledWith(expect.objectContaining({
                loginAttempts: 5,
                lockoutUntil: expect.any(Date)
            }));
        });
    });

    describe('refreshToken', () => {
        it('should refresh token successfully', async () => {
            (verifyRefreshToken as jest.Mock).mockReturnValue({ userId: 'user-id' });
            const mockUser = createMockUser({ refreshToken: 'valid-refresh-token' });
            (User.findByPk as jest.Mock).mockResolvedValue(mockUser);
            (generateTokenPair as jest.Mock).mockReturnValue({ accessToken: 'new', refreshToken: 'new-r' });

            const result = await authService.refreshToken('valid-refresh-token');

            expect(result.accessToken).toBe('new');
            expect(mockUser.update).toHaveBeenCalled();
        });

        it('should throw UnauthorizedError if user not found', async () => {
            (verifyRefreshToken as jest.Mock).mockReturnValue({ userId: 'user-id' });
            (User.findByPk as jest.Mock).mockResolvedValue(null);

            await expect(authService.refreshToken('token')).rejects.toThrow(UnauthorizedError);
        });

        it('should detect token theft (mismatching token)', async () => {
            (verifyRefreshToken as jest.Mock).mockReturnValue({ userId: 'user-id' });
            const mockUser = createMockUser({ refreshToken: 'other-token' });
            (User.findByPk as jest.Mock).mockResolvedValue(mockUser);

            await expect(authService.refreshToken('stolen-token')).rejects.toThrow(UnauthorizedError);
            // Should invalidate token
            expect(mockUser.update).toHaveBeenCalledWith({ refreshToken: null });
        });

        it('should throw UnauthorizedError if account deactivated', async () => {
            (verifyRefreshToken as jest.Mock).mockReturnValue({ userId: 'user-id' });
            const mockUser = createMockUser({ refreshToken: 'token', isActive: false });
            (User.findByPk as jest.Mock).mockResolvedValue(mockUser);

            await expect(authService.refreshToken('token')).rejects.toThrow(UnauthorizedError);
        });

        it('should handle invalid token error from verifyRefreshToken', async () => {
            (verifyRefreshToken as jest.Mock).mockImplementation(() => { throw new Error('Invalid'); });

            await expect(authService.refreshToken('bad-token')).rejects.toThrow(UnauthorizedError);
        });

        it('should rethrow UnauthorizedError if verifyRefreshToken throws it', async () => {
            const error = new UnauthorizedError('msg');
            (verifyRefreshToken as jest.Mock).mockImplementation(() => { throw error; });
            await expect(authService.refreshToken('token')).rejects.toThrow(UnauthorizedError);
        });
    });

    describe('logout', () => {
        it('should logout successfully', async () => {
            const mockUser = createMockUser();
            (User.findByPk as jest.Mock).mockResolvedValue(mockUser);

            await authService.logout('user-id');

            expect(mockUser.update).toHaveBeenCalledWith({ refreshToken: null });
        });

        it('should verify user exists before logout', async () => {
            (User.findByPk as jest.Mock).mockResolvedValue(null);
            // Should not throw
            await authService.logout('user-id');
        });
    });

    describe('changePassword', () => {
        it('should change password successfully', async () => {
            const mockUser = createMockUser();
            (User.findByPk as jest.Mock).mockResolvedValue(mockUser);

            await authService.changePassword('user-id', 'old', 'new');

            expect(mockUser.update).toHaveBeenCalledWith({ password: 'new' });
            // Should invalidate refresh token
            expect(mockUser.update).toHaveBeenCalledWith({ refreshToken: null });
        });

        it('should throw NotFoundError if user not found', async () => {
            (User.findByPk as jest.Mock).mockResolvedValue(null);
            await expect(authService.changePassword('id', 'old', 'new')).rejects.toThrow(NotFoundError);
        });

        it('should throw BadRequestError if old password incorrect', async () => {
            const mockUser = createMockUser({ comparePassword: jest.fn().mockResolvedValue(false) });
            (User.findByPk as jest.Mock).mockResolvedValue(mockUser);

            await expect(authService.changePassword('id', 'wrong', 'new')).rejects.toThrow(BadRequestError);
        });
    });

    describe('getUserById', () => {
        it('should return user', async () => {
            const mockUser = createMockUser();
            (User.findByPk as jest.Mock).mockResolvedValue(mockUser);

            const result = await authService.getUserById('id');
            expect(result).toBe(mockUser);
        });

        it('should throw NotFoundError if not found', async () => {
            (User.findByPk as jest.Mock).mockResolvedValue(null);
            await expect(authService.getUserById('id')).rejects.toThrow(NotFoundError);
        });
    });
});
