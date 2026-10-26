import { NotificationChannel } from '../src/channels/notification-channel';
import { EventOfType, PayloadOf } from '../src/domain/events';
import { Notification } from '../src/domain/notification';
import { EventType } from '../src/domain/types';
import { Clock } from '../src/infra/clock';

export const FIXED_DATE = new Date('2026-01-01T00:00:00.000Z');
export const fixedClock: Clock = { now: () => FIXED_DATE };

export class RecordingChannel implements NotificationChannel {
  readonly name = 'recording';
  readonly sent: Notification[] = [];
  failWith?: Error;

  async send(notification: Notification): Promise<void> {
    if (this.failWith) throw this.failWith;
    this.sent.push(notification);
  }

  messagesFor(userId: number): string[] {
    return this.sent.filter((n) => n.recipientId === userId).map((n) => n.message);
  }
}

let eventCounter = 0;
export function makeEvent<T extends EventType>(type: T, payload: PayloadOf<T>): EventOfType<T> {
  return { eventId: `test-evt-${++eventCounter}`, type, occurredAt: FIXED_DATE, payload } as unknown as EventOfType<T>;
}
