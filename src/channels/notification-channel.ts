import { Notification } from '../domain/notification';

/** Port for a delivery mechanism (in-app today; push/email would be further implementations). */
export interface NotificationChannel {
  readonly name: string;
  send(notification: Notification): Promise<void>;
}
