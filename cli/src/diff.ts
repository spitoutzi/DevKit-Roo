import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { analyzeCoverage } from './coverage.js';

export interface Snapshot {
    timestamp: string;
    phase: string;
    files: Record<string, string>; // relativePath → sha256
    invariantCount: number;
    uxInvariantCount: number;
    adrCount: number;
    rfcCount: number;
    invCount: number;
    escCount: number;
    coveragePercent: number;
}

export interface DiffResult {
    from: Snapshot;
    to: Snapshot;
    added: string[];
    removed: string[];
    modified: string[];
    stats: {
        invariantsDelta: number;
        uxInvariantsDelta: number;
        adrDelta: number;
        rfcDelta: number;
        invDelta: number;
        escDelta: number;
        coverageDelta: number;
    };
}

function hashFile(path: string): string {
    const content = readFileSync(path, 'utf-8');
    return createHash('sha256').update(content).digest('hex').slice(0, 12);
}

function walkDir(dir: string, base: string): Record<string, string> {
    const result: Record<string, string> = {};
    if (!existsSync(dir)) return result;

    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
            Object.assign(result, walkDir(fullPath, base));
        } else if (entry.name.endsWith('.md')) {
            const rel = relative(base, fullPath);
            result[rel] = hashFile(fullPath);
        }
    }
    return result;
}

function countSections(filePath: string, prefix: string): number {
    if (!existsSync(filePath)) return 0;
    const content = readFileSync(filePath, 'utf-8');
    const regex = new RegExp(`^## ${prefix}\\d+:`, 'gm');
    return (content.match(regex) || []).length;
}

function countFiles(dir: string, prefix: string): number {
    if (!existsSync(dir)) return 0;
    return readdirSync(dir).filter(f => f.startsWith(prefix) && f.endsWith('.md')).length;
}

export function takeSnapshot(cwd: string): Snapshot {
    const devkitDir = join(cwd, '.devkit');
    const statusPath = join(devkitDir, 'STATUS.md');

    let phase = 'unknown';
    if (existsSync(statusPath)) {
        const content = readFileSync(statusPath, 'utf-8');
        const match = content.match(/^CURRENT_PHASE:\s*(.+)/m);
        if (match) phase = match[1]!.trim();
    }

    const files = walkDir(devkitDir, devkitDir);
    const coverage = analyzeCoverage(cwd);

    return {
        timestamp: new Date().toISOString(),
        phase,
        files,
        invariantCount: countSections(join(devkitDir, 'arch', 'invariants.md'), 'I'),
        uxInvariantCount: countSections(join(devkitDir, 'product', 'ux_invariants.md'), 'U'),
        adrCount: countFiles(join(devkitDir, 'arch', 'decisions'), 'ADR-'),
        rfcCount: countFiles(join(devkitDir, 'arch', 'decisions'), 'RFC-'),
        invCount: countFiles(join(devkitDir, 'arch', 'decisions'), 'INV-'),
        escCount: countFiles(join(devkitDir, 'qa', 'escalations'), 'ESC-'),
        coveragePercent: coverage.percentage,
    };
}

export function saveSnapshot(cwd: string, snapshot: Snapshot): string {
    const dir = join(cwd, '.devkit', '.snapshots');
    mkdirSync(dir, { recursive: true });

    const id = snapshot.timestamp.replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
    const fileName = `${id}_${snapshot.phase}.json`;
    const filePath = join(dir, fileName);

    writeFileSync(filePath, JSON.stringify(snapshot, null, 2));
    return fileName;
}

export function listSnapshots(cwd: string): string[] {
    const dir = join(cwd, '.devkit', '.snapshots');
    if (!existsSync(dir)) return [];
    return readdirSync(dir).filter(f => f.endsWith('.json')).sort();
}

