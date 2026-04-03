import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AdminStatsApiResponse } from '../models';

@Injectable({
    providedIn: 'root'
})
export class AdminService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/admin`;

    getDashboardStats(): Observable<AdminStatsApiResponse> {
        return this.http.get<AdminStatsApiResponse>(`${this.apiUrl}/stats`);
    }
}
