import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppointmentService } from '../../../core/services/appointment.service';
import { NotificationService } from '../../../core/services/notification.service';
import { InsuranceService } from '../../../core/services/insurance.service';
import { AppointmentStatus, Appointment, InsuranceStatus } from '../../../core/models';

@Component({
  selector: 'app-doctor-appointments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './appointments.component.html',
  styleUrl: './appointments.component.scss',
})
export class DoctorAppointmentsComponent implements OnInit {
  appointmentService = inject(AppointmentService);
  private notificationService = inject(NotificationService);
  private insuranceService = inject(InsuranceService);

  viewMode = signal<'list' | 'calendar'>('list');
  showCompleteModal = signal(false);
  showCancelModal = signal(false);

  selectedStatus = '';
  startDate = '';
  endDate = '';
  selectedAppointment: Appointment | null = null;
  completionNotes = '';
  cancellationReason = '';
  prescriptions: Array<{ medication: string; dosage: string; frequency: string; duration: string; instructions?: string }> = [];

  ngOnInit(): void {
    this.loadAppointments();
  }

  loadAppointments(): void {
    this.appointmentService.getAppointments({
      status: this.selectedStatus as AppointmentStatus || undefined,
      startDate: this.startDate || undefined,
      endDate: this.endDate || undefined,
      limit: 50,
    }).subscribe();
  }

  resetFilters(): void {
    this.selectedStatus = '';
    this.startDate = '';
    this.endDate = '';
    this.loadAppointments();
  }

  confirmAppointment(apt: Appointment): void {
    this.appointmentService.confirmAppointment(apt.id).subscribe({
      next: () => {
        this.notificationService.success('Success', 'Appointment confirmed');
        this.loadAppointments();
      },
    });
  }

  openCompleteModal(apt: Appointment): void {
    this.selectedAppointment = apt;
    this.completionNotes = '';
    this.prescriptions = [];
    this.showCompleteModal.set(true);
  }

  openCancelModal(apt: Appointment): void {
    this.selectedAppointment = apt;
    this.cancellationReason = '';
    this.showCancelModal.set(true);
  }

  closeModals(): void {
    this.showCompleteModal.set(false);
    this.showCancelModal.set(false);
    this.selectedAppointment = null;
  }

  addPrescription(): void {
    this.prescriptions.push({ medication: '', dosage: '', frequency: '', duration: '', instructions: '' });
  }

  removePrescription(index: number): void {
    this.prescriptions.splice(index, 1);
  }

  completeAppointment(): void {
    if (!this.selectedAppointment) return;

    const validPrescriptions = this.prescriptions.filter(p => p.medication && p.dosage);

    this.appointmentService.completeAppointment(
      this.selectedAppointment.id,
      this.completionNotes || undefined,
      validPrescriptions.length > 0 ? validPrescriptions : undefined
    ).subscribe({
      next: () => {
        this.notificationService.success('Success', 'Appointment completed');
        this.closeModals();
        this.loadAppointments();
      },
    });
  }

  cancelAppointment(): void {
    if (!this.selectedAppointment || this.cancellationReason.length < 10) return;

    this.appointmentService.cancelAppointment(
      this.selectedAppointment.id,
      this.cancellationReason
    ).subscribe({
      next: () => {
        this.notificationService.success('Success', 'Appointment cancelled');
        this.closeModals();
        this.loadAppointments();
      },
    });
  }

  getStatusBadgeClass(status: AppointmentStatus): string {
    const classes: Record<AppointmentStatus, string> = {
      [AppointmentStatus.SCHEDULED]: 'bg-warning text-dark',
      [AppointmentStatus.CONFIRMED]: 'bg-primary',
      [AppointmentStatus.COMPLETED]: 'bg-success',
      [AppointmentStatus.CANCELLED]: 'bg-danger',
      [AppointmentStatus.NO_SHOW]: 'bg-secondary',
    };
    return classes[status] || 'bg-secondary';
  }

  verifyPatientInsurance(apt: Appointment): void {
    if (!apt.patientId) return;

    // Fetch the patient's insurances to verify the first active one
    this.insuranceService.getPatientInsurance(apt.patientId).subscribe({
      next: (val) => {
        const insurances = val.data?.insurances || [];
        const activeInsurance = insurances.find(ins => ins.isActive);

        if (!activeInsurance) {
          this.notificationService.error('Verification Failed', 'Patient has no active insurance.');
          return;
        }

        if (activeInsurance.verificationStatus === InsuranceStatus.VERIFIED) {
          this.notificationService.success('Already Verified', 'Patient insurance is already verified.');
          return;
        }

        this.insuranceService.verifyInsurance(activeInsurance.id).subscribe({
          next: () => {
            this.notificationService.success('Verified', 'Patient insurance has been successfully verified.');
          },
          error: (err) => {
            this.notificationService.error('Error', 'Failed to verify insurance.');
            console.error('Verify error', err);
          }
        });
      },
      error: (err) => {
        this.notificationService.error('Error', 'Could not fetch patient insurance.');
        console.error('Fetch insurance error', err);
      }
    });
  }
}
