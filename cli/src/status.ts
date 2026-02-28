import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PHASE_ORDER, PHASE_LABELS } from './utils.js';

export type Phase = 'research' | 'product' | 'arch' | 'spec' | 'qa';
export type PhaseStatus = 'pending' | 'in_progress' | 'done';

const PHASE_NEXT_STEP: Record<Phase, string> = {
    research: 'Define your idea. Run /research-kit or create artifacts in .devkit/research/',
    product: 'Define users and UX invariants. Run /product-kit or create artifacts in .devkit/product/',
    arch: 'Design architecture variants and invariants. Run /arch-kit or create artifacts in .devkit/arch/',
    spec: 'Write specs and implement. Run /spec-kit with github/spec-kit workflow',
    qa: 'Generate test contracts from invariants. Run /qa-kit',
};

export interface DevKitStatus {
    phase: Phase;
    mode: string;
    initialized: string;
    phaseProgress: Record<Phase, PhaseStatus>;
    nextStep: string;
    artifactCounts: Record<string, number>;
}

function parseCheckboxStatus(line: string): PhaseStatus {
    if (line.includes('[x]')) return 'done';
    if (line.includes('[/]')) return 'in_progress';
    return 'pending';
}

function countFiles(dir: string): number {
    try {
        return readdirSync(dir).filter((f: string) => f.endsWith('.md')).length;
    } catch {
        return 0;
    }
}

export function getStatus(cwd: string): DevKitStatus | null {
    const statusPath = join(cwd, '.devkit', 'STATUS.md');
    if (!existsSync(statusPath)) return null;

    const content = readFileSync(statusPath, 'utf-8');
    const lines = content.split('\n');

    // Parse header fields
    let mode = 'unknown';
    let initialized = 'unknown';
    let currentPhase: Phase = 'research';

    for (const line of lines) {
        const modeMatch = line.match(/^MODE:\s*(.+)/);
        if (modeMatch) mode = modeMatch[1]!.trim();

        const initMatch = line.match(/^INITIALIZED:\s*(.+)/);
        if (initMatch) initialized = initMatch[1]!.trim();

        const phaseMatch = line.match(/^CURRENT_PHASE:\s*(.+)/);
        if (phaseMatch) {
            const parsed = phaseMatch[1]!.trim();
            if (PHASE_ORDER.includes(parsed as Phase)) {
                currentPhase = parsed as Phase;
            }
        }
    }

    // Parse phase checkboxes
    const phaseProgress: Record<Phase, PhaseStatus> = {
        research: 'pending',
        product: 'pending',
        arch: 'pending',
        spec: 'pending',
        qa: 'pending',
    };

    for (const line of lines) {
        for (const phase of PHASE_ORDER) {
            if (line.includes(PHASE_LABELS[phase]!)) {
                phaseProgress[phase] = parseCheckboxStatus(line);
            }
        }
    }

    // Count artifacts
    const artifactCounts: Record<string, number> = {
        research: countFiles(join(cwd, '.devkit', 'research')),
        product: countFiles(join(cwd, '.devkit', 'product')),
        arch: countFiles(join(cwd, '.devkit', 'arch')),
        decisions: countFiles(join(cwd, '.devkit', 'arch', 'decisions')),
        qa: countFiles(join(cwd, '.devkit', 'qa')),
    };

    return {
        phase: currentPhase,
        mode,
        initialized,
        phaseProgress,
        nextStep: PHASE_NEXT_STEP[currentPhase] ?? 'Unknown phase',
        artifactCounts,
    };
}

export function formatStatus(status: DevKitStatus): string {
    const lines: string[] = [];

    lines.push('╔══════════════════════════════════════╗');
    lines.push('║         DevKit Status                ║');
    lines.push('╚══════════════════════════════════════╝');
    lines.push('');
    lines.push(`  Mode:        ${status.mode}`);
    lines.push(`  Initialized: ${status.initialized}`);
    lines.push(`  Phase:       ${status.phase.toUpperCase()}`);
    lines.push('');
    lines.push('  Progress:');

    for (const phase of PHASE_ORDER) {
        const s = status.phaseProgress[phase];
        const icon = s === 'done' ? '✅' : s === 'in_progress' ? '🔄' : '⬜';
        const count = status.artifactCounts[phase] ?? 0;
        const artifacts = count > 0 ? ` (${count} artifacts)` : '';
        const label = PHASE_LABELS[phase];
        const pointer = phase === status.phase ? ' ◀ current' : '';
        lines.push(`    ${icon} ${label}${artifacts}${pointer}`);
    }

    lines.push('');
    lines.push(`  Next: ${status.nextStep}`);
    lines.push('');

    return lines.join('\n');
}
