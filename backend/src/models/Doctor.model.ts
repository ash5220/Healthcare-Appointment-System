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
import { User } from './User.model';

export interface DoctorQualification {
    degree: string;
    institution: string;
    year: number;
}

export class Doctor extends Model<InferAttributes<Doctor>, InferCreationAttributes<Doctor>> {
    declare id: CreationOptional<string>;
    declare userId: ForeignKey<User['id']>;
    declare specialization: string;
    declare licenseNumber: string;
    declare yearsOfExperience: CreationOptional<number>;
    declare consultationFee: CreationOptional<number>;
    declare bio: CreationOptional<string>;
    declare qualifications: CreationOptional<DoctorQualification[]>;
    declare languages: CreationOptional<string[]>;
    declare rating: CreationOptional<number>;
    declare totalPatients: CreationOptional<number>;
    declare isApproved: CreationOptional<boolean>;
    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;
    declare deletedAt: CreationOptional<Date | null>;

    // Association
    declare user?: NonAttribute<User>;
}

Doctor.init(
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
        specialization: {
            type: DataTypes.STRING(100),
            allowNull: false,
            validate: {
                notEmpty: true,
            },
        },
        licenseNumber: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
            validate: {
                notEmpty: true,
            },
        },
        yearsOfExperience: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            validate: {
                min: 0,
            },
        },
        consultationFee: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0,
            validate: {
                min: 0,
            },
        },
        bio: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        qualifications: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: [],
        },
        languages: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: ['English'],
        },
        rating: {
            type: DataTypes.DECIMAL(2, 1),
            allowNull: false,
            defaultValue: 0,
            validate: {
                min: 0,
                max: 5,
            },
        },
        totalPatients: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            validate: {
                min: 0,
            },
        },
        isApproved: {
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
        tableName: 'doctors',
        timestamps: true,
        paranoid: true, // HIPAA: soft-delete, retain records for 6+ years
        underscored: true,
        indexes: [
            { fields: ['specialization'] },
            { fields: ['rating'] },
        ],
    }
);
