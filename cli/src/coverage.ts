import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export interface CoverageEntry {
    invariant: string;
    id: string;
    type: 'technical' | 'ux';
    coveredBy: string[];
    status: 'covered' | 'partial' | 'uncovered';
}

export interface CoverageResult {
    entries: CoverageEntry[];
    totalInvariants: number;
    covered: number;
    partial: number;
    uncovered: number;
    percentage: number;
}

function extractInvariants(content: string, type: 'technical' | 'ux'): { id: string; name: string; statement: string }[] {
    const results: { id: string; name: string; statement: string }[] = [];
    const prefix = type === 'technical' ? 'I' : 'U';
    const regex = new RegExp(`^## (${prefix}\\d+):\\s*(.+)`, 'gm');
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null) {
        const id = match[1]!;
        const name = match[2]!.trim();

        // Get statement
        const start = match.index;
        const rest = content.slice(start);
        const nextSection = rest.indexOf('\n## ', 3);
        const section = nextSection > 0 ? rest.slice(0, nextSection) : rest;
        const stmtMatch = section.match(/STATEMENT:\s*(.+)/);
        const statement = stmtMatch?.[1]?.trim() ?? name;

        results.push({ id, name, statement });
    }

    return results;
}

function findTestMentions(cwd: string, invariantId: string, invariantName: string): string[] {
    const mentions: string[] = [];

    // Check test_contracts.md
    const testContracts = join(cwd, '.devkit', 'qa', 'test_contracts.md');
    if (existsSync(testContracts)) {
        const content = readFileSync(testContracts, 'utf-8');
        if (content.includes(invariantId) || content.toLowerCase().includes(invariantName.toLowerCase())) {
            mentions.push('qa/test_contracts.md');
        }
    }

    // Check coverage_map.md
    const coverageMap = join(cwd, '.devkit', 'qa', 'coverage_map.md');
    if (existsSync(coverageMap)) {
        const content = readFileSync(coverageMap, 'utf-8');
        if (content.includes(invariantId) || content.toLowerCase().includes(invariantName.toLowerCase())) {
            mentions.push('qa/coverage_map.md');
        }
    }

    // Check assumption_checks.md
    const assumptionChecks = join(cwd, '.devkit', 'qa', 'assumption_checks.md');
    if (existsSync(assumptionChecks)) {
        const content = readFileSync(assumptionChecks, 'utf-8');
        if (content.includes(invariantId)) {
            mentions.push('qa/assumption_checks.md');
        }
    }

    // Search test files in project (common patterns) — recursive up to 3 levels
    const testDirs = ['tests', 'test', '__tests__', 'spec', 'cli/tests'];

    function collectTestFiles(dir: string, relPrefix: string, depth: number): void {
        if (depth > 3) return;
        try {
            const entries = readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = join(dir, entry.name);
                const relPath = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;

                if (entry.isDirectory()) {
                    collectTestFiles(fullPath, relPath, depth + 1);
                } else if (
                    entry.name.endsWith('.test.ts') || entry.name.endsWith('.test.js') ||
                    entry.name.endsWith('.spec.ts') || entry.name.endsWith('.spec.js')
                ) {
                    const content = readFileSync(fullPath, 'utf-8');
                    const keywords = invariantName.toLowerCase().split(/[\s\-_:]+/).filter(w => w.length > 3);
                    const hasId = content.includes(invariantId);
                    const hasKeywords = keywords.some(kw => content.toLowerCase().includes(kw));

                    if (hasId || hasKeywords) {
                        mentions.push(relPath);
                    }
                }
            }
        } catch {
            // Skip unreadable dirs
        }
    }

    for (const dir of testDirs) {
        const testDir = join(cwd, dir);
        if (!existsSync(testDir)) continue;
        collectTestFiles(testDir, dir, 0);
    }

    return [...new Set(mentions)]; // dedupe
}

export function analyzeCoverage(cwd: string): CoverageResult {
    const entries: CoverageEntry[] = [];

    // Technical invariants
    const invPath = join(cwd, '.devkit', 'arch', 'invariants.md');
    if (existsSync(invPath)) {
        const content = readFileSync(invPath, 'utf-8');
        const invariants = extractInvariants(content, 'technical');

        for (const inv of invariants) {
            const coveredBy = findTestMentions(cwd, inv.id, inv.name);
            entries.push({
                invariant: `${inv.id}: ${inv.name}`,
                id: inv.id,
                type: 'technical',
                coveredBy,
                status: coveredBy.length >= 2 ? 'covered' : coveredBy.length === 1 ? 'partial' : 'uncovered',
            });
        }
    }

    // UX invariants
    const uxPath = join(cwd, '.devkit', 'product', 'ux_invariants.md');
    if (existsSync(uxPath)) {
        const content = readFileSync(uxPath, 'utf-8');
        const invariants = extractInvariants(content, 'ux');

        for (const inv of invariants) {
            const coveredBy = findTestMentions(cwd, inv.id, inv.name);
            entries.push({
                invariant: `${inv.id}: ${inv.name}`,
                id: inv.id,
                type: 'ux',
                coveredBy,
                status: coveredBy.length >= 2 ? 'covered' : coveredBy.length === 1 ? 'partial' : 'uncovered',
            });
        }
    }

    const covered = entries.filter(e => e.status === 'covered').length;
    const partial = entries.filter(e => e.status === 'partial').length;
    const uncovered = entries.filter(e => e.status === 'uncovered').length;
    const total = entries.length;

    return {
        entries,
        totalInvariants: total,
        covered,
        partial,
        uncovered,
        percentage: total > 0 ? Math.round((covered / total) * 100) : 0,
    };
}

export function formatCoverage(result: CoverageResult): string {
    const lines: string[] = [];

    lines.push(`Coverage: ${result.covered}/${result.totalInvariants} invariants fully covered (${result.percentage}%)`);
    lines.push('');

    // Progress bar
    const barWidth = 30;
    const filledCount = Math.round((result.percentage / 100) * barWidth);
    const bar = '█'.repeat(filledCount) + '░'.repeat(barWidth - filledCount);
    lines.push(`  [${bar}] ${result.percentage}%`);
    lines.push('');

    // Group by type
    const technical = result.entries.filter(e => e.type === 'technical');
    const ux = result.entries.filter(e => e.type === 'ux');

    if (technical.length > 0) {
        lines.push('  Technical Invariants:');
        for (const e of technical) {
            const icon = e.status === 'covered' ? '✅' : e.status === 'partial' ? '🟡' : '❌';
            lines.push(`    ${icon} ${e.invariant}`);
            if (e.coveredBy.length > 0) {
                for (const by of e.coveredBy) {
                    lines.push(`       ↳ ${by}`);
                }
            }
        }
        lines.push('');
    }

    if (ux.length > 0) {
        lines.push('  UX Invariants:');
        for (const e of ux) {
            const icon = e.status === 'covered' ? '✅' : e.status === 'partial' ? '🟡' : '❌';
            lines.push(`    ${icon} ${e.invariant}`);
            if (e.coveredBy.length > 0) {
                for (const by of e.coveredBy) {
                    lines.push(`       ↳ ${by}`);
                }
            }
        }
        lines.push('');
    }

    if (result.uncovered > 0) {
        lines.push(`  ⚠️  ${result.uncovered} invariant(s) have NO test coverage.`);
        lines.push('     Add tests or reference invariant IDs in test_contracts.md');
        lines.push('');
    }

    return lines.join('\n');
}
