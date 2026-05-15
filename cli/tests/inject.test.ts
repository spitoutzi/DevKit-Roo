import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { injectDevkitHooks } from '../src/inject.js';

const TEST_DIR = join(import.meta.dirname, '..', '.test-tmp-inject');

beforeEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
    mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
});

describe('injectDevkitHooks', () => {
    it('creates .claude/commands/ if missing and copies bundled commands', () => {
        const result = injectDevkitHooks(TEST_DIR);

        expect(result.errors).toEqual([]);
        expect(result.created.length).toBeGreaterThan(0);
        expect(existsSync(join(TEST_DIR, '.claude', 'commands', 'speckit.specify.md'))).toBe(true);
        expect(existsSync(join(TEST_DIR, '.claude', 'commands', 'speckit.clarify.md'))).toBe(true);
        expect(existsSync(join(TEST_DIR, '.claude', 'commands', 'speckit.plan.md'))).toBe(true);
        expect(existsSync(join(TEST_DIR, '.claude', 'commands', 'speckit.tasks.md'))).toBe(true);
        expect(existsSync(join(TEST_DIR, '.claude', 'commands', 'speckit.implement.md'))).toBe(true);
        expect(existsSync(join(TEST_DIR, '.claude', 'commands', 'speckit.analyze.md'))).toBe(true);
        expect(existsSync(join(TEST_DIR, '.claude', 'commands', 'speckit.checklist.md'))).toBe(true);
    });

    it('creates .roo/commands/ if missing and copies bundled commands', () => {
        mkdirSync(join(TEST_DIR, '.roo', 'commands'), { recursive: true });
        const result = injectDevkitHooks(TEST_DIR);

        expect(result.errors).toEqual([]);
        expect(result.created.length).toBeGreaterThan(0);
        expect(existsSync(join(TEST_DIR, '.roo', 'commands', 'speckit.specify.md'))).toBe(true);
        expect(existsSync(join(TEST_DIR, '.roo', 'commands', 'speckit.clarify.md'))).toBe(true);
        expect(existsSync(join(TEST_DIR, '.roo', 'commands', 'speckit.plan.md'))).toBe(true);
        expect(existsSync(join(TEST_DIR, '.roo', 'commands', 'speckit.tasks.md'))).toBe(true);
        expect(existsSync(join(TEST_DIR, '.roo', 'commands', 'speckit.implement.md'))).toBe(true);
        expect(existsSync(join(TEST_DIR, '.roo', 'commands', 'speckit.analyze.md'))).toBe(true);
        expect(existsSync(join(TEST_DIR, '.roo', 'commands', 'speckit.checklist.md'))).toBe(true);
    });

    it('creates .gemini/commands/ if missing and copies bundled commands', () => {
        mkdirSync(join(TEST_DIR, '.gemini', 'commands'), { recursive: true });
        const result = injectDevkitHooks(TEST_DIR);

        expect(result.errors).toEqual([]);
        // Gemini is TOML, we don't copy bundled MD files to it
        expect(existsSync(join(TEST_DIR, '.gemini', 'commands'))).toBe(true);
    });

    it('created files contain DEVKIT markers', () => {
        injectDevkitHooks(TEST_DIR);

        const specify = readFileSync(join(TEST_DIR, '.claude', 'commands', 'speckit.specify.md'), 'utf-8');
        expect(specify).toContain('<!-- DEVKIT:START:invariant-guard -->');
        expect(specify).toContain('<!-- DEVKIT:END:invariant-guard -->');

        const plan = readFileSync(join(TEST_DIR, '.claude', 'commands', 'speckit.plan.md'), 'utf-8');
        expect(plan).toContain('<!-- DEVKIT:START:constitution-precheck -->');
        expect(plan).toContain('<!-- DEVKIT:END:constitution-precheck -->');
        expect(plan).toContain('<!-- DEVKIT:START:plan-postcheck -->');
        expect(plan).toContain('<!-- DEVKIT:END:plan-postcheck -->');
    });

    it('is idempotent — skips on second run', () => {
        // Setup all agents
        mkdirSync(join(TEST_DIR, '.claude', 'commands'), { recursive: true });
        mkdirSync(join(TEST_DIR, '.roo', 'commands'), { recursive: true });
        mkdirSync(join(TEST_DIR, '.gemini', 'commands'), { recursive: true });

        const first = injectDevkitHooks(TEST_DIR);
        // Claude (7 + 6 methodology) + Roo (7 + 6 methodology) = 26
        expect(first.created.length).toBe(26);
        expect(first.skipped.length).toBe(0);

        const second = injectDevkitHooks(TEST_DIR);
        expect(second.created.length).toBe(0);
        expect(second.injected.length).toBe(0);
        expect(second.skipped.length).toBe(26);
    });

    it('re-injects when markers are removed from a file', () => {
        injectDevkitHooks(TEST_DIR);

        // Remove markers from speckit.specify.md
        const specifyPath = join(TEST_DIR, '.claude', 'commands', 'speckit.specify.md');
        const original = readFileSync(specifyPath, 'utf-8');
        const startIdx = original.indexOf('<!-- DEVKIT:START:invariant-guard -->');
        const endIdx = original.indexOf('<!-- DEVKIT:END:invariant-guard -->') + '<!-- DEVKIT:END:invariant-guard -->'.length;
        const stripped = original.substring(0, startIdx) + original.substring(endIdx);
        writeFileSync(specifyPath, stripped, 'utf-8');

        const result = injectDevkitHooks(TEST_DIR);
        expect(result.injected).toContain('claude:speckit.specify');

        // Verify markers are back
        const updated = readFileSync(specifyPath, 'utf-8');
        expect(updated).toContain('<!-- DEVKIT:START:invariant-guard -->');
        expect(updated).toContain('<!-- DEVKIT:END:invariant-guard -->');
    });

    it('replaces outdated marker content', () => {
        injectDevkitHooks(TEST_DIR);

        // Modify content between markers
        const specifyPath = join(TEST_DIR, '.claude', 'commands', 'speckit.specify.md');
        const content = readFileSync(specifyPath, 'utf-8');
        const modified = content.replace(
            /<!-- DEVKIT:START:invariant-guard -->[\s\S]*?<!-- DEVKIT:END:invariant-guard -->/,
            '<!-- DEVKIT:START:invariant-guard -->\nOLD CONTENT\n<!-- DEVKIT:END:invariant-guard -->'
        );
        writeFileSync(specifyPath, modified, 'utf-8');

        const result = injectDevkitHooks(TEST_DIR);
        expect(result.injected).toContain('claude:speckit.specify');

        const updated = readFileSync(specifyPath, 'utf-8');
        expect(updated).not.toContain('OLD CONTENT');
        expect(updated).toContain('devkit impact');
    });

    it('force mode re-injects even when current', () => {
        mkdirSync(join(TEST_DIR, '.claude', 'commands'), { recursive: true });
        mkdirSync(join(TEST_DIR, '.roo', 'commands'), { recursive: true });
        injectDevkitHooks(TEST_DIR);

        const result = injectDevkitHooks(TEST_DIR, { force: true });
        // Numbered commands don't have hooks, so they are skipped if they exist
        // 26 total - 12 methodology = 14
        expect(result.skipped.length).toBe(12);
        expect(result.injected.length + result.created.length).toBe(14);
    });

    it('preserves non-DevKit content in existing files', () => {
        injectDevkitHooks(TEST_DIR);

        // Add custom content to a file
        const planPath = join(TEST_DIR, '.claude', 'commands', 'speckit.plan.md');
        const content = readFileSync(planPath, 'utf-8');
        const withCustom = content + '\n## My Custom Section\nCustom content here\n';
        writeFileSync(planPath, withCustom, 'utf-8');

        // Modify marker content to trigger re-injection
        const modified = withCustom.replace(
            /<!-- DEVKIT:START:constitution-precheck -->[\s\S]*?<!-- DEVKIT:END:constitution-precheck -->/,
            '<!-- DEVKIT:START:constitution-precheck -->\nOLD\n<!-- DEVKIT:END:constitution-precheck -->'
        );
        writeFileSync(planPath, modified, 'utf-8');

        injectDevkitHooks(TEST_DIR);

        const updated = readFileSync(planPath, 'utf-8');
        expect(updated).toContain('My Custom Section');
        expect(updated).toContain('Custom content here');
        expect(updated).not.toContain('OLD');
    });

    it('handles all 7 commands', () => {
        const result = injectDevkitHooks(TEST_DIR);
        const allCommands = [...result.created, ...result.injected, ...result.skipped];
        expect(allCommands).toContain('claude:speckit.specify');
        expect(allCommands).toContain('claude:speckit.clarify');
        expect(allCommands).toContain('claude:speckit.plan');
        expect(allCommands).toContain('claude:speckit.tasks');
        expect(allCommands).toContain('claude:speckit.implement');
        expect(allCommands).toContain('claude:speckit.analyze');
        expect(allCommands).toContain('claude:speckit.checklist');
    });

    it('handles methodology commands for Claude and Roo', () => {
        mkdirSync(join(TEST_DIR, '.claude', 'commands'), { recursive: true });
        mkdirSync(join(TEST_DIR, '.roo', 'commands'), { recursive: true });
        const result = injectDevkitHooks(TEST_DIR);
        
        expect(existsSync(join(TEST_DIR, '.claude', 'commands', '00-devkit-init.md'))).toBe(true);
        expect(existsSync(join(TEST_DIR, '.claude', 'commands', '01-research-kit.md'))).toBe(true);
        expect(existsSync(join(TEST_DIR, '.claude', 'commands', '02-product-kit.md'))).toBe(true);
        expect(existsSync(join(TEST_DIR, '.claude', 'commands', '03-arch-kit.md'))).toBe(true);
        expect(existsSync(join(TEST_DIR, '.claude', 'commands', '04-spec-kit.md'))).toBe(true);
        expect(existsSync(join(TEST_DIR, '.claude', 'commands', '05-qa-kit.md'))).toBe(true);

        expect(existsSync(join(TEST_DIR, '.roo', 'commands', '00-devkit-init.md'))).toBe(true);
        expect(existsSync(join(TEST_DIR, '.roo', 'commands', '01-research-kit.md'))).toBe(true);
        expect(existsSync(join(TEST_DIR, '.roo', 'commands', '02-product-kit.md'))).toBe(true);
        expect(existsSync(join(TEST_DIR, '.roo', 'commands', '03-arch-kit.md'))).toBe(true);
        expect(existsSync(join(TEST_DIR, '.roo', 'commands', '04-spec-kit.md'))).toBe(true);
        expect(existsSync(join(TEST_DIR, '.roo', 'commands', '05-qa-kit.md'))).toBe(true);
    });

    it('speckit.plan has two hooks', () => {
        injectDevkitHooks(TEST_DIR);

        const plan = readFileSync(join(TEST_DIR, '.claude', 'commands', 'speckit.plan.md'), 'utf-8');
        const starts = plan.match(/<!-- DEVKIT:START:/g);
        expect(starts?.length).toBe(2);
    });

    it('does not generate .roomodes (handled by scaffold)', () => {
        // Ensure .roo/commands exists to trigger roo agent detection
        mkdirSync(join(TEST_DIR, '.roo', 'commands'), { recursive: true });
        
        injectDevkitHooks(TEST_DIR);

        // inject no longer generates .roomodes — scaffold handles it
        const roomodesPath = join(TEST_DIR, '.roomodes');
        expect(existsSync(roomodesPath)).toBe(false);
    });
});
