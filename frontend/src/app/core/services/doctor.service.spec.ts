import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DoctorService } from './doctor.service';

describe('DoctorService', () => {
    let service: DoctorService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                DoctorService,
                provideHttpClient(),
                provideHttpClientTesting()
            ]
        });
        service = TestBed.inject(DoctorService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });
});
