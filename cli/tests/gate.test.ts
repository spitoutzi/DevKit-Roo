import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { checkGate } from '../src/gate.js';

const TEST_DIR = join(import.meta.dirname, '..', '.test-tmp-gate');

beforeEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
    mkdirSync(join(TEST_DIR, '.devkit', 'research'), { recursive: true });
    mkdirSync(join(TEST_DIR, '.devkit', 'product'), { recursive: true });
    mkdirSync(join(TEST_DIR, '.devkit', 'arch', 'decisions'), { recursive: true });
    mkdirSync(join(TEST_DIR, '.devkit', 'qa', 'escalations'), { recursive: true });
});

afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
});

describe('checkGate', () => {
    it('blocks research gate when market.md missing', () => {
        // Only feasibility exists
        writeFileSync(join(TEST_DIR, '.devkit', 'research', 'feasibility.md'),
            '# Feasibility\n\nFEASIBLE: yes\n');
        writeFileSync(join(TEST_DIR, '.devkit', 'research', 'assumptions.md'), '# Assumptions\n');

        const result = checkGate(TEST_DIR, 'research');
        expect(result.allowed).toBe(false);
    });

    it('allows research gate when all conditions met', () => {
        writeFileSync(join(TEST_DIR, '.devkit', 'research', 'market.md'), '# Market\n');
        writeFileSync(join(TEST_DIR, '.devkit', 'research', 'feasibility.md'),
            '# Feasibility\n\nFEASIBLE: yes\n');
        writeFileSync(join(TEST_DIR, '.devkit', 'research', 'unknowns.md'),
            '# Unknowns\n\n## Unknown: X\nBLOCKER: no\nSTATUS: open\n');
        writeFileSync(join(TEST_DIR, '.devkit', 'research', 'assumptions.md'), '# Assumptions\n');

        const result = checkGate(TEST_DIR, 'research');
        expect(result.allowed).toBe(true);
        expect(result.nextPhase).toBe('product');
    });

    it('blocks research gate when open blocker exists', () => {
        writeFileSync(join(TEST_DIR, '.devkit', 'research', 'market.md'), '# Market\n');
        writeFileSync(join(TEST_DIR, '.devkit', 'research', 'feasibility.md'),
            '# Feasibility\n\nFEASIBLE: yes\n');
        writeFileSync(join(TEST_DIR, '.devkit', 'research', 'unknowns.md'),
            '# Unknowns\n\n## Unknown: Critical\nBLOCKER: yes\nSTATUS: open\n');
        writeFileSync(join(TEST_DIR, '.devkit', 'research', 'assumptions.md'), '# Assumptions\n');

        const result = checkGate(TEST_DIR, 'research');
        expect(result.allowed).toBe(false);
        expect(result.conditions.some(c => !c.satisfied && c.description.includes('BLOCKER'))).toBe(true);
    });

    it('blocks product gate when users.md missing', () => {
        const result = checkGate(TEST_DIR, 'product');
        expect(result.allowed).toBe(false);
    });

    it('allows product gate when all conditions met', () => {
        writeFileSync(join(TEST_DIR, '.devkit', 'product', 'users.md'),
            '# Users\n\n## Primary User\nHAPPY_PATH: do the thing\n');
        writeFileSync(join(TEST_DIR, '.devkit', 'product', 'ux_invariants.md'),
            '# UX Invariants\n\n## U1: Zero config\nSTATEMENT: works\n');
        writeFileSync(join(TEST_DIR, '.devkit', 'product', 'roadmap.md'),
            '# Roadmap\n\n## MVP\nGOAL: something\n\n## Never (anti-scope)\nNot this\n');

        const result = checkGate(TEST_DIR, 'product');
        expect(result.allowed).toBe(true);
        expect(result.nextPhase).toBe('arch');
    });

    it('blocks arch gate when spec-kit not initialized', () => {
        // Constitution exists but no .specify/scripts/
        writeFileSync(join(TEST_DIR, '.devkit', 'arch', 'invariants.md'),
            '# Technical Invariants\n\n## I1: Test\nSTATEMENT: test\nSTATUS: verified\n');
        writeFileSync(join(TEST_DIR, '.devkit', 'arch', 'constitution.md'), '# Constitution\n');

        const result = checkGate(TEST_DIR, 'arch');
        expect(result.allowed).toBe(false);
        expect(result.conditions.some(c => !c.satisfied && c.description.includes('spec-kit initialized'))).toBe(true);
    });

    it('allows arch gate when all conditions met', () => {
        writeFileSync(join(TEST_DIR, '.devkit', 'arch', 'invariants.md'),
            '# Technical Invariants\n\n## I1: Test\nSTATEMENT: test\nSTATUS: verified\n');
        writeFileSync(join(TEST_DIR, '.devkit', 'arch', 'constitution.md'), '# Constitution\n');
        // spec-kit initialized
        mkdirSync(join(TEST_DIR, '.specify', 'scripts'), { recursive: true });
        // Constitution synced
        mkdirSync(join(TEST_DIR, '.specify', 'memory'), { recursive: true });
        writeFileSync(join(TEST_DIR, '.specify', 'memory', 'constitution.md'), '# Constitution\n');

        const result = checkGate(TEST_DIR, 'arch');
        expect(result.allowed).toBe(true);
        expect(result.nextPhase).toBe('spec');
    });
});
