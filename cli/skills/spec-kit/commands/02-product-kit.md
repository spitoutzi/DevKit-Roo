---
name: product-kit
description: DevKit Level 2. Use after ResearchKit when developer needs to define who the user is, establish UX invariants, and set the roadmap before architecture. Triggers on phrases like "who is this for", "how will people use this", "what's the MVP", "user experience", or when ResearchKit handoff is complete.
license: MIT
metadata:
  author: devkit
  version: "1.1"
  layer: "2-of-5"
  prev: research-kit
  next: arch-kit
---

# ProductKit — Level 2: "What exactly are we building and for whom?"

You are operating in ProductKit phase. Your job is to define the user, establish UX invariants, and set roadmap priorities before any architecture decisions are made.

## Start

```bash
devkit status
```

Confirm you are in the product phase. If not, check gate status of the previous phase.

## Your Role

- Define who the user is and how they interact with the product
- Establish UX invariants that constrain architecture
- Prioritize ruthlessly: MVP vs later vs never
- Do NOT recommend technical solutions
- Do NOT write code or architecture

## Critical Principle

UX invariants are defined HERE, before ArchKit. They constrain architecture just as hard as technical requirements. If defined after, you get 60-parameter CLIs that formally work but are unusable.

## Phases

### Phase 1: User Definition
Identify the real user. Ask:
- Who specifically will use this? (developer, devops, manager, end user?)
- What do they already know?
- What context are they in when they use this? (manually, in CI, in a script?)
- What is their happy path — the 80% case?

### Phase 2: UX Invariants
Formalize what the system PROMISES the user. Not how it looks — what it guarantees.

Examples:
- "New user reaches result in under N steps"
- "No required config to get started — sensible defaults"
- "Every error message tells you what to do next"
- "Core operation completes in under N seconds"

Each invariant gets: PRIORITY (must/should/could) and VALIDATION method.

### Phase 3: Roadmap
Define phases from user perspective:
- MVP: minimum to be genuinely useful
- V1: full intended experience
- Later: good ideas for the future
- Never (anti-scope): explicitly out of scope — prevents scope creep

## Artifacts to Produce

Read templates from:
- [Users template](references/users.md)
- [UX Invariants template](references/ux_invariants.md)
- [Roadmap template](references/roadmap.md)

Save artifacts to `.devkit/product/`.

**After creating or updating artifacts, always run:**
```bash
devkit validate
```
Fix any errors before proceeding.

## Gate: When Can We Move to ArchKit?

```bash
devkit gate
```

ALLOWED to proceed when:
- Primary user and happy path defined
- UX invariants established for MVP scope
- Roadmap has explicit anti-scope
- No contradictions between UX invariants

BLOCKED when:
- UX invariants contradict each other
- Happy path unclear
- "Who is the user" still open

## Event Detection

### Product Blocker (triggered during SpecKit or later)
If developer says: "this is awkward to use", "too many parameters", "users won't understand this" — this is a UX invariant violation.

Response:
> "This looks like a UX invariant violation. Let me check product-kit artifacts.
> [check ux_invariants.md]
> This conflicts with [U_N]. Running ProductKit investigation before continuing."

Review ux_invariants.md, explore options, update invariants if needed, propagate changes to ArchKit via `devkit rfc`.

## Handoff

When `devkit gate` shows ALLOWED:

```bash
devkit advance
devkit status
```

Then generate summary:
```
PRODUCT COMPLETE
USER: [one-line description]
HAPPY PATH: [one sentence]
UX INVARIANTS: N defined (M must, K should)
MVP SCOPE: [summary]
ANTI-SCOPE: [what we explicitly won't do]
READY FOR: ArchKit
```
