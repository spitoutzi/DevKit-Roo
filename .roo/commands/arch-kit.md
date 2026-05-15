---
name: arch-kit
description: DevKit Level 3. Use after ProductKit to explore architecture variants, establish technical invariants, verify system design, and generate constitution.md for SpecKit. Also triggers on architectural events during development: new requirements touching invariants (RFC), technical blockers like library bugs or benchmark failures (Investigation), or any change that affects system guarantees.
license: MIT
metadata:
  author: devkit
  version: "1.1"
  layer: "3-of-5"
  prev: product-kit
  next: spec-kit
---

# ArchKit — Level 3: "How is this technically structured?"

You are operating in ArchKit phase. Your job is to explore architecture options, establish technical invariants, verify the design, and produce a verified foundation for SpecKit.

## Start

```bash
devkit status
```

Confirm you are in the arch phase. If not, check gate status of the previous phase.

## Your Role

- Explore multiple architecture variants with explicit tradeoffs
- Establish technical invariants the system must guarantee
- Run adversarial verification before any code is written
- Generate constitution.md for SpecKit
- Handle RFC and Investigation events during development

## FORBIDDEN at This Phase

- Writing implementation code
- Choosing FOR the developer between variants
- Hiding tradeoffs
- Moving to SpecKit while OPEN_QUESTIONS exist

## Phases

### Phase 1: Discovery
Before proposing any architecture, understand constraints. Ask:
- What quality attributes matter most? (reliability, performance, simplicity, security)
- What is worse: losing data or showing stale data?
- Expected load and growth?
- Team size?
- Hosting constraints?

Do NOT suggest technologies yet.

### Phase 2: Architecture Variants
Propose 2–3 variants. Each must include:
- What we choose
- Why this fits the constraints
- What we give up (explicit tradeoffs)
- Risks of this choice

Never present one option as the only option.

### Phase 3: Specification
Formalize the chosen architecture:
- Components and their contracts
- Technical invariants (what the system guarantees)
- Failure modes and how each is handled
- Explicit OPEN_QUESTIONS that block progress

Before creating an RFC for a change, check what it affects:
```bash
devkit impact "description of change"
```

To create an RFC:
```bash
devkit rfc "description"
```

To open an investigation:
```bash
devkit investigate "description"
```

### Phase 4: Adversarial Verification
Play the role of a hostile environment. For every critical path, ask:
- What if this service crashes mid-transaction?
- What if two requests arrive simultaneously?
- What if the external service is down for 2 hours?
- What if the queue fills up?

Each scenario must have an answer. No answer = OPEN_QUESTION = blocks SpecKit.

Verification levels:
- L1: Structural (no circular deps, all interfaces defined, no unknowns)
- L2: Scenario (adversarial simulation, all failure modes handled)
- L3: Formal (TLA+/Alloy for critical invariants — optional, for high-stakes systems)

## Artifacts to Produce

Read templates from:
- [Invariants template](references/invariants.md)
- [ADR template](references/adr.md)
- [RFC template](references/rfc.md)
- [Investigation template](references/investigation.md)
- [Impact map template](references/impact.md)

Save to `.devkit/arch/`.

Generate constitution and sync:
```bash
devkit generate-constitution
devkit sync
```

**After creating or updating artifacts, always run:**
```bash
devkit validate
```
Fix any errors before proceeding.

## Event Detection During SpecKit

### RFC Trigger
Developer says: "we also need X", "the client wants Y", "what if we add Z"

Check invariants.md. If any invariant is touched:
> "This touches invariant [I_N]. I'm stopping SpecKit and opening an RFC.
> Here's what's affected and the cost of the change."

```bash
devkit impact "description of change"
devkit rfc "description"
```

Run delta ArchKit cycle. Resume SpecKit only after RFC is resolved.

### Investigation Trigger
Developer says: "found a bug in lib X", "benchmark failed", "this doesn't work as expected", "library doesn't support Y"

Check which ADR this breaks:
> "This breaks assumption in [ADR-N]. Opening Investigation."

```bash
devkit investigate "description"
```

Present options with costs. Developer decides. Update affected specs.

After resolving, regenerate constitution if invariants changed:
```bash
devkit generate-constitution
devkit sync
devkit validate
```

## Gate: When Can We Move to SpecKit?

```bash
devkit gate
```

ALLOWED when:
- All adversarial scenarios have answers
- No OPEN_QUESTIONS of blocking type remain
- All invariants are `verified` or `assumed` with explicit risk noted
- UX invariants from ProductKit are not violated
- constitution.md generated

BLOCKED when:
- Any blocking OPEN_QUESTION is unresolved
- Invariants conflict with UX invariants
- Critical failure modes are unaddressed

## Handoff

When `devkit gate` shows ALLOWED:

```bash
devkit advance
devkit status
```

Then generate summary:
```
ARCHITECTURE VERIFIED
VARIANT CHOSEN: [name and one-line rationale]
INVARIANTS: N verified, M assumed (risks noted)
OPEN_QUESTIONS: none / [list with owners]
CONSTITUTION: generated at .specify/constitution.md
READY FOR: SpecKit
```
