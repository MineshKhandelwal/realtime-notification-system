import { DEFAULT_ITEMS, InMemoryItemCatalog, ItemCatalog } from './catalog/item-catalog';
import { InAppChannel } from './channels/in-app-channel';
import { MockInAppClient } from './channels/in-app-client';
import { NotificationChannel } from './channels/notification-channel';
import { EventBus, InMemoryEventBus } from './events/event-bus';
import { Clock, systemClock } from './infra/clock';
import { IdGenerator, uuidGenerator } from './infra/id-generator';
import { createConsoleLogger, Logger } from './infra/logger';
import { DispatchResult } from './notifications/dispatch-result';
import { HandlerRegistry } from './notifications/handler-registry';
import { createDefaultHandlers } from './notifications/handlers';
import { NotificationService } from './notifications/notification-service';
import { IdPlayerNameResolver, PlayerNameResolver } from './players/player-name-resolver';
import { InMemoryPreferenceStore, PreferenceStore } from './preferences/preference-store';
import { EventPublisher } from './producers/event-publisher';
import { GameEngine } from './producers/game-engine';
import { SocialSystem } from './producers/social-system';

export interface NotificationSystemOptions {
  channel?: NotificationChannel;
  preferences?: PreferenceStore;
  itemCatalog?: ItemCatalog;
  playerNames?: PlayerNameResolver;
  logger?: Logger;
  clock?: Clock;
  eventIds?: IdGenerator;
  notificationIds?: IdGenerator;
}

export interface NotificationSystem {
  gameEngine: GameEngine;
  socialSystem: SocialSystem;
  preferences: PreferenceStore;
  channel: NotificationChannel;
  eventBus: EventBus<DispatchResult>;
  registry: HandlerRegistry;
  notificationService: NotificationService;
}

/** Composition root: the only place where components are wired together. Any dependency can be overridden. */
export function createNotificationSystem(options: NotificationSystemOptions = {}): NotificationSystem {
  const logger = options.logger ?? createConsoleLogger();
  const clock = options.clock ?? systemClock;
  const preferences = options.preferences ?? new InMemoryPreferenceStore();
  const channel = options.channel ?? new InAppChannel(new MockInAppClient());
  const itemCatalog = options.itemCatalog ?? new InMemoryItemCatalog(DEFAULT_ITEMS);
  const playerNames = options.playerNames ?? new IdPlayerNameResolver();

  const registry = new HandlerRegistry();
  createDefaultHandlers({ itemCatalog, playerNames, logger }).forEach((handler) => registry.register(handler));

  const notificationService = new NotificationService({
    registry,
    preferences,
    channel,
    logger,
    clock,
    notificationIds: options.notificationIds ?? uuidGenerator,
  });

  const eventBus = new InMemoryEventBus<DispatchResult>(logger);
  eventBus.subscribe((event) => notificationService.dispatch(event));

  const publisher = new EventPublisher({ bus: eventBus, clock, eventIds: options.eventIds ?? uuidGenerator });

  return {
    gameEngine: new GameEngine(publisher),
    socialSystem: new SocialSystem(publisher),
    preferences,
    channel,
    eventBus,
    registry,
    notificationService,
  };
}
