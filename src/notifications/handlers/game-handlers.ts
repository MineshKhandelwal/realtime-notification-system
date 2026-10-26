import {
  ChallengeCompletedEvent,
  ItemAcquiredEvent,
  PlayerAttackedEvent,
  PlayerDefeatedEvent,
  PlayerLeveledUpEvent,
} from '../../domain/events';
import { EventType, NotificationCategory, NotificationType } from '../../domain/types';
import { humanizeItemId, isAtLeast, ItemCatalog, Rarity } from '../../catalog/item-catalog';
import { Logger } from '../../infra/logger';
import { PlayerNameResolver } from '../../players/player-name-resolver';
import { EventHandler } from '../event-handler';
import { NotificationIntent } from '../notification-intent';

export class LevelUpHandler implements EventHandler<EventType.PLAYER_LEVELED_UP> {
  readonly eventType = EventType.PLAYER_LEVELED_UP;

  handle({ payload }: PlayerLeveledUpEvent): NotificationIntent[] {
    return [
      {
        recipientId: payload.userId,
        type: NotificationType.LEVEL_UP,
        category: NotificationCategory.GAME,
        message: `Congratulations! You've reached level ${payload.level}!`,
        metadata: { level: payload.level },
      },
    ];
  }
}

export class ItemAcquiredHandler implements EventHandler<EventType.ITEM_ACQUIRED> {
  readonly eventType = EventType.ITEM_ACQUIRED;

  constructor(
    private readonly catalog: ItemCatalog,
    private readonly logger: Logger,
    private readonly minimumRarity: Rarity = Rarity.RARE,
  ) {}

  handle({ payload }: ItemAcquiredEvent): NotificationIntent[] {
    const item = this.catalog.lookup(payload.itemId);
    let message: string;
    if (!item) {
      // The producer chose to emit this event, so notify rather than silently drop it.
      this.logger.warn('Item not in catalog; notifying with fallback name', { itemId: payload.itemId });
      message = `You've acquired the ${humanizeItemId(payload.itemId)}!`;
    } else if (!isAtLeast(item.rarity, this.minimumRarity)) {
      return [];
    } else {
      message = `You've acquired the ${item.rarity.toLowerCase()} ${item.displayName}!`;
    }
    return [
      {
        recipientId: payload.userId,
        type: NotificationType.ITEM_ACQUIRED,
        category: NotificationCategory.GAME,
        message,
        metadata: { itemId: payload.itemId },
      },
    ];
  }
}

export class ChallengeCompletedHandler implements EventHandler<EventType.CHALLENGE_COMPLETED> {
  readonly eventType = EventType.CHALLENGE_COMPLETED;

  handle({ payload }: ChallengeCompletedEvent): NotificationIntent[] {
    return [
      {
        recipientId: payload.userId,
        type: NotificationType.CHALLENGE_COMPLETED,
        category: NotificationCategory.GAME,
        message: `Challenge complete! You've finished '${payload.challengeName}'.`,
        metadata: { challengeName: payload.challengeName },
      },
    ];
  }
}

export class PlayerAttackedHandler implements EventHandler<EventType.PLAYER_ATTACKED> {
  readonly eventType = EventType.PLAYER_ATTACKED;

  constructor(private readonly playerNames: PlayerNameResolver) {}

  handle({ payload }: PlayerAttackedEvent): NotificationIntent[] {
    return [
      {
        recipientId: payload.victimId,
        type: NotificationType.PVP_ATTACKED,
        category: NotificationCategory.GAME,
        message: `You've been attacked by Player '${this.playerNames.displayName(payload.attackerId)}'!`,
        metadata: { attackerId: payload.attackerId },
      },
    ];
  }
}

export class PlayerDefeatedHandler implements EventHandler<EventType.PLAYER_DEFEATED> {
  readonly eventType = EventType.PLAYER_DEFEATED;

  constructor(private readonly playerNames: PlayerNameResolver) {}

  handle({ payload }: PlayerDefeatedEvent): NotificationIntent[] {
    return [
      {
        recipientId: payload.loserId,
        type: NotificationType.PVP_DEFEATED,
        category: NotificationCategory.GAME,
        message: `You've been defeated by Player '${this.playerNames.displayName(payload.winnerId)}'.`,
        metadata: { winnerId: payload.winnerId },
      },
    ];
  }
}
