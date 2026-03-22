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
import { DayOfWeek } from '../types/constants';
import { Doctor } from './Doctor.model';

export class DoctorAvailability extends Model<
    InferAttributes<DoctorAvailability>,
    InferCreationAttributes<DoctorAvailability>
> {
    declare id: CreationOptional<string>;
    declare doctorId: ForeignKey<Doctor['id']>;
    declare dayOfWeek: DayOfWeek;
    declare startTime: string;
    declare endTime: string;
    declare slotDuration: number; // in minutes
    declare isActive: CreationOptional<boolean>;
    declare effectiveFrom: Date;
    declare effectiveTo: CreationOptional<Date>;
    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;

    // Associations
    declare doctor?: NonAttribute<Doctor>;

    // Helper method to generate time slots
    getTimeSlots(): string[] {
        const slots: string[] = [];
        const [startHour, startMinute] = this.startTime.split(':').map(Number);
        const [endHour, endMinute] = this.endTime.split(':').map(Number);

        let currentMinutes = startHour * 60 + startMinute;
        const endMinutes = endHour * 60 + endMinute;

        while (currentMinutes < endMinutes) {
            const hours = Math.floor(currentMinutes / 60);
            const minutes = currentMinutes % 60;
            slots.push(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
            currentMinutes += this.slotDuration;
        }

        return slots;
    }
}

DoctorAvailability.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        doctorId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'doctors',
                key: 'id',
            },
        },
        dayOfWeek: {
            type: DataTypes.ENUM(...Object.values(DayOfWeek)),
            allowNull: false,
        },
        startTime: {
            type: DataTypes.TIME,
            allowNull: false,
        },
        endTime: {
            type: DataTypes.TIME,
            allowNull: false,
        },
        slotDuration: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 30,
            validate: {
                min: 15,
                max: 120,
            },
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        effectiveFrom: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },
        effectiveTo: {
            type: DataTypes.DATEONLY,
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
        tableName: 'doctor_availability',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['doctor_id'] },
            { fields: ['day_of_week'] },
            { fields: ['is_active'] },
            // Unique constraint for overlapping availability
            // Note: explicit name required — MySQL caps index names at 64 chars
            {
                name: 'uq_avail_doctor_day_start_from',
                unique: true,
                fields: ['doctor_id', 'day_of_week', 'start_time', 'effective_from'],
            },
        ],
        validate: {
            endTimeAfterStartTime(this: DoctorAvailability) {
                if (this.startTime >= this.endTime) {
                    throw new Error('End time must be after start time');
                }
            },
            effectiveToAfterFrom(this: DoctorAvailability) {
                if (this.effectiveTo && this.effectiveFrom >= this.effectiveTo) {
                    throw new Error('Effective to date must be after effective from date');
                }
            },
        },
    }
);
