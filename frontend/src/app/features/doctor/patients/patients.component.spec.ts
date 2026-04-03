import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../../environments/environment';
import { Gender } from '../../../core/models';

import { DoctorPatientsComponent } from './patients.component';

const APPTS_URL = `${environment.apiUrl}/appointments`;

const makeAppointment = (patientId: string, firstName: string, lastName: string, extra = {}) => ({
  id: `apt-${patientId}`,
  patientId,
  doctorId: 'doc1',
  appointmentDate: '2026-04-10',
  startTime: '09:00',
  endTime: '09:30',
  status: 'confirmed',
  reasonForVisit: 'Check-up',
  patient: {
    id: patientId,
    userId: `u-${patientId}`,
    dateOfBirth: new Date('1990-01-01'),
    gender: Gender.MALE,
    allergies: [],
    user: { firstName, lastName, email: `${firstName.toLowerCase()}@example.com` },
    ...extra,
  } as never,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('DoctorPatientsComponent', () => {
  let component: DoctorPatientsComponent;
  let fixture: ComponentFixture<DoctorPatientsComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DoctorPatientsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  afterEach(() => httpMock.verify());

  function buildAndFlush(pages: ReturnType<typeof makeAppointment>[][] = [[]]) {
    fixture = TestBed.createComponent(DoctorPatientsComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges(); // triggers ngOnInit → loadPatients → page 1

    pages.forEach((pageData, idx) => {
      const req = httpMock.expectOne(
        (r) =>
          r.url === APPTS_URL &&
          r.params.get('page') === String(idx + 1) &&
          r.params.get('limit') === '100',
      );
      req.flush({
        success: true,
        data: pageData,
        metadata: { page: idx + 1, limit: 100, total: pages.flat().length, totalPages: pages.length },
      });
    });

    fixture.detectChanges();
  }

  it('should create', () => {
    buildAndFlush();
    expect(component).toBeTruthy();
  });

  // ---------------------------------------------------------------------------
  // Happy path
  // ---------------------------------------------------------------------------
  describe('DoctorPatientsComponent — load — happy path', () => {
    it('DoctorPatientsComponent — single page of appointments — extracts unique patients', fakeAsync(() => {
      buildAndFlush([[makeAppointment('p1', 'Alice', 'Smith'), makeAppointment('p2', 'Bob', 'Jones')]]);
      tick();
      expect(component['allPatients']().length).toBe(2);
      expect(component.isLoading()).toBeFalse();
    }));

    it('DoctorPatientsComponent — multiple appointments for same patient — deduplicated', fakeAsync(() => {
      buildAndFlush([
        [
          makeAppointment('p1', 'Alice', 'Smith'),
          makeAppointment('p1', 'Alice', 'Smith'), // duplicate
          makeAppointment('p2', 'Bob', 'Jones'),
        ],
      ]);
      tick();
      expect(component['allPatients']().length).toBe(2);
    }));

    it('DoctorPatientsComponent — appointments without patient field — skipped', fakeAsync(() => {
      const aptNoPatient = { ...makeAppointment('p1', 'Alice', 'Smith'), patient: undefined };
      buildAndFlush([[aptNoPatient as never]]);
      tick();
      expect(component['allPatients']().length).toBe(0);
    }));

    it('DoctorPatientsComponent — multi-page response — fetches all pages and combines', fakeAsync(() => {
      buildAndFlush([
        [makeAppointment('p1', 'Alice', 'Smith')],
        [makeAppointment('p2', 'Bob', 'Jones')],
      ]);
      tick();
      expect(component['allPatients']().length).toBe(2);
    }));

    it('DoctorPatientsComponent — empty appointments — allPatients is empty', fakeAsync(() => {
      buildAndFlush([[]]);
      tick();
      expect(component['allPatients']()).toEqual([]);
    }));
  });

  // ---------------------------------------------------------------------------
  // Error cases
  // ---------------------------------------------------------------------------
  describe('DoctorPatientsComponent — load — error cases', () => {
    it('DoctorPatientsComponent — HTTP error — sets isLoading to false', fakeAsync(() => {
      fixture = TestBed.createComponent(DoctorPatientsComponent);
      component = fixture.componentInstance;
      httpMock = TestBed.inject(HttpTestingController);
      fixture.detectChanges();

      httpMock
        .expectOne((r) => r.url === APPTS_URL)
        .flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
      tick();

      expect(component.isLoading()).toBeFalse();
    }));
  });

  // ---------------------------------------------------------------------------
  // Search filtering
  // ---------------------------------------------------------------------------
  describe('DoctorPatientsComponent — search filtering', () => {
    beforeEach(fakeAsync(() => {
      buildAndFlush([
        [makeAppointment('p1', 'Alice', 'Smith'), makeAppointment('p2', 'Bob', 'Jones')],
      ]);
      tick();
    }));

    it('DoctorPatientsComponent — empty query — returns all patients', () => {
      component.searchQuery.set('');
      expect(component.filteredPatients().length).toBe(2);
    });

    it('DoctorPatientsComponent — query matching first name — filters correctly', () => {
      component.searchQuery.set('alice');
      expect(component.filteredPatients().length).toBe(1);
      expect(component.filteredPatients()[0].user?.firstName).toBe('Alice');
    });

    it('DoctorPatientsComponent — query matching email — filters correctly', () => {
      component.searchQuery.set('bob@example');
      expect(component.filteredPatients().length).toBe(1);
    });

    it('DoctorPatientsComponent — query matching nothing — returns empty list', () => {
      component.searchQuery.set('zzznomatch');
      expect(component.filteredPatients().length).toBe(0);
    });

    it('DoctorPatientsComponent — query with uppercase — case-insensitive match', () => {
      component.searchQuery.set('ALICE');
      expect(component.filteredPatients().length).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // initials helper
  // ---------------------------------------------------------------------------
  describe('DoctorPatientsComponent — initials — edge cases', () => {
    beforeEach(fakeAsync(() => {
      buildAndFlush([[]]);
      tick();
    }));

    it('DoctorPatientsComponent — patient with full name — returns uppercased initials', () => {
      const patient = makeAppointment('p1', 'Alice', 'Smith').patient;
      expect(component['initials'](patient)).toBe('AS');
    });

    it('DoctorPatientsComponent — patient with no user — returns empty string', () => {
      const patient = { id: 'p1', userId: 'u1', dateOfBirth: new Date(), gender: Gender.MALE, allergies: [] } as never;
      expect(component['initials'](patient)).toBe('');
    });
  });
});
