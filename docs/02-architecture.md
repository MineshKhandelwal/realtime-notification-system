# 02 — Architecture & Design

> How the requirements in `01-requirements-analysis.md` are met, which patterns are used, and the trade-offs behind them.

---

## 1. Overview

```
 ┌──────────────┐   ┌───────────────┐
 │  GameEngine  │   │ SocialSystem  │     Producers (simulated platform subsystems)
 │   (façade)   │   │   (façade)    │     – validate input, build typed DomainEvent
 └──────┬───────┘   └───────┬───────┘
        │ publish(event)    │
        ▼                   ▼
 ┌─────────────────────────────────────┐
 │              EventBus               │   In-process pub/sub (Observer)
 └─────────────────┬───────────────────┘
                   │ subscribe(*)
                   ▼
 ┌─────────────────────────────────────┐        ┌──────────────────────┐
 │        NotificationService          │──────▶ │   HandlerRegistry    │  event.type → EventHandler
 │  (orchestrates the pipeline below)  │        │  (Strategy per type) │
 │                                     │        └──────────────────────┘
 │ 1. resolve handler                  │        ┌──────────────────────┐
 │ 2. handler → NotificationIntent[]   │──────▶ │ ItemCatalog          │  (item handler)
 │                                     │        │ PlayerNameResolver   │  (social + PvP handlers)
 │ 3. check preferences per intent     │        └──────────────────────┘
 │ 4. build Notification               │        ┌──────────────────────┐
 │ 5. send via channel                 │──────▶ │   PreferenceStore    │  userId → {GAME: bool, SOCIAL: bool}
 │ 6. return DispatchResult[]          │        └──────────────────────┘
 └─────────────────┬───────────────────┘
                   │ send(notification)
                   ▼
 ┌─────────────────────────────────────┐
 │  NotificationChannel (interface)    │   Port
 │   └─ InAppChannel → InAppClient     │   Adapter → mocked external client
 └─────────────────────────────────────┘
```

Wiring happens in one **composition root** (`createNotificationSystem()`), which the demo and the integration tests
both use.

---

## 2. Components

| Component | Responsibility | Kind |
|-----------|---------------|------|
| `DomainEvent` (discriminated union) | Immutable fact that something happened: `eventId`, `type`, `occurredAt`, typed `payload` | Type |
| `GameEngine`, `SocialSystem` | Simulated producers. Public API mirrors the brief (`playerLeveledUp(1, 15)` …). Validate input, build an event, publish it. | Façade |
| `EventBus` | `publish(event)` / `subscribe(listener)`. Isolates listener errors. `publish` returns a promise of all results. | Interface + in-memory impl |
| `NotificationService` | Runs the pipeline. Knows nothing about specific event types. | Service |
| `EventHandler<E>` | For one event type: the **category**, the **recipients** and the **message** → `NotificationIntent[]`. Can return `[]` to skip (non-rare item). | Strategy interface |
| `HandlerRegistry` | `Map<EventType, EventHandler>`. Registration is explicit and checked for duplicates. | Registry |
| `NotificationIntent` | `{ recipientId, type, category, message, metadata? }`: what *should* be sent, before preferences | Value object |
| `Notification` | The final object handed to delivery (A-1) | Entity |
| `PreferenceStore` | `isEnabled(userId, category)`, `setPreference(userId, category, enabled)`. Missing entries mean enabled (A-4). | Interface + `InMemoryPreferenceStore` (a `Map`) |
| `ItemCatalog` | `lookup(itemId) → { displayName, rarity } \| undefined` | Interface + `InMemoryItemCatalog` |
| `PlayerNameResolver` | `displayName(userId) → string`. Handlers that mention another player use it. The default `IdPlayerNameResolver` returns the ID as a string (A-3). | Interface + default impl |
| `NotificationChannel` | `send(notification): Promise<void>` | Port |
| `InAppChannel` | Adapter that forwards to the mocked external `InAppClient` | Adapter |
| `InAppClient` (mock) | Stands in for "the existing notification client". Records deliveries and logs them to the console. | Test double / simulator |
| `Logger` | Minimal interface (`debug/info/warn/error`). Console impl, silent impl for tests. | Interface |
| `Clock`, `IdGenerator` | Injectable `now()` / `nextId()` for deterministic tests | Interface |

