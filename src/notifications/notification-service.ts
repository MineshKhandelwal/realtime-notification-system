import { DomainEvent } from '../domain/events';
import { errorMessage } from '../domain/errors';
import { Notification } from '../domain/notification';
import { NotificationChannel } from '../channels/notification-channel';
import { Clock } from '../infra/clock';
import { IdGenerator } from '../infra/id-generator';
import { Logger } from '../infra/logger';
import { PreferenceStore } from '../preferences/preference-store';
import { DispatchReason, DispatchResult } from './dispatch-result';
import { HandlerRegistry } from './handler-registry';
import { NotificationIntent } from './notification-intent';

export interface NotificationServiceDependencies {
  registry: HandlerRegistry;
  preferences: PreferenceStore;
  channel: NotificationChannel;
  logger: Logger;
  clock: Clock;
  notificationIds: IdGenerator;
}

/**
 * Event → handler → preference check → Notification → channel.
 * Knows nothing about specific event types and never throws: every failure
 * becomes a FAILED result so the producing game code is never affected.
 */
export class NotificationService {
  constructor(private readonly deps: NotificationServiceDependencies) {}

  async dispatch(event: DomainEvent): Promise<DispatchResult[]> {
    const { registry, logger } = this.deps;

    const handler = registry.get(event.type);
    if (!handler) {
      logger.error('No handler registered for event', { eventId: event.eventId, eventType: event.type });
      return [this.failed(event, 'NO_HANDLER')];
    }

    let intents: NotificationIntent[];
    try {
      intents = handler.handle(event);
    } catch (error) {
      logger.error('Handler failed', { eventId: event.eventId, eventType: event.type, error: errorMessage(error) });
      return [this.failed(event, 'HANDLER_ERROR', error)];
    }

    if (intents.length === 0) {
      logger.debug('Event not noteworthy; nothing to send', { eventId: event.eventId, eventType: event.type });
      return [{ eventId: event.eventId, eventType: event.type, status: 'SKIPPED', reason: 'NOT_NOTEWORTHY' }];
    }

    const results: DispatchResult[] = [];
    for (const intent of intents) {
      results.push(await this.deliver(event, intent));
    }
    return results;
  }

  private async deliver(event: DomainEvent, intent: NotificationIntent): Promise<DispatchResult> {
    const { preferences, channel, logger, clock, notificationIds } = this.deps;
    const { recipientId, category } = intent;

    let enabled: boolean;
    try {
      enabled = preferences.isEnabled(recipientId, category);
    } catch (error) {
      // Fail closed: if we can't confirm the user wants it, don't send.
      logger.error('Preference lookup failed', { eventId: event.eventId, recipientId, error: errorMessage(error) });
      return this.failed(event, 'PREFERENCE_ERROR', error, recipientId);
    }
    if (!enabled) {
      logger.debug('Suppressed by user preference', { eventId: event.eventId, recipientId, category });
      return {
        eventId: event.eventId,
        eventType: event.type,
        status: 'SUPPRESSED',
        recipientId,
        reason: 'PREFERENCE_DISABLED',
      };
    }

    const notification = new Notification({ ...intent, id: notificationIds.next(), createdAt: clock.now() });
    try {
      await channel.send(notification);
    } catch (error) {
      logger.error('Delivery failed', {
        eventId: event.eventId,
        notificationId: notification.id,
        recipientId,
        channel: channel.name,
        error: errorMessage(error),
      });
      return { ...this.failed(event, 'DELIVERY_ERROR', error, recipientId), notification };
    }

    logger.info('Notification sent', { eventId: event.eventId, notificationId: notification.id, recipientId });
    return { eventId: event.eventId, eventType: event.type, status: 'SENT', recipientId, notification };
  }

  private failed(event: DomainEvent, reason: DispatchReason, error?: unknown, recipientId?: number): DispatchResult {
    return {
      eventId: event.eventId,
      eventType: event.type,
      status: 'FAILED',
      reason,
      ...(recipientId !== undefined && { recipientId }),
      ...(error !== undefined && { error: errorMessage(error) }),
    };
  }
}
