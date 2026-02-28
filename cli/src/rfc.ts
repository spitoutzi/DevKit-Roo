import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { analyzeImpact } from './impact.js';
import { getNextId } from './utils.js';

export interface RfcResult {
    created: boolean;
    id: string;
    path: string;
    affectedInvariants: string[];
    affectedSpecs: string[];
    riskLevel: string;
    error?: string;
}

export function createRfc(cwd: string, description: string): RfcResult {
    const devkitDir = join(cwd, '.devkit');
    const decisionsDir = join(devkitDir, 'arch', 'decisions');

    if (!existsSync(devkitDir)) {
        return {
            created: false, id: '', path: '', affectedInvariants: [],
            affectedSpecs: [], riskLevel: 'unknown',
            error: '.devkit/ not found. Run "devkit init" first.',
        };
    }

    // Ensure decisions directory exists
    mkdirSync(decisionsDir, { recursive: true });

    // Run impact analysis
    const impact = analyzeImpact(cwd, description);

    // Generate RFC ID
    const id = getNextId(decisionsDir, 'RFC-');
    const filename = `${id}.md`;
    const filePath = join(decisionsDir, filename);
    const today = new Date().toISOString().split('T')[0];

    // Build RFC content from template
    const lines: string[] = [];
    lines.push(`# ${id}: ${description}`);
    lines.push('');
    lines.push(`DATE: ${today}`);
    lines.push('STATUS: open');
    lines.push(`TRIGGERED_BY: ${description}`);
    lines.push('');

    // Affected invariants (auto-populated from impact analysis)
    lines.push('## Affected Invariants');
    if (impact.affectedInvariants.length > 0) {
        for (const inv of impact.affectedInvariants) {
            lines.push(`- ${inv}`);
        }
    } else {
        lines.push('_No invariants directly affected (manual review recommended)_');
    }
    lines.push('');

    // Affected specs
    lines.push('## Affected Specs');
    if (impact.affectedSpecs.length > 0) {
        for (const spec of impact.affectedSpecs) {
            lines.push(`- ${spec}`);
        }
    } else {
        lines.push('_No specs identified (check .specify/ manually)_');
    }
    lines.push('');

    // Change cost
    lines.push('## Change Cost');
    lines.push(`SPECS_TO_REVISE: ${impact.affectedSpecs.length}`);
    lines.push(`INVARIANTS_TO_CHANGE: ${impact.affectedInvariants.length}`);
    lines.push('ESTIMATED_EFFORT: TODO');
    lines.push('');

    // Options (developer fills these)
    lines.push('## Options');
    lines.push('');
    lines.push('### Option A: [name]');
    lines.push('Description, pros, cons');
    lines.push('');
    lines.push('### Option B: [name]');
    lines.push('Description, pros, cons');
    lines.push('');

    // Decision (to be filled)
    lines.push('## Decision');
    lines.push('CHOSEN: ');
    lines.push('RATIONALE: ');
    lines.push('DECIDED_BY: ');
    lines.push(`DATE_DECIDED: `);
    lines.push('');

    // Post-decision checklist
    lines.push('## Post-Decision Actions');
    lines.push('- [ ] Update invariants.md');
    lines.push('- [ ] Regenerate constitution (`devkit generate-constitution`)');
    lines.push('- [ ] Sync constitution (`devkit sync`)');
    lines.push('- [ ] Mark affected specs as NEEDS_REVISION');
    lines.push('- [ ] Resume SpecKit');
    lines.push('');

    writeFileSync(filePath, lines.join('\n'), 'utf-8');

    return {
        created: true,
        id,
        path: `arch/decisions/${filename}`,
        affectedInvariants: impact.affectedInvariants,
        affectedSpecs: impact.affectedSpecs,
        riskLevel: impact.riskLevel,
    };
}

export function listRfcs(cwd: string): { id: string; title: string; status: string; date: string }[] {
    const decisionsDir = join(cwd, '.devkit', 'arch', 'decisions');
    if (!existsSync(decisionsDir)) return [];

    return readdirSync(decisionsDir)
        .filter(f => f.startsWith('RFC-') && f.endsWith('.md'))
        .sort()
        .map(f => {
            const content = readFileSync(join(decisionsDir, f), 'utf-8');
            const titleMatch = content.match(/^# (.+)/m);
            const statusMatch = content.match(/^STATUS:\s*(.+)/m);
            const dateMatch = content.match(/^DATE:\s*(.+)/m);
            return {
                id: f.replace('.md', ''),
                title: titleMatch?.[1] ?? f,
                status: statusMatch?.[1]?.trim() ?? 'unknown',
                date: dateMatch?.[1]?.trim() ?? 'unknown',
            };
        });
}

export function resolveRfc(cwd: string, rfcId: string, option: string, rationale: string): { resolved: boolean; error?: string } {
    // Validate ID: only alphanumeric characters and hyphens allowed
    if (!/^[A-Za-z0-9-]+$/.test(rfcId)) {
        return { resolved: false, error: `Invalid RFC ID "${rfcId}": only alphanumeric characters and hyphens are allowed.` };
    }

    const decisionsDir = join(cwd, '.devkit', 'arch', 'decisions');
    const filePath = join(decisionsDir, `${rfcId}.md`);

    // Verify resolved path stays within decisionsDir (defense-in-depth)
    const resolvedDecisionsDir = resolve(decisionsDir);
    const resolvedFilePath = resolve(filePath);
    if (!resolvedFilePath.startsWith(resolvedDecisionsDir + '/')) {
        return { resolved: false, error: `Invalid RFC ID "${rfcId}": path traversal detected.` };
    }

    if (!existsSync(filePath)) {
        return { resolved: false, error: `${rfcId}.md not found in .devkit/arch/decisions/` };
    }

    const content = readFileSync(filePath, 'utf-8');
    const today = new Date().toISOString().split('T')[0];

    const lines = content.split('\n').map(line => {
        if (line.startsWith('STATUS:')) return 'STATUS: accepted';
        if (line.startsWith('CHOSEN:')) return `CHOSEN: ${option}`;
        if (line.startsWith('RATIONALE:')) return `RATIONALE: ${rationale}`;
        if (line.startsWith('DECIDED_BY:')) return 'DECIDED_BY: developer';
        if (line.startsWith('DATE_DECIDED:')) return `DATE_DECIDED: ${today}`;
        return line;
    });

    writeFileSync(filePath, lines.join('\n'), 'utf-8');

    return { resolved: true };
}
