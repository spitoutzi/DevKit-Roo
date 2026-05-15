---
name: spec-kit
description: DevKit Level 4. Activated when architecture is verified and constitution is synced. Delegates implementation to github/spec-kit (specify-cli) as the execution engine. DevKit provides event detection (RFC, Investigation, Product Blocker) that interrupts spec-kit workflow when invariants are touched. Triggers on phrases like "let's build", "implement", "start coding", "write the feature".
license: MIT
metadata:
  author: devkit
  version: "2.0"
  layer: "4-of-5"
  prev: arch-kit
  next: qa-kit
---

# SpecKit — Level 4: "Build it."

You are operating in SpecKit phase. Architecture is verified. Constitution is synced to `.specify/memory/constitution.md`. Now you build — using **github/spec-kit** as the implementation engine.

## Start

```bash
devkit status
```

Confirm you are in the spec phase. If not, check gate status of the previous phase.

## Prerequisites

Before any spec work, verify:

1. Constitution exists and is synced:
```bash
ls .specify/memory/constitution.md
```
If missing:
```bash
devkit generate-constitution
devkit sync
```

2. spec-kit is initialized:
```bash
ls .specify/scripts/
```
If missing:
```bash
specify init . --ai claude
```

## Your Role

- Delegate specification and implementation to spec-kit `/speckit.*` commands
- Monitor every developer message for escalation triggers
- STOP and escalate before proceeding when triggers are detected
- Never silently modify architecture within a spec

## spec-kit Workflow

Execute these commands in order. Each is a slash command provided by spec-kit:

### Step 1: Create Feature Specification
```
/speckit.specify <feature description>
```
Creates `.specify/specs/NNN-feature-name/spec.md` + git branch.
Focuses on WHAT and WHY, not HOW. Max 3 `[NEEDS CLARIFICATION]` markers.

### Step 2: Resolve Ambiguities
```
/speckit.clarify
```
Structured ambiguity scan across 11 categories. Asks up to 5 questions per session.
Updates spec.md with `## Clarifications` section.

### Step 3: Technical Implementation Plan
```
/speckit.plan <tech stack preferences>
```
Generates: `plan.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`.
Performs constitution compliance check automatically.

### Step 4: Task Breakdown
```
/speckit.tasks
```
Generates `tasks.md` with dependency ordering.
Tasks tagged `[P]` for parallelizable, `[USn]` mapped to user stories.

### Step 5: Cross-Artifact Consistency Analysis
```
/speckit.analyze
```
Read-only analysis: duplication, ambiguity, underspecification, constitution alignment, coverage gaps, inconsistency. Outputs severity-rated findings.

### Step 6: Quality Checklists
```
/speckit.checklist <domain>
```
"Unit tests for English" — validates that requirements themselves are complete, clear, consistent, and measurable. Domains: security, ux, api, etc.

### Step 7: Implement
```
/speckit.implement
```
Executes tasks phase-by-phase, marks completed in tasks.md, validates against spec.

### Bonus: Export to GitHub Issues
```
/speckit.taskstoissues
```

## Invariant Guard

Every spec must declare which invariants it touches:

```markdown
## Invariant Coverage
TECHNICAL: [I1, I3] from .devkit/arch/invariants.md
UX: [U2] from .devkit/product/ux_invariants.md
```

If implementation requires deviating from an invariant — STOP. Do not implement. Open RFC:

```bash
devkit impact "description of deviation"
devkit rfc "description"
```

## Event Detection — CRITICAL

Monitor every developer message. Before continuing spec work, check for triggers.

### RFC Trigger — New Requirement
Patterns: "we also need", "add support for", "client wants", "what about", "can we also"

Action:
> "This sounds like a new requirement. Let me check if it touches our invariants."

```bash
devkit impact "new requirement description"
devkit rfc "description"
```

Do NOT continue spec work until RFC is resolved.

### Investigation Trigger — Technical Blocker
Patterns: "bug in library", "this doesn't support", "benchmark shows", "unexpected behavior", "performance issue"

Action:
> "This breaks an architectural assumption. Opening Investigation."

```bash
devkit investigate "description of blocker"
```

Do NOT work around the blocker silently.

### Product Blocker Trigger — UX Problem
Patterns: "this is hard to use", "too many parameters", "confusing", "users won't get this"

Action:
> "This looks like a UX invariant issue."

Check `.devkit/product/ux_invariants.md`. If violated — escalate to ProductKit.

### No Trigger — Normal Work
When none of the above apply: proceed with spec-kit workflow.

**After creating or updating DevKit artifacts, always run:**
```bash
devkit validate
```

## Gate: When Can We Move to QAKit?

```bash
devkit gate
```

ALLOWED when:
- At least one spec-kit feature implemented (`.specify/specs/NNN-*/`)
- No open RFCs or Investigations

BLOCKED when:
- Open RFC or Investigation exists
- No features in `.specify/specs/`

## Handoff

When `devkit gate` shows ALLOWED:

```bash
devkit advance
devkit status
```

Then generate summary:
```
IMPLEMENTATION COMPLETE
SPECS: [list of .specify/specs/NNN-*/ directories]
INVARIANTS COVERED: [list from spec invariant coverage sections]
OPEN ITEMS: none / [list with owners]
READY FOR: QAKit
```
