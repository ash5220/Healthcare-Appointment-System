/**
 * AdminDashboardComponent Unit Tests
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AdminDashboardComponent } from './dashboard.component';
import { AuthService } from '../../../core/services/auth.service';
import { AdminService } from '../../../core/services/admin.service';
import { signal } from '@angular/core';
import { UserRole } from '../../../core/models';
import { of } from 'rxjs';

describe('AdminDashboardComponent', () => {
    let component: AdminDashboardComponent;
    let fixture: ComponentFixture<AdminDashboardComponent>;
    let mockAuthService: jasmine.SpyObj<AuthService>;
    let mockAdminService: jasmine.SpyObj<AdminService>;

    const mockUser = {
        id: '1',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
        firstName: 'Admin',
        lastName: 'User',
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

        mockAdminService = jasmine.createSpyObj('AdminService', ['getDashboardStats']);
        mockAdminService.getDashboardStats.and.returnValue(of({
            data: {
                stats: {
                    users: {
                        total: 10,
                        byRole: { doctor: 2, patient: 8, admin: 1 },
                        active: 9,
                        inactive: 1,
                        verified: 8,
                        unverified: 2,
                    },
                    appointments: {
                        total: 50,
                        byStatus: { confirmed: 20, completed: 25, cancelled: 5 },
                    },
                },
            },
        }));

        await TestBed.configureTestingModule({
            imports: [AdminDashboardComponent],
            providers: [
                provideRouter([]),
                { provide: AuthService, useValue: mockAuthService },
                { provide: AdminService, useValue: mockAdminService },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(AdminDashboardComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should display admin name in welcome message', () => {
        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.textContent).toContain('Admin');
    });

    it('should render all quick action buttons', () => {
        const compiled = fixture.nativeElement as HTMLElement;
        const quickActionButtons = compiled.querySelectorAll('.quick-action-btn');
        expect(quickActionButtons.length).toBe(component['quickActions'].length);
    });

    it('should display system statistics', () => {
        // Wait for demo data to load
        fixture.detectChanges();

        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.textContent).toContain('Total Users');
        expect(compiled.textContent).toContain('Doctors');
        expect(compiled.textContent).toContain('Patients');
        expect(compiled.textContent).toContain('Appointments');
    });
});