### 2.1 Core types (sketch)

```ts
type UserId = number;

enum NotificationCategory { GAME = 'GAME', SOCIAL = 'SOCIAL' }

enum EventType {
  PLAYER_LEVELED_UP = 'PLAYER_LEVELED_UP',
  ITEM_ACQUIRED = 'ITEM_ACQUIRED',
  CHALLENGE_COMPLETED = 'CHALLENGE_COMPLETED',
  PLAYER_ATTACKED = 'PLAYER_ATTACKED',
  PLAYER_DEFEATED = 'PLAYER_DEFEATED',
  FRIEND_REQUEST_SENT = 'FRIEND_REQUEST_SENT',
  FRIEND_REQUEST_ACCEPTED = 'FRIEND_REQUEST_ACCEPTED',
  NEW_FOLLOWER = 'NEW_FOLLOWER',
}

interface BaseEvent<T extends EventType, P> {
  readonly eventId: string;
  readonly type: T;
  readonly occurredAt: Date;
  readonly payload: P;
}
type PlayerLeveledUpEvent = BaseEvent<EventType.PLAYER_LEVELED_UP, { userId: UserId; level: number }>;
// … one per event type
type DomainEvent = PlayerLeveledUpEvent | ItemAcquiredEvent | /* … */ NewFollowerEvent;

interface EventHandler<E extends DomainEvent = DomainEvent> {
  readonly eventType: E['type'];
  handle(event: E): NotificationIntent[];
}

interface NotificationChannel { send(n: Notification): Promise<void>; }

interface PreferenceStore {
  isEnabled(userId: UserId, category: NotificationCategory): boolean;
  setPreference(userId: UserId, category: NotificationCategory, enabled: boolean): void;
}

type DispatchStatus = 'SENT' | 'SUPPRESSED' | 'SKIPPED' | 'FAILED';
interface DispatchResult {
  eventId: string;
  eventType: EventType;
  status: DispatchStatus;
  recipientId?: UserId;
  notification?: Notification;
  reason?: 'PREFERENCE_DISABLED' | 'NOT_NOTEWORTHY' | 'NO_HANDLER' | 'HANDLER_ERROR' | 'PREFERENCE_ERROR' | 'DELIVERY_ERROR';
  error?: string;
}
```

---

## 3. Dispatch sequence

```
GameEngine.playerLeveledUp(1, 15)
  ├─ validate(userId=1, level=15)            ── invalid → throw InvalidEventError (nothing published)
  ├─ event = { eventId, type: PLAYER_LEVELED_UP, occurredAt, payload }
  └─ return eventBus.publish(event)
        └─ NotificationService.onEvent(event)
              ├─ handler = registry.get(event.type)            ── none → FAILED/NO_HANDLER
              ├─ intents = handler.handle(event)               ── throws → FAILED/HANDLER_ERROR
              │                                                ── []     → SKIPPED/NOT_NOTEWORTHY
              └─ for each intent:
                    ├─ preferences.isEnabled(recipient, category) ── false → SUPPRESSED
                    │                                                ── throws → FAILED/PREFERENCE_ERROR
                    ├─ notification = new Notification(...)
                    ├─ await channel.send(notification)           ── throws → FAILED/DELIVERY_ERROR
                    └─ SENT
```

**Step order versus the brief.** The brief lists *create Notification → check preferences → send*. We check preferences
**before** building the `Notification`, so no object (and no ID) is created for a notification that will never be sent.
The steps and their meaning are otherwise unchanged. Category and recipient are known from the intent, which is all the
preference check needs.

