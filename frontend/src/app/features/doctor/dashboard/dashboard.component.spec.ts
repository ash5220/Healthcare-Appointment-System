/**
 * DoctorDashboardComponent Unit Tests
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DoctorDashboardComponent } from './dashboard.component';
import { AuthService } from '../../../core/services/auth.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { UserRole } from '../../../core/models';

describe('DoctorDashboardComponent', () => {
    let component: DoctorDashboardComponent;
    let fixture: ComponentFixture<DoctorDashboardComponent>;
    let mockAuthService: jasmine.SpyObj<AuthService>;
    let mockAppointmentService: jasmine.SpyObj<AppointmentService>;

    const mockUser = {
        id: '1',
        email: 'doctor@example.com',
        role: UserRole.DOCTOR,
        firstName: 'Jane',
        lastName: 'Smith',
        isActive: true,
        isEmailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    beforeEach(async () => {
        mockAuthService = jasmine.createSpyObj('AuthService', ['logout'], {
            isAuthenticated: signal(true),
            currentUser: signal(mockUser),
        });

        mockAppointmentService = jasmine.createSpyObj('AppointmentService', ['getAppointments'], {
            isLoading: signal(false),
            upcomingAppointments: signal([]),
        });
        mockAppointmentService.getAppointments.and.returnValue(of({
            success: true,
            data: [],
            metadata: {
                total: 0,
                page: 1,
                limit: 10,
                totalPages: 0
            },
            message: 'Success',
        }));

        await TestBed.configureTestingModule({
            imports: [DoctorDashboardComponent],
            providers: [
                provideRouter([]),
                { provide: AuthService, useValue: mockAuthService },
                { provide: AppointmentService, useValue: mockAppointmentService },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(DoctorDashboardComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should load appointments on init', () => {
        expect(mockAppointmentService.getAppointments).toHaveBeenCalled();
    });

    it('should display doctor name in welcome message', () => {
        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.textContent).toContain('Smith');
    });

    describe('getGreeting', () => {
        it('should return morning for hours before 12', () => {
            jasmine.clock().install();
            jasmine.clock().mockDate(new Date(2024, 0, 1, 9, 0, 0));

            expect(component['getGreeting']()).toBe('morning');

            jasmine.clock().uninstall();
        });

        it('should return afternoon for hours 12-17', () => {
            jasmine.clock().install();
            jasmine.clock().mockDate(new Date(2024, 0, 1, 14, 0, 0));

            expect(component['getGreeting']()).toBe('afternoon');

            jasmine.clock().uninstall();
        });

        it('should return evening for hours 18+', () => {
            jasmine.clock().install();
            jasmine.clock().mockDate(new Date(2024, 0, 1, 20, 0, 0));

            expect(component['getGreeting']()).toBe('evening');

            jasmine.clock().uninstall();
        });
    });
});
