import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface PendingDoctor {
  id: string;
  specialization: string;
  licenseNumber: string;
  isApproved: boolean;
  user?: { firstName: string; lastName: string; email: string };
}

@Component({
  selector: 'app-admin-doctors',
  imports: [],
  templateUrl: './doctors.component.html',
  styleUrl: './doctors.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDoctorsComponent implements OnInit {
  private http = inject(HttpClient);
  private adminUrl = `${environment.apiUrl}/admin`;

  pendingDoctors = signal<PendingDoctor[]>([]);
  total = signal(0);
  isLoading = signal(true);
  errorMessage = signal('');
  actionInProgress = signal<string | null>(null);

  ngOnInit(): void {
    this.loadPendingDoctors();
  }

  loadPendingDoctors(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.http
      .get<{
        data: PendingDoctor[];
        metadata: { total: number };
      }>(`${this.adminUrl}/doctors/pending`)
      .subscribe({
        next: (res) => {
          this.pendingDoctors.set(res.data);
          this.total.set(res.metadata?.total ?? res.data.length);
          this.isLoading.set(false);
        },
        error: () => {
          this.errorMessage.set('Failed to load pending doctors.');
          this.isLoading.set(false);
        },
      });
  }

  approve(doctorId: string): void {
    this.actionInProgress.set(doctorId);
    this.http.patch(`${this.adminUrl}/doctors/${doctorId}/approve`, {}).subscribe({
      next: () => {
        this.actionInProgress.set(null);
        this.loadPendingDoctors();
      },
      error: () => {
        this.errorMessage.set('Failed to approve doctor.');
        this.actionInProgress.set(null);
      },
    });
  }

  reject(doctorId: string): void {
    this.actionInProgress.set(doctorId);
    this.http.patch(`${this.adminUrl}/doctors/${doctorId}/reject`, {}).subscribe({
      next: () => {
        this.actionInProgress.set(null);
        this.loadPendingDoctors();
      },
      error: () => {
        this.errorMessage.set('Failed to reject doctor.');
        this.actionInProgress.set(null);
      },
    });
  }
}
