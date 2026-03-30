/**
 * AppointmentListComponent Unit Tests
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppointmentListComponent } from './appointment-list.component';
import { AppointmentService } from '../../../../core/services/appointment.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { signal } from '@angular/core';
import { of } from 'rxjs';

describe('AppointmentListComponent', () => {
    let component: AppointmentListComponent;
    let fixture: ComponentFixture<AppointmentListComponent>;
    let mockAppointmentService: jasmine.SpyObj<AppointmentService>;
    let mockNotificationService: jasmine.SpyObj<NotificationService>;

    beforeEach(async () => {
        mockAppointmentService = jasmine.createSpyObj('AppointmentService', ['getAppointments', 'cancelAppointment'], {
            isLoading: signal(false),
        });
        mockAppointmentService.getAppointments.and.returnValue(of({
            success: true,
            data: [],
            message: 'Success',
            metadata: { total: 0, page: 1, limit: 10, totalPages: 0 }
        }));

        mockNotificationService = jasmine.createSpyObj('NotificationService', ['success', 'error']);

        await TestBed.configureTestingModule({
            imports: [AppointmentListComponent],
            providers: [
                provideRouter([]),
                { provide: AppointmentService, useValue: mockAppointmentService },
                { provide: NotificationService, useValue: mockNotificationService },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(AppointmentListComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should load appointments on init', () => {
        expect(mockAppointmentService.getAppointments).toHaveBeenCalled();
    });

    it('should filter appointments by status', () => {
        component['setFilter']('upcoming');
        expect(component['selectedFilter']()).toBe('upcoming');
    });

    it('should update search term', () => {
        const mockEvent = { target: { value: 'Smith' } } as unknown as Event;
        component['onSearch'](mockEvent);
        expect(component['searchTerm']()).toBe('Smith');
    });
});
