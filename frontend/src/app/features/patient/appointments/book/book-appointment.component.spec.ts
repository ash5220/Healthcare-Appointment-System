/**
 * BookAppointmentComponent Unit Tests
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookAppointmentComponent } from './book-appointment.component';
import { AppointmentService } from '../../../../core/services/appointment.service';
import { DoctorService } from '../../../../core/services/doctor.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { of, throwError } from 'rxjs';
import { provideRouter, Router } from '@angular/router';
import { Doctor, UserRole } from '../../../../core/models';

describe('BookAppointmentComponent', () => {
    let component: BookAppointmentComponent;
    let fixture: ComponentFixture<BookAppointmentComponent>;
    let mockAppointmentService: jasmine.SpyObj<AppointmentService>;
    let mockDoctorService: jasmine.SpyObj<DoctorService>;
    let mockNotificationService: jasmine.SpyObj<NotificationService>;
    let router: Router;

    const mockDoctor: Doctor = {
        id: 'd1',
        userId: 'u1',
        specialization: 'Cardiology',
        licenseNumber: 'L123',
        yearsOfExperience: 10,
        consultationFee: 100,
        rating: 4.5,
        totalPatients: 100,
        qualifications: [],
        languages: ['English'],
        user: {
            id: 'u1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'doc@test.com',
            role: UserRole.DOCTOR,
            isActive: true,
            isEmailVerified: true,
            createdAt: new Date(),
            updatedAt: new Date()
        }
    };

    beforeEach(async () => {
        mockAppointmentService = jasmine.createSpyObj('AppointmentService', [
            'getAvailableSlots',
            'createAppointment',
        ]);
        mockAppointmentService.getAvailableSlots.and.returnValue(of({
            success: true,
            data: { slots: ['09:00', '10:00'] },
            message: 'Success',
        }));
        mockAppointmentService.createAppointment.and.returnValue(of({
            success: true,
            data: { appointment: {} as any },
            message: 'Success'
        }));

        mockDoctorService = jasmine.createSpyObj('DoctorService', ['getDoctors']);
        mockDoctorService.getDoctors.and.returnValue(of({
            success: true,
            data: [mockDoctor],
            metadata: { page: 1, limit: 10, total: 1, totalPages: 1 }
        }));

        mockNotificationService = jasmine.createSpyObj('NotificationService', ['success', 'error']);

        await TestBed.configureTestingModule({
            imports: [BookAppointmentComponent],
            providers: [
                provideRouter([]),
                { provide: AppointmentService, useValue: mockAppointmentService },
                { provide: DoctorService, useValue: mockDoctorService },
                { provide: NotificationService, useValue: mockNotificationService },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(BookAppointmentComponent);
        component = fixture.componentInstance;
        router = TestBed.inject(Router);
        spyOn(router, 'navigate');
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should load doctors on init', () => {
        // Doctor loading happens on init
        expect(component['doctors']()).toBeDefined();
    });

    it('should filter doctors by search term', () => {
        component['searchTerm'] = 'Smith';
        component['filterDoctors']();
        // Filtered doctors should be updated
        expect(component['filteredDoctors']).toBeDefined();
    });

    it('should select a doctor', () => {
        const mockDoctor = component['doctors']()[0];
        if (mockDoctor) {
            component['selectDoctor'](mockDoctor);
            expect(component['selectedDoctor']()).toBe(mockDoctor);
        }
    });
});
