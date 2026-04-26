import { Transaction } from 'sequelize';
import { AppEventBus, SystemEvents } from '../utils/eventBus.util';
import { notificationService } from '../services/notification.service';
import { logger } from '../config/logger';
import { NotificationMetadata } from '../models/Notification.model';

interface AppointmentEventPayload {
  userId: string;
  title: string;
  message: string;
  type: 'appointment_reminder' | 'appointment_cancelled' | 'appointment_confirmed';
  metadata: NotificationMetadata;
  transaction?: Transaction;
}

// Subscriber initialization function
export const initNotificationSubscribers = (): void => {
  AppEventBus.on(
    SystemEvents.APPOINTMENT_CREATED,
    ({ userId, title, message, type, metadata, transaction }: AppointmentEventPayload): void => {
      notificationService
        .createAppointmentNotification(userId, title, message, type, metadata, transaction)
        .catch((err: unknown) => {
          logger.error(`Error processing APPOINTMENT_CREATED event for user ${userId}:`, err);
        });
    }
  );

  AppEventBus.on(
    SystemEvents.APPOINTMENT_CANCELLED,
    ({ userId, title, message, type, metadata, transaction }: AppointmentEventPayload): void => {
      notificationService
        .createAppointmentNotification(userId, title, message, type, metadata, transaction)
        .catch((err: unknown) => {
          logger.error(`Error processing APPOINTMENT_CANCELLED event for user ${userId}:`, err);
        });
    }
  );

  AppEventBus.on(
    SystemEvents.APPOINTMENT_CONFIRMED,
    ({ userId, title, message, type, metadata, transaction }: AppointmentEventPayload): void => {
      notificationService
        .createAppointmentNotification(userId, title, message, type, metadata, transaction)
        .catch((err: unknown) => {
          logger.error(`Error processing APPOINTMENT_CONFIRMED event for user ${userId}:`, err);
        });
    }
  );

  logger.info('Notification subscribers initialized');
};
