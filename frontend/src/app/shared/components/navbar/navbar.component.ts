/**
 * NavbarComponent
 *
 * The main navigation component that appears at the top of every page.
 * It provides:
 * - Role-based navigation links (different menus for patients, doctors, admins)
 * - User authentication status display
 * - Responsive mobile navigation
 * - Logout functionality
 *
 * This component uses Angular's signal-based reactivity for authentication state
 * and control flow syntax (@if, @for) for template logic.
 */
import {
  Component,
  inject,
  signal,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { MessageService } from '../../../core/services/message.service';
import { UserRole } from '../../../core/models';

/**
 * Interface defining the structure of navigation items.
 * Each item has a route path, display label, and icon class.
 */
interface NavItem {
  path: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent implements OnInit, OnDestroy {
  /** Inject the AuthService to access authentication state */
  protected readonly authService = inject(AuthService);

  /** Inject the MessageService to access unread message count */
  protected readonly messageService = inject(MessageService);

  /** Track whether the mobile menu is expanded */
  protected isMenuCollapsed = signal(true);

  private unreadPollInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Navigation items for patient users.
   * Patients can view appointments, book new ones, and access medical records.
   */
  protected readonly patientNavItems: NavItem[] = [
    { path: '/patient/dashboard', label: 'Dashboard', icon: 'bi-house' },
    { path: '/patient/appointments', label: 'My Appointments', icon: 'bi-calendar-check' },
    { path: '/patient/book', label: 'Book Appointment', icon: 'bi-calendar-plus' },
    { path: '/patient/medical-records', label: 'Medical Records', icon: 'bi-file-medical' },
    { path: '/patient/insurance', label: 'Insurance', icon: 'bi-shield-check' },
    { path: '/patient/messages', label: 'Messages', icon: 'bi-chat-dots' },
  ];

  /**
   * Navigation items for doctor users.
   * Doctors can manage their schedule, view patients, and handle appointments.
   */
  protected readonly doctorNavItems: NavItem[] = [
    { path: '/doctor/dashboard', label: 'Dashboard', icon: 'bi-house' },
    { path: '/doctor/appointments', label: 'Appointments', icon: 'bi-calendar-week' },
    { path: '/doctor/schedule', label: 'My Schedule', icon: 'bi-clock-history' },
    { path: '/doctor/patients', label: 'Patients', icon: 'bi-people' },
    { path: '/doctor/messages', label: 'Messages', icon: 'bi-chat-dots' },
  ];

  /**
   * Navigation items for admin users.
   * Only links to routes that are fully implemented.
   */
  protected readonly adminNavItems: NavItem[] = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: 'bi-house' },
    { path: '/admin/users', label: 'Users', icon: 'bi-people' },
    { path: '/admin/messages', label: 'Messages', icon: 'bi-chat-dots' },
  ];

  /**
   * Get navigation items based on the current user's role.
   * Returns an empty array if user is not authenticated.
   */
  protected get currentNavItems(): NavItem[] {
    const user = this.authService.currentUser();
    if (!user) return [];

    switch (user.role) {
      case UserRole.PATIENT:
        return this.patientNavItems;
      case UserRole.DOCTOR:
        return this.doctorNavItems;
      case UserRole.ADMIN:
        return this.adminNavItems;
    }
  }

  ngOnInit(): void {
    // Load initial unread count if authenticated
    if (this.authService.isAuthenticated()) {
      this.messageService.getUnreadCount().subscribe();
    }
    // Poll every 30 seconds
    this.unreadPollInterval = setInterval(() => {
      if (this.authService.isAuthenticated()) {
        this.messageService.getUnreadCount().subscribe();
      }
    }, 30000);
  }

  ngOnDestroy(): void {
    if (this.unreadPollInterval) {
      clearInterval(this.unreadPollInterval);
    }
  }

  /**
   * Toggle the mobile menu expanded/collapsed state.
   */
  protected toggleMenu(): void {
    this.isMenuCollapsed.update((collapsed) => !collapsed);
  }

  /**
   * Handle user logout.
   * Calls the AuthService to clear tokens and redirect to login.
   */
  protected logout(): void {
    this.authService.logout();
  }

  /**
   * Get the display name for the current user.
   * Combines first and last name, or falls back to email.
   */
  protected get displayName(): string {
    const user = this.authService.currentUser();
    if (!user) return '';

    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.email;
  }

  /**
   * Get the user's initials for the avatar display.
   * Uses first letter of first and last name.
   */
  protected get userInitials(): string {
    const user = this.authService.currentUser();
    if (!user) return '';

    const first = user.firstName?.charAt(0) || '';
    const last = user.lastName?.charAt(0) || '';
    return `${first}${last}`.toUpperCase();
  }
}
