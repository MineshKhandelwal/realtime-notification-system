import { Notification } from '../domain/notification';
import { EventType, UserId } from '../domain/types';

export type DispatchStatus = 'SENT' | 'SUPPRESSED' | 'SKIPPED' | 'FAILED';

export type DispatchReason =
  | 'PREFERENCE_DISABLED'
  | 'NOT_NOTEWORTHY'
  | 'NO_HANDLER'
  | 'HANDLER_ERROR'
  | 'PREFERENCE_ERROR'
  | 'DELIVERY_ERROR';

/** Outcome of processing one event for one recipient (or for the whole event when no recipient was reached). */
export interface DispatchResult {
  readonly eventId: string;
  readonly eventType: EventType;
  readonly status: DispatchStatus;
  readonly recipientId?: UserId;
  readonly notification?: Notification;
  readonly reason?: DispatchReason;
  readonly error?: string;
}
