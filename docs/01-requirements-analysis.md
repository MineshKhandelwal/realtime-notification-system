# 01 — Requirements Analysis

> Source: *Coding Challenge: Real-Time Notification System for a Gaming Platform* (Globalli).
> This document turns the brief into explicit requirements, assumptions, edge cases and scope boundaries.
> When the brief is ambiguous, the decision taken is recorded and marked **[Assumption]** so it can be challenged.

---

## 1. Problem statement

Players on a multiplayer gaming platform must be told, in real time and inside the app, about important things that happen
**in the game** (level up, rare item, challenge completed, PvP) and **in their social network** (friend request, friend
accepted, new follower). Events are emitted by separate platform subsystems (a game engine, a social system). The
notification system must capture those events, decide **who** to notify and **what** to say, respect each user's
**per-category preferences**, and hand the resulting `Notification` to an (existing, mocked) in-app delivery mechanism.

The evaluation weighs **design quality, extensibility and the process used** (including AI usage) at least as much as the
feature list.

---

## 2. Functional requirements

| ID | Requirement | Source | Priority |
|----|-------------|--------|----------|
| FR-1 | Notify a player when they **level up** — e.g. *"Congratulations! You've reached level 15!"* | Brief: In-Game Events | Must |
| FR-2 | Notify a player when they **acquire a rare or valuable item** — e.g. *"You've acquired the legendary Sword of Azeroth!"* | Brief: In-Game Events | Must |
| FR-3 | Notify a player when they **complete a challenge** (quest or achievement) | Brief: In-Game Events | Must |
| FR-4 | Notify a player when they are **attacked** or **defeated** by another player (PvP) | Brief: In-Game Events (*optional, good to consider*) | Should |
| FR-5 | Notify a player when **another player sends them a friend request** — e.g. *"Player 'X' has sent you a friend request."* | Brief: Social Events | Must |
| FR-6 | Notify a player when **a friend request they sent is accepted** | Brief: Social Events | Must |
| FR-7 | Notify a player when **another player starts following them** | Brief: Social Events | Must |
| FR-8 | Each user can **enable/disable notifications per category** (at least *Game Events*, *Social Events*), stored as a simple map | Brief: User Preferences | Must |
| FR-9 | A notification is **not sent** when the recipient has disabled that category | Brief: User Preferences / Dispatching | Must |
| FR-10 | Event pipeline: **receive** event → **determine notification type** → **create `Notification`** → **check preferences** → **send** | Brief: Event Handling | Must |
| FR-11 | Delivery is **in-app only**, through an external client that is mocked | Brief: Channels / Important Note | Must |
| FR-12 | Provide **example usage** that triggers the four example events and visibly shows how the system responds (sent / suppressed) | Brief: Example Usage | Must |
| FR-13 | Messages are **clear, concise and informative**, following the brief's templates | Brief: Notification Content | Must |

### 2.1 Event → recipient → message mapping

The brief's triggers carry IDs only. Who is notified is a design decision for some events, so it is written down here.

| Producer call | Meaning | Recipient | Category | Message template |
|---|---|---|---|---|
| `gameEngine.playerLeveledUp(userId, level)` | `userId` reached `level` | `userId` | GAME | `Congratulations! You've reached level {level}!` |
| `gameEngine.itemAcquired(userId, itemId)` | `userId` obtained `itemId` | `userId` | GAME | `You've acquired the {rarity} {itemName}!` |
| `gameEngine.challengeCompleted(userId, challengeName)` | `userId` completed a quest/achievement | `userId` | GAME | `Challenge complete! You've finished '{challengeName}'.` |
| `gameEngine.playerAttacked(attackerId, victimId)` | PvP attack | `victimId` | GAME | `You've been attacked by Player '{attackerName}'!` |
| `gameEngine.playerDefeated(winnerId, loserId)` | PvP defeat | `loserId` | GAME | `You've been defeated by Player '{winnerName}'.` |
| `socialSystem.friendRequestSent(senderId, recipientId)` | `senderId` → `recipientId` | `recipientId` | SOCIAL | `Player '{senderName}' has sent you a friend request.` |
| `socialSystem.friendRequestAccepted(accepterId, requesterId)` | `accepterId` accepted the request from `requesterId` | `requesterId` | SOCIAL | `Player '{accepterName}' accepted your friend request.` |
| `socialSystem.newFollower(followerId, followedId)` | `followerId` follows `followedId` | `followedId` | SOCIAL | `Player '{followerName}' started following you.` |

