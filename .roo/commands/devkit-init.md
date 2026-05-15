---
name: devkit-init
description: Initialize DevKit in any project. Use when developer wants to start using DevKit methodology — whether starting fresh, adding to an existing project with code, or upgrading from spec-kit alone. Triggers on phrases like "init devkit", "setup devkit", "start devkit", "add devkit to project", "initialize devkit".
license: MIT
metadata:
  author: devkit
  version: "1.1"
---

# DevKit Init

Initialize DevKit for any project state. Detect what exists, choose the right mode, set up what's needed.

## Step 1: Run CLI Init

Run the CLI command — it auto-detects project state and creates the structure:

```bash
devkit init
```

This will:
- Detect project state (greenfield / brownfield / upgrade / already initialized)
- Create `.devkit/` directory structure
- Generate `STATUS.md` with correct mode and phase
- Report what was created vs skipped

If `.devkit/` already exists, it safely skips (idempotent).

## Step 2: Verify State

```bash
devkit status
```

Review the output: mode, current phase, progress. This confirms init worked correctly.

## Step 3: Install spec-kit if not present (optional)

Check if `specify` CLI is available:

```bash
specify --version
```

If not found, inform the developer (do not block init):
```
Note: spec-kit not found. DevKit works independently.
If you want SpecKit integration, install with:
  uv tool install specify-cli --from git+https://github.com/github/spec-kit.git
Then run: specify init . --ai claude
```

Important: spec-kit installation is optional. DevKit init must succeed regardless of spec-kit availability.

## Step 4: Mode-Specific Setup

For **brownfield** mode, also follow [brownfield.md](references/brownfield.md) to reconstruct invariants from existing code.

For **upgrade** mode, follow [upgrade.md](references/upgrade.md) to extract artifacts from existing constitution.

For **greenfield**, no extra setup needed.

## Step 5: Confirm and Show Next Step

```bash
devkit status
```

Tell developer what to do next based on detected mode:

- Greenfield: "Start with: /research-kit — describe your idea"
- Brownfield: "Review .devkit/arch/invariants.md, then /arch-kit to fill gaps"
- Upgrade: "Review .devkit/arch/invariants.md extracted from constitution"
