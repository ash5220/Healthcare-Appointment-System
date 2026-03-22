import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DayOfWeek, AvailabilityResponse, DoctorsResponse, DoctorAvailability } from '../models';

@Injectable({
    providedIn: 'root'
})
export class DoctorService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/doctors`;

    getAvailability(): Observable<AvailabilityResponse> {
        return this.http.get<AvailabilityResponse>(`${this.apiUrl}/availability`);
    }

    updateSchedule(schedule: Array<{
        dayOfWeek: DayOfWeek;
        startTime: string;
        endTime: string;
        slotDuration: number;
    }>, effectiveFrom: string): Observable<{ success: boolean; data: { availabilities: DoctorAvailability[] }; message?: string }> {
        return this.http.post<{ success: boolean; data: { availabilities: DoctorAvailability[] }; message?: string }>(`${this.apiUrl}/schedule`, {
            schedule,
            effectiveFrom
        });
    }

    getDoctors(): Observable<DoctorsResponse> {
        return this.http.get<DoctorsResponse>(this.apiUrl);
    }
}
