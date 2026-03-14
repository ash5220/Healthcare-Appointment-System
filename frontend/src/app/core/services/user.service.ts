import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UserResponse } from '../models';

@Injectable({
    providedIn: 'root'
})
export class UserService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/users`;

    getUsers(params: {
        page: number;
        limit: number;
        role?: string;
        isActive?: string;
        search?: string;
    }): Observable<UserResponse> {
        let httpParams = new HttpParams()
            .set('page', params.page.toString())
            .set('limit', params.limit.toString());

        if (params.role) httpParams = httpParams.set('role', params.role);
        if (params.isActive) httpParams = httpParams.set('isActive', params.isActive);
        if (params.search) httpParams = httpParams.set('search', params.search);

        return this.http.get<UserResponse>(this.apiUrl, { params: httpParams });
    }

    // Placeholder methods for future implementation if needed by UsersComponent
    /*
    updateUser(id: string, data: Partial<User>): Observable<any> {
      return this.http.put(`${this.apiUrl}/${id}`, data);
    }
  
    deleteUser(id: string): Observable<any> {
      return this.http.delete(`${this.apiUrl}/${id}`);
    }
    */
}
