import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { StorageService } from './storage.service';
import { UserRole, User } from '../models';
import { environment } from '../../../environments/environment';

describe('AuthService', () => {
    let service: AuthService;
    let httpMock: HttpTestingController;
    let routerSpy: jasmine.SpyObj<Router>;
    let storageServiceSpy: jasmine.SpyObj<StorageService>;

    const mockUser: User = {
        id: '1',
        email: 'test@example.com',
        role: UserRole.PATIENT,
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
        isEmailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    const mockTokens = {
        accessToken: 'fake-access-token'
    };

    beforeEach(() => {
        routerSpy = jasmine.createSpyObj('Router', ['navigate']);
        storageServiceSpy = jasmine.createSpyObj('StorageService', [
            'getAccessToken', 'getUser', 'setTokens', 'setUser', 'clearAuth'
        ]);

        TestBed.configureTestingModule({
            providers: [
                AuthService,
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: Router, useValue: routerSpy },
                { provide: StorageService, useValue: storageServiceSpy }
            ]
        });

        service = TestBed.inject(AuthService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('Login', () => {
        it('should authenticate user and store tokens on success', () => {
            const credentials = { email: 'test@example.com', password: 'password' };

            service.login(credentials).subscribe(response => {
                expect(response.success).toBeTrue();
                expect(response.data.user).toEqual(mockUser);
                expect(service.isAuthenticated()).toBeTrue();
                expect(service.currentUser()).toEqual(mockUser);
            });

            const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
            expect(req.request.method).toBe('POST');
            req.flush({
                success: true,
                data: { user: mockUser, accessToken: mockTokens.accessToken }
            });

            expect(storageServiceSpy.setTokens).toHaveBeenCalledWith(mockTokens.accessToken);
            expect(storageServiceSpy.setUser).toHaveBeenCalledWith(mockUser);
        });

        it('should handle login error correctly', () => {
            const credentials = { email: 'test@example.com', password: 'wrong-password' };

            service.login(credentials).subscribe({
                error: (error) => {
                    expect(error.status).toBe(401);
                    expect(service.isAuthenticated()).toBeFalse();
                }
            });

            const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
            req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

            expect(storageServiceSpy.setTokens).not.toHaveBeenCalled();
        });
    });

    describe('Role Checking', () => {
        it('should return true if user has the role', () => {
            // Manually set signal for testing (since it's private/protected setters usually, but we can simulate state via init or mock)
            // Since we can't easily write to signals from outside without a visible setter/method, we'll simulate a login flow first or use reflection if needed.
            // Better: Validate logic by simulating login first.

            // Simulate logged in state
            (service as unknown as { currentUserSignal: { set: (v: User | null) => void } }).currentUserSignal.set(mockUser); // Accessing private signal for test setup

            expect(service.hasRole(UserRole.PATIENT)).toBeTrue();
            expect(service.hasRole(UserRole.DOCTOR)).toBeFalse();
        });

        it('should return false if no user is logged in', () => {
            (service as unknown as { currentUserSignal: { set: (v: User | null) => void } }).currentUserSignal.set(null);
            expect(service.hasRole(UserRole.PATIENT)).toBeFalse();
        });
    });

    describe('Logout', () => {
        it('should clear auth and navigate to login', () => {
            service.logout();

            const req = httpMock.expectOne(`${environment.apiUrl}/auth/logout`);
            expect(req.request.method).toBe('POST');
            req.flush({});

            expect(storageServiceSpy.clearAuth).toHaveBeenCalled();
            expect(routerSpy.navigate).toHaveBeenCalledWith(['/auth/login']);
            expect(service.currentUser()).toBeNull();
        });
    });
});
