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
import { Gender } from '../types/constants';
import { User } from './User.model';
import { encrypt, decrypt, isEncrypted } from '../utils/crypto.util';

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface InsuranceInfo {
  provider: string;
  policyNumber: string;
  groupNumber?: string;
  expiryDate?: string;
}

export class Patient extends Model<InferAttributes<Patient>, InferCreationAttributes<Patient>> {
  declare id: CreationOptional<string>;
  declare userId: ForeignKey<User['id']>;
  declare dateOfBirth: Date;
  declare gender: Gender;
  declare bloodGroup: CreationOptional<string>;
  declare allergies: CreationOptional<string[]>;
  declare emergencyContactName: CreationOptional<string>;
  declare emergencyContactPhone: CreationOptional<string>;
  declare address: CreationOptional<Address>;
  declare insuranceInfo: CreationOptional<InsuranceInfo>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;

  // Association
  declare user?: NonAttribute<User>;
}

Patient.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    dateOfBirth: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      validate: {
        isDate: true,
        // Use a custom validator so the date is evaluated at runtime,
        // not once at module-load time (which would freeze the boundary date).
        isInThePast(value: string) {
          const today = new Date().toISOString().split('T')[0];
          if (value >= today) {
            throw new Error('Date of birth must be in the past');
          }
        },
      },
    },
    gender: {
      type: DataTypes.ENUM(...Object.values(Gender)),
      allowNull: false,
    },
    bloodGroup: {
      type: DataTypes.STRING(5),
      allowNull: true,
      validate: {
        isIn: [['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']],
      },
    },
    allergies: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },
    emergencyContactName: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    emergencyContactPhone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    address: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    insuranceInfo: {
      // Stored as AES-256-GCM encrypted TEXT (PHI at rest).
      // The getter/setter transparently encrypt on write and decrypt on read,
      // so application code continues to work with a plain InsuranceInfo object.
      type: DataTypes.TEXT,
      allowNull: true,
      get(): InsuranceInfo | null {
        const raw = this.getDataValue('insuranceInfo');
        if (!raw) return null;
        // raw is stored as encrypted string in the DB
        const rawStr = raw as unknown as string;
        try {
          const json = isEncrypted(rawStr) ? decrypt(rawStr) : rawStr;
          return JSON.parse(json) as InsuranceInfo;
        } catch {
          return null;
        }
      },
      set(value: InsuranceInfo | null) {
        if (value === null || value === undefined) {
          this.setDataValue('insuranceInfo', null as unknown as InsuranceInfo);
          return;
        }
        const json = JSON.stringify(value);
        this.setDataValue('insuranceInfo', encrypt(json) as unknown as InsuranceInfo);
      },
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
    tableName: 'patients',
    timestamps: true,
    paranoid: true, // HIPAA: soft-delete, retain records for 6+ years
    underscored: true,
    indexes: [{ fields: ['date_of_birth'] }, { fields: ['gender'] }],
  }
);
