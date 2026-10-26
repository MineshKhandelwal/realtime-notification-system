import { InvalidEventError } from '../../src/domain/errors';
import { DomainEvent } from '../../src/domain/events';
import { EventType } from '../../src/domain/types';
import { InMemoryEventBus } from '../../src/events/event-bus';
import { createSequentialIdGenerator } from '../../src/infra/id-generator';
import { silentLogger } from '../../src/infra/logger';
import { DispatchResult } from '../../src/notifications/dispatch-result';
import { EventPublisher } from '../../src/producers/event-publisher';
import { GameEngine } from '../../src/producers/game-engine';
import { SocialSystem } from '../../src/producers/social-system';
import { FIXED_DATE, fixedClock } from '../helpers';

function setup() {
  const published: DomainEvent[] = [];
  const bus = new InMemoryEventBus<DispatchResult>(silentLogger);
  bus.subscribe((event) => {
    published.push(event);
    return [];
  });
  const publisher = new EventPublisher({ bus, clock: fixedClock, eventIds: createSequentialIdGenerator('evt') });
  return { published, gameEngine: new GameEngine(publisher), socialSystem: new SocialSystem(publisher) };
}

// Simulates calls from untyped (JS) code.
const loose = <T>(value: unknown) => value as T;

describe('producers publish well-formed events', () => {
  it.each<[string, (s: ReturnType<typeof setup>) => Promise<unknown>, EventType, object]>([
    ['playerLeveledUp', (s) => s.gameEngine.playerLeveledUp(1, 15), EventType.PLAYER_LEVELED_UP, { userId: 1, level: 15 }],
    ['itemAcquired', (s) => s.gameEngine.itemAcquired(2, 'SwordOfAzeroth'), EventType.ITEM_ACQUIRED, { userId: 2, itemId: 'SwordOfAzeroth' }],
    ['challengeCompleted', (s) => s.gameEngine.challengeCompleted(1, '  Dragon Slayer '), EventType.CHALLENGE_COMPLETED, { userId: 1, challengeName: 'Dragon Slayer' }],
    ['playerAttacked', (s) => s.gameEngine.playerAttacked(4, 2), EventType.PLAYER_ATTACKED, { attackerId: 4, victimId: 2 }],
    ['playerDefeated', (s) => s.gameEngine.playerDefeated(4, 2), EventType.PLAYER_DEFEATED, { winnerId: 4, loserId: 2 }],
    ['friendRequestSent', (s) => s.socialSystem.friendRequestSent(3, 1), EventType.FRIEND_REQUEST_SENT, { senderId: 3, recipientId: 1 }],
    ['friendRequestAccepted', (s) => s.socialSystem.friendRequestAccepted(1, 3), EventType.FRIEND_REQUEST_ACCEPTED, { accepterId: 1, requesterId: 3 }],
    ['newFollower', (s) => s.socialSystem.newFollower(2, 1), EventType.NEW_FOLLOWER, { followerId: 2, followedId: 1 }],
  ])('%s', async (_name, call, type, payload) => {
    const s = setup();
    await call(s);
    expect(s.published).toEqual([{ eventId: 'evt-1', type, occurredAt: FIXED_DATE, payload }]);
    expect(Object.isFrozen(s.published[0].payload)).toBe(true);
  });
});

describe('producers reject invalid input before publishing', () => {
  const badIds: unknown[] = [0, -1, 1.5, NaN, Infinity, null, undefined, '1', Number.MAX_SAFE_INTEGER + 1];

  it.each(badIds)('user ID %p', (bad) => {
    const s = setup();
    const id = loose<number>(bad);
    const calls = [
      () => s.gameEngine.playerLeveledUp(id, 2),
      () => s.gameEngine.itemAcquired(id, 'SwordOfAzeroth'),
      () => s.gameEngine.challengeCompleted(id, 'Quest'),
      () => s.gameEngine.playerAttacked(id, 2),
      () => s.gameEngine.playerAttacked(2, id),
      () => s.gameEngine.playerDefeated(id, 2),
      () => s.gameEngine.playerDefeated(2, id),
      () => s.socialSystem.friendRequestSent(id, 1),
      () => s.socialSystem.friendRequestSent(1, id),
      () => s.socialSystem.friendRequestAccepted(id, 1),
      () => s.socialSystem.friendRequestAccepted(1, id),
      () => s.socialSystem.newFollower(id, 1),
      () => s.socialSystem.newFollower(1, id),
    ];
    calls.forEach((call) => expect(call).toThrow(InvalidEventError));
    expect(s.published).toHaveLength(0);
  });

  it.each([0, -5, 2.5, NaN, '15', null])('level %p', (bad) => {
    const s = setup();
    expect(() => s.gameEngine.playerLeveledUp(1, loose<number>(bad))).toThrow(/level must be a positive integer/);
    expect(s.published).toHaveLength(0);
  });

  it.each(['', '   ', null, undefined, 42])('item ID / challenge name %p', (bad) => {
    const s = setup();
    expect(() => s.gameEngine.itemAcquired(1, loose<string>(bad))).toThrow(/itemId must be a non-empty string/);
    expect(() => s.gameEngine.challengeCompleted(1, loose<string>(bad))).toThrow(/challengeName must be a non-empty string/);
    expect(s.published).toHaveLength(0);
  });

  it('self-targeted social and PvP actions', () => {
    const s = setup();
    expect(() => s.socialSystem.friendRequestSent(3, 3)).toThrow('Player 3 cannot send a friend request to themselves');
    expect(() => s.socialSystem.friendRequestAccepted(3, 3)).toThrow(InvalidEventError);
    expect(() => s.socialSystem.newFollower(3, 3)).toThrow(InvalidEventError);
    expect(() => s.gameEngine.playerAttacked(3, 3)).toThrow(InvalidEventError);
    expect(() => s.gameEngine.playerDefeated(3, 3)).toThrow(InvalidEventError);
    expect(s.published).toHaveLength(0);
  });
});
