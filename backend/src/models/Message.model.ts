import {
    Model,
    DataTypes,
    InferAttributes,
    InferCreationAttributes,
    CreationOptional,
    NonAttribute,
} from 'sequelize';
import { sequelize } from '../config/database';

export class Message extends Model<InferAttributes<Message>, InferCreationAttributes<Message>> {
    declare id: CreationOptional<string>;
    declare senderId: string;
    declare receiverId: string;
    declare content: string;
    declare isRead: CreationOptional<boolean>;
    declare readAt: CreationOptional<Date | null>;
    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;
    declare deletedAt: CreationOptional<Date | null>;

    // Virtual associations (populated via includes)
    declare sender?: NonAttribute<{ id: string; firstName: string; lastName: string; role: string }>;
    declare receiver?: NonAttribute<{ id: string; firstName: string; lastName: string; role: string }>;
}

Message.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        senderId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id',
            },
        },
        receiverId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id',
            },
        },
        content: {
            type: DataTypes.TEXT,
            allowNull: false,
            validate: {
                notEmpty: true,
                len: [1, 5000],
            },
        },
        isRead: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        readAt: {
            type: DataTypes.DATE,
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
        deletedAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: 'messages',
        timestamps: true,
        paranoid: true, // HIPAA: soft-delete, retain records for 6+ years
        underscored: true,
        indexes: [
            { fields: ['sender_id'] },
            { fields: ['receiver_id'] },
            { fields: ['is_read'] },
            { fields: ['created_at'] },
        ],
    }
);
