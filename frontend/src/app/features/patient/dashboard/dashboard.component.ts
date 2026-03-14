/**
 * PatientDashboardComponent
 * 
 * The main dashboard view for patient users. This component displays:
 * - Welcome message with personalized greeting
 * - Summary statistics (upcoming, completed, pending, cancelled appointments)
 * - Quick action buttons for common tasks
 * - List of upcoming appointments
 * 
 * Architecture Notes:
 * - Uses Angular signals for reactive state management
 * - Implements OnInit for initial data loading
 * - Uses the AppointmentService to fetch appointment data
 * - All magic numbers are extracted to constants for maintainability
 */
import { Component, inject, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { MedicalRecordService } from '../../../core/services/medical-record.service';
import { AppointmentStatus, Appointment } from '../../../core/models';
import {
  MAX_PAGE_SIZE,
  DASHBOARD_UPCOMING_APPOINTMENTS_LIMIT
} from '../../../core/constants';

/**
 * Interface for dashboard statistics display.
 * Groups appointment counts by status for summary cards.
 */
interface DashboardStats {
  upcoming: number;
  completed: number;
  pending: number;
  cancelled: number;
}

@Component({
  selector: 'app-patient-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class PatientDashboardComponent implements OnInit {
  /** AuthService for accessing current user information */
  protected readonly authService = inject(AuthService);

  /** AppointmentService for fetching and managing appointments */
  protected readonly appointmentService = inject(AppointmentService);

  /** MedicalRecordService for accessing medical records */
  protected readonly medicalRecordService = inject(MedicalRecordService);

  /** Dashboard statistics signal, updated when appointments are loaded */
  protected readonly stats = signal<DashboardStats>({
    upcoming: 0,
    completed: 0,
    pending: 0,
    cancelled: 0,
  });

  /**
   * Triggers the download of medical records as CSV.
   */
  downloadRecords(): void {
    this.medicalRecordService.downloadMyRecordsCsv();
  }

  /**
   * Triggers the download of medical records as PDF.
   */
  downloadRecordsPdf(): void {
    this.medicalRecordService.downloadMyRecordsPdf();
  }

  /** 
   * Computed signal for upcoming appointments to display.
   * Limited to a configurable number for dashboard display.
   */
  protected readonly displayedAppointments = computed(() =>
    this.appointmentService.upcomingAppointments()
      .slice(0, DASHBOARD_UPCOMING_APPOINTMENTS_LIMIT)
  );

  /** Loading state for the dashboard */
  protected readonly isLoading = computed(() =>
    this.appointmentService.isLoading()
  );

  /**
   * Quick action items for the patient dashboard.
   * Each action has a route, label, and icon for display.
   */
  protected readonly quickActions = [
    { route: '/patient/book', label: 'Book Appointment', icon: 'bi-calendar-plus' },
    { route: '/patient/appointments', label: 'View All Appointments', icon: 'bi-list-check' },
    { route: '/patient/medical-records', label: 'Medical Records', icon: 'bi-file-medical' },
    { route: '/profile', label: 'Update Profile', icon: 'bi-person-gear' },
  ];

  /**
   * Lifecycle hook - called after component initialization.
   * Triggers data loading for the dashboard.
   */
  ngOnInit(): void {
    this.loadDashboardData();
  }

  /**
   * Load all appointments and calculate dashboard statistics.
   * 
   * Uses MAX_PAGE_SIZE to fetch all appointments in one request,
   * then filters and counts by status for the summary cards.
   */
  protected loadDashboardData(): void {
    this.appointmentService.getAppointments({ limit: MAX_PAGE_SIZE }).subscribe({
      next: (response) => {
        const appointments = response.data;
        this.calculateStats(appointments);
      },
      error: (error) => {
        console.error('Failed to load dashboard data:', error);
        // Stats remain at 0 on error, which is acceptable for display
      },
    });
  }

  /**
   * Calculate appointment statistics from the loaded data.
   * 
   * @param appointments - Array of all patient appointments
   */
  private calculateStats(appointments: Appointment[]): void {
    const stats: DashboardStats = {
      upcoming: 0,
      completed: 0,
      pending: 0,
      cancelled: 0,
    };

    appointments.forEach(appointment => {
      switch (appointment.status) {
        case AppointmentStatus.CONFIRMED:
          stats.upcoming++;
          break;
        case AppointmentStatus.SCHEDULED:
          stats.upcoming++;
          stats.pending++; // Scheduled appointments are also counted as pending
          break;
        case AppointmentStatus.COMPLETED:
          stats.completed++;
          break;
        case AppointmentStatus.CANCELLED:
          stats.cancelled++;
          break;
        // NO_SHOW is not counted in any category
      }
    });

    this.stats.set(stats);
  }

  /**
   * Get the CSS class for an appointment status badge.
   * Uses Bootstrap utility classes for consistent styling.
   * 
   * @param status - The appointment status
   * @returns CSS class string for the badge
   */
  protected getStatusBadgeClass(status: AppointmentStatus): string {
    const statusClasses: Record<AppointmentStatus, string> = {
      [AppointmentStatus.SCHEDULED]: 'bg-warning-subtle text-warning',
      [AppointmentStatus.CONFIRMED]: 'bg-primary-subtle text-primary',
      [AppointmentStatus.COMPLETED]: 'bg-success-subtle text-success',
      [AppointmentStatus.CANCELLED]: 'bg-danger-subtle text-danger',
      [AppointmentStatus.NO_SHOW]: 'bg-secondary-subtle text-secondary',
    };

    return statusClasses[status] || 'bg-secondary';
  }

  /**
   * Get initials from a doctor's name for avatar display.
   * 
   * @param appointment - The appointment containing doctor info
   * @returns Two-letter initials string
   */
  protected getDoctorInitials(appointment: Appointment): string {
    const firstName = appointment.doctor?.user?.firstName || '';
    const lastName = appointment.doctor?.user?.lastName || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }

  /**
   * Get the full display name for a doctor.
   * 
   * @param appointment - The appointment containing doctor info
   * @returns Formatted doctor name with "Dr." prefix
   */
  protected getDoctorName(appointment: Appointment): string {
    const firstName = appointment.doctor?.user?.firstName || '';
    const lastName = appointment.doctor?.user?.lastName || '';
    return `Dr. ${firstName} ${lastName}`.trim();
  }
}
