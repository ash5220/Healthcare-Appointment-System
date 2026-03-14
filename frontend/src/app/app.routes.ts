import { Routes } from '@angular/router';
import { authGuard, guestGuard, patientGuard, doctorGuard, adminGuard } from './core/guards';

export const routes: Routes = [
  // Public routes
  {
    path: '',
    redirectTo: 'auth/login',
    pathMatch: 'full',
  },
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/login/login.component').then((m) => m.LoginComponent),
        canActivate: [guestGuard],
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./features/auth/register/register.component').then((m) => m.RegisterComponent),
        canActivate: [guestGuard],
      },
    ],
  },

  // Patient routes
  {
    path: 'patient',
    canActivate: [authGuard, patientGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/patient/dashboard/dashboard.component').then(
            (m) => m.PatientDashboardComponent,
          ),
      },
      {
        path: 'appointments',
        loadComponent: () =>
          import('./features/patient/appointments/list/appointment-list.component').then(
            (m) => m.AppointmentListComponent,
          ),
      },
      {
        path: 'book',
        loadComponent: () =>
          import('./features/patient/appointments/book/book-appointment.component').then(
            (m) => m.BookAppointmentComponent,
          ),
      },
      {
        path: 'medical-records',
        loadComponent: () =>
          import('./features/patient/medical-records/medical-records.component').then(
            (m) => m.MedicalRecordsComponent,
          ),
      },
      {
        path: 'insurance',
        loadComponent: () =>
          import('./features/patient/insurance/insurance.component').then(
            (m) => m.InsuranceComponent,
          ),
      },
      {
        path: 'payments',
        loadComponent: () =>
          import('./features/patient/payments/payments.component').then((m) => m.PaymentsComponent),
      },
      {
        path: 'messages',
        loadComponent: () =>
          import('./features/messaging/messaging.component').then((m) => m.MessagingComponent),
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
    ],
  },

  // Doctor routes
  {
    path: 'doctor',
    canActivate: [authGuard, doctorGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/doctor/dashboard/dashboard.component').then(
            (m) => m.DoctorDashboardComponent,
          ),
      },
      {
        path: 'appointments',
        loadComponent: () =>
          import('./features/doctor/appointments/appointments.component').then(
            (m) => m.DoctorAppointmentsComponent,
          ),
      },
      {
        path: 'schedule',
        loadComponent: () =>
          import('./features/doctor/schedule/schedule.component').then((m) => m.ScheduleComponent),
      },
      {
        path: 'messages',
        loadComponent: () =>
          import('./features/messaging/messaging.component').then((m) => m.MessagingComponent),
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
    ],
  },

  // Admin routes
  {
    path: 'admin',
    canActivate: [authGuard, adminGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/admin/dashboard/dashboard.component').then(
            (m) => m.AdminDashboardComponent,
          ),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./features/admin/users/users.component').then((m) => m.UsersComponent),
      },
      {
        path: 'messages',
        loadComponent: () =>
          import('./features/messaging/messaging.component').then((m) => m.MessagingComponent),
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
    ],
  },

  // Profile/Settings routes
  {
    path: 'profile',
    loadComponent: () =>
      import('./features/profile/profile.component').then((m) => m.ProfileComponent),
    canActivate: [authGuard],
  },
  {
    path: 'profile/mfa-setup',
    loadComponent: () =>
      import('./features/profile/mfa-setup/mfa-setup.component').then((m) => m.MfaSetupComponent),
    canActivate: [authGuard],
  },

  // Fallback — proper 404 page instead of silently redirecting
  {
    path: 'unauthorized',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '**',
    loadComponent: () =>
      import('./features/not-found/not-found.component').then((m) => m.NotFoundComponent),
  },
];
