import { sequelize } from '../src/config/database';
import { initializeAssociations, User, Doctor, Patient, Appointment, MedicalRecord, DoctorAvailability } from '../src/models';
import { UserRole, Gender, AppointmentStatus, MedicalRecordType, DayOfWeek } from '../src/types/constants';

const seedDatabase = async () => {
    try {
        console.log('Initializing associations...');
        initializeAssociations();

        console.log('Syncing database...');
        await sequelize.sync({ force: true });

        console.log('Seeding Users...');

        const admin = await User.create({
            email: 'admin@test.com',
            password: 'Password123!',
            role: UserRole.ADMIN,
            firstName: 'System',
            lastName: 'Admin'
        });

        const doctorUser = await User.create({
            email: 'doctor@test.com',
            password: 'Password123!',
            role: UserRole.DOCTOR,
            firstName: 'John',
            lastName: 'Doe'
        });

        const patientUser = await User.create({
            email: 'patient@test.com',
            password: 'Password123!',
            role: UserRole.PATIENT,
            firstName: 'Jane',
            lastName: 'Smith'
        });

        console.log('Seeding Profiles...');

        const doctor = await Doctor.create({
            userId: doctorUser.id,
            specialization: 'General Practice',
            licenseNumber: 'MD12345',
            yearsOfExperience: 10,
            consultationFee: 150,
            bio: 'Experienced general practitioner.',
        });

        const patient = await Patient.create({
            userId: patientUser.id,
            dateOfBirth: new Date('1990-01-01'),
            gender: Gender.FEMALE,
            bloodGroup: 'A+',
            emergencyContactName: 'John Smith',
            emergencyContactPhone: '555-0100',
        });

        console.log('Seeding Doctor Availability...');
        const days = Object.values(DayOfWeek);
        const effectiveFrom = new Date();
        const effectiveTo = new Date();
        effectiveTo.setFullYear(effectiveTo.getFullYear() + 1);

        for (const day of days) {
            await DoctorAvailability.create({
                doctorId: doctor.id,
                dayOfWeek: day,
                startTime: '09:00:00',
                endTime: '17:00:00',
                isAvailable: ([DayOfWeek.SATURDAY, DayOfWeek.SUNDAY] as DayOfWeek[]).includes(day) ? false : true,
                effectiveFrom,
                effectiveTo,
            } as any);
        }

        console.log('Seeding Appointments...');

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const appointment = await Appointment.create({
            patientId: patient.id,
            doctorId: doctor.id,
            appointmentDate: tomorrow,
            startTime: '10:00:00',
            endTime: '10:30:00',
            status: AppointmentStatus.SCHEDULED,
            reasonForVisit: 'Annual checkup'
        });

        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 10);

        const pastAppointment = await Appointment.create({
            patientId: patient.id,
            doctorId: doctor.id,
            appointmentDate: pastDate,
            startTime: '14:00:00',
            endTime: '14:30:00',
            status: AppointmentStatus.COMPLETED,
            reasonForVisit: 'Flu symptoms'
        });

        console.log('Seeding Medical Records...');

        await MedicalRecord.create({
            patientId: patient.id,
            doctorId: doctor.id,
            appointmentId: pastAppointment.id,
            recordType: MedicalRecordType.CONSULTATION,
            diagnosis: 'Common Flu',
            notes: 'Patient advised to rest and drink plenty of fluids.',
            prescriptions: [
                {
                    medication: 'Ibuprofen',
                    dosage: '400mg',
                    frequency: 'every 6 hours',
                    duration: '3 days',
                    startDate: pastDate.toISOString().split('T')[0],
                }
            ],
            isConfidential: false
        });

        console.log('Database seeding completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
};

seedDatabase();
