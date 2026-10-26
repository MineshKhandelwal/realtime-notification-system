import { EventOfType } from '../domain/events';
import { EventType } from '../domain/types';
import { NotificationIntent } from './notification-intent';

/**
 * Strategy for one event type: who is notified, in which category, with what
 * message. Returning an empty array means "nothing worth notifying".
 */
export interface EventHandler<T extends EventType = EventType> {
  readonly eventType: T;
  handle(event: EventOfType<T>): NotificationIntent[];
}