export function loadSnapshot(cwd: string, fileName: string): Snapshot {
    // Validate filename: only safe characters allowed, must end with .json
    if (!/^[A-Za-z0-9_\-]+\.json$/.test(fileName)) {
        throw new Error(`Invalid snapshot filename "${fileName}": only alphanumeric, hyphens, and underscores are allowed.`);
    }

    const dir = join(cwd, '.devkit', '.snapshots');
    const filePath = join(dir, fileName);

    // Defense-in-depth: verify resolved path stays within snapshots directory
    const resolvedDir = resolve(dir);
    const resolvedPath = resolve(filePath);
    if (!resolvedPath.startsWith(resolvedDir + '/')) {
        throw new Error(`Invalid snapshot filename "${fileName}": path traversal detected.`);
    }

    let raw: string;
    try {
        raw = readFileSync(filePath, 'utf-8');
    } catch (err) {
        throw new Error(`Cannot read snapshot "${fileName}": ${err instanceof Error ? err.message : String(err)}`);
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch (err) {
        throw new Error(`Snapshot "${fileName}" contains invalid JSON: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Validate required Snapshot fields
    if (
        typeof parsed !== 'object' || parsed === null ||
        typeof (parsed as Record<string, unknown>).timestamp !== 'string' ||
        typeof (parsed as Record<string, unknown>).phase !== 'string' ||
        typeof (parsed as Record<string, unknown>).files !== 'object' ||
        (parsed as Record<string, unknown>).files === null
    ) {
        throw new Error(`Snapshot "${fileName}" has invalid structure: missing required fields (timestamp, phase, files).`);
    }

    return parsed as Snapshot;
}

export function diffSnapshots(from: Snapshot, to: Snapshot): DiffResult {
    const added = Object.keys(to.files).filter(f => !(f in from.files));
    const removed = Object.keys(from.files).filter(f => !(f in to.files));
    const modified = Object.keys(to.files).filter(f =>
        f in from.files && from.files[f] !== to.files[f]
    );

    return {
        from,
        to,
        added,
        removed,
        modified,
        stats: {
            invariantsDelta: to.invariantCount - from.invariantCount,
            uxInvariantsDelta: to.uxInvariantCount - from.uxInvariantCount,
            adrDelta: to.adrCount - from.adrCount,
            rfcDelta: to.rfcCount - from.rfcCount,
            invDelta: to.invCount - from.invCount,
            escDelta: to.escCount - from.escCount,
            coverageDelta: to.coveragePercent - from.coveragePercent,
        },
    };
}

function delta(n: number): string {
    if (n > 0) return `+${n}`;
    if (n < 0) return `${n}`;
    return '=';
}

export function formatDiff(result: DiffResult): string {
    const lines: string[] = [];
    const s = result.stats;

    lines.push(`  From: ${result.from.phase} (${result.from.timestamp.split('T')[0]})`);
    lines.push(`  To:   ${result.to.phase} (${result.to.timestamp.split('T')[0]})`);
    lines.push('');

    // File changes
    const totalChanges = result.added.length + result.removed.length + result.modified.length;
    if (totalChanges === 0) {
        lines.push('  No file changes detected.');
    } else {
        lines.push(`  Files: ${totalChanges} change(s)`);
        for (const f of result.added) {
            lines.push(`    ➕ ${f}`);
        }
        for (const f of result.modified) {
            lines.push(`    ✏️  ${f}`);
        }
        for (const f of result.removed) {
            lines.push(`    ➖ ${f}`);
        }
    }
    lines.push('');

    // Stats delta
    lines.push('  Stats:');

    const rows = [
        ['Technical invariants', s.invariantsDelta],
        ['UX invariants', s.uxInvariantsDelta],
        ['ADR decisions', s.adrDelta],
        ['RFCs', s.rfcDelta],
        ['Investigations', s.invDelta],
        ['Escalations', s.escDelta],
        ['Coverage', s.coverageDelta],
    ] as const;

    for (const [label, val] of rows) {
        const d = delta(val as number);
        const icon = (val as number) > 0 ? '📈' : (val as number) < 0 ? '📉' : '➖';
        const suffix = label === 'Coverage' ? '%' : '';
        lines.push(`    ${icon} ${label}: ${d}${suffix}`);
    }

    lines.push('');
    return lines.join('\n');
}