Signatures in **bold in the brief** (`playerLeveledUp`, `itemAcquired`, `friendRequestSent`, `friendRequestAccepted`) are
kept exactly. The others (`challengeCompleted`, `playerAttacked`, `playerDefeated`, `newFollower`) are not given in
the brief, so they follow the same shape: actor first, then target.

---

## 3. Non-functional requirements

| ID | Requirement | How it is addressed |
|----|-------------|---------------------|
| NFR-1 | **Must compile and run** from a clean clone using the provided scripts | `npm install && npm run build && npm start`; `npm test`. No external services or runtime dependencies. |
| NFR-2 | **Flexibility / maintainability as the system grows** | Event types, handlers, channels and preference stores sit behind interfaces. Adding an event type means adding a handler and registering it, without editing the dispatcher (Open/Closed). See `02-architecture.md`. |
| NFR-3 | **Real-time** behaviour | In-process event bus, dispatched as soon as the producer calls it; no polling or batching. |
| NFR-4 | **Fault isolation** — a notification failure must not break the game | Producer calls never throw because of downstream failures. Handler and channel errors are caught, logged and returned as a failed dispatch result. |
| NFR-5 | **Testability** | Constructor dependency injection, deterministic clock and ID generator injectable, Jest unit and integration tests. |
| NFR-6 | **Language/tooling** | TypeScript (strict), Node.js ≥ 16, Jest (via `ts-jest`). |
| NFR-7 | **Documentation of AI process** | `docs/04-ai-process.md` is a deliverable, kept up to date across the work. |

---

## 4. Assumptions

| ID | Assumption | Rationale |
|----|------------|-----------|
| A-1 | **No `Notification` class is provided** *(confirmed)*. We design our own from the requirements: `id`, `recipientId`, `type`, `category`, `message`, `createdAt`, optional `metadata`. | The brief mentions a provided class, but none exists. |
| A-2 | User IDs are **positive integers** (the brief uses `1`, `2`, `3`). | Matches the example triggers. |
| A-3 | Player names come from a **`PlayerNameResolver`** interface *(confirmed)*. The default implementation returns the player ID, so messages read `Player '3'`. A real profile service can be plugged in later without changing handlers or the pipeline. | The brief's `'X'` is a name, but only IDs are supplied. |
| A-4 | **Default preference = enabled** *(confirmed)*. A user with no stored preferences, or no entry for a category, receives notifications (opt-out model). | Gaming platforms typically default to on; it also keeps the demo meaningful. One constant to flip. |
| A-5 | Two categories: **GAME** (level up, item, challenge, PvP) and **SOCIAL** (friend request, friend accepted, follower). | The brief names exactly these two. PvP happens in the game, so it falls under GAME. |
| A-6 | *(Confirmed.)* "Rare or valuable" is decided with a small in-memory **item catalog** (`itemId → displayName, rarity`). Only items at or above `RARE` produce a notification. | Needed to (a) filter as the brief describes and (b) render *"legendary Sword of Azeroth"* from the ID `"SwordOfAzeroth"`. |
| A-7 | An **unknown item ID** (not in the catalog) still produces a notification, using a humanised name and no rarity word (`"SwordOfAzeroth"` → *"Sword of Azeroth"*). A warning is logged. | The producer chose to emit the event. Dropping it silently is the worse failure. Recorded as open question Q-3. |
| A-8 | The game engine emits `playerLeveledUp` only on a real level increase. The notification system does **not** track level history. | State tracking belongs to the game engine. |
| A-9 | *(Confirmed.)* `friendRequestAccepted(1, 3)` means *user 1 accepted the request from user 3*. Only the **original requester (3)** is notified. | Matches the brief's comment. The accepter just performed the action and does not need a notification. |
| A-10 | Delivery is **fire-and-forget to an existing client**. The client handles online/offline, persistence and display. | Brief: "You can assume there is an existing notification client". |
| A-11 | Single process, in-memory. No persistence of events, notifications or preferences between runs. | Brief scope; the demo and tests run in one process. |

