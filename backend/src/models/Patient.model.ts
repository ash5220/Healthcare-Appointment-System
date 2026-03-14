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
      type: DataTypes.JSON,
      allowNull: true,
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
  },
  {
    sequelize,
    tableName: 'patients',
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ['date_of_birth'] }, { fields: ['gender'] }],
  }
);
