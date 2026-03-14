import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaymentService } from '../../../core/services/payment.service';
import { Payment, PaymentStatus, PaymentMethod } from '../../../core/models';
import { finalize } from 'rxjs';

@Component({
    selector: 'app-payments',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './payments.component.html',
    styleUrl: './payments.component.scss'
})
export class PaymentsComponent implements OnInit {
    private paymentService = inject(PaymentService);

    payments = signal<Payment[]>([]);
    isLoading = signal<boolean>(true);
    error = signal<string | null>(null);
    selectedPayment = signal<Payment | null>(null);

    PaymentStatus = PaymentStatus;
    PaymentMethod = PaymentMethod;

    ngOnInit(): void {
        this.fetchPayments();
    }

    fetchPayments(): void {
        this.isLoading.set(true);
        this.error.set(null);
        this.paymentService.getPayments()
            .pipe(finalize(() => this.isLoading.set(false)))
            .subscribe({
                next: (response) => {
                    if (response.success) {
                        this.payments.set(response.data.payments);
                    }
                },
                error: () => {
                    this.error.set('Failed to load payment history');
                }
            });
    }

    selectPayment(payment: Payment): void {
        this.selectedPayment.set(
            this.selectedPayment()?.id === payment.id ? null : payment
        );
    }

    getStatusClass(status: PaymentStatus): string {
        switch (status) {
            case PaymentStatus.COMPLETED: return 'bg-success';
            case PaymentStatus.PENDING: return 'bg-warning text-dark';
            case PaymentStatus.FAILED: return 'bg-danger';
            case PaymentStatus.REFUNDED: return 'bg-info';
            default: return 'bg-secondary';
        }
    }

    getStatusIcon(status: PaymentStatus): string {
        switch (status) {
            case PaymentStatus.COMPLETED: return 'bi-check-circle-fill';
            case PaymentStatus.PENDING: return 'bi-hourglass-split';
            case PaymentStatus.FAILED: return 'bi-x-circle-fill';
            case PaymentStatus.REFUNDED: return 'bi-arrow-counterclockwise';
            default: return 'bi-question-circle';
        }
    }

    getMethodIcon(method: PaymentMethod): string {
        switch (method) {
            case PaymentMethod.STRIPE: return 'bi-credit-card-2-front-fill';
            case PaymentMethod.PAYPAL: return 'bi-paypal';
            case PaymentMethod.INSURANCE: return 'bi-shield-fill-check';
            case PaymentMethod.CASH: return 'bi-cash-stack';
            default: return 'bi-wallet2';
        }
    }

    getMethodLabel(method: PaymentMethod): string {
        switch (method) {
            case PaymentMethod.STRIPE: return 'Credit/Debit Card';
            case PaymentMethod.PAYPAL: return 'PayPal';
            case PaymentMethod.INSURANCE: return 'Insurance';
            case PaymentMethod.CASH: return 'Cash';
            default: return method;
        }
    }

    getTotalPaid(): number {
        return this.payments()
            .filter(p => p.paymentStatus === PaymentStatus.COMPLETED)
            .reduce((sum, p) => sum + Number(p.amount), 0);
    }

    getTotalPending(): number {
        return this.payments()
            .filter(p => p.paymentStatus === PaymentStatus.PENDING)
            .reduce((sum, p) => sum + Number(p.amount), 0);
    }

    getTotalRefunded(): number {
        return this.payments()
            .filter(p => p.paymentStatus === PaymentStatus.REFUNDED)
            .reduce((sum, p) => sum + Number(p.refundAmount || p.amount), 0);
    }
}
