/**
 * End-to-end through createNotificationSystem: producer → bus → service → in-app channel → mock client.
 * Test names map to the acceptance criteria in docs/01-requirements-analysis.md §10.
 */
import { InAppChannel } from '../../src/channels/in-app-channel';
import { MockInAppClient } from '../../src/channels/in-app-client';
import { createNotificationSystem, NotificationSystemOptions } from '../../src/container';
import { InvalidEventError } from '../../src/domain/errors';
import { NotificationCategory } from '../../src/domain/types';
import { createSequentialIdGenerator } from '../../src/infra/id-generator';
import { silentLogger } from '../../src/infra/logger';
import { fixedClock } from '../helpers';

function setup(overrides: NotificationSystemOptions = {}) {
  const client = new MockInAppClient();
  const system = createNotificationSystem({
    channel: new InAppChannel(client),
    logger: silentLogger,
    clock: fixedClock,
    eventIds: createSequentialIdGenerator('evt'),
    notificationIds: createSequentialIdGenerator('ntf'),
    ...overrides,
  });
  const messagesFor = (userId: number) => client.deliveriesFor(userId).map((d) => d.payload.message);
  return { ...system, client, messagesFor };
}

describe('Acceptance criteria', () => {
  it('AC-1: level up notifies the player', async () => {
    const { gameEngine, client } = setup();
    await gameEngine.playerLeveledUp(1, 15);
    expect(client.deliveries).toEqual([
      {
        userId: 1,
        payload: {
          notificationId: 'ntf-1',
          type: 'LEVEL_UP',
          category: 'GAME',
          message: "Congratulations! You've reached level 15!",
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      },
    ]);
  });

  it('AC-2: legendary item notifies the player with rarity and display name', async () => {
    const { gameEngine, messagesFor } = setup();
    await gameEngine.itemAcquired(2, 'SwordOfAzeroth');
    expect(messagesFor(2)).toEqual(["You've acquired the legendary Sword of Azeroth!"]);
  });

  it('AC-3: friend request notifies the recipient', async () => {
    const { socialSystem, client, messagesFor } = setup();
    await socialSystem.friendRequestSent(3, 1);
    expect(messagesFor(1)).toEqual(["Player '3' has sent you a friend request."]);
    expect(client.deliveriesFor(3)).toHaveLength(0);
  });

  it('AC-4: friend accepted notifies the original requester only', async () => {
    const { socialSystem, client, messagesFor } = setup();
    await socialSystem.friendRequestAccepted(1, 3);
    expect(messagesFor(3)).toEqual(["Player '1' accepted your friend request."]);
    expect(client.deliveriesFor(1)).toHaveLength(0);
  });

  it('AC-5: disabled category suppresses delivery', async () => {
    const { socialSystem, preferences, client } = setup();
    preferences.setPreference(1, NotificationCategory.SOCIAL, false);
    const results = await socialSystem.friendRequestSent(3, 1);
    expect(results).toEqual([expect.objectContaining({ status: 'SUPPRESSED', recipientId: 1 })]);
    expect(client.deliveries).toHaveLength(0);
  });

  it('AC-6: disabling SOCIAL does not affect GAME', async () => {
    const { gameEngine, preferences, messagesFor } = setup();
    preferences.setPreference(1, NotificationCategory.SOCIAL, false);
    await gameEngine.playerLeveledUp(1, 16);
    expect(messagesFor(1)).toEqual(["Congratulations! You've reached level 16!"]);
  });

  it('AC-7: common item is skipped', async () => {
    const { gameEngine, client } = setup();
    const results = await gameEngine.itemAcquired(2, 'RustyDagger');
    expect(results).toEqual([expect.objectContaining({ status: 'SKIPPED', reason: 'NOT_NOTEWORTHY' })]);
    expect(client.deliveries).toHaveLength(0);
  });

  it('AC-8: invalid input throws InvalidEventError and nothing is delivered', () => {
    const { gameEngine, socialSystem, client } = setup();
    expect(() => socialSystem.friendRequestSent(3, 3)).toThrow(InvalidEventError);
    expect(() => gameEngine.playerLeveledUp(-1, 5)).toThrow(InvalidEventError);
    expect(client.deliveries).toHaveLength(0);
  });

  it('AC-9: delivery failure is reported, never thrown to the game', async () => {
    const { gameEngine } = setup({
      channel: { name: 'in-app', send: () => Promise.reject(new Error('client unavailable')) },
    });
    await expect(gameEngine.playerLeveledUp(1, 15)).resolves.toEqual([
      expect.objectContaining({ status: 'FAILED', reason: 'DELIVERY_ERROR', recipientId: 1 }),
    ]);
  });

  it('AC-10: the four brief triggers run in sequence and each reach the right player', async () => {
    const { gameEngine, socialSystem, client } = setup();
    await gameEngine.playerLeveledUp(1, 15);
    await gameEngine.itemAcquired(2, 'SwordOfAzeroth');
    await socialSystem.friendRequestSent(3, 1);
    await socialSystem.friendRequestAccepted(1, 3);
    expect(client.deliveries.map((d) => [d.userId, d.payload.message])).toEqual([
      [1, "Congratulations! You've reached level 15!"],
      [2, "You've acquired the legendary Sword of Azeroth!"],
      [1, "Player '3' has sent you a friend request."],
      [3, "Player '1' accepted your friend request."],
    ]);
  });

  it('AC-11: challenge, PvP and follower events notify the correct recipient', async () => {
    const { gameEngine, socialSystem, messagesFor } = setup();
    await gameEngine.challengeCompleted(1, 'Dragon Slayer');
    await gameEngine.playerAttacked(4, 2);
    await gameEngine.playerDefeated(4, 2);
    await socialSystem.newFollower(2, 1);

    expect(messagesFor(1)).toEqual([
      "Challenge complete! You've finished 'Dragon Slayer'.",
      "Player '2' started following you.",
    ]);
    expect(messagesFor(2)).toEqual(["You've been attacked by Player '4'!", "You've been defeated by Player '4'."]);
    expect(messagesFor(4)).toEqual([]);
  });

  it('a real player-name service plugs in without touching notification logic', async () => {
    const { socialSystem, messagesFor } = setup({
      playerNames: { displayName: (id) => (id === 3 ? 'Arthas' : String(id)) },
    });
    await socialSystem.friendRequestSent(3, 1);
    expect(messagesFor(1)).toEqual(["Player 'Arthas' has sent you a friend request."]);
  });

  it('fire-and-forget calls are still dispatched in call order', async () => {
    const { gameEngine, messagesFor } = setup();
    const pending = [gameEngine.playerLeveledUp(1, 2), gameEngine.playerLeveledUp(1, 3), gameEngine.playerLeveledUp(1, 4)];
    await Promise.all(pending);
    expect(messagesFor(1)).toEqual([
      "Congratulations! You've reached level 2!",
      "Congratulations! You've reached level 3!",
      "Congratulations! You've reached level 4!",
    ]);
  });
});
