import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ProfileComponent } from './profile.component';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { UserRole } from '../../core/models';
import { signal } from '@angular/core';

describe('ProfileComponent', () => {
  let component: ProfileComponent;
  let fixture: ComponentFixture<ProfileComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let notificationServiceSpy: jasmine.SpyObj<NotificationService>;
  let routerSpy: jasmine.SpyObj<Router>;

  const mockUser = {
    id: 'user-1',
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@test.com',
    role: UserRole.PATIENT,
    phoneNumber: '1234567890',
    isActive: true,
    isEmailVerified: true,
    createdAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    // Create spies
    authServiceSpy = jasmine.createSpyObj('AuthService', [
      'getProfile',
      'updateProfile',
      'requestEmailChange',
      'userRole'
    ], {
      currentUser: signal(mockUser)
    });

    authServiceSpy.getProfile.and.returnValue(of({ data: mockUser as any }));
    authServiceSpy.userRole.and.returnValue(UserRole.PATIENT as any);

    notificationServiceSpy = jasmine.createSpyObj('NotificationService', ['success', 'error']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [ProfileComponent, ReactiveFormsModule],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: NotificationService, useValue: notificationServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ── Initialization ──

  describe('Initialization — happy path', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize forms with user data if user signal is populated', () => {
      // Because currentUser has mockUser
      expect((component as any).profileForm.value).toEqual({
        firstName: 'Jane',
        lastName: 'Doe',
        phoneNumber: '1234567890',
      });
    });
  });

  describe('Initialization — edge cases', () => {
    it('should call loadProfile if currentUser is initially null', () => {
      // Override the property with a null signal
      Object.defineProperty(authServiceSpy, 'currentUser', { value: signal(null) });

      const newFixture = TestBed.createComponent(ProfileComponent);
      newFixture.detectChanges();

      expect(newFixture).toBeTruthy();
      expect(authServiceSpy.getProfile).toHaveBeenCalled();
    });
  });

  describe('Initialization — error cases', () => {
    it('should show error notification if loadProfile fails', () => {
      Object.defineProperty(authServiceSpy, 'currentUser', { value: signal(null) });
      authServiceSpy.getProfile.and.returnValue(throwError(() => new Error('Network error')));

      const newFixture = TestBed.createComponent(ProfileComponent);
      newFixture.detectChanges();

      expect(notificationServiceSpy.error).toHaveBeenCalledWith('Error', 'Failed to load user profile');
    });
  });

  // ── Profile Update ──

  describe('Profile Update — happy path', () => {
    it('should update profile successfully', () => {
      // Arrange
      (component as any).enterEditMode();
      (component as any).profileForm.patchValue({
        firstName: 'Updated',
        lastName: 'Name',
      });
      authServiceSpy.updateProfile.and.returnValue(of({ data: mockUser as any }));

      // Act
      (component as any).saveProfile();

      // Assert
      expect(authServiceSpy.updateProfile).toHaveBeenCalledWith({
        firstName: 'Updated',
        lastName: 'Name',
        phoneNumber: '1234567890',
      });
      expect(notificationServiceSpy.success).toHaveBeenCalledWith('Saved', 'Profile updated successfully');
      expect((component as any).isEditMode()).toBeFalse();
    });
  });

  describe('Profile Update — edge cases', () => {
    it('should not call updateProfile if the form is invalid', () => {
      // Arrange
      (component as any).enterEditMode();
      (component as any).profileForm.patchValue({ firstName: '' }); // Invalid, required

      // Act
      (component as any).saveProfile();

      // Assert
      expect(authServiceSpy.updateProfile).not.toHaveBeenCalled();
    });
  });

  describe('Profile Update — error cases', () => {
    it('should handle API errors when updating profile', () => {
      // Arrange
      (component as any).enterEditMode();
      authServiceSpy.updateProfile.and.returnValue(throwError(() => ({ error: { message: 'Validation failed' } })));

      // Act
      (component as any).saveProfile();

      // Assert
      expect((component as any).isSaving()).toBeFalse();
      expect(notificationServiceSpy.error).toHaveBeenCalledWith('Error', 'Validation failed');
    });
  });

  // ── Email Change ──

  describe('Email Change — happy path', () => {
    it('should request an email change successfully', () => {
      // Arrange
      (component as any).enterEmailChangeMode();
      (component as any).emailChangeForm.patchValue({ newEmail: 'newemail@test.com' });
      authServiceSpy.requestEmailChange.and.returnValue(of({ success: true }));

      // Act
      (component as any).requestEmailChange();

      // Assert
      expect(authServiceSpy.requestEmailChange).toHaveBeenCalledWith('newemail@test.com');
      expect((component as any).emailChangeSent()).toBeTrue();
    });
  });

  describe('Email Change — edge cases', () => {
    it('should not request email change if form is invalid', () => {
      // Arrange
      (component as any).enterEmailChangeMode();
      (component as any).emailChangeForm.patchValue({ newEmail: 'invalid-email' });

      // Act
      (component as any).requestEmailChange();

      // Assert
      expect(authServiceSpy.requestEmailChange).not.toHaveBeenCalled();
    });
  });

  describe('Email Change — error cases', () => {
    it('should show error notification if email change request fails', () => {
      // Arrange
      (component as any).enterEmailChangeMode();
      (component as any).emailChangeForm.patchValue({ newEmail: 'newemail@test.com' });
      authServiceSpy.requestEmailChange.and.returnValue(throwError(() => ({ error: { message: 'Email already taken' } })));

      // Act
      (component as any).requestEmailChange();

      // Assert
      expect(notificationServiceSpy.error).toHaveBeenCalledWith('Error', 'Email already taken');
      expect((component as any).emailChangeSent()).toBeFalse();
    });
  });

  // ── Navigation ──

  describe('Navigation', () => {
    it('should navigate back to correct dashboard based on role', () => {
      // Act
      (component as any).goBack();

      // Assert
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/patient/dashboard']);
    });

    it('should navigate to MFA setup', () => {
      // Act
      (component as any).goToMfa();

      // Assert
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/profile/mfa-setup']);
    });
  });

});
