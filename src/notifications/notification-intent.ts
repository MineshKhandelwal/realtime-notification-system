import { NotificationMetadata } from '../domain/notification';
import { NotificationCategory, NotificationType, UserId } from '../domain/types';

/** What a handler wants sent, before preferences are applied and a Notification is built. */
export interface NotificationIntent {
  readonly recipientId: UserId;
  readonly type: NotificationType;
  readonly category: NotificationCategory;
  readonly message: string;
  readonly metadata?: NotificationMetadata;
}
