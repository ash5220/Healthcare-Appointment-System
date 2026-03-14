import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DoctorAppointmentsComponent } from './appointments.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('DoctorAppointmentsComponent', () => {
    let component: DoctorAppointmentsComponent;
    let fixture: ComponentFixture<DoctorAppointmentsComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [DoctorAppointmentsComponent],
            providers: [
                provideHttpClient(),
                provideHttpClientTesting()
            ]
        })
            .compileComponents();

        fixture = TestBed.createComponent(DoctorAppointmentsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
