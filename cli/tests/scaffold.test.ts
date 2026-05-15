import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { scaffoldDevkit } from '../src/scaffold.js';

const TEST_DIR = join(import.meta.dirname, '..', '.test-tmp-scaffold');

beforeEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
    mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
});

describe('scaffoldDevkit', () => {
    it('creates .devkit/ structure', () => {
        const result = scaffoldDevkit(TEST_DIR, 'greenfield');
        expect(result.mode).toBe('greenfield');
        expect(result.created.length).toBeGreaterThan(0);

        expect(existsSync(join(TEST_DIR, '.devkit'))).toBe(true);
        expect(existsSync(join(TEST_DIR, '.devkit', 'research'))).toBe(true);
        expect(existsSync(join(TEST_DIR, '.devkit', 'product'))).toBe(true);
        expect(existsSync(join(TEST_DIR, '.devkit', 'arch'))).toBe(true);
        expect(existsSync(join(TEST_DIR, '.devkit', 'arch', 'decisions'))).toBe(true);
        expect(existsSync(join(TEST_DIR, '.devkit', 'qa'))).toBe(true);
        expect(existsSync(join(TEST_DIR, '.devkit', 'qa', 'escalations'))).toBe(true);
        expect(existsSync(join(TEST_DIR, '.devkit', 'STATUS.md'))).toBe(true);
    });

    it('is idempotent — does not overwrite existing files on re-run', () => {
        const first = scaffoldDevkit(TEST_DIR, 'greenfield');
        const second = scaffoldDevkit(TEST_DIR, 'greenfield');

        expect(first.created.length).toBeGreaterThan(0);
        // Second run should create nothing (everything already exists)
        expect(second.created.length).toBe(0);
        // Everything should be skipped
        expect(second.skipped.length).toBeGreaterThan(0);
    });

    it('creates minimal .roomodes when DevKit template is not bundled', () => {
        // TEST_DIR does not have DevKit/ — resolveRoomodesSrc returns null
        const result = scaffoldDevkit(TEST_DIR, 'greenfield');

        expect(result.created).toContain('.roomodes (minimal)');
        expect(existsSync(join(TEST_DIR, '.roomodes'))).toBe(true);

        const content = readFileSync(join(TEST_DIR, '.roomodes'), 'utf-8');
        expect(content).toContain('customModes: []');
    });

    it('copies .roomodes from DevKit/ in cwd when available', () => {
        // Simulate repo-root layout: set up DevKit/.roomodes in TEST_DIR
        const devkitDir = join(TEST_DIR, 'DevKit');
        mkdirSync(devkitDir, { recursive: true });
        const customRoomodes = 'customModes:\n  - slug: test-mode\n    name: Test\n    roleDefinition: test\n    groups:\n      - read\n';
        writeFileSync(join(devkitDir, '.roomodes'), customRoomodes, 'utf-8');

        const result = scaffoldDevkit(TEST_DIR, 'greenfield');

        expect(result.created).toContain('.roomodes');
        expect(existsSync(join(TEST_DIR, '.roomodes'))).toBe(true);

        const content = readFileSync(join(TEST_DIR, '.roomodes'), 'utf-8');
        expect(content).toBe(customRoomodes);
    });

    it('overwrites .roomodes on re-run when template exists', () => {
        // First run with a simple template
        const devkitDir = join(TEST_DIR, 'DevKit');
        mkdirSync(devkitDir, { recursive: true });
        writeFileSync(join(devkitDir, '.roomodes'), 'customModes: []\n', 'utf-8');

        scaffoldDevkit(TEST_DIR, 'greenfield');

        // Update the template
        writeFileSync(join(devkitDir, '.roomodes'), 'customModes:\n  - slug: new-mode\n    name: New\n    roleDefinition: test\n    groups:\n      - read\n', 'utf-8');

        const result = scaffoldDevkit(TEST_DIR, 'greenfield');

        expect(result.created).toContain('.roomodes (updated)');

        const content = readFileSync(join(TEST_DIR, '.roomodes'), 'utf-8');
        expect(content).toContain('new-mode');
    });
});
