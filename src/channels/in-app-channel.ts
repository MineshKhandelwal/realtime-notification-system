import { Notification } from '../domain/notification';
import { InAppClient } from './in-app-client';
import { NotificationChannel } from './notification-channel';

/** Adapter: translates a domain Notification into the in-app client's payload. */
export class InAppChannel implements NotificationChannel {
  readonly name = 'in-app';

  constructor(private readonly client: InAppClient) {}

  send(notification: Notification): Promise<void> {
    return this.client.push(notification.recipientId, {
      notificationId: notification.id,
      type: notification.type,
      category: notification.category,
      message: notification.message,
      createdAt: notification.createdAt.toISOString(),
    });
  }
}
