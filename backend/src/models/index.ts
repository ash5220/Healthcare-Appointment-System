// Export all models
export { User } from './User.model';
export { Doctor } from './Doctor.model';
export { Patient } from './Patient.model';
export { Appointment } from './Appointment.model';
export { MedicalRecord } from './MedicalRecord.model';
export { DoctorAvailability } from './Availability.model';
export { Notification } from './Notification.model';
export { Message } from './Message.model';
export { Insurance } from './Insurance.model';
export { PhiAuditLog } from './PhiAuditLog.model';
export { PhiAction, PhiResourceType, AuditOutcome } from './PhiAuditLog.model';

// Import models for associations
import { User } from './User.model';
import { Doctor } from './Doctor.model';
import { Patient } from './Patient.model';
import { Appointment } from './Appointment.model';
import { MedicalRecord } from './MedicalRecord.model';
import { DoctorAvailability } from './Availability.model';
import { Notification } from './Notification.model';
import { Message } from './Message.model';
import { Insurance } from './Insurance.model';
import './PhiAuditLog.model';

// Define associations
export const initializeAssociations = (): void => {
    // User - Doctor relationship (One-to-One)
    User.hasOne(Doctor, {
        foreignKey: 'userId',
        as: 'doctorProfile',
    });
    Doctor.belongsTo(User, {
        foreignKey: 'userId',
        as: 'user',
    });

    // User - Patient relationship (One-to-One)
    User.hasOne(Patient, {
        foreignKey: 'userId',
        as: 'patientProfile',
    });
    Patient.belongsTo(User, {
        foreignKey: 'userId',
        as: 'user',
    });

    // Doctor - Appointment relationship (One-to-Many)
    Doctor.hasMany(Appointment, {
        foreignKey: 'doctorId',
        as: 'appointments',
    });
    Appointment.belongsTo(Doctor, {
        foreignKey: 'doctorId',
        as: 'doctor',
    });

    // Patient - Appointment relationship (One-to-Many)
    Patient.hasMany(Appointment, {
        foreignKey: 'patientId',
        as: 'appointments',
    });
    Appointment.belongsTo(Patient, {
        foreignKey: 'patientId',
        as: 'patient',
    });

    // User - Appointment (cancelledBy) relationship
    User.hasMany(Appointment, {
        foreignKey: 'cancelledBy',
        as: 'cancelledAppointments',
    });
    Appointment.belongsTo(User, {
        foreignKey: 'cancelledBy',
        as: 'cancelledByUser',
    });

    // Doctor - MedicalRecord relationship (One-to-Many)
    Doctor.hasMany(MedicalRecord, {
        foreignKey: 'doctorId',
        as: 'medicalRecords',
    });
    MedicalRecord.belongsTo(Doctor, {
        foreignKey: 'doctorId',
        as: 'doctor',
    });

    // Patient - MedicalRecord relationship (One-to-Many)
    Patient.hasMany(MedicalRecord, {
        foreignKey: 'patientId',
        as: 'medicalRecords',
    });
    MedicalRecord.belongsTo(Patient, {
        foreignKey: 'patientId',
        as: 'patient',
    });

    // Appointment - MedicalRecord relationship (One-to-One)
    Appointment.hasOne(MedicalRecord, {
        foreignKey: 'appointmentId',
        as: 'medicalRecord',
    });
    MedicalRecord.belongsTo(Appointment, {
        foreignKey: 'appointmentId',
        as: 'appointment',
    });

    // Doctor - DoctorAvailability relationship (One-to-Many)
    Doctor.hasMany(DoctorAvailability, {
        foreignKey: 'doctorId',
        as: 'availabilities',
    });
    DoctorAvailability.belongsTo(Doctor, {
        foreignKey: 'doctorId',
        as: 'doctor',
    });

    // User - Notification relationship (One-to-Many)
    User.hasMany(Notification, {
        foreignKey: 'userId',
        as: 'notifications',
    });
    Notification.belongsTo(User, {
        foreignKey: 'userId',
        as: 'user',
    });

    // User - Message sender relationship (One-to-Many)
    User.hasMany(Message, {
        foreignKey: 'senderId',
        as: 'sentMessages',
    });
    Message.belongsTo(User, {
        foreignKey: 'senderId',
        as: 'sender',
    });

    // User - Message receiver relationship (One-to-Many)
    User.hasMany(Message, {
        foreignKey: 'receiverId',
        as: 'receivedMessages',
    });
    Message.belongsTo(User, {
        foreignKey: 'receiverId',
        as: 'receiver',
    });

    // Patient - Insurance relationship (One-to-Many)
    Patient.hasMany(Insurance, {
        foreignKey: 'patientId',
        as: 'insurances',
    });
    Insurance.belongsTo(Patient, {
        foreignKey: 'patientId',
        as: 'patient',
    });
};
