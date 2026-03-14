import { Doctor, Patient } from './user.model';
import { Appointment } from './appointment.model';

export enum MedicalRecordType {
    CONSULTATION = 'CONSULTATION',
    LAB_RESULT = 'LAB_RESULT',
    PRESCRIPTION = 'PRESCRIPTION',
    SURGERY = 'SURGERY',
    VACCINATION = 'VACCINATION',
    OTHER = 'OTHER'
}

export interface PrescriptionRecord {
    medication: string;
    dosage: string;
    frequency: string;
    duration: string;
    startDate: string;
    endDate?: string;
    instructions?: string;
}

export interface LabResult {
    testName: string;
    result: string;
    normalRange: string;
    unit: string;
    date: string;
    notes?: string;
}

export interface MedicalRecord {
    id: string;
    patientId: string;
    doctorId: string;
    appointmentId?: string;
    recordType: MedicalRecordType;
    diagnosis?: string;
    symptoms?: string[];
    prescriptions?: PrescriptionRecord[];
    labResults?: LabResult[];
    attachments?: string[];
    notes?: string;
    isConfidential: boolean;
    createdAt: string;
    updatedAt: string;

    // Virtual
    doctor?: Doctor;
    patient?: Patient;
    appointment?: Appointment;
}
