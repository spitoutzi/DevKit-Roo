import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Phase } from './status.js';
import { PHASE_ORDER, PHASE_LABELS } from './utils.js';

export interface AdvanceResult {
    advanced: boolean;
    from: Phase;
    to: Phase;
    error?: string;
}

export function advancePhase(cwd: string, currentPhase: Phase): AdvanceResult {
    const statusPath = join(cwd, '.devkit', 'STATUS.md');

    if (!existsSync(statusPath)) {
        return {
            advanced: false,
            from: currentPhase,
            to: currentPhase,
            error: '.devkit/STATUS.md not found. Run "devkit init" first.',
        };
    }

    const idx = PHASE_ORDER.indexOf(currentPhase);
    if (idx === PHASE_ORDER.length - 1) {
        return {
            advanced: false,
            from: currentPhase,
            to: currentPhase,
            error: `Already at the final phase (${PHASE_LABELS[currentPhase]}). No further phases.`,
        };
    }

    const nextPhase = PHASE_ORDER[idx + 1]!;
    let content = readFileSync(statusPath, 'utf-8');

    // Update CURRENT_PHASE
    content = content.replace(
        /CURRENT_PHASE:\s*.+/,
        `CURRENT_PHASE: ${nextPhase}`
    );

    // Mark current phase as done
    const currentLabel = PHASE_LABELS[currentPhase]!;
    content = content.replace(
        new RegExp(`- \\[.\\] ${currentLabel}`),
        `- [x] ${currentLabel}`
    );

    // Mark next phase as in-progress
    const nextLabel = PHASE_LABELS[nextPhase]!;
    content = content.replace(
        new RegExp(`- \\[.\\] ${nextLabel}`),
        `- [/] ${nextLabel}`
    );

    writeFileSync(statusPath, content, 'utf-8');

    return {
        advanced: true,
        from: currentPhase,
        to: nextPhase,
    };
}
