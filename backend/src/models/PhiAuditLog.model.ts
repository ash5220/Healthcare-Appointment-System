/**
 * PHI Audit Log Model (HIPAA Compliance - C-02)
 *
 * Records every access or export of Protected Health Information (PHI).
 * HIPAA requires audit controls that track who accessed what, when, and the outcome.
 *
 * This table is append-only; rows must NEVER be updated or deleted.
 * Retention policy: retain for a minimum of 6 years per HIPAA §164.530(j).
 */
import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from 'sequelize';
import { sequelize } from '../config/database';
import { UserRole } from '../types/constants';

// ─────────────────────────────────────────────────────────────────────────────
// PHI value-object enumerations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Actions that constitute a PHI access event.
 * Add entries here as new PHI-touching features are built.
 */
export const PhiAction = {
  // Medical records
  VIEW_MEDICAL_RECORDS: 'view_medical_records',
  EXPORT_RECORDS_CSV: 'export_records_csv',
  EXPORT_RECORDS_PDF: 'export_records_pdf',
  // Appointments
  BOOK_APPOINTMENT: 'book_appointment',
  VIEW_APPOINTMENT: 'view_appointment',
  UPDATE_APPOINTMENT: 'update_appointment',
  CANCEL_APPOINTMENT: 'cancel_appointment',
  CONFIRM_APPOINTMENT: 'confirm_appointment',
  COMPLETE_APPOINTMENT: 'complete_appointment',
  // Patient profile
  VIEW_PATIENT_PROFILE: 'view_patient_profile',
} as const;

export type PhiAction = (typeof PhiAction)[keyof typeof PhiAction];

/**
 * Categories of PHI resources.
 */
export const PhiResourceType = {
  MEDICAL_RECORD: 'medical_record',
  APPOINTMENT: 'appointment',
  PATIENT_PROFILE: 'patient_profile',
} as const;

export type PhiResourceType = (typeof PhiResourceType)[keyof typeof PhiResourceType];

/**
 * Whether the access attempt succeeded or was blocked.
 */
export const AuditOutcome = {
  SUCCESS: 'success',
  FAILURE: 'failure',
} as const;

export type AuditOutcome = (typeof AuditOutcome)[keyof typeof AuditOutcome];

// ─────────────────────────────────────────────────────────────────────────────
// Model
// ─────────────────────────────────────────────────────────────────────────────

export class PhiAuditLog extends Model<
  InferAttributes<PhiAuditLog>,
  InferCreationAttributes<PhiAuditLog>
> {
  declare id: CreationOptional<string>;

  /** The authenticated user who performed the action (null for unauthenticated attempts). */
  declare actorId: string | null;

  /** Role of the actor at the time of access. */
  declare actorRole: UserRole | null;

  /** The PHI action performed. */
  declare action: PhiAction;

  /** Category of the resource that was accessed. */
  declare resourceType: PhiResourceType;

  /** ID of the patient whose PHI was accessed. Indexed for quick per-patient audits. */
  declare patientId: string | null;

  /** Specific record ID (e.g. a single MedicalRecord UUID), when applicable. */
  declare resourceId: string | null;

  /** Client IP address at the time of the request. */
  declare ipAddress: string | null;

  /** Client User-Agent header value. */
  declare userAgent: string | null;

  /** Whether the access succeeded or was denied. */
  declare outcome: AuditOutcome;

  /** Optional structured details (freeform JSON for context-specific metadata). */
  declare details: Record<string, unknown> | null;

  /** Immutable timestamp — set once on creation, never updated. */
  declare createdAt: CreationOptional<Date>;
}

PhiAuditLog.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    actorId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    actorRole: {
      type: DataTypes.ENUM(...Object.values(UserRole)),
      allowNull: true,
    },
    action: {
      type: DataTypes.ENUM(...Object.values(PhiAction)),
      allowNull: false,
    },
    resourceType: {
      type: DataTypes.ENUM(...Object.values(PhiResourceType)),
      allowNull: false,
    },
    patientId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    resourceId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    ipAddress: {
      type: DataTypes.STRING(45), // supports IPv6
      allowNull: true,
    },
    userAgent: {
      type: DataTypes.STRING(512),
      allowNull: true,
    },
    outcome: {
      type: DataTypes.ENUM(...Object.values(AuditOutcome)),
      allowNull: false,
    },
    details: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'phi_audit_logs',
    // Audit logs are immutable — disable updatedAt.
    timestamps: true,
    updatedAt: false,
    // Column names use snake_case because the global Sequelize config sets underscored: true.
    indexes: [
      { fields: ['patient_id'] },
      { fields: ['actor_id'] },
      { fields: ['action'] },
      { fields: ['created_at'] },
    ],
  }
);
