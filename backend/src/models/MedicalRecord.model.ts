import {
    Model,
    DataTypes,
    InferAttributes,
    InferCreationAttributes,
    CreationOptional,
    ForeignKey,
    NonAttribute,
} from 'sequelize';
import { sequelize } from '../config/database';
import { MedicalRecordType } from '../types/constants';
import { Patient } from './Patient.model';
import { Doctor } from './Doctor.model';
import { Appointment } from './Appointment.model';

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

export class MedicalRecord extends Model<
    InferAttributes<MedicalRecord>,
    InferCreationAttributes<MedicalRecord>
> {
    declare id: CreationOptional<string>;
    declare patientId: ForeignKey<Patient['id']>;
    declare doctorId: ForeignKey<Doctor['id']>;
    declare appointmentId: CreationOptional<ForeignKey<Appointment['id']>>;
    declare recordType: MedicalRecordType;
    declare diagnosis: CreationOptional<string>;
    declare symptoms: CreationOptional<string[]>;
    declare prescriptions: CreationOptional<PrescriptionRecord[]>;
    declare labResults: CreationOptional<LabResult[]>;
    declare attachments: CreationOptional<string[]>;
    declare notes: CreationOptional<string>;
    declare isConfidential: CreationOptional<boolean>;
    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;
    declare deletedAt: CreationOptional<Date | null>;

    // Associations
    declare patient?: NonAttribute<Patient>;
    declare doctor?: NonAttribute<Doctor>;
    declare appointment?: NonAttribute<Appointment>;
}

MedicalRecord.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        patientId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'patients',
                key: 'id',
            },
        },
        doctorId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'doctors',
                key: 'id',
            },
        },
        appointmentId: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'appointments',
                key: 'id',
            },
        },
        recordType: {
            type: DataTypes.ENUM(...Object.values(MedicalRecordType)),
            allowNull: false,
        },
        diagnosis: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        symptoms: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: [],
        },
        prescriptions: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: [],
        },
        labResults: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: [],
        },
        attachments: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: [],
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        isConfidential: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        deletedAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: 'medical_records',
        timestamps: true,
        paranoid: true, // HIPAA: soft-delete, retain records for 6+ years
        underscored: true,
        indexes: [
            { fields: ['patient_id'] },
            { fields: ['doctor_id'] },
            { fields: ['appointment_id'] },
            { fields: ['record_type'] },
            { fields: ['created_at'] },
        ],
    }
);