**Return value.** Producer methods return `Promise<DispatchResult[]>`. Game code can ignore it (fire-and-forget); the
demo and tests `await` it for deterministic assertions. The promise **never rejects**, because every downstream error
becomes a `FAILED` result (NFR-4).

---

## 4. Patterns and why

| Pattern | Where | Why | Trade-off accepted |
|---------|-------|-----|--------------------|
| **Observer / pub-sub** | `EventBus` between producers and `NotificationService` | Producers don't know the notification system exists, matching the brief's "emitted by different parts of the game platform". Other consumers (analytics, achievements) can subscribe later without touching producers. | One extra hop of indirection. In-process only; see §6 for moving to a broker. |
| **Strategy + Registry** | One `EventHandler` per event type, looked up by `type` | The brief stresses "flexibility and maintainability as the system grows". A new event type is a new file plus one registration, with no `switch` in the service (Open/Closed). Each handler can be unit-tested on its own. | More files than a single `switch`. Registration errors (forgetting to register) surface at runtime, which is why the composition root registers all handlers and a test asserts that every `EventType` has one. |
| **Ports & Adapters (hexagonal-lite)** | `NotificationChannel`, `PreferenceStore`, `ItemCatalog`, `PlayerNameResolver`, `Logger`, `Clock` | The brief says delivery is an external dependency to mock. Interfaces make that natural, and push/email or a DB-backed preference store can be added without changing the core. | Interfaces with a single implementation today. |
| **Façade** | `GameEngine`, `SocialSystem` | Keeps the exact call shape from the brief (`gameEngine.playerLeveledUp(1, 15)`) while hiding event construction and validation. | None of note. |
| **Constructor DI + composition root** | `createNotificationSystem(overrides?)` | Tests swap in a fake channel, silent logger and fixed clock. There is exactly one place where wiring happens. | Manual wiring instead of a DI container, which is deliberate: no framework is needed at this size. |
| **Discriminated unions** | `DomainEvent` | The compiler narrows the payload per event type, so handlers can't read the wrong fields. | Requires an exhaustive union update for each new event (a benefit, really). |
| **Result objects instead of exceptions (downstream)** | `DispatchResult` | Fault isolation and observable outcomes for the demo and tests. | Callers must inspect results if they care. |

### Rejected alternatives

- **One big `NotificationService` with a `switch(event.type)`**: simplest, but it grows without bound and fails the
  maintainability goal.
- **Node `EventEmitter` directly**: synchronous, errors in one listener propagate to the emitter (to the game engine), and
  there is no way to await results. A thin custom bus (about 30 lines) gives error isolation and awaitable results.
- **Producers call `NotificationService` directly**: couples the game engine to notifications. The bus costs little and
  matches the "events emitted by different parts" framing.
- **Message templates in a separate i18n/template engine**: i18n is out of scope, so templates live in the handlers. Moving
  them to a template map is a mechanical change if needed.

---

## 5. Error-handling strategy

| Layer | Error | Handling |
|-------|-------|----------|
| Façade | Invalid input | Throws `InvalidEventError` synchronously. It is the caller's bug, so fail fast. |
| EventBus | A listener throws or rejects | Caught per listener and logged; other listeners still run. |
| Service | No handler / handler throws | `FAILED` result, logged with `eventId`. |
| Service | Preference lookup throws | `FAILED/PREFERENCE_ERROR`. **Fails closed**: if we can't confirm the user wants it, nothing is sent. |
| Service | Channel throws or rejects | `FAILED/DELIVERY_ERROR` per recipient. Other recipients of the same event still get processed. |
| Item catalog | Unknown item | Warning, fallback name (A-7). |

There are no retries by design (out of scope). The `DispatchResult` carries enough data (`eventId`, `recipientId`, the
`notification`) for a retry or dead-letter layer to be added later.

---

## 6. Extension scenarios (likely interview "what if" questions)

