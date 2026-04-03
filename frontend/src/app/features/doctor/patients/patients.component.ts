import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { expand, reduce, takeWhile } from 'rxjs/operators';
import { EMPTY } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Patient, Appointment, PaginatedResponse } from '../../../core/models';

const PAGE_LIMIT = 100;

@Component({
  selector: 'app-doctor-patients',
  imports: [],
  templateUrl: './patients.component.html',
  styleUrl: './patients.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DoctorPatientsComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/appointments`;

  protected readonly searchQuery = signal('');
  protected readonly isLoading = signal(true);
  private readonly allPatients = signal<Patient[]>([]);

  /** Patients filtered by the search query. */
  protected readonly filteredPatients = computed<Patient[]>(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.allPatients();
    return this.allPatients().filter((p) => {
      const name = `${p.user?.firstName ?? ''} ${p.user?.lastName ?? ''}`.toLowerCase();
      const email = (p.user?.email ?? '').toLowerCase();
      return name.includes(query) || email.includes(query);
    });
  });

  ngOnInit(): void {
    this.loadPatients();
  }

  private loadPatients(): void {
    this.isLoading.set(true);

    const firstPage$ = this.fetchPage(1);

    firstPage$
      .pipe(
        expand((response) => {
          const { page, totalPages } = response.metadata;
          return page < totalPages ? this.fetchPage(page + 1) : EMPTY;
        }),
        takeWhile(() => true, true),
        reduce((acc: Appointment[], response) => acc.concat(response.data), []),
      )
      .subscribe({
        next: (appointments) => {
          this.allPatients.set(this.extractUniquePatients(appointments));
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
        },
      });
  }

  private fetchPage(page: number) {
    const params = new HttpParams()
      .set('limit', PAGE_LIMIT.toString())
      .set('page', page.toString());
    return this.http.get<PaginatedResponse<Appointment>>(this.apiUrl, { params });
  }

  private extractUniquePatients(appointments: Appointment[]): Patient[] {
    const seen = new Set<string>();
    const result: Patient[] = [];
    for (const apt of appointments) {
      if (apt.patient && !seen.has(apt.patientId)) {
        seen.add(apt.patientId);
        result.push(apt.patient);
      }
    }
    return result;
  }

  protected initials(patient: Patient): string {
    const first = patient.user?.firstName?.charAt(0) ?? '';
    const last = patient.user?.lastName?.charAt(0) ?? '';
    return `${first}${last}`.toUpperCase();
  }
}
