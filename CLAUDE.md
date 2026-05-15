# DevKit — Project Instructions

This is the DevKit CLI project: a 5-level AI development methodology tool.

## Available Slash Commands

| Command | Level | Purpose |
|---------|-------|---------|
| `/devkit-init` | Setup | Initialize DevKit in any project |
| `/research-kit` | 1 | Explore feasibility, find analogues, map unknowns |
| `/product-kit` | 2 | Define users, UX invariants, roadmap |
| `/arch-kit` | 3 | Architecture variants, technical invariants, constitution |
| `/spec-kit` | 4 | Specifications and implementation |
| `/qa-kit` | 5 | Test contracts, coverage, escalations |

## CLI Commands

The `devkit` CLI is the primary tool. Key commands:

```
devkit init              # Initialize .devkit/ structure
devkit status            # Show current phase and progress
devkit validate          # Check artifacts against schemas
devkit gate              # Check if current phase can advance
devkit advance           # Move to next phase
devkit rfc "desc"        # Create RFC (architecture change)
devkit investigate "desc" # Create Investigation (tech blocker)
devkit escalate "desc"   # Create Escalation (QA finding)
devkit impact "desc"     # Analyze impact of a change
devkit generate-constitution  # Generate constitution.md
devkit sync              # Sync constitution to .specify/
devkit coverage          # Check invariant test coverage
devkit snapshot          # Take .devkit/ state snapshot
devkit diff              # Diff against last snapshot
devkit dashboard         # Open web dashboard
devkit inject            # Inject DevKit hooks into speckit commands
devkit brief             # Generate .devkit/BRIEF.md for AI agents
devkit watch             # Watch for changes and auto-validate
```

## Project Structure

- `cli/` — CLI source code (TypeScript, ESM)
- `cli/skills/` — Bundled skill definitions (copied on `devkit init`)
- `{ResearchKit,ProductKit,ArchKit,SpecKit,QAKit}/` — Kit source directories
- `devkit-init/` — Init skill source
- `.devkit/` — Self-bootstrapped DevKit artifacts for this project

## Development

```bash
cd cli && npm run build   # Build
npm test                  # Run tests (vitest, 81 tests)
```

## Key Conventions

- ESM only (`"type": "module"`) — no `require()`
- ID generation uses max-scan pattern (never sort-last)
- Gate checks use try/catch with safe-fail defaults
- `hasCodeFiles` has MAX_SCAN_DEPTH=5 to prevent stack overflow
- All invariants (8 technical + 6 UX) are at 100% coverage
