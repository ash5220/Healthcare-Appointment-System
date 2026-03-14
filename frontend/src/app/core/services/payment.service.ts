import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
    Payment,
    CreatePaymentData,
    PaymentResponse,
    PaymentListResponse,
} from '../models';

@Injectable({
    providedIn: 'root',
})
export class PaymentService {
    private http = inject(HttpClient);
    private readonly apiUrl = `${environment.apiUrl}/payments`;

    // Signals for state management
    private paymentsSignal = signal<Payment[]>([]);
    private isLoadingSignal = signal<boolean>(false);

    // Public readonly signals
    readonly payments = computed(() => this.paymentsSignal());
    readonly isLoading = computed(() => this.isLoadingSignal());

    getPayments(): Observable<PaymentListResponse> {
        this.isLoadingSignal.set(true);
        return this.http.get<PaymentListResponse>(this.apiUrl).pipe(
            tap((response) => {
                this.paymentsSignal.set(response.data.payments);
                this.isLoadingSignal.set(false);
            })
        );
    }

    getPaymentById(id: string): Observable<PaymentResponse> {
        return this.http.get<PaymentResponse>(`${this.apiUrl}/${id}`);
    }

    getPaymentsByAppointment(appointmentId: string): Observable<PaymentListResponse> {
        return this.http.get<PaymentListResponse>(
            `${this.apiUrl}/appointment/${appointmentId}`
        );
    }

    createPayment(data: CreatePaymentData): Observable<PaymentResponse> {
        this.isLoadingSignal.set(true);
        return this.http.post<PaymentResponse>(this.apiUrl, data).pipe(
            tap((response) => {
                const current = this.paymentsSignal();
                this.paymentsSignal.set([response.data.payment, ...current]);
                this.isLoadingSignal.set(false);
            })
        );
    }

    confirmStripePayment(paymentIntentId: string): Observable<PaymentResponse> {
        return this.http.post<PaymentResponse>(`${this.apiUrl}/stripe/confirm`, {
            paymentIntentId,
        });
    }

    capturePaypalPayment(orderId: string, captureId?: string): Observable<PaymentResponse> {
        return this.http.post<PaymentResponse>(`${this.apiUrl}/paypal/capture`, {
            orderId,
            captureId,
        });
    }
}
