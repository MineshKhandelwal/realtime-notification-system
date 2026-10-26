/**
 * Example usage: simulated game and social subsystems emitting events, and
 * how the notification system responds to each. Run with `npm start`.
 */
import { InAppChannel } from './channels/in-app-channel';
import { Delivery, MockInAppClient } from './channels/in-app-client';
import { createNotificationSystem } from './container';
import { InvalidEventError } from './domain/errors';
import { NotificationCategory } from './domain/types';
import { createSequentialIdGenerator } from './infra/id-generator';
import { createConsoleLogger } from './infra/logger';
import { DispatchResult } from './notifications/dispatch-result';

const printDelivery = ({ userId, payload }: Delivery) =>
  console.log(`    📬 in-app → user ${userId}: "${payload.message}"`);

function printResults(results: DispatchResult[]): void {
  for (const r of results) {
    const who = r.recipientId !== undefined ? ` user ${r.recipientId}` : '';
    const why = r.reason ? ` (${r.reason}${r.error ? `: ${r.error}` : ''})` : '';
    console.log(`    → ${r.status}${who}${why}`);
  }
}

async function trigger(label: string, call: () => Promise<DispatchResult[]>): Promise<void> {
  console.log(`\n  ${label}`);
  try {
    printResults(await call());
  } catch (error) {
    if (!(error instanceof InvalidEventError)) throw error;
    console.log(`    ✖ rejected: ${error.message}`);
  }
}

function section(title: string): void {
  console.log(`\n=== ${title} ===`);
}

async function main(): Promise<void> {
  const logger = createConsoleLogger('warn');
  const { gameEngine, socialSystem, preferences } = createNotificationSystem({
    channel: new InAppChannel(new MockInAppClient(printDelivery)),
    logger,
    eventIds: createSequentialIdGenerator('evt'),
    notificationIds: createSequentialIdGenerator('ntf'),
  });

  section('1. Example triggers from the brief');
  await trigger('gameEngine.playerLeveledUp(1, 15)', () => gameEngine.playerLeveledUp(1, 15));
  await trigger('gameEngine.itemAcquired(2, "SwordOfAzeroth")', () => gameEngine.itemAcquired(2, 'SwordOfAzeroth'));
  await trigger('socialSystem.friendRequestSent(3, 1)', () => socialSystem.friendRequestSent(3, 1));
  await trigger('socialSystem.friendRequestAccepted(1, 3)', () => socialSystem.friendRequestAccepted(1, 3));

  section('2. Other in-game and social events');
  await trigger('gameEngine.challengeCompleted(1, "Dragon\'s Lair")', () =>
    gameEngine.challengeCompleted(1, "Dragon's Lair"),
  );
  await trigger('gameEngine.playerAttacked(4, 2)', () => gameEngine.playerAttacked(4, 2));
  await trigger('gameEngine.playerDefeated(4, 2)', () => gameEngine.playerDefeated(4, 2));
  await trigger('socialSystem.newFollower(2, 1)', () => socialSystem.newFollower(2, 1));

  section('3. User preferences: user 1 disables SOCIAL');
  preferences.setPreference(1, NotificationCategory.SOCIAL, false);
  await trigger('socialSystem.friendRequestSent(2, 1)', () => socialSystem.friendRequestSent(2, 1));
  await trigger('gameEngine.playerLeveledUp(1, 16)   (GAME still enabled)', () => gameEngine.playerLeveledUp(1, 16));

  section('4. Item rarity');
  await trigger('gameEngine.itemAcquired(2, "RustyDagger")   (COMMON)', () => gameEngine.itemAcquired(2, 'RustyDagger'));
  await trigger('gameEngine.itemAcquired(2, "MoonlitAmulet")   (not in catalog)', () =>
    gameEngine.itemAcquired(2, 'MoonlitAmulet'),
  );

  section('5. Invalid input is rejected at the boundary');
  await trigger('socialSystem.friendRequestSent(3, 3)', () => socialSystem.friendRequestSent(3, 3));
  await trigger('gameEngine.playerLeveledUp(-1, 5)', () => gameEngine.playerLeveledUp(-1, 5));

  section('6. Delivery failure does not break the game');
  const failing = createNotificationSystem({
    channel: { name: 'in-app', send: () => Promise.reject(new Error('client unavailable')) },
    logger,
    eventIds: createSequentialIdGenerator('evt-failing'),
    notificationIds: createSequentialIdGenerator('ntf-failing'),
  });
  await trigger('gameEngine.playerLeveledUp(1, 17)   (client down)', () => failing.gameEngine.playerLeveledUp(1, 17));
  console.log('    ✔ game call returned normally');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