---

## 5. Validation rules and invalid input

Validation happens **at the boundary** (the producer façade methods), before an event enters the bus.

| Rule | Applies to | Behaviour on violation |
|------|------------|------------------------|
| V-1 User IDs are positive safe integers | all events | `InvalidEventError` |
| V-2 Level is a positive safe integer | level up | `InvalidEventError` |
| V-3 `itemId` / `challengeName` are non-empty after trimming | item, challenge | `InvalidEventError` |
| V-4 Actor ≠ target (no self friend request, self accept, self follow, self attack) | social, PvP | `InvalidEventError` |
| V-5 `null` / `undefined` / `NaN` / wrong type (JS callers bypass TS types) | all | `InvalidEventError` |

**Why throw at the boundary but never downstream:** a malformed call is a programming error in the *calling* code, and
failing fast and loudly makes it visible. Once an event is valid and accepted, anything that goes wrong later (handler
bug, channel outage) is the notification system's own problem and must not propagate into the game loop (NFR-4).

---

## 6. Edge cases and failure scenarios

| # | Scenario | Expected behaviour |
|---|----------|--------------------|
| E-1 | Recipient disabled the category | No `Notification` is sent; result `SUPPRESSED` (reason `PREFERENCE_DISABLED`); logged at debug level. |
| E-2 | Recipient has no preferences stored | Treated as enabled (A-4). |
| E-3 | Disabling GAME does not affect SOCIAL (and vice versa) | Preferences are checked per category. |
| E-4 | Preferences change between two events | Each dispatch reads preferences **at dispatch time**; the latest value wins. |
| E-5 | Item below rarity threshold (e.g. `COMMON`) | Not notified; result `SKIPPED` (reason `NOT_NOTEWORTHY`). |
| E-6 | Unknown item ID | Notified with a humanised name and a warning logged (A-7). |
| E-7 | No handler registered for an event type | Logged as an error; result `FAILED` (reason `NO_HANDLER`). Other events are unaffected. |
| E-8 | A handler throws | Caught; result `FAILED`; other events and handlers are unaffected. |
| E-9 | The channel (mock client) throws or rejects | Caught; result `FAILED` (reason `DELIVERY_ERROR`). **No retry** (out of scope, see §8). |
| E-9b | The preference store throws (e.g. a future DB is down) | Fail closed: not sent; result `FAILED` (reason `PREFERENCE_ERROR`). |
| E-10 | Invalid input (see §5) | `InvalidEventError` thrown synchronously to the caller; nothing is dispatched. |
| E-11 | The same event is emitted twice | Two notifications. **No de-duplication**: in-process with no retries, duplicates can only come from the producer. Each event carries a unique `eventId` so de-duplication can be added later. |
| E-12 | Ordering | Events from a single producer are dispatched in call order (single-threaded Node, sequential processing per publish). Ordering across producers is not guaranteed. |
| E-13 | Very large values (level `1e9`, very long item names) | Accepted as long as they pass V-1 to V-3. The message is not truncated; display is the client's job. |
| E-14 | Very high event volume | Out of scope for the in-process demo. See the scaling notes in `02-architecture.md`. |

---

## 7. Constraints

