import { EventType, UserId } from '../domain/types';
import { DispatchResult } from '../notifications/dispatch-result';
import { EventPublisher } from './event-publisher';
import { assertDifferentPlayers, assertPositiveInteger, assertUserId, requireNonEmptyString } from './validation';

/**
 * Simulated game engine. Each method validates its input (throwing
 * InvalidEventError) and publishes an event. The returned promise never
 * rejects; game code may ignore it (fire-and-forget) or await the outcomes.
 */
export class GameEngine {
  constructor(private readonly publisher: EventPublisher) {}

  playerLeveledUp(userId: UserId, level: number): Promise<DispatchResult[]> {
    assertUserId(userId, 'userId');
    assertPositiveInteger(level, 'level');
    return this.publisher.publish(EventType.PLAYER_LEVELED_UP, { userId, level });
  }

  itemAcquired(userId: UserId, itemId: string): Promise<DispatchResult[]> {
    assertUserId(userId, 'userId');
    const normalizedItemId = requireNonEmptyString(itemId, 'itemId');
    return this.publisher.publish(EventType.ITEM_ACQUIRED, { userId, itemId: normalizedItemId });
  }

  challengeCompleted(userId: UserId, challengeName: string): Promise<DispatchResult[]> {
    assertUserId(userId, 'userId');
    const normalizedName = requireNonEmptyString(challengeName, 'challengeName');
    return this.publisher.publish(EventType.CHALLENGE_COMPLETED, { userId, challengeName: normalizedName });
  }

  playerAttacked(attackerId: UserId, victimId: UserId): Promise<DispatchResult[]> {
    assertUserId(attackerId, 'attackerId');
    assertUserId(victimId, 'victimId');
    assertDifferentPlayers(attackerId, victimId, 'attack');
    return this.publisher.publish(EventType.PLAYER_ATTACKED, { attackerId, victimId });
  }

  playerDefeated(winnerId: UserId, loserId: UserId): Promise<DispatchResult[]> {
    assertUserId(winnerId, 'winnerId');
    assertUserId(loserId, 'loserId');
    assertDifferentPlayers(winnerId, loserId, 'defeat');
    return this.publisher.publish(EventType.PLAYER_DEFEATED, { winnerId, loserId });
  }
}
