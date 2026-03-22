import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { MfaSetupComponent } from './mfa-setup.component';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

describe('MfaSetupComponent', () => {
    let component: MfaSetupComponent;
    let fixture: ComponentFixture<MfaSetupComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [MfaSetupComponent],
            providers: [
                AuthService,
                NotificationService,
                provideHttpClient(),
                provideHttpClientTesting(),
                provideRouter([])
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(MfaSetupComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
