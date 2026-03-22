/**
 * AdminDashboardComponent
 * 
 * The main dashboard for system administrators providing:
 * - System-wide statistics overview
 * - Quick access to management functions
 * - Summary of appointments and user activity
 * 
 * Note: In a production environment, these statistics would be fetched
 * from dedicated admin API endpoints with proper authorization.
 */
import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { AdminService } from '../../../core/services/admin.service';
import { SystemStats, AppointmentBreakdown, UserStats, QuickAction } from '../../../core/models';

@Component({
    selector: 'app-admin-dashboard',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './dashboard.component.html',
    styleUrl: './dashboard.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardComponent implements OnInit {
    protected readonly authService = inject(AuthService);
    private readonly adminService = inject(AdminService);

    /** System-wide statistics */
    protected readonly stats = signal<SystemStats>({
        totalUsers: 0,
        totalDoctors: 0,
        totalPatients: 0,
        totalAppointments: 0,
    });

    /** Today's appointment breakdown */
    protected readonly appointmentBreakdown = signal<AppointmentBreakdown>({
        scheduled: 0,
        confirmed: 0,
        completed: 0,
        cancelled: 0,
    });

    /** User activity statistics */
    protected readonly userStats = signal<UserStats>({
        activeUsers: 0,
        newThisWeek: 0,
        pendingVerification: 0,
        inactive: 0,
    });

    /** Loading state */
    protected readonly isLoading = signal(true);

    /** Quick actions for the admin dashboard */
    protected readonly quickActions: QuickAction[] = [
        { route: '/admin/users', label: 'Manage Users', icon: 'bi-people' },
        { route: '/admin/doctors', label: 'Manage Doctors', icon: 'bi-person-badge' },
        { route: '/admin/appointments', label: 'All Appointments', icon: 'bi-calendar-week' },
        { route: '/admin/settings', label: 'System Settings', icon: 'bi-gear' },
        { route: '/admin/reports', label: 'View Reports', icon: 'bi-graph-up' },
    ];

    ngOnInit(): void {
        this.loadDashboardData();
    }

    /**
     * Load all dashboard statistics from the API.
     * Falls back to demo data if API is unavailable.
     */
    protected loadDashboardData(): void {
        this.adminService.getDashboardStats().subscribe({
            next: (response) => {
                this.stats.set(response.data.stats);
                this.isLoading.set(false);
            },
            error: () => {
                // Use demo data for development
                this.setDemoData();
                this.isLoading.set(false);
            },
        });
    }

    /**
     * Set demo data for development/testing.
     * In production, this would not be needed.
     */
    private setDemoData(): void {
        this.stats.set({
            totalUsers: 168,
            totalDoctors: 24,
            totalPatients: 142,
            totalAppointments: 1250,
        });

        this.appointmentBreakdown.set({
            scheduled: 12,
            confirmed: 8,
            completed: 5,
            cancelled: 2,
        });

        this.userStats.set({
            activeUsers: 156,
            newThisWeek: 12,
            pendingVerification: 3,
            inactive: 8,
        });
    }
}
