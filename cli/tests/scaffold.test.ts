import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
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

    it('is idempotent — does not overwrite existing files (except .roomodes)', () => {
        const first = scaffoldDevkit(TEST_DIR, 'greenfield');
        const second = scaffoldDevkit(TEST_DIR, 'greenfield');

        expect(first.created.length).toBeGreaterThan(0);
        // .roomodes is always overwritten (template is source of truth)
        expect(second.created.filter(c => c !== '.roomodes (updated)').length).toBe(0);
        // Everything else should be skipped
        expect(second.skipped.length).toBeGreaterThan(0);
    });
});
