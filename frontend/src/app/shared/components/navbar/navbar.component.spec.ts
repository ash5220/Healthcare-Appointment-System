/**
 * NavbarComponent Unit Tests
 * 
 * Tests for the main navigation component.
 * Covers:
 * - Component creation
 * - Role-based navigation display
 * - User authentication state handling
 * - Menu toggle functionality
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NavbarComponent } from './navbar.component';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { signal } from '@angular/core';
import { UserRole } from '../../../core/models';

describe('NavbarComponent', () => {
    let component: NavbarComponent;
    let fixture: ComponentFixture<NavbarComponent>;
    let mockAuthService: jasmine.SpyObj<AuthService>;

    beforeEach(async () => {
        // Create a mock AuthService with signal-based properties
        mockAuthService = jasmine.createSpyObj('AuthService', ['logout'], {
            isAuthenticated: signal(false),
            currentUser: signal(null),
        });

        await TestBed.configureTestingModule({
            imports: [NavbarComponent],
            providers: [
                provideRouter([]),
                { provide: AuthService, useValue: mockAuthService },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(NavbarComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('when user is not authenticated', () => {
        it('should display login and register links', () => {
            const compiled = fixture.nativeElement as HTMLElement;
            expect(compiled.querySelector('[routerLink="/auth/login"]')).toBeTruthy();
            expect(compiled.querySelector('[routerLink="/auth/register"]')).toBeTruthy();
        });

        it('should not display user dropdown', () => {
            const compiled = fixture.nativeElement as HTMLElement;
            expect(compiled.querySelector('#userDropdown')).toBeFalsy();
        });
    });

    describe('role-based navigation', () => {
        it('should display patient navigation items', () => {
            (mockAuthService as any).currentUser = signal({ id: '1', role: UserRole.PATIENT, firstName: 'P' });
            fixture.detectChanges();

            const compiled = fixture.nativeElement as HTMLElement;
            expect(compiled.querySelector('[routerLink="/patient/dashboard"]')).toBeTruthy();
        });

        it('should display doctor navigation items', () => {
            (mockAuthService as any).currentUser = signal({ id: '2', role: UserRole.DOCTOR, firstName: 'D' });
            fixture.detectChanges();

            const compiled = fixture.nativeElement as HTMLElement;
            expect(compiled.querySelector('[routerLink="/doctor/dashboard"]')).toBeTruthy();
            expect(compiled.querySelector('[routerLink="/doctor/schedule"]')).toBeTruthy();
        });

        it('should display admin navigation items', () => {
            (mockAuthService as any).currentUser = signal({ id: '3', role: UserRole.ADMIN, firstName: 'A' });
            fixture.detectChanges();

            const compiled = fixture.nativeElement as HTMLElement;
            expect(compiled.querySelector('[routerLink="/admin/dashboard"]')).toBeTruthy();
            expect(compiled.querySelector('[routerLink="/admin/users"]')).toBeTruthy();
        });
    });

    describe('user dropdown', () => {
        it('should display correct initials', () => {
            (mockAuthService as any).currentUser = signal({
                id: '1', role: UserRole.PATIENT, firstName: 'John', lastName: 'Doe'
            });
            fixture.detectChanges();

            expect(component['userInitials']).toBe('JD');
        });
    });

    describe('menu toggle', () => {
        it('should toggle menu collapsed state', () => {
            expect(component['isMenuCollapsed']()).toBeTrue();

            component['toggleMenu']();
            expect(component['isMenuCollapsed']()).toBeFalse();

            component['toggleMenu']();
            expect(component['isMenuCollapsed']()).toBeTrue();
        });
    });

    describe('logout', () => {
        it('should call AuthService logout', () => {
            component['logout']();
            expect(mockAuthService.logout).toHaveBeenCalled();
        });
    });
});
