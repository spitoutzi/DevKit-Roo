import { existsSync, readdirSync } from 'node:fs';
import type { Phase } from './status.js';

// ──────────────────────── Phase Constants ────────────────────────
// Single source of truth for phase ordering and labels.
// Previously duplicated in status.ts, advance.ts, gate.ts, index.ts.

export const PHASE_ORDER: Phase[] = ['research', 'product', 'arch', 'spec', 'qa'];

export const PHASE_LABELS: Record<Phase | 'production', string> = {
    research: 'ResearchKit',
    product: 'ProductKit',
    arch: 'ArchKit',
    spec: 'SpecKit',
    qa: 'QAKit',
    production: 'Production',
};

// ──────────────────────── ID Generation ────────────────────────
// Shared ID generator using max-scan pattern.
// Previously duplicated in rfc.ts and investigate.ts.

export function getNextId(dir: string, prefix: string): string {
    if (!existsSync(dir)) return `${prefix}001`;

    const files = readdirSync(dir)
        .filter(f => f.startsWith(prefix) && f.endsWith('.md'));

    let maxNum = 0;
    for (const f of files) {
        const m = f.match(new RegExp(`${prefix}(\\d+)`));
        if (m) maxNum = Math.max(maxNum, parseInt(m[1]!, 10));
    }

    return `${prefix}${(maxNum + 1).toString().padStart(3, '0')}`;
}

// ──────────────────────── Keyword Extraction ────────────────────────
// Shared keyword extractor for impact analysis and investigations.
// Unified stop-word list — previously inconsistent across files.

const STOP_WORDS = new Set([
    'the', 'and', 'for', 'with', 'from', 'that', 'this', 'into',
    'add', 'new', 'use', 'bug', 'found', 'does', 'not', 'has',
    'was', 'are', 'but', 'can', 'all', 'will', 'our', 'any',
]);

export function extractKeywords(description: string): string[] {
    return description
        .toLowerCase()
        .split(/[\s,;]+/)
        .filter(w => w.length > 2)
        .filter(w => !STOP_WORDS.has(w));
}