- TypeScript + Node.js + Jest (stakeholder preference).
- Must build and run from a fresh clone with documented npm scripts. No Docker, database or broker required.
- No runtime dependencies beyond Node itself (dev dependencies only: `typescript`, `jest`, `ts-jest`, `@types/*`).
- Delivered as a public GitHub repo owned by the candidate, with README and AI-process documentation.

---

## 8. Explicitly out of scope

From the brief, or because nothing in the brief asks for it:

- Rendering or displaying notifications in a game client (brief: *Important Note*).
- Push, email and SMS channels. The **channel interface** leaves room for them, but only in-app is built.
- Real transport (WebSockets, SSE), servers, HTTP APIs and authentication.
- Persistence: databases, notification history/inbox, read/unread state.
- Retries, dead-letter queues, delivery guarantees, de-duplication.
- Rate limiting, batching or digest notifications, quiet hours.
- Localisation/i18n of messages.
- Finer-grained preferences (per event type, per channel). The brief asks for **per-category** only.
- A real player profile service (only the `PlayerNameResolver` seam is built) or a real item database.
- Preference management UI or API beyond a programmatic setter used by the demo and tests.

---

## 9. Open questions (all resolved)

| # | Question | Resolution |
|---|----------|-----------------|
| Q-1 | Is a concrete `Notification` class supposed to be supplied? It is not in the PDF. | **Confirmed:** design our own (A-1). |
| Q-2 | Should preferences default to enabled or disabled for users with no settings? | **Confirmed:** enabled (A-4). |
| Q-3 | Should unknown or non-rare items be notified? | **Confirmed:** in-memory item list; unknown → notify, below `RARE` → skip (A-6, A-7). |
| Q-4 | On friend-request acceptance, should the accepter also get a confirmation? | **Confirmed:** requester only (A-9). |
| Q-5 | Is PvP expected in the delivered solution? | Included as a Should: one handler each, and it exercises the multi-party recipient logic. |
| Q-6 | How should player names be shown without a profile service? | **Confirmed:** player ID as the fallback, behind a `PlayerNameResolver` (A-3). |

---

## 10. Acceptance criteria (traceability)

| AC | Given / When / Then | Covers |
|----|---------------------|--------|
| AC-1 | Given user 1 has GAME enabled, when `playerLeveledUp(1, 15)`, then user 1 receives *"Congratulations! You've reached level 15!"* | FR-1, FR-10, FR-13 |
| AC-2 | Given `SwordOfAzeroth` is LEGENDARY, when `itemAcquired(2, "SwordOfAzeroth")`, then user 2 receives *"You've acquired the legendary Sword of Azeroth!"* | FR-2, A-6 |
| AC-3 | When `friendRequestSent(3, 1)`, then **user 1** receives *"Player '3' has sent you a friend request."* | FR-5 |
| AC-4 | When `friendRequestAccepted(1, 3)`, then **user 3** receives *"Player '1' accepted your friend request."* | FR-6, A-9 |
| AC-5 | Given user 1 disabled SOCIAL, when `friendRequestSent(3, 1)`, then nothing is delivered and the result is `SUPPRESSED` | FR-8, FR-9 |
| AC-6 | Given user 1 disabled SOCIAL, when `playerLeveledUp(1, 16)`, then user 1 **still** receives the level-up | E-3 |
| AC-7 | When `itemAcquired(2, "RustyDagger")` (COMMON), then nothing is delivered and the result is `SKIPPED` | E-5 |
| AC-8 | When `friendRequestSent(3, 3)` or `playerLeveledUp(-1, 5)`, then `InvalidEventError` is thrown and nothing is delivered | §5 |
| AC-9 | Given the channel throws, when any valid event is emitted, then the producer call does not throw and the result is `FAILED` | NFR-4, E-9 |
| AC-10 | `npm start` runs the demo showing the four brief triggers plus a suppressed and a failed case, each with its outcome logged | FR-12 |
| AC-11 | Challenge completed, PvP attacked/defeated and new follower each notify the correct recipient with the templated message | FR-3, FR-4, FR-7 |
