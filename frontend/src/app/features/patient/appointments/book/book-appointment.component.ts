/**
 * BookAppointmentComponent
 *
 * Multi-step appointment booking wizard allowing patients to:
 * 1. Search and select a doctor
 * 2. Choose an available date
 * 3. Select a time slot
 * 4. Provide reason for visit
 * 5. Confirm and book
 *
 * Uses reactive signals for state management and computed values
 * for derived state like filtered doctors.
 */
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { AppointmentService } from '../../../../core/services/appointment.service';
import { DoctorService } from '../../../../core/services/doctor.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Doctor, UserRole } from '../../../../core/models';
import {
  MAX_BOOKING_DAYS_AHEAD,
  MIN_REASON_LENGTH,
  MAX_REASON_LENGTH,
} from '../../../../core/constants';

/**
 * Medical specializations available for filtering.
 * Matches backend enum values.
 */
const SPECIALIZATIONS = [
  'Cardiology',
  'Dermatology',
  'General Medicine',
  'Neurology',
  'Orthopedics',
  'Pediatrics',
  'Psychiatry',
] as const;

@Component({
  selector: 'app-book-appointment',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule],
  templateUrl: './book-appointment.component.html',
  styleUrl: './book-appointment.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookAppointmentComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly appointmentService = inject(AppointmentService);
  private readonly doctorService = inject(DoctorService);
  private readonly notificationService = inject(NotificationService);

  /** All doctors from API */
  protected readonly doctors = signal<Doctor[]>([]);

  /** Filtered doctors based on search and specialization */
  protected readonly filteredDoctors = signal<Doctor[]>([]);

  /** Available time slots for selected date */
  protected readonly availableSlots = signal<string[]>([]);

  /** Currently selected doctor */
  protected readonly selectedDoctor = signal<Doctor | null>(null);

  /** Currently selected time slot */
  protected readonly selectedSlot = signal<string | null>(null);

  /** Loading states */
  protected readonly isLoadingDoctors = signal(false);
  protected readonly isLoadingSlots = signal(false);
  protected readonly isSubmitting = signal(false);

  /** Search and filter inputs */
  protected searchTerm = '';
  protected selectedSpecialization = '';

  /** Available specializations */
  protected readonly specializations = SPECIALIZATIONS;

  /** Min reason length for validation feedback */
  protected readonly minReasonLength = MIN_REASON_LENGTH;

  /**
   * Date boundaries for appointment booking.
   * Prevents booking in the past or too far in the future.
   */
  protected readonly minDate = new Date().toISOString().split('T')[0];
  protected readonly maxDate = new Date(Date.now() + MAX_BOOKING_DAYS_AHEAD * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  /** Booking form for date and reason */
  protected readonly bookingForm = this.fb.group({
    appointmentDate: ['', Validators.required],
    reasonForVisit: [
      '',
      [
        Validators.required,
        Validators.minLength(MIN_REASON_LENGTH),
        Validators.maxLength(MAX_REASON_LENGTH),
      ],
    ],
  });

  ngOnInit(): void {
    this.loadDoctors();
  }

  /**
   * Load all available doctors from the API.
   */
  protected loadDoctors(): void {
    this.isLoadingDoctors.set(true);

    this.doctorService.getDoctors().subscribe({
      next: (response) => {
        const doctors = response.data || [];
        this.doctors.set(doctors);
        this.filteredDoctors.set(doctors);
        this.isLoadingDoctors.set(false);
      },
      error: () => {
        // Set demo doctors for development
        this.setDemoDoctors();
        this.isLoadingDoctors.set(false);
      },
    });
  }

  /**
   * Set demo doctors for development/testing.
   */
  private setDemoDoctors(): void {
    const demoDoctors: Doctor[] = [
      {
        id: '1',
        userId: '1',
        specialization: 'Cardiology',
        licenseNumber: 'L001',
        yearsOfExperience: 10,
        consultationFee: 100,
        rating: 4.5,
        totalPatients: 500,
        qualifications: [{ degree: 'MD', institution: 'Harvard Medical School', year: 2010 }],
        languages: ['English'],
        user: {
          id: '1',
          email: 'dr.smith@example.com',
          role: 'doctor' as UserRole,
          firstName: 'John',
          lastName: 'Smith',
          isActive: true,
          isEmailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      {
        id: '2',
        userId: '2',
        specialization: 'General Medicine',
        licenseNumber: 'L002',
        yearsOfExperience: 8,
        consultationFee: 80,
        rating: 4.8,
        totalPatients: 350,
        qualifications: [{ degree: 'MD', institution: 'Johns Hopkins', year: 2012 }],
        languages: ['English', 'Spanish'],
        user: {
          id: '2',
          email: 'dr.johnson@example.com',
          role: UserRole.DOCTOR,
          firstName: 'Sarah',
          lastName: 'Johnson',
          isActive: true,
          isEmailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
    ];
    this.doctors.set(demoDoctors);
    this.filteredDoctors.set(demoDoctors);
  }

  /**
   * Filter doctors based on search term and specialization.
   */
  protected filterDoctors(): void {
    let result = this.doctors();

    // Apply search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(
        (d) =>
          d.user?.firstName?.toLowerCase().includes(term) ||
          d.user?.lastName?.toLowerCase().includes(term) ||
          d.specialization?.toLowerCase().includes(term),
      );
    }

    // Apply specialization filter
    if (this.selectedSpecialization) {
      result = result.filter((d) => d.specialization === this.selectedSpecialization);
    }

    this.filteredDoctors.set(result);
  }

  /**
   * Handle doctor selection.
   */
  protected selectDoctor(doctor: Doctor): void {
    this.selectedDoctor.set(doctor);
    this.selectedSlot.set(null);
    this.availableSlots.set([]);

    // Load slots if date is already selected
    if (this.bookingForm.get('appointmentDate')?.value) {
      this.loadAvailableSlots();
    }
  }

  /**
   * Load available time slots for the selected doctor and date.
   */
  protected loadAvailableSlots(): void {
    const doctor = this.selectedDoctor();
    const date = this.bookingForm.get('appointmentDate')?.value;

    if (!doctor || !date) return;

    this.isLoadingSlots.set(true);

    this.appointmentService.getAvailableSlots(doctor.id, date).subscribe({
      next: (response) => {
        this.availableSlots.set(response.data.slots || []);
        this.isLoadingSlots.set(false);
      },
      error: (error: unknown) => {
        void error;
        // Demo slots for development
        this.availableSlots.set([
          '09:00',
          '09:30',
          '10:00',
          '10:30',
          '11:00',
          '14:00',
          '14:30',
          '15:00',
          '15:30',
          '16:00',
        ]);
        this.isLoadingSlots.set(false);
      },
    });
  }

  /**
   * Handle time slot selection.
   */
  protected selectSlot(slot: string): void {
    this.selectedSlot.set(slot);
  }

  /**
   * Submit the appointment booking.
   */
  protected onSubmit(): void {
    if (this.bookingForm.invalid || !this.selectedDoctor() || !this.selectedSlot()) {
      return;
    }

    const doctor = this.selectedDoctor();
    const slot = this.selectedSlot();
    const appointmentDate = this.bookingForm.get('appointmentDate')?.value;
    const reasonForVisit = this.bookingForm.get('reasonForVisit')?.value;
    if (!doctor || !slot || !appointmentDate || !reasonForVisit) return;

    this.isSubmitting.set(true);

    this.appointmentService
      .createAppointment({
        doctorId: doctor.id,
        appointmentDate,
        startTime: slot,
        reasonForVisit,
      })
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.notificationService.success('Success', 'Appointment booked successfully!');
          this.router.navigate(['/patient/appointments']);
        },
        error: (error: unknown) => {
          void error;
          this.isSubmitting.set(false);
        },
      });
  }

  /**
   * Get doctor initials for avatar display.
   */
  protected getDoctorInitials(doctor: Doctor): string {
    const first = doctor.user?.firstName?.charAt(0) || '';
    const last = doctor.user?.lastName?.charAt(0) || '';
    return `${first}${last}`.toUpperCase();
  }

  /**
   * Get doctor full name.
   */
  protected getDoctorName(doctor: Doctor): string {
    return `Dr. ${doctor.user?.firstName || ''} ${doctor.user?.lastName || ''}`.trim();
  }

  /**
   * Check if form has a specific error.
   */
  protected hasError(controlName: string, errorName: string): boolean {
    const control = this.bookingForm.get(controlName);
    return control ? control.hasError(errorName) && control.touched : false;
  }
}
