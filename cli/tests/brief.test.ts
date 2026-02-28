import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { generateBrief } from '../src/brief.js';

const TEST_DIR = join(import.meta.dirname, '..', '.test-tmp-brief');

function setupMinimalDevkit() {
    mkdirSync(join(TEST_DIR, '.devkit', 'arch', 'decisions'), { recursive: true });
    mkdirSync(join(TEST_DIR, '.devkit', 'product'), { recursive: true });
    mkdirSync(join(TEST_DIR, '.devkit', 'qa', 'escalations'), { recursive: true });
    mkdirSync(join(TEST_DIR, '.devkit', 'research'), { recursive: true });

    writeFileSync(join(TEST_DIR, '.devkit', 'STATUS.md'), `# DevKit Status

MODE: greenfield
INITIALIZED: 2026-02-28
CURRENT_PHASE: arch

## Phase Status
- [x] ResearchKit
- [x] ProductKit
- [/] ArchKit
- [ ] SpecKit
- [ ] QAKit
`);
}

beforeEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
});

afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
});

describe('generateBrief', () => {
    it('returns error when .devkit/ not found', () => {
        mkdirSync(TEST_DIR, { recursive: true });
        const result = generateBrief(TEST_DIR);
        expect(result.generated).toBe(false);
        expect(result.error).toContain('.devkit/ not found');
    });

    it('generates brief with minimal devkit (STATUS.md only)', () => {
        setupMinimalDevkit();
        const result = generateBrief(TEST_DIR);

        expect(result.generated).toBe(true);
        expect(result.content).toContain('# Project Brief');
        expect(result.content).toContain('ArchKit');
        expect(result.content).toContain('current');
        expect(result.stats.techInvariants).toBe(0);
        expect(result.stats.uxInvariants).toBe(0);
        expect(result.stats.openItems).toBe(0);
    });

    it('writes BRIEF.md to .devkit/', () => {
        setupMinimalDevkit();
        const result = generateBrief(TEST_DIR);

        expect(result.generated).toBe(true);
        const briefPath = join(TEST_DIR, '.devkit', 'BRIEF.md');
        expect(existsSync(briefPath)).toBe(true);

        const written = readFileSync(briefPath, 'utf-8');
        expect(written).toBe(result.content);
    });

    it('includes invariants as one-liners', () => {
        setupMinimalDevkit();

        writeFileSync(join(TEST_DIR, '.devkit', 'arch', 'invariants.md'), `# Technical Invariants

## I1: Zero external deps
STATEMENT: CLI works without external runtime dependencies
FAILURE_MODE: Installation fails in air-gapped environments

## I2: Idempotent init
STATEMENT: Running init multiple times produces same result
FAILURE_MODE: State corruption on re-init
`);

        writeFileSync(join(TEST_DIR, '.devkit', 'product', 'ux_invariants.md'), `# UX Invariants

## U1: Zero-config start
STATEMENT: Works without any configuration file
PRIORITY: must

## U2: Status at a glance
STATEMENT: Current state visible in one command
PRIORITY: must
`);

        const result = generateBrief(TEST_DIR);

        expect(result.generated).toBe(true);
        expect(result.stats.techInvariants).toBe(2);
        expect(result.stats.uxInvariants).toBe(2);
        expect(result.content).toContain('I1: CLI works without external runtime dependencies');
        expect(result.content).toContain('I2: Running init multiple times produces same result');
        expect(result.content).toContain('U1: Works without any configuration file');
        expect(result.content).toContain('U2: Current state visible in one command');
        // Should NOT contain full FAILURE_MODE / PRIORITY details
        expect(result.content).not.toContain('FAILURE_MODE');
        expect(result.content).not.toContain('PRIORITY');
    });

    it('shows only open items, not resolved ones', () => {
        setupMinimalDevkit();

        // Create open RFC
        writeFileSync(join(TEST_DIR, '.devkit', 'arch', 'decisions', 'RFC-001.md'), `# RFC-001: Add watch mode

DATE: 2026-02-28
STATUS: open
`);

        // Create accepted RFC (should NOT appear in open items)
        writeFileSync(join(TEST_DIR, '.devkit', 'arch', 'decisions', 'RFC-002.md'), `# RFC-002: Change error format

DATE: 2026-02-28
STATUS: accepted
CHOSEN: Option A
RATIONALE: Industry standard
`);

        // Create open investigation
        writeFileSync(join(TEST_DIR, '.devkit', 'arch', 'decisions', 'INV-001.md'), `# INV-001: SQLite performance

DATE: 2026-02-28
STATUS: open
`);

        const result = generateBrief(TEST_DIR);

        expect(result.generated).toBe(true);
        expect(result.stats.openItems).toBe(2); // RFC-001 + INV-001
        expect(result.content).toContain('RFC-001');
        expect(result.content).toContain('INV-001');

        // RFC-002 should appear in Recent Decisions, not Open Items
        expect(result.content).toContain('Recent Decisions');
        expect(result.content).toContain('RFC-002');
    });

    it('brief stays compact (under 150 lines)', () => {
        setupMinimalDevkit();

        // Add invariants
        writeFileSync(join(TEST_DIR, '.devkit', 'arch', 'invariants.md'), `# Technical Invariants
${Array.from({ length: 8 }, (_, i) => `\n## I${i + 1}: Invariant ${i + 1}\nSTATEMENT: Description of invariant ${i + 1}\n`).join('')}
`);

        writeFileSync(join(TEST_DIR, '.devkit', 'product', 'ux_invariants.md'), `# UX Invariants
${Array.from({ length: 6 }, (_, i) => `\n## U${i + 1}: UX Invariant ${i + 1}\nSTATEMENT: Description of UX invariant ${i + 1}\nPRIORITY: must\n`).join('')}
`);

        // Add RFCs and INVs
        for (let i = 1; i <= 3; i++) {
            writeFileSync(join(TEST_DIR, '.devkit', 'arch', 'decisions', `RFC-00${i}.md`),
                `# RFC-00${i}: Feature ${i}\n\nDATE: 2026-02-28\nSTATUS: open\n`);
        }

        const result = generateBrief(TEST_DIR);

        expect(result.generated).toBe(true);
        expect(result.stats.totalLines).toBeLessThan(150);
    });
});
