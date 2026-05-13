---
name: qa-kit
description: DevKit Level 5. Use after implementation to verify the system against all levels of decisions: specs, technical invariants, UX invariants, and research assumptions. Generates test contracts from invariants. Escalates failures to the correct DevKit level — not just bug reports, but signals about where a decision was wrong.
license: MIT
metadata:
  author: devkit
  version: "1.1"
  layer: "5-of-5"
  prev: spec-kit
---

# QAKit — Level 5: "Does it work the way we decided?"

You are operating in QAKit phase. Your job is not just to find bugs — it is to verify the system against every level of decisions made in DevKit.

## Start

```bash
devkit status
```

Confirm you are in the qa phase. If not, check gate status of the previous phase.

## Your Role

- Generate test contracts from invariants (not from code)
- Map coverage: which invariants are tested, which are not
- Validate that research assumptions held in reality
- Escalate failures to the correct DevKit level
- Distinguish between a bug in code and a wrong decision upstream

## CRITICAL PRINCIPLE

A failing test is a signal, not just an error. The question is not only "what broke" but "at which level was the decision wrong":

```
Code doesn't match spec?        → fix in SpecKit (no escalation)
System violates invariant?      → Investigation in ArchKit
System works but feels wrong?   → ProductKit investigation
Assumption proved false?        → ResearchKit revision
```

## Phases

### Phase 1: Contract Generation
Read `.devkit/arch/invariants.md` and `.devkit/product/ux_invariants.md`.
For each invariant, generate a test contract:
- What to check
- How to check it (unit / integration / e2e / manual)
- What constitutes a violation
- Criticality: blocker / major / minor

Save to `.devkit/qa/test_contracts.md`.

**After creating contracts, validate:**
```bash
devkit validate
```

### Phase 2: Coverage Analysis
Map every invariant to its test contract.
Identify uncovered invariants — these are explicit technical debt.

```bash
devkit coverage
```

Save to `.devkit/qa/coverage_map.md`.

### Phase 3: Assumption Validation
Read `.devkit/research/assumptions.md`.
For each assumption, check whether reality confirmed or rejected it.
Rejected assumptions → escalate to ResearchKit.
Save findings to `.devkit/qa/assumption_checks.md`.

```bash
devkit validate
```

## Artifacts to Produce

Read templates from:
- [Test contracts template](references/test_contracts.md)
- [Coverage map template](references/coverage_map.md)
- [Assumption checks template](references/assumption_checks.md)

Save to `.devkit/qa/`.

**After creating or updating artifacts, always run:**
```bash
devkit validate
```
Fix any errors before proceeding.

## Escalation Logic

When a test fails or a problem is found:

### Step 1: What exactly failed?
Read the failing test contract. What invariant or spec does it cover?

### Step 2: Why did it fail?
```
Is this a code bug (code ≠ spec)?
  → Fix in SpecKit. No escalation needed.

Does the code match the spec but the spec violates an invariant?
  → Investigation in ArchKit. Open INV-XXX.

Does everything work technically but the user experience is wrong?
  → Product Blocker in ProductKit.

Did a research assumption prove false in production?
  → ResearchKit revision.
```

### Step 3: Document the escalation

```bash
devkit escalate "description of failure"
```

This creates `.devkit/qa/escalations/ESC-XXX.md`. Fill in:
- What was found
- Which level it escalated to
- What decision was triggered
- Resolution

## Gate: Ready for Production?

```bash
devkit gate
```

ALLOWED when:
- All BLOCKER test contracts pass
- No open escalations of blocker severity
- Coverage map shows all `must` invariants covered

BLOCKED when:
- Any BLOCKER contract fails
- Open blocker-level escalation exists

Check coverage threshold:
```bash
devkit coverage
```

## Continuous QA

QAKit is not a one-time gate. It runs:
- After each SpecKit implementation batch
- After each RFC resolution (re-verify affected invariants)
- After each Investigation resolution
- Before any production deployment
