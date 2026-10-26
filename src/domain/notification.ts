import { NotificationCategory, NotificationType, UserId } from './types';

export type NotificationMetadata = Readonly<Record<string, string | number | boolean>>;

export interface NotificationProps {
  id: string;
  recipientId: UserId;
  type: NotificationType;
  category: NotificationCategory;
  message: string;
  createdAt: Date;
  metadata?: NotificationMetadata;
}

/** Immutable, channel-agnostic notification handed to delivery. */
export class Notification {
  readonly id: string;
  readonly recipientId: UserId;
  readonly type: NotificationType;
  readonly category: NotificationCategory;
  readonly message: string;
  readonly createdAt: Date;
  readonly metadata: NotificationMetadata;

  constructor(props: NotificationProps) {
    this.id = props.id;
    this.recipientId = props.recipientId;
    this.type = props.type;
    this.category = props.category;
    this.message = props.message;
    this.createdAt = new Date(props.createdAt.getTime());
    this.metadata = Object.freeze({ ...props.metadata });
    Object.freeze(this);
  }
}
