import { EventType, NotificationCategory, NotificationType } from '../../src/domain/types';
import { createSequentialIdGenerator } from '../../src/infra/id-generator';
import { silentLogger } from '../../src/infra/logger';
import { EventHandler } from '../../src/notifications/event-handler';
import { HandlerRegistry } from '../../src/notifications/handler-registry';
import { LevelUpHandler } from '../../src/notifications/handlers';
import { NotificationService } from '../../src/notifications/notification-service';
import { InMemoryPreferenceStore, PreferenceStore } from '../../src/preferences/preference-store';
import { FIXED_DATE, fixedClock, makeEvent, RecordingChannel } from '../helpers';

function setup(options: { handlers?: EventHandler[]; preferences?: PreferenceStore } = {}) {
  const registry = new HandlerRegistry();
  (options.handlers ?? [new LevelUpHandler()]).forEach((h) => registry.register(h));
  const channel = new RecordingChannel();
  const preferences = options.preferences ?? new InMemoryPreferenceStore();
  const service = new NotificationService({
    registry,
    preferences,
    channel,
    logger: silentLogger,
    clock: fixedClock,
    notificationIds: createSequentialIdGenerator('ntf'),
  });
  return { service, channel, preferences };
}

const levelUp = (userId = 1, level = 15) => makeEvent(EventType.PLAYER_LEVELED_UP, { userId, level });

describe('NotificationService', () => {
  it('builds a Notification and sends it when the category is enabled', async () => {
    const { service, channel } = setup();
    const event = levelUp();
    const [result] = await service.dispatch(event);

    expect(result).toMatchObject({ eventId: event.eventId, eventType: event.type, status: 'SENT', recipientId: 1 });
    expect(channel.sent).toHaveLength(1);
    expect(channel.sent[0]).toMatchObject({
      id: 'ntf-1',
      recipientId: 1,
      type: NotificationType.LEVEL_UP,
      category: NotificationCategory.GAME,
      message: "Congratulations! You've reached level 15!",
      createdAt: FIXED_DATE,
    });
    expect(result.notification).toBe(channel.sent[0]);
  });

  it('suppresses (and does not build) a notification when the category is disabled', async () => {
    const { service, channel, preferences } = setup();
    preferences.setPreference(1, NotificationCategory.GAME, false);

    expect(await service.dispatch(levelUp())).toEqual([
      expect.objectContaining({ status: 'SUPPRESSED', recipientId: 1, reason: 'PREFERENCE_DISABLED' }),
    ]);
    expect(channel.sent).toHaveLength(0);
  });

  it('reads preferences at dispatch time', async () => {
    const { service, channel, preferences } = setup();
    await service.dispatch(levelUp(1, 2));
    preferences.setPreference(1, NotificationCategory.GAME, false);
    await service.dispatch(levelUp(1, 3));
    preferences.setPreference(1, NotificationCategory.GAME, true);
    await service.dispatch(levelUp(1, 4));
    expect(channel.messagesFor(1)).toEqual([
      "Congratulations! You've reached level 2!",
      "Congratulations! You've reached level 4!",
    ]);
  });

  it('reports SKIPPED when the handler finds nothing noteworthy', async () => {
    const skipAll: EventHandler = { eventType: EventType.PLAYER_LEVELED_UP, handle: () => [] };
    const { service, channel } = setup({ handlers: [skipAll] });
    expect(await service.dispatch(levelUp())).toEqual([
      expect.objectContaining({ status: 'SKIPPED', reason: 'NOT_NOTEWORTHY' }),
    ]);
    expect(channel.sent).toHaveLength(0);
  });

  it('reports FAILED/NO_HANDLER for an event type without a handler', async () => {
    const { service } = setup({ handlers: [] });
    expect(await service.dispatch(levelUp())).toEqual([
      expect.objectContaining({ status: 'FAILED', reason: 'NO_HANDLER' }),
    ]);
  });

  it('reports FAILED/HANDLER_ERROR when a handler throws', async () => {
    const broken: EventHandler = {
      eventType: EventType.PLAYER_LEVELED_UP,
      handle: () => {
        throw new Error('bad template');
      },
    };
    const { service } = setup({ handlers: [broken] });
    await expect(service.dispatch(levelUp())).resolves.toEqual([
      expect.objectContaining({ status: 'FAILED', reason: 'HANDLER_ERROR', error: 'bad template' }),
    ]);
  });

  it('reports FAILED/PREFERENCE_ERROR and does not send when the preference lookup throws', async () => {
    const brokenPreferences: PreferenceStore = {
      isEnabled: () => {
        throw new Error('db down');
      },
      setPreference: () => undefined,
    };
    const { service, channel } = setup({ preferences: brokenPreferences });
    expect(await service.dispatch(levelUp())).toEqual([
      expect.objectContaining({ status: 'FAILED', reason: 'PREFERENCE_ERROR', recipientId: 1, error: 'db down' }),
    ]);
    expect(channel.sent).toHaveLength(0);
  });

  it('reports FAILED/DELIVERY_ERROR when the channel throws, keeping the notification for later retry', async () => {
    const { service, channel } = setup();
    channel.failWith = new Error('client unavailable');
    const [result] = await service.dispatch(levelUp());
    expect(result).toMatchObject({
      status: 'FAILED',
      reason: 'DELIVERY_ERROR',
      recipientId: 1,
      error: 'client unavailable',
    });
    expect(result.notification?.message).toBe("Congratulations! You've reached level 15!");
  });

  it('processes each recipient independently for multi-recipient events', async () => {
    const both: EventHandler = {
      eventType: EventType.PLAYER_LEVELED_UP,
      handle: () => [
        { recipientId: 1, type: NotificationType.LEVEL_UP, category: NotificationCategory.GAME, message: 'to 1' },
        { recipientId: 2, type: NotificationType.LEVEL_UP, category: NotificationCategory.GAME, message: 'to 2' },
      ],
    };
    const { service, channel, preferences } = setup({ handlers: [both] });
    preferences.setPreference(1, NotificationCategory.GAME, false);

    const results = await service.dispatch(levelUp());
    expect(results.map((r) => [r.recipientId, r.status])).toEqual([
      [1, 'SUPPRESSED'],
      [2, 'SENT'],
    ]);
    expect(channel.sent.map((n) => n.message)).toEqual(['to 2']);
  });
});
