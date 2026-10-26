# 03 — Implementation & Test Plan

> Ordered, incremental plan. Each phase ends green (`npm run build && npm test`).
>
> **Status: phases 0–8 complete.** 95 tests across 10 suites; coverage 99.7% lines / 98.5% branches.

---

## Phase 0 — Scaffolding
- `package.json` scripts: `build` (tsc), `start` (`node dist/demo.js`; `prestart` runs `build`, so a fresh clone needs only `npm install && npm start`), `test` (jest), `test:coverage`.
- `tsconfig.json` (`strict`, `target ES2020`, `module commonjs`, `outDir dist`, `rootDir src`).
- `jest.config.js` (ts-jest preset, `tests/` roots).
- `.nvmrc` → Node 20; `engines.node` ≥ 16.
- **Done when:** `npm install && npm run build && npm test` succeeds on an empty test.

## Phase 1 — Domain
- `types.ts`, `events.ts`, `notification.ts`, `errors.ts`.
- Infra: `Logger` (console + silent), `Clock`, `IdGenerator`.
- **Tests:** `Notification` is immutable and stores its fields.

## Phase 2 — Event bus
- `EventBus` interface and `InMemoryEventBus` with per-listener error isolation, returning aggregated results.
- **Tests:** delivers to all subscribers; one throwing listener doesn't stop others; publish never rejects.

## Phase 3 — Preferences, item catalog, player names
- `InMemoryPreferenceStore` (`Map<UserId, Map<Category, boolean>>`, default enabled).
- `InMemoryItemCatalog` with seed data (`SwordOfAzeroth` → LEGENDARY, `RustyDagger` → COMMON, …) and a `humanize()` fallback.
- `PlayerNameResolver` interface + `IdPlayerNameResolver`.
- **Tests:** defaults; per-category independence; overwrite; rarity threshold; humanize (`SwordOfAzeroth` → `Sword of Azeroth`).

## Phase 4 — Handlers and registry
- One handler per event type (see `01` §2.1 for recipients and templates).
- `HandlerRegistry` that rejects duplicate registration.
- **Tests:** a stub `PlayerNameResolver` (`3 → 'Arthas'`) shows names come only from the resolver; each handler gives the correct recipient, category, type and exact message; the item handler skips COMMON items; the registry covers every `EventType` (exhaustiveness test).

## Phase 5 — Notification service and channel
- `NotificationService` pipeline (`02` §3); `InAppChannel`; mock `InAppClient`.
- **Tests (with a fake channel):** SENT, SUPPRESSED, SKIPPED, FAILED/NO_HANDLER, FAILED/HANDLER_ERROR, FAILED/DELIVERY_ERROR; preference read at dispatch time.

## Phase 6 — Producers and validation
- `GameEngine`, `SocialSystem` façades and the `validation.ts` guards.
- **Tests:** table-driven invalid inputs (`0`, `-1`, `1.5`, `NaN`, `null`, `'1'`, `''`, `'   '`, self-targeting) → `InvalidEventError` with nothing published; valid input publishes exactly one event of the right shape.

## Phase 7 — Composition root and demo
- `createNotificationSystem(overrides?)`.
- `demo.ts` runs:
  1. the four brief triggers exactly as written;
  2. challenge completed, new follower and PvP;
  3. user 1 disables SOCIAL → friend request suppressed, level-up still delivered;
  4. a common item → skipped;
  5. an invalid call → caught `InvalidEventError` printed;
  6. a failing channel → FAILED, game call unaffected.
  Each step prints the trigger and its `DispatchResult`s.
- **Integration tests:** AC-1 … AC-11 from `01` §10, end-to-end through the container.

## Phase 8 — Documentation and polish
- README: how to run, features, design summary, links to `docs/`.
- Update `04-ai-process.md` with the prompts actually used during implementation.
- Coverage check (target ≥ 90% lines on `src/`, excluding `demo.ts` and `index.ts`). Achieved 99.7%.

---

## Test strategy summary

| Level | Scope | Doubles |
|-------|-------|---------|
| Unit | Handlers, registry, preferences, catalog, validation, bus, service | Fake channel, silent logger, fixed clock and IDs |
| Integration | Façade → bus → service → channel through `createNotificationSystem` | Recording `InAppClient` mock |
| Smoke | `npm start` exits 0 | — |

Every acceptance criterion in `01` §10 maps to at least one integration test, named after it (`AC-3: friend request notifies the recipient`).

## Definition of done
- [x] `npm install && npm run build && npm start && npm test` all succeed on a clean clone (Node ≥ 16).
- [x] All AC-1 … AC-11 covered by passing tests.
- [x] No `any` in `src/`; `tsc --noEmit` clean under `strict`.
- [x] README and `docs/` updated; AI process log complete.
