# realtime-notification-system

A real-time, event-driven notification system for a gaming platform, featuring in-game and social notifications, user
preference management, and a modular architecture for extensible notification handling.

Written in TypeScript (strict mode) for Node.js, tested with Jest. No runtime dependencies.

## Quick start
Requires **Node.js ≥ 16** (20 recommended, see `.nvmrc`).

```bash
npm install
npm start          # builds, then runs the example-usage demo
npm test           # 95 Jest unit + integration tests
npm run test:coverage
npm run build      # compile to dist/ only
npm run typecheck  # tsc --noEmit over src and tests
```

## Features
| Area | What's included |
|------|-----------------|
| In-game events | Level up · rare/valuable item acquired (rarity-filtered through an in-memory item catalog) · challenge completed · PvP attacked / defeated |
| Social events | Friend request sent · friend request accepted · new follower |
| Preferences | Per-user, per-category (GAME / SOCIAL) enable/disable in a `Map`; enabled by default |
| Delivery | In-app channel adapter that sends to a mocked external client (the real client is out of scope per the brief) |
| Player names | `PlayerNameResolver` interface; defaults to the player ID until a profile service is plugged in |
| Robustness | Input checked when an event is emitted (`InvalidEventError`); after that, failures never reach game code and come back as `FAILED` results |

## Example usage
The four triggers from the brief, exactly as written:

```ts
const { gameEngine, socialSystem, preferences } = createNotificationSystem();

gameEngine.playerLeveledUp(1, 15);            // → user 1: "Congratulations! You've reached level 15!"
gameEngine.itemAcquired(2, "SwordOfAzeroth"); // → user 2: "You've acquired the legendary Sword of Azeroth!"
socialSystem.friendRequestSent(3, 1);         // → user 1: "Player '3' has sent you a friend request."
socialSystem.friendRequestAccepted(1, 3);     // → user 3: "Player '1' accepted your friend request."

preferences.setPreference(1, NotificationCategory.SOCIAL, false);
socialSystem.friendRequestSent(2, 1);         // → SUPPRESSED (user 1 disabled social notifications)
```

Every producer call returns `Promise<DispatchResult[]>`. Game code can ignore it (fire-and-forget) or await it to see
the outcome: `SENT`, `SUPPRESSED`, `SKIPPED` or `FAILED`. The promise never rejects.

`npm start` runs [src/demo.ts](src/demo.ts), which shows the brief's triggers, the other event types, preferences,
rarity filtering, rejected input and a delivery failure:

```
=== 1. Example triggers from the brief ===
  gameEngine.playerLeveledUp(1, 15)
    📬 in-app → user 1: "Congratulations! You've reached level 15!"
    → SENT user 1
  ...
=== 3. User preferences: user 1 disables SOCIAL ===
  socialSystem.friendRequestSent(2, 1)
    → SUPPRESSED user 1 (PREFERENCE_DISABLED)
  ...
=== 6. Delivery failure does not break the game ===
  gameEngine.playerLeveledUp(1, 17)   (client down)
    → FAILED user 1 (DELIVERY_ERROR: client unavailable)
    ✔ game call returned normally
```

## Architecture
```
GameEngine / SocialSystem ──publish──▶ EventBus ──▶ NotificationService
   (validate input,                                   │ 1. pick the EventHandler for this event type
    build event)                                      │ 2. handler → recipient(s), category, message
                                                      │ 3. PreferenceStore.isEnabled(recipient, category)?
                                                      │ 4. build Notification
                                                      ▼ 5. NotificationChannel.send()
                                              InAppChannel ──▶ MockInAppClient
```

- **Observer/pub-sub:** producers don't know the notification system exists.
- **Strategy + registry:** one handler per event type. Adding an event type means adding a handler, with no change
  to the service.
- **Ports and adapters:** channel, preferences, item catalog, player names, logger and clock are all interfaces, wired
  together in one place: [src/container.ts](src/container.ts).

Full rationale, trade-offs and "what if we add X" scenarios are in
[docs/02-architecture.md](docs/02-architecture.md).

## Documentation
| Doc | Contents |
|-----|----------|
| [01 — Requirements analysis](docs/01-requirements-analysis.md) | Requirements, assumptions (all confirmed), validation, edge cases, out of scope, acceptance criteria |
| [02 — Architecture](docs/02-architecture.md) | Components, dispatch flow, patterns and trade-offs, error handling, extension scenarios |
| [03 — Implementation & test plan](docs/03-implementation-and-test-plan.md) | Phased build plan, test strategy, definition of done |
| [04 — AI usage & process](docs/04-ai-process.md) | Prompts, workflow and tools used |

## Out of scope (per the brief)
Client-side display, push/email channels, real transport (WebSockets), persistence, retries and de-duplication, rate
limiting, and i18n. The interfaces leave room for each; see the extension scenarios in the architecture doc.
