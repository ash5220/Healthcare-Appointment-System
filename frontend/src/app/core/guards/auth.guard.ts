import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authService.isAuthenticated()) {
        return true;
    }

    router.navigate(['/login'], {
        queryParams: { returnUrl: router.url },
    });
    return false;
};

export const guestGuard: CanActivateFn = () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isAuthenticated()) {
        return true;
    }

    // Redirect to appropriate dashboard based on role
    const role = authService.userRole();
    switch (role) {
        case 'doctor':
            router.navigate(['/doctor/dashboard']);
            break;
        case 'admin':
            router.navigate(['/admin/dashboard']);
            break;
        default:
            router.navigate(['/patient/dashboard']);
    }
    return false;
};
