import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ScheduleComponent } from './schedule.component';
import { DoctorService } from '../../../core/services/doctor.service';
import { of } from 'rxjs';

describe('ScheduleComponent', () => {
    let component: ScheduleComponent;
    let fixture: ComponentFixture<ScheduleComponent>;
    let mockDoctorService: jasmine.SpyObj<DoctorService>;

    beforeEach(async () => {
        mockDoctorService = jasmine.createSpyObj('DoctorService', ['getAvailability', 'updateSchedule']);
        mockDoctorService.getAvailability.and.returnValue(of({
            data: { availability: [] }
        }));

        await TestBed.configureTestingModule({
            imports: [ScheduleComponent],
            providers: [
                { provide: DoctorService, useValue: mockDoctorService }
            ]
        })
            .compileComponents();

        fixture = TestBed.createComponent(ScheduleComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
