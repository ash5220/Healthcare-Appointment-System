import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AppointmentService } from './appointment.service';
import { environment } from '../../../environments/environment';
import { AppointmentStatus, Appointment } from '../models';

describe('AppointmentService', () => {
    let service: AppointmentService;
    let httpMock: HttpTestingController;

    const mockAppointment: Appointment = {
        id: '100',
        patientId: 'p1',
        doctorId: 'd1',
        appointmentDate: '2023-10-10',
        startTime: '10:00',
        endTime: '10:30',
        status: AppointmentStatus.SCHEDULED,
        reasonForVisit: 'Checkup',
        createdAt: new Date(),
        updatedAt: new Date()
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                AppointmentService,
                provideHttpClient(),
                provideHttpClientTesting()
            ]
        });
        service = TestBed.inject(AppointmentService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('getAppointments', () => {
        it('should build correct query params from filters', () => {
            // filters
            const filters = {
                page: 1,
                limit: 10,
                status: AppointmentStatus.CONFIRMED,
                doctorId: 'd123'
            };

            service.getAppointments(filters).subscribe();

            const req = httpMock.expectOne(req => req.url === `${environment.apiUrl}/appointments`);
            expect(req.request.params.get('page')).toBe('1');
            expect(req.request.params.get('limit')).toBe('10');
            expect(req.request.params.get('status')).toBe(AppointmentStatus.CONFIRMED);
            expect(req.request.params.get('doctorId')).toBe('d123');
            expect(req.request.params.has('startDate')).toBeFalse();

            req.flush({
                success: true,
                data: [mockAppointment],
                metadata: { total: 1, page: 1, limit: 10, totalPages: 1 }
            });
        });

        it('should update signals after fetching', () => {
            service.getAppointments().subscribe();

            const req = httpMock.expectOne(req => req.url === `${environment.apiUrl}/appointments`);
            req.flush({
                success: true,
                data: [mockAppointment],
                metadata: { total: 1, page: 1, limit: 10, totalPages: 1 }
            });

            expect(service.appointments()).toEqual([mockAppointment]);
            expect(service.total()).toBe(1);
        });
    });

    describe('updateAppointment', () => {
        it('should update local signal state on successful update', () => {
            // Pre-load data
            (service as any).appointmentsSignal.set([mockAppointment]);

            const updatedAppt = { ...mockAppointment, status: AppointmentStatus.CONFIRMED };

            service.updateAppointment(mockAppointment.id, { status: AppointmentStatus.CONFIRMED }).subscribe();

            const req = httpMock.expectOne(`${environment.apiUrl}/appointments/${mockAppointment.id}`);
            expect(req.request.method).toBe('PUT');
            req.flush({
                success: true,
                data: { appointment: updatedAppt }
            });

            const storedAppts = service.appointments();
            expect(storedAppts[0].status).toBe(AppointmentStatus.CONFIRMED);
        });
    });
});
