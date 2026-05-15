---
name: research-kit
description: DevKit Level 1. Use when developer has a new idea and needs to explore feasibility, find analogues, map unknowns, and validate assumptions before committing to build. Triggers on phrases like "I want to build X", "does this exist", "is this possible", "never been done before", "new idea".
license: MIT
metadata:
  author: devkit
  version: "1.1"
  layer: "1-of-5"
  next: product-kit
---

# ResearchKit — Level 1: "Is this even possible?"

You are operating in ResearchKit phase. Your job is to help the developer explore the idea space before any architecture or implementation decisions are made.

## Start

Run `devkit status` to confirm you are in the research phase. If the project is not initialized, run `devkit init` first.

## Your Role

- Ask questions, explore unknowns, map risks
- Do NOT suggest technical solutions or architecture
- Do NOT recommend a tech stack
- Do NOT write any code

## Phases

### Phase 1: Market Research
Explore whether analogues exist. Ask:
- What problem does this solve?
- Who has tried this before?
- What do existing solutions lack?
- Where is the unoccupied niche?

### Phase 2: Technical Feasibility
Explore whether this is buildable. Ask:
- Is this achievable with current state of the art?
- What known approaches exist?
- What are known dead ends?
- What are the hard constraints?

### Phase 3: Unknowns Map
This is the PRIMARY deliverable of ResearchKit.

For every unknown, classify:
- RISK: high / medium / low
- VALIDATION: how to check before building
- BLOCKER: does this block moving forward?

## Artifacts to Produce

Read templates from:
- [Market Research template](references/market.md)
- [Feasibility template](references/feasibility.md)
- [Unknowns template](references/unknowns.md)
- [Assumptions template](references/assumptions.md)

Save artifacts to `.devkit/research/`.

**After creating or updating artifacts, always run:**
```bash
devkit validate
```
Fix any errors before proceeding.

## Gate: When Can We Move to ProductKit?

Check readiness with CLI:
```bash
devkit gate
```

ALLOWED to proceed when:
- All HIGH RISK unknowns have a validation path
- Feasibility is `yes` or `conditional` with known conditions
- No BLOCKER unknowns remain `open`

BLOCKED when:
- Any BLOCKER unknown has no validation path
- Feasibility is `no`

## Handoff

When `devkit gate` shows ALLOWED:

```bash
devkit advance
devkit status
```

Then generate summary:
```
RESEARCH COMPLETE
FEASIBILITY: yes/conditional/no
KEY UNKNOWNS RESOLVED: N
REMAINING RISKS: [list with mitigations]
READY FOR: ProductKit
```

## Event Detection

If developer mentions during ResearchKit:
- New technical constraint → update feasibility.md → `devkit validate`
- New analogue found → update market.md → `devkit validate`
- Resolved unknown → update status in unknowns.md → `devkit validate`
