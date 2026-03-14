import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
    const notificationService = inject(NotificationService);

    return next(req).pipe(
        catchError((error: HttpErrorResponse) => {
            let errorMessage = 'An unexpected error occurred';

            if (error.error instanceof ErrorEvent) {
                // Client-side error
                errorMessage = error.error.message;
            } else {
                // Server-side error
                switch (error.status) {
                    case 400:
                        errorMessage = error.error?.message || 'Bad request';
                        break;
                    case 401:
                        errorMessage = 'Please log in to continue';
                        break;
                    case 403:
                        errorMessage = 'You do not have permission to access this resource';
                        break;
                    case 404:
                        errorMessage = error.error?.message || 'Resource not found';
                        break;
                    case 409:
                        errorMessage = error.error?.message || 'Resource conflict';
                        break;
                    case 422: {
                        // Validation errors - extract field errors
                        const validationErrors = error.error?.errors;
                        if (validationErrors) {
                            const messages = Object.values(validationErrors).flat();
                            errorMessage = messages.join('. ');
                        } else {
                            errorMessage = error.error?.message || 'Validation failed';
                        }
                        break;
                    }
                    case 429:
                        errorMessage = 'Too many requests. Please try again later.';
                        break;
                    case 500:
                        errorMessage = 'Server error. Please try again later.';
                        break;
                    default:
                        errorMessage = error.error?.message || 'An error occurred';
                }
            }

            // Don't show notification for 401 on initial load
            if (error.status !== 401 || !req.url.includes('/auth/profile')) {
                notificationService.error('Error', errorMessage);
            }

            return throwError(() => error);
        })
    );
};
