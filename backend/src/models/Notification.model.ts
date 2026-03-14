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
import { NotificationType } from '../types/constants';
import { User } from './User.model';

export interface NotificationMetadata {
    appointmentId?: string;
    doctorId?: string;
    patientId?: string;
    appointmentDate?: string;
    [key: string]: string | undefined;
}

export class Notification extends Model<
    InferAttributes<Notification>,
    InferCreationAttributes<Notification>
> {
    declare id: CreationOptional<string>;
    declare userId: ForeignKey<User['id']>;
    declare type: NotificationType;
    declare title: string;
    declare message: string;
    declare isRead: CreationOptional<boolean>;
    declare metadata: CreationOptional<NotificationMetadata>;
    declare createdAt: CreationOptional<Date>;
    declare readAt: CreationOptional<Date>;

    // Associations
    declare user?: NonAttribute<User>;
}

Notification.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id',
            },
        },
        type: {
            type: DataTypes.ENUM(...Object.values(NotificationType)),
            allowNull: false,
        },
        title: {
            type: DataTypes.STRING(255),
            allowNull: false,
            validate: {
                notEmpty: true,
            },
        },
        message: {
            type: DataTypes.TEXT,
            allowNull: false,
            validate: {
                notEmpty: true,
            },
        },
        isRead: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        metadata: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: {},
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        readAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: 'notifications',
        timestamps: true,
        updatedAt: false,
        underscored: true,
        indexes: [
            { fields: ['user_id'] },
            { fields: ['is_read'] },
            { fields: ['type'] },
            { fields: ['created_at'] },
        ],
    }
);
