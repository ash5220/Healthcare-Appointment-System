import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  OnInit,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { UserRole } from '../../core/models';
import { NotificationService } from '../../core/services/notification.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  protected readonly isLoading = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly isRequestingEmailChange = signal(false);
  protected readonly isEditMode = signal(false);
  protected readonly isEmailChangeMode = signal(false);
  protected readonly emailChangeSent = signal(false);

  protected readonly user = this.authService.currentUser;

  protected readonly displayName = computed(() => {
    const u = this.user();
    if (!u) return '';
    return `${u.firstName} ${u.lastName}`;
  });

  protected readonly userInitials = computed(() => {
    const u = this.user();
    if (!u) return '';
    return `${u.firstName?.charAt(0) ?? ''}${u.lastName?.charAt(0) ?? ''}`.toUpperCase();
  });

  // ── Forms ──────────────────────────────────────────────────────────────

  protected profileForm!: FormGroup;
  protected emailChangeForm!: FormGroup;

  ngOnInit(): void {
    if (!this.user()) {
      this.loadProfile();
    }
    this.buildForms();
  }

  private buildForms(): void {
    const u = this.user();
    this.profileForm = this.fb.group({
      firstName: [
        u?.firstName ?? '',
        [
          Validators.required,
          Validators.minLength(1),
          Validators.maxLength(100),
          Validators.pattern(/^[a-zA-Z\s'-]+$/),
        ],
      ],
      lastName: [
        u?.lastName ?? '',
        [
          Validators.required,
          Validators.minLength(1),
          Validators.maxLength(100),
          Validators.pattern(/^[a-zA-Z\s'-]+$/),
        ],
      ],
      phoneNumber: [u?.phoneNumber ?? '', [Validators.maxLength(20)]],
    });

    this.emailChangeForm = this.fb.group({
      newEmail: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    });
  }

  protected loadProfile(): void {
    this.isLoading.set(true);
    this.authService.getProfile().subscribe({
      next: () => {
        this.isLoading.set(false);
        this.buildForms();
      },
      error: (err: unknown) => {
        this.isLoading.set(false);
        this.notificationService.error('Error', 'Failed to load user profile');
        console.error('Profile load error:', err);
      },
    });
  }

  // ── Edit Mode ──────────────────────────────────────────────────────────

  protected enterEditMode(): void {
    const u = this.user();
    if (u) {
      this.profileForm.patchValue({
        firstName: u.firstName,
        lastName: u.lastName,
        phoneNumber: u.phoneNumber ?? '',
      });
    }
    this.isEditMode.set(true);
    this.isEmailChangeMode.set(false);
  }

  protected cancelEditMode(): void {
    this.isEditMode.set(false);
    this.profileForm.reset();
    this.buildForms();
  }

  protected saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }
    this.isSaving.set(true);
    const { firstName, lastName, phoneNumber } = this.profileForm.value as {
      firstName: string;
      lastName: string;
      phoneNumber: string;
    };
    this.authService
      .updateProfile({ firstName, lastName, phoneNumber: phoneNumber || null })
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.isEditMode.set(false);
          this.notificationService.success('Saved', 'Profile updated successfully');
        },
        error: (err: unknown) => {
          this.isSaving.set(false);
          const msg =
            (err as { error?: { message?: string } })?.error?.message ??
            'Failed to update profile';
          this.notificationService.error('Error', msg);
        },
      });
  }

  // ── Email Change ───────────────────────────────────────────────────────

  protected enterEmailChangeMode(): void {
    this.isEmailChangeMode.set(true);
    this.isEditMode.set(false);
    this.emailChangeSent.set(false);
    this.emailChangeForm.reset();
  }

  protected cancelEmailChange(): void {
    this.isEmailChangeMode.set(false);
    this.emailChangeSent.set(false);
    this.emailChangeForm.reset();
  }

  protected requestEmailChange(): void {
    if (this.emailChangeForm.invalid) {
      this.emailChangeForm.markAllAsTouched();
      return;
    }
    this.isRequestingEmailChange.set(true);
    const { newEmail } = this.emailChangeForm.value as { newEmail: string };
    this.authService.requestEmailChange(newEmail).subscribe({
      next: () => {
        this.isRequestingEmailChange.set(false);
        this.emailChangeSent.set(true);
      },
      error: (err: unknown) => {
        this.isRequestingEmailChange.set(false);
        const msg =
          (err as { error?: { message?: string } })?.error?.message ??
          'Failed to request email change';
        this.notificationService.error('Error', msg);
      },
    });
  }

  // ── Navigation ─────────────────────────────────────────────────────────

  protected goToMfa(): void {
    this.router.navigate(['/profile/mfa-setup']);
  }

  protected goBack(): void {
    const role = this.authService.userRole();
    switch (role) {
      case UserRole.PATIENT:
        this.router.navigate(['/patient/dashboard']);
        break;
      case UserRole.DOCTOR:
        this.router.navigate(['/doctor/dashboard']);
        break;
      case UserRole.ADMIN:
        this.router.navigate(['/admin/dashboard']);
        break;
      default:
        this.router.navigate(['/patient/dashboard']);
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  protected getFieldError(form: FormGroup, field: string): string | null {
    const control = form.get(field);
    if (!control || !control.touched || !control.errors) return null;
    if (control.errors['required']) return 'This field is required';
    if (control.errors['minlength']) return 'Too short';
    if (control.errors['maxlength']) return 'Too long';
    if (control.errors['pattern']) return 'Invalid characters';
    if (control.errors['email']) return 'Enter a valid email address';
    return 'Invalid value';
  }
}
