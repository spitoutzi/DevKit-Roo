import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export type EscalationLevel = 'speckit' | 'archkit' | 'productkit' | 'researchkit';

export interface EscalationResult {
    created: boolean;
    id: string;
    path: string;
    level: EscalationLevel;
    reason: string;
    error?: string;
}

const LEVEL_DESCRIPTIONS: Record<EscalationLevel, string> = {
    speckit: 'Code bug — code doesn\'t match spec. Fix in SpecKit.',
    archkit: 'Invariant violation — system breaks an architectural guarantee. Investigation needed.',
    productkit: 'UX problem — system works but user experience is wrong. Product investigation needed.',
    researchkit: 'Assumption rejected — a research assumption proved false. Research revision needed.',
};

function detectEscalationLevel(cwd: string, description: string): { level: EscalationLevel; reason: string } {
    const lower = description.toLowerCase();

    // Check for UX-related keywords → ProductKit
    const uxKeywords = ['ux', 'user experience', 'usability', 'confusing', 'unintuitive',
        'hard to use', 'awkward', 'too many', 'parameters', 'complicated', 'неудобно',
        'непонятно', 'слишком', 'пользователь не'];
    for (const kw of uxKeywords) {
        if (lower.includes(kw)) {
            return { level: 'productkit', reason: `UX issue detected ("${kw}"). Escalating to ProductKit.` };
        }
    }

    // Check for assumption/research keywords → ResearchKit
    const researchKeywords = ['assumption', 'assumed', 'we thought', 'turns out',
        'wrong assumption', 'predicted', 'expected market', 'feasibility',
        'предполагали', 'оказалось'];
    for (const kw of researchKeywords) {
        if (lower.includes(kw)) {
            return { level: 'researchkit', reason: `Research assumption challenged ("${kw}"). Escalating to ResearchKit.` };
        }
    }

    // Check for invariant/architecture keywords → ArchKit
    const archKeywords = ['invariant', 'guarantee', 'architecture', 'design flaw',
        'fundamental', 'race condition', 'data loss', 'security', 'performance',
        'инвариант', 'архитектур', 'гарантия'];
    for (const kw of archKeywords) {
        if (lower.includes(kw)) {
            return { level: 'archkit', reason: `Architectural issue detected ("${kw}"). Escalating to ArchKit.` };
        }
    }

    // Check for bug/library keywords → ArchKit investigation
    const bugKeywords = ['bug in', 'library', 'doesn\'t support', 'benchmark',
        'unexpected behavior', 'limitation', 'баг', 'либа не'];
    for (const kw of bugKeywords) {
        if (lower.includes(kw)) {
            return { level: 'archkit', reason: `Technical blocker detected ("${kw}"). Opening ArchKit investigation.` };
        }
    }

    // Default: code bug → SpecKit
    return { level: 'speckit', reason: 'No specific escalation trigger found. Treating as code bug (SpecKit fix).' };
}

export function createEscalation(cwd: string, description: string, forceLevel?: EscalationLevel): EscalationResult {
    const devkitDir = join(cwd, '.devkit');
    const escalationsDir = join(devkitDir, 'qa', 'escalations');

    if (!existsSync(devkitDir)) {
        return {
            created: false, id: '', path: '', level: 'speckit', reason: '',
            error: '.devkit/ not found. Run "devkit init" first.',
        };
    }

    mkdirSync(escalationsDir, { recursive: true });

    // Detect level
    const { level, reason } = forceLevel
        ? { level: forceLevel, reason: `Manually escalated to ${forceLevel}.` }
        : detectEscalationLevel(cwd, description);

    // Generate ID (use max suffix to avoid collisions after deletions)
    const existingFiles = existsSync(escalationsDir) ? readdirSync(escalationsDir).filter(f => f.startsWith('ESC-')) : [];
    let maxNum = 0;
    for (const f of existingFiles) {
        const m = f.match(/ESC-(\d+)/);
        if (m) maxNum = Math.max(maxNum, parseInt(m[1]!, 10));
    }
    const id = `ESC-${(maxNum + 1).toString().padStart(3, '0')}`;
    const filename = `${id}.md`;
    const filePath = join(escalationsDir, filename);
    const today = new Date().toISOString().split('T')[0];

    const lines: string[] = [];
    lines.push(`# ${id}: ${description}`);
    lines.push('');
    lines.push(`DATE: ${today}`);
    lines.push('STATUS: open');
    lines.push(`TRIGGERED_BY: ${description}`);
    lines.push(`ESCALATED_TO: ${level}`);
    lines.push(`REASON: ${reason}`);
    lines.push('');

    lines.push('## Analysis');
    lines.push('');

    switch (level) {
        case 'speckit':
            lines.push('**Type**: Code bug (code ≠ spec)');
            lines.push('**Action**: Fix in SpecKit, no escalation needed.');
            lines.push('');
            lines.push('### What went wrong');
            lines.push('');
            lines.push('### Fix');
            lines.push('');
            break;

        case 'archkit':
            lines.push('**Type**: Invariant violation or technical blocker');
            lines.push('**Action**: Open Investigation in ArchKit (`devkit investigate "..."`)')
            lines.push('');
            lines.push('### Which invariant/assumption is broken');
            lines.push('');
            lines.push('### Proposed investigation');
            lines.push('');
            break;

        case 'productkit':
            lines.push('**Type**: UX invariant violation');
            lines.push('**Action**: ProductKit investigation — review ux_invariants.md');
            lines.push('');
            lines.push('### Which UX invariant is violated');
            lines.push('');
            lines.push('### User impact');
            lines.push('');
            break;

        case 'researchkit':
            lines.push('**Type**: Research assumption rejected');
            lines.push('**Action**: ResearchKit revision — update assumptions.md');
            lines.push('');
            lines.push('### Which assumption proved false');
            lines.push('');
            lines.push('### What we now know');
            lines.push('');
            break;
    }

    lines.push('## Resolution');
    lines.push('RESOLVED_BY: ');
    lines.push('DATE_RESOLVED: ');
    lines.push('DECISION_CREATED: ');
    lines.push('');

    writeFileSync(filePath, lines.join('\n'), 'utf-8');

    return {
        created: true,
        id,
        path: `qa/escalations/${filename}`,
        level,
        reason,
    };
}
