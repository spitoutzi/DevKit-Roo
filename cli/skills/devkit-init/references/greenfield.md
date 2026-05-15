# Greenfield Mode

Fresh project. No code, no .devkit/, no .specify/.

## What to Do

1. Run `devkit init` — creates:
   - `.devkit/` — структура артефактов (research, product, arch, qa)
   - `.roomodes` — 3 кастомных режима Roo Code (devkit-coder, devkit-research, devkit-architect)
   - `.roo/commands/` — слэш-команды для всех уровней методологии
   - `.agent/skills/` — Agent Skills
   - `.roo/mcp.json` — MCP-серверы (memory, context7)
   - `.roo/rules-devkit-coder/rules.md` — правила режима
2. (Опционально) Установить spec-kit: `specify init . --integration roo`
3. Tell developer to start with ResearchKit

## Starting Message to Developer

```
DevKit initialized for a new project.

Your development cycle:
  /research-kit  → explore feasibility and unknowns
  /product-kit   → define users and UX invariants  
  /arch-kit      → verify architecture
  /spec-kit      → implement (via spec-kit workflow)
  /qa-kit        → verify against all decisions

Start with /research-kit — describe your idea.
```

## Files to Create

Create `.devkit/STATUS.md`:

```markdown
# DevKit Status

MODE: greenfield
INITIALIZED: [date]
CURRENT_PHASE: research
SPEC_KIT: initialized

## Phase Status
- [ ] ResearchKit
- [ ] ProductKit  
- [ ] ArchKit
- [ ] SpecKit
- [ ] QAKit
```