| Scenario | What changes | What stays |
|----------|-------------|------------|
| **New event type** (e.g. *guild invite*) | Add an event type, a façade method and a handler; register it | Service, bus, channels, preferences |
| **New category** (e.g. *GUILD*) | Add an enum value; handlers return it. Preferences already map category → bool | Everything else |
| **Push / email channel** | Implement `NotificationChannel`. Add a `ChannelRouter` that picks channels per notification (and per-channel preferences, if wanted) | Handlers, bus, producers |
| **Per-event-type preferences** | Change the `PreferenceStore` key from category to `(category, type)`, falling back to category | Handlers, channels |
| **Real-time transport** (WebSocket) | `InAppChannel` adapter pushes to a socket gateway keyed by `userId` | Core pipeline |
| **Offline users / inbox** | Add a `NotificationRepository`. Persist before send and mark delivered on ack | Handlers |
| **Scale-out / multiple services** | Replace the in-memory `EventBus` with a Kafka/SQS/Redis Streams adapter behind the same interface. Make handlers idempotent using `eventId`. Partition by recipient to keep per-user ordering | Handlers, preferences interface, channels |
| **Retries / DLQ** | Wrap the channel in a `RetryingChannel` decorator. Route `FAILED` results to a DLQ | Everything else |
| **Rate limiting / digest** (e.g. 50 followers per minute) | A decorator between the service and the channel, or an aggregation handler | Producers, handlers |
| **Localisation** | Handlers return a template key and params; a `MessageRenderer` resolves them per user locale | Pipeline |
| **Real player names** | Implement `PlayerNameResolver` against the profile service and pass it to `createNotificationSystem`. If the lookup becomes async, `EventHandler.handle` returns a `Promise` (the service already awaits) | Handlers' templates, pipeline |

---

## 7. Project layout

```
src/
  domain/
    types.ts                 UserId, NotificationCategory, EventType, NotificationType
    events.ts                DomainEvent union + payloads
    notification.ts          Notification class (A-1)
    errors.ts                InvalidEventError
  events/
    event-bus.ts             EventBus interface + InMemoryEventBus
  producers/
    game-engine.ts           GameEngine façade
    social-system.ts         SocialSystem façade
    event-publisher.ts       stamps eventId/occurredAt and publishes
    validation.ts            boundary input guards
  notifications/
    notification-service.ts  the pipeline
    handler-registry.ts
    event-handler.ts         EventHandler strategy interface
    notification-intent.ts
    dispatch-result.ts
    handlers/
      game-handlers.ts       level up, item, challenge, PvP attacked/defeated
      social-handlers.ts     friend request, friend accepted, new follower
      index.ts               createDefaultHandlers()
  preferences/
    preference-store.ts      interface + InMemoryPreferenceStore
  catalog/
    item-catalog.ts          interface + InMemoryItemCatalog + seed data + humanizeItemId
  players/
    player-name-resolver.ts  interface + IdPlayerNameResolver
  channels/
    notification-channel.ts  port
    in-app-channel.ts        adapter
    in-app-client.ts         external client interface + MockInAppClient
  infra/
    logger.ts  clock.ts  id-generator.ts
  container.ts               createNotificationSystem()
  demo.ts                    example usage (npm start)
  index.ts                   public exports
tests/
  unit/                      one file per component
  integration/acceptance.test.ts   AC-1 … AC-11 end-to-end
```

## 8. Technology choices

| Choice | Reason |
|--------|--------|
| TypeScript `strict` | Discriminated unions and exhaustive checks catch mistakes at compile time |
| Node.js ≥ 16, CommonJS output | Runs everywhere with no flags; simplest for `ts-jest` |
| Jest + ts-jest | Requested; no separate build needed for tests |
| No runtime deps | Nothing to break on `npm install`; the domain is small enough |
| `crypto.randomUUID()` for IDs | Built into Node ≥ 16 |
