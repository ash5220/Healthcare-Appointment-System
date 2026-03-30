import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  User,
  UserRole,
  LoginCredentials,
  RegisterData,
  PatientRegisterData,
  DoctorRegisterData,
  AuthResponse,
} from '../models';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private storageService = inject(StorageService);

  private readonly apiUrl = `${environment.apiUrl}/auth`;

  // Signals for reactive state
  private currentUserSignal = signal<User | null>(null);
  private isAuthenticatedSignal = signal<boolean>(false);
  private isLoadingSignal = signal<boolean>(false);

  // Public readonly signals
  readonly currentUser = computed(() => this.currentUserSignal());
  readonly isAuthenticated = computed(() => this.isAuthenticatedSignal());
  readonly isLoading = computed(() => this.isLoadingSignal());
  readonly userRole = computed(() => this.currentUserSignal()?.role || null);

  constructor() {
    this.initializeAuth();
  }

  private initializeAuth(): void {
    const token = this.storageService.getAccessToken();
    const user = this.storageService.getUser();

    if (token && user) {
      // Access token still in memory (e.g. SPA navigation, not a full reload)
      this.currentUserSignal.set(user);
      this.isAuthenticatedSignal.set(true);
    } else if (user && !token) {
      // Page was refreshed — access token lost (in-memory) but user
      // session exists.  Attempt to get a new access token using the
      // HttpOnly refresh-token cookie.
      //
      // Set the user optimistically so route guards don't redirect
      // during the short refresh window, but track loading state so
      // the UI can show a spinner if needed.
      this.currentUserSignal.set(user);
      this.isLoadingSignal.set(true);

      this.refreshToken().subscribe({
        next: () => {
          // Refresh succeeded — mark as fully authenticated
          this.isAuthenticatedSignal.set(true);
          this.isLoadingSignal.set(false);
        },
        error: () => {
          // Refresh failed — session truly expired
          this.isLoadingSignal.set(false);
          this.clearAuth();
        },
      });
    }
  }

  login(credentials: LoginCredentials): Observable<AuthResponse> {
    this.isLoadingSignal.set(true);

    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap((response) => {
        if (response.success && !response.data.mfaRequired) {
          const { user, accessToken } = response.data;
          this.handleAuthSuccess(user, accessToken);
        }
      }),
      catchError((error: unknown) => {
        this.isLoadingSignal.set(false);
        return throwError(() => error);
      }),
    );
  }

  register(data: RegisterData): Observable<AuthResponse> {
    this.isLoadingSignal.set(true);

    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, data).pipe(
      tap((response) => {
        if (response.success && !response.data.mfaRequired) {
          const { user, accessToken } = response.data;
          this.handleAuthSuccess(user, accessToken);
        }
      }),
      catchError((error: unknown) => {
        this.isLoadingSignal.set(false);
        return throwError(() => error);
      }),
    );
  }

  registerPatient(data: PatientRegisterData): Observable<AuthResponse> {
    this.isLoadingSignal.set(true);

    return this.http.post<AuthResponse>(`${this.apiUrl}/register/patient`, data).pipe(
      tap((response) => {
        if (response.success && !response.data.mfaRequired) {
          const { user, accessToken } = response.data;
          this.handleAuthSuccess(user, accessToken);
        }
      }),
      catchError((error: unknown) => {
        this.isLoadingSignal.set(false);
        return throwError(() => error);
      }),
    );
  }

  registerDoctor(data: DoctorRegisterData): Observable<AuthResponse> {
    this.isLoadingSignal.set(true);

    return this.http.post<AuthResponse>(`${this.apiUrl}/register/doctor`, data).pipe(
      tap((response) => {
        if (response.success && !response.data.mfaRequired) {
          const { user, accessToken } = response.data;
          this.handleAuthSuccess(user, accessToken);
        }
      }),
      catchError((error: unknown) => {
        this.isLoadingSignal.set(false);
        return throwError(() => error);
      }),
    );
  }

  verifyMfaLogin(tempToken: string, token: string): Observable<AuthResponse> {
    this.isLoadingSignal.set(true);
    return this.http.post<AuthResponse>(`${this.apiUrl}/verify-mfa`, { tempToken, token }).pipe(
      tap((response) => {
        if (response.success && !response.data.mfaRequired) {
          const { user, accessToken } = response.data;
          this.handleAuthSuccess(user, accessToken);
        }
      }),
      catchError((error: unknown) => {
        this.isLoadingSignal.set(false);
        return throwError(() => error);
      }),
    );
  }

  setupMfa(): Observable<{
    success: boolean;
    data: { qrCodeUrl: string; secret: string };
    message?: string;
  }> {
    return this.http.post<{
      success: boolean;
      data: { qrCodeUrl: string; secret: string };
      message?: string;
    }>(`${this.apiUrl}/setup-mfa`, {});
  }

  verifySetupMfa(token: string): Observable<{ success: boolean; message?: string }> {
    return this.http.post<{ success: boolean; message?: string }>(
      `${this.apiUrl}/verify-setup-mfa`,
      { token },
    );
  }

  logout(): void {
    this.http.post(`${this.apiUrl}/logout`, {}).subscribe({
      complete: () => this.clearAuth(),
      error: (err: unknown) => {
        console.error('[AuthService] logout error (clearing session anyway):', err);
        this.clearAuth();
      },
    });
  }

  refreshToken(): Observable<{ data: { accessToken: string } }> {
    return this.http
      .post<{
        data: { accessToken: string };
      }>(`${this.apiUrl}/refresh-token`, {}, { withCredentials: true })
      .pipe(
        tap((response) => {
          this.storageService.setTokens(response.data.accessToken);
        }),
        catchError((error: unknown) => {
          this.clearAuth();
          return throwError(() => error);
        }),
      );
  }

  getProfile(): Observable<{ data: User }> {
    return this.http.get<{ data: User }>(`${this.apiUrl}/profile`).pipe(
      tap((response) => {
        this.currentUserSignal.set(response.data);
        this.storageService.setUser(response.data);
      }),
    );
  }

  private handleAuthSuccess(user: User, accessToken: string): void {
    this.storageService.setTokens(accessToken);
    this.storageService.setUser(user);
    this.currentUserSignal.set(user);
    this.isAuthenticatedSignal.set(true);
    this.isLoadingSignal.set(false);
  }

  private clearAuth(): void {
    this.storageService.clearAuth();
    this.currentUserSignal.set(null);
    this.isAuthenticatedSignal.set(false);
    this.router.navigate(['/auth/login']);
  }

  hasRole(role: UserRole | UserRole[]): boolean {
    const userRole = this.currentUserSignal()?.role;
    if (!userRole) return false;

    if (Array.isArray(role)) {
      return role.includes(userRole);
    }
    return userRole === role;
  }
}
