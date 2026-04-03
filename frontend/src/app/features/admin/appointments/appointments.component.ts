import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe, NgClass, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface AdminAppointment {
  id: string;
  status: string;
  appointmentDate: string;
  reasonForVisit?: string;
  patient?: { user?: { firstName: string; lastName: string; email: string } };
  doctor?: { user?: { firstName: string; lastName: string } };
}

@Component({
  selector: 'app-admin-appointments',
  standalone: true,
  imports: [DatePipe, TitleCasePipe, NgClass, FormsModule],
  templateUrl: './appointments.component.html',
  styleUrl: './appointments.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminAppointmentsComponent implements OnInit {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/appointments`;

  appointments = signal<AdminAppointment[]>([]);
  total = signal(0);
  isLoading = signal(true);
  errorMessage = signal('');

  statusFilter = '';
  currentPage = 1;
  readonly pageSize = 10;

  readonly statuses = ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'];

  ngOnInit(): void {
    this.loadAppointments();
  }

  loadAppointments(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    const params: Record<string, string> = {
      page: String(this.currentPage),
      limit: String(this.pageSize),
    };
    if (this.statusFilter) {
      params['status'] = this.statusFilter;
    }

    const query = new URLSearchParams(params).toString();
    this.http.get<{ data: AdminAppointment[]; metadata: { total: number } }>(
      `${this.apiUrl}?${query}`
    ).subscribe({
      next: (res) => {
        this.appointments.set(res.data);
        this.total.set(res.metadata?.total ?? res.data.length);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to load appointments.');
        this.isLoading.set(false);
      },
    });
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadAppointments();
  }

  get totalPages(): number {
    return Math.ceil(this.total() / this.pageSize);
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadAppointments();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadAppointments();
    }
  }

  statusClass(status: string): string {
    const map: Record<string, string> = {
      scheduled: 'bg-warning-subtle text-warning',
      confirmed: 'bg-primary-subtle text-primary',
      completed: 'bg-success-subtle text-success',
      cancelled: 'bg-danger-subtle text-danger',
      no_show: 'bg-secondary-subtle text-secondary',
    };
    return map[status] ?? 'bg-light text-muted';
  }
}
