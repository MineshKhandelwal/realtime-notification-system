# 04 — AI Usage & Process Log

> The brief asks for "the prompts you used and the process you followed to go from requirements to a working solution.
> Workflows and patterns used, tools used." This file is that record and is updated at each step.

## Tools
- **Claude Code** (VS Code extension, model Claude Opus) as a pair-programming agent with repository access.
- Git/GitHub for delivery.

## Workflow followed
1. **Analysis before code.** The AI was explicitly told not to implement anything until analysis and planning were done.
   Its output is `01-requirements-analysis.md`.
2. **Design.** Architecture, patterns, trade-offs and extension scenarios are in `02-architecture.md`.
3. **Plan.** Incremental phases with tests per phase are in `03-implementation-and-test-plan.md`.
4. **Human review gate.** The developer reviews the assumptions (A-1 … A-11) and open questions (Q-1 … Q-5) before
   implementation starts.
5. **Implementation, phase by phase.** Each phase is prompted separately, verified with `npm run build && npm test`, and
   reviewed before committing.
6. **Review pass.** An AI code review of the full diff, followed by a manual read-through.

## Prompts used

### Step 1 — Analysis and design (no code)
> *Attached: Coding Challenge.pdf*
>
> You are acting as a Senior Software Engineer. Your task is to analyze, design and document the coding requirement attached.
> 1) Understand the complete scope of the assignment, including:
>    a) Edge cases, invalid inputs, error scenarios, and potential failure points.
>    b) Architectural requirements, constraints, assumptions, and anything explicitly outside the assignment's scope.
>    c) Do not invent missing requirements or introduce unnecessary features.
> 2) Write all required documentations
> 3) Language preference - Typescript, Node Js, Jest
>
> Do not start implementation until you have completed the analysis and planning.

**Result:** documents 01–04 and the README skeleton. Notable AI findings worth discussing:
- The brief says a `Notification` class is "provided", but none is attached (Q-1).
- The direction of `friendRequestAccepted(1, 3)` decides who gets notified (A-9).
- "Rare or valuable" plus the *"legendary Sword of Azeroth"* example implies an item lookup (A-6).
- The brief's order (create → check preferences → send) was kept in meaning but reordered so preferences are checked
  before the object is built (architecture §3).

### Step 2 — Human review of assumptions
> Confirmations
> 1) There is no Notification class provided. Design our own based on the requirements.
> 2) Yes
> 3) Yes, Keep in-memory item list
> 4) Yes
> 5) Yes, Use the player ID as the fallback display name, but isolate name resolution so a real player profile service can be added later without changing notification logic.

**Result:** all open questions closed in `01` §9. Point 5 changed the design: a `PlayerNameResolver` port was added
(default implementation returns the ID), and the docs were updated before any code was written.

### Step 3 — Implementation
The confirmations in step 2 were the go-ahead. The AI worked through the phases in `03`, type-checking after each
group of files and running the demo before writing tests.

What the loop surfaced:
- **Type-system friction:** TypeScript can't link a generic `type` to its `payload` when building an event, so
  `EventPublisher` has one documented cast. A first version of the handler registry needed a mapped union type and
  an `as never` in a test. Because methods are bivariant, plain `EventHandler` is enough, so the registry was
  simplified.
- **A failure mode the design missed:** writing the service exposed that the preference lookup could also throw (for
  example, a future DB-backed store). The service fails closed (`PREFERENCE_ERROR`), and `01` and `02` were updated
  to match.
- **Coverage-driven additions:** the first coverage run showed the composition-root defaults and logger untested, so
  `tests/unit/infra.test.ts` was added.
- **Local environment:** the local Node is 16.13, so the minimum was set to `>=16`, which still has `crypto.randomUUID`
  and Jest 29.

Verification: `npx tsc --noEmit`; `npm test` (95 passing, 99.7% line coverage); `npm start` exits 0; and a clean
reinstall from scratch.


## Patterns for working with the AI
- **Constrain scope explicitly** ("do not invent requirements") to avoid gold-plating.
- **Force assumptions into the open** (tables of assumptions and questions) so they can be reviewed instead of being
  silently baked into the code.
- **Small, verifiable increments**, each phase ending with green build and tests.
- **Acceptance criteria → test names**, so the AI's output can be checked against the brief mechanically.
