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
import { PaymentStatus, PaymentMethod } from '../types/constants';
import { Appointment } from './Appointment.model';
import { Patient } from './Patient.model';

export class Payment extends Model<
    InferAttributes<Payment>,
    InferCreationAttributes<Payment>
> {
    declare id: CreationOptional<string>;
    declare appointmentId: ForeignKey<Appointment['id']>;
    declare patientId: ForeignKey<Patient['id']>;
    declare amount: number;
    declare currency: CreationOptional<string>;
    declare paymentMethod: PaymentMethod;
    declare paymentStatus: CreationOptional<PaymentStatus>;
    declare stripePaymentIntentId: CreationOptional<string>;
    declare stripeChargeId: CreationOptional<string>;
    declare paypalOrderId: CreationOptional<string>;
    declare paypalCaptureId: CreationOptional<string>;
    declare insuranceCoveredAmount: CreationOptional<number>;
    declare patientResponsibility: CreationOptional<number>;
    declare refundAmount: CreationOptional<number>;
    declare refundReason: CreationOptional<string>;
    declare refundedAt: CreationOptional<Date>;
    declare paidAt: CreationOptional<Date>;
    declare failureReason: CreationOptional<string>;
    declare metadata: CreationOptional<Record<string, unknown>>;
    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;

    // Associations
    declare appointment?: NonAttribute<Appointment>;
    declare patient?: NonAttribute<Patient>;
}

Payment.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        appointmentId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'appointments',
                key: 'id',
            },
        },
        patientId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'patients',
                key: 'id',
            },
        },
        amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            validate: {
                min: 0,
            },
        },
        currency: {
            type: DataTypes.STRING(3),
            allowNull: false,
            defaultValue: 'USD',
        },
        paymentMethod: {
            type: DataTypes.ENUM(...Object.values(PaymentMethod)),
            allowNull: false,
        },
        paymentStatus: {
            type: DataTypes.ENUM(...Object.values(PaymentStatus)),
            allowNull: false,
            defaultValue: PaymentStatus.PENDING,
        },
        stripePaymentIntentId: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        stripeChargeId: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        paypalOrderId: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        paypalCaptureId: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        insuranceCoveredAmount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: 0,
        },
        patientResponsibility: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: 0,
        },
        refundAmount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
        },
        refundReason: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        refundedAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        paidAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        failureReason: {
            type: DataTypes.TEXT,
            allowNull: true,
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
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
    },
    {
        sequelize,
        tableName: 'payments',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['appointment_id'] },
            { fields: ['patient_id'] },
            { fields: ['payment_status'] },
            { fields: ['payment_method'] },
            { fields: ['stripe_payment_intent_id'] },
            { fields: ['paypal_order_id'] },
        ],
    }
);
