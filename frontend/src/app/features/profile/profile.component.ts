import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { UserRole } from '../../core/models';
import { NotificationService } from '../../core/services/notification.service';
import { Router } from '@angular/router';

@Component({
    selector: 'app-profile',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './profile.component.html',
    styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit {
    private readonly authService = inject(AuthService);
    private readonly notificationService = inject(NotificationService);
    private readonly router = inject(Router);

    protected readonly isLoading = signal(false);
    protected readonly user = this.authService.currentUser;

    ngOnInit(): void {
        if (!this.user()) {
            this.loadProfile();
        }
    }

    protected loadProfile(): void {
        this.isLoading.set(true);
        this.authService.getProfile().subscribe({
            next: () => this.isLoading.set(false),
            error: (err) => {
                this.isLoading.set(false);
                this.notificationService.error('Error', 'Failed to load user profile');
                console.error('Profile load error:', err);
            }
        });
    }

    protected get displayName(): string {
        const user = this.user();
        if (!user) return '';
        return `${user.firstName} ${user.lastName}`;
    }

    protected get userInitials(): string {
        const user = this.user();
        if (!user) return '';
        const first = user.firstName?.charAt(0) || '';
        const last = user.lastName?.charAt(0) || '';
        return `${first}${last}`.toUpperCase();
    }

    protected goToMfa(): void {
        this.router.navigate(['/profile/mfa-setup']);
    }

    protected goBack(): void {
        const role = this.authService.userRole();
        if (role === UserRole.DOCTOR) {
            this.router.navigate(['/doctor/dashboard']);
        } else if (role === UserRole.ADMIN) {
            this.router.navigate(['/admin/dashboard']);
        } else {
            this.router.navigate(['/patient/dashboard']);
        }
    }
}
