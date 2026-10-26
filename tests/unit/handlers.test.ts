import { DEFAULT_ITEMS, InMemoryItemCatalog, Rarity } from '../../src/catalog/item-catalog';
import { EventType, NotificationCategory, NotificationType } from '../../src/domain/types';
import { Logger, silentLogger } from '../../src/infra/logger';
import {
  ChallengeCompletedHandler,
  FriendRequestAcceptedHandler,
  FriendRequestSentHandler,
  ItemAcquiredHandler,
  LevelUpHandler,
  NewFollowerHandler,
  PlayerAttackedHandler,
  PlayerDefeatedHandler,
} from '../../src/notifications/handlers';
import { IdPlayerNameResolver, PlayerNameResolver } from '../../src/players/player-name-resolver';
import { makeEvent } from '../helpers';

const ids = new IdPlayerNameResolver();
const named: PlayerNameResolver = { displayName: (id) => ({ 3: 'Arthas', 4: 'Jaina' } as Record<number, string>)[id] ?? String(id) };
const { GAME, SOCIAL } = NotificationCategory;

describe('game handlers', () => {
  it('LevelUpHandler notifies the player who levelled up', () => {
    const intents = new LevelUpHandler().handle(makeEvent(EventType.PLAYER_LEVELED_UP, { userId: 1, level: 15 }));
    expect(intents).toEqual([
      {
        recipientId: 1,
        type: NotificationType.LEVEL_UP,
        category: GAME,
        message: "Congratulations! You've reached level 15!",
        metadata: { level: 15 },
      },
    ]);
  });

  describe('ItemAcquiredHandler', () => {
    const catalog = new InMemoryItemCatalog(DEFAULT_ITEMS);
    const acquire = (itemId: string, handler = new ItemAcquiredHandler(catalog, silentLogger)) =>
      handler.handle(makeEvent(EventType.ITEM_ACQUIRED, { userId: 2, itemId }));

    it('includes rarity and display name for noteworthy items', () => {
      expect(acquire('SwordOfAzeroth')).toEqual([
        expect.objectContaining({
          recipientId: 2,
          type: NotificationType.ITEM_ACQUIRED,
          category: GAME,
          message: "You've acquired the legendary Sword of Azeroth!",
        }),
      ]);
      expect(acquire('PhoenixFeather')[0].message).toBe("You've acquired the rare Phoenix Feather!");
    });

    it('skips items below the rarity threshold', () => {
      expect(acquire('RustyDagger')).toEqual([]);
      expect(acquire('ElvenBow')).toEqual([]);
    });

    it('honours a custom threshold', () => {
      expect(acquire('ElvenBow', new ItemAcquiredHandler(catalog, silentLogger, Rarity.UNCOMMON))).toHaveLength(1);
    });

    it('still notifies unknown items with a humanised name and logs a warning', () => {
      const logger: Logger = { ...silentLogger, warn: jest.fn() };
      const intents = acquire('MoonlitAmulet', new ItemAcquiredHandler(catalog, logger));
      expect(intents[0].message).toBe("You've acquired the Moonlit Amulet!");
      expect(logger.warn).toHaveBeenCalledWith(expect.any(String), { itemId: 'MoonlitAmulet' });
    });
  });

  it('ChallengeCompletedHandler notifies the player with the challenge name', () => {
    const [intent] = new ChallengeCompletedHandler().handle(
      makeEvent(EventType.CHALLENGE_COMPLETED, { userId: 1, challengeName: "Dragon's Lair" }),
    );
    expect(intent).toMatchObject({
      recipientId: 1,
      type: NotificationType.CHALLENGE_COMPLETED,
      category: GAME,
      message: "Challenge complete! You've finished 'Dragon's Lair'.",
    });
  });

  it('PlayerAttackedHandler notifies the victim, not the attacker', () => {
    const intents = new PlayerAttackedHandler(ids).handle(
      makeEvent(EventType.PLAYER_ATTACKED, { attackerId: 4, victimId: 2 }),
    );
    expect(intents).toHaveLength(1);
    expect(intents[0]).toMatchObject({
      recipientId: 2,
      type: NotificationType.PVP_ATTACKED,
      category: GAME,
      message: "You've been attacked by Player '4'!",
    });
  });

  it('PlayerDefeatedHandler notifies the loser, not the winner', () => {
    const intents = new PlayerDefeatedHandler(ids).handle(
      makeEvent(EventType.PLAYER_DEFEATED, { winnerId: 4, loserId: 2 }),
    );
    expect(intents).toHaveLength(1);
    expect(intents[0]).toMatchObject({
      recipientId: 2,
      type: NotificationType.PVP_DEFEATED,
      category: GAME,
      message: "You've been defeated by Player '4'.",
    });
  });
});

describe('social handlers', () => {
  it('FriendRequestSentHandler notifies the recipient', () => {
    const intents = new FriendRequestSentHandler(ids).handle(
      makeEvent(EventType.FRIEND_REQUEST_SENT, { senderId: 3, recipientId: 1 }),
    );
    expect(intents).toEqual([
      expect.objectContaining({
        recipientId: 1,
        type: NotificationType.FRIEND_REQUEST,
        category: SOCIAL,
        message: "Player '3' has sent you a friend request.",
      }),
    ]);
  });

  it('FriendRequestAcceptedHandler notifies only the original requester', () => {
    const intents = new FriendRequestAcceptedHandler(ids).handle(
      makeEvent(EventType.FRIEND_REQUEST_ACCEPTED, { accepterId: 1, requesterId: 3 }),
    );
    expect(intents).toEqual([
      expect.objectContaining({
        recipientId: 3,
        type: NotificationType.FRIEND_ACCEPTED,
        category: SOCIAL,
        message: "Player '1' accepted your friend request.",
      }),
    ]);
  });

  it('NewFollowerHandler notifies the followed player', () => {
    const intents = new NewFollowerHandler(ids).handle(
      makeEvent(EventType.NEW_FOLLOWER, { followerId: 2, followedId: 1 }),
    );
    expect(intents).toEqual([
      expect.objectContaining({
        recipientId: 1,
        type: NotificationType.NEW_FOLLOWER,
        category: SOCIAL,
        message: "Player '2' started following you.",
      }),
    ]);
  });
});

describe('player name resolution', () => {
  it('IdPlayerNameResolver falls back to the player ID', () => {
    expect(ids.displayName(3)).toBe('3');
  });

  it('every handler that mentions another player takes its name from the resolver', () => {
    const messages = [
      new FriendRequestSentHandler(named).handle(makeEvent(EventType.FRIEND_REQUEST_SENT, { senderId: 3, recipientId: 1 })),
      new FriendRequestAcceptedHandler(named).handle(
        makeEvent(EventType.FRIEND_REQUEST_ACCEPTED, { accepterId: 3, requesterId: 1 }),
      ),
      new NewFollowerHandler(named).handle(makeEvent(EventType.NEW_FOLLOWER, { followerId: 3, followedId: 1 })),
      new PlayerAttackedHandler(named).handle(makeEvent(EventType.PLAYER_ATTACKED, { attackerId: 4, victimId: 1 })),
      new PlayerDefeatedHandler(named).handle(makeEvent(EventType.PLAYER_DEFEATED, { winnerId: 4, loserId: 1 })),
    ].map(([intent]) => intent.message);

    expect(messages).toEqual([
      "Player 'Arthas' has sent you a friend request.",
      "Player 'Arthas' accepted your friend request.",
      "Player 'Arthas' started following you.",
      "You've been attacked by Player 'Jaina'!",
      "You've been defeated by Player 'Jaina'.",
    ]);
  });
});
