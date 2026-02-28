import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { getNextId, extractKeywords } from './utils.js';

export interface InvestigationResult {
    created: boolean;
    id: string;
    path: string;
    brokenAssumption: string | null;
    adrSource: string | null;
    invariantsAtRisk: string[];
    error?: string;
}

function findBrokenAssumption(
    cwd: string,
    keywords: string[],
): { adr: string; assumption: string } | null {
    const decisionsDir = join(cwd, '.devkit', 'arch', 'decisions');
    if (!existsSync(decisionsDir)) return null;

    const adrs = readdirSync(decisionsDir)
        .filter(f => f.startsWith('ADR-') && f.endsWith('.md'));

    for (const adrFile of adrs) {
        const content = readFileSync(join(decisionsDir, adrFile), 'utf-8');

        // Check if any keyword appears in the Assumptions section
        const assumptionSection = content.split(/^## Assumptions/m)[1];
        if (!assumptionSection) continue;

        // Only check up to the next ## section
        const endIdx = assumptionSection.indexOf('\n## ');
        const assumptionText = endIdx > 0 ? assumptionSection.slice(0, endIdx) : assumptionSection;

        for (const keyword of keywords) {
            if (assumptionText.toLowerCase().includes(keyword.toLowerCase())) {
                return {
                    adr: adrFile.replace('.md', ''),
                    assumption: assumptionText.trim().split('\n')[0]?.trim() ?? '(see ADR)',
                };
            }
        }
    }

    return null;
}

function findInvariantsAtRisk(cwd: string, keywords: string[]): string[] {
    const results: string[] = [];

    for (const relPath of ['arch/invariants.md', 'product/ux_invariants.md']) {
        const fullPath = join(cwd, '.devkit', relPath);
        if (!existsSync(fullPath)) continue;

        const content = readFileSync(fullPath, 'utf-8');
        const sections = content.split(/^## /m).slice(1);

        for (const section of sections) {
            const header = section.split('\n')[0]?.trim() ?? '';
            for (const keyword of keywords) {
                if (section.toLowerCase().includes(keyword.toLowerCase())) {
                    results.push(header);
                    break;
                }
            }
        }
    }

    return results;
}

export function createInvestigation(cwd: string, description: string): InvestigationResult {
    const devkitDir = join(cwd, '.devkit');
    const decisionsDir = join(devkitDir, 'arch', 'decisions');

    if (!existsSync(devkitDir)) {
        return {
            created: false, id: '', path: '', brokenAssumption: null,
            adrSource: null, invariantsAtRisk: [],
            error: '.devkit/ not found. Run "devkit init" first.',
        };
    }

    mkdirSync(decisionsDir, { recursive: true });

    // Extract keywords
    const keywords = extractKeywords(description);

    // Try to find broken assumption in ADRs
    const broken = findBrokenAssumption(cwd, keywords);

    // Find invariants at risk
    const invariantsAtRisk = findInvariantsAtRisk(cwd, keywords);

    // Generate ID
    const id = getNextId(decisionsDir, 'INV-');
    const filename = `${id}.md`;
    const filePath = join(decisionsDir, filename);
    const today = new Date().toISOString().split('T')[0];

    const lines: string[] = [];
    lines.push(`# ${id}: ${description}`);
    lines.push('');
    lines.push(`DATE: ${today}`);
    lines.push('STATUS: open');
    lines.push(`TRIGGERED_BY: ${description}`);
    lines.push('');

    // Broken assumption
    lines.push('## Broken Assumption');
    if (broken) {
        lines.push(`ASSUMPTION_IN: ${broken.adr}`);
        lines.push(`ASSUMPTION_WAS: ${broken.assumption}`);
    } else {
        lines.push('ASSUMPTION_IN: _not auto-detected — check ADRs manually_');
        lines.push('ASSUMPTION_WAS: ');
    }
    lines.push('REALITY: ');
    lines.push('');

    // Impact
    lines.push('## Impact');
    if (invariantsAtRisk.length > 0) {
        lines.push(`INVARIANTS_AT_RISK: [${invariantsAtRisk.join(', ')}]`);
    } else {
        lines.push('INVARIANTS_AT_RISK: _none auto-detected_');
    }
    lines.push('SPECS_AFFECTED: []');
    lines.push('');

    // Options
    lines.push('## Options');
    lines.push('');
    lines.push('### Option A: [workaround]');
    lines.push('Description. Cost. Technical debt introduced.');
    lines.push('');
    lines.push('### Option B: [alternative approach]');
    lines.push('Description. Cost. Technical debt introduced.');
    lines.push('');
    lines.push('### Option C: [accept limitation]');
    lines.push('Description. Cost. Technical debt introduced.');
    lines.push('');

    // Decision
    lines.push('## Decision');
    lines.push('CHOSEN: ');
    lines.push('RATIONALE: ');
    lines.push('DECIDED_BY: ');
    lines.push(`DATE_DECIDED: `);
    lines.push('');

    // Post-decision
    lines.push('## Post-Decision Actions');
    lines.push('- [ ] Update affected ADR or create new one');
    lines.push('- [ ] Update invariants.md if changed');
    lines.push('- [ ] Regenerate constitution (`devkit generate-constitution`)');
    lines.push('- [ ] Update affected specs');
    lines.push('- [ ] Document any technical debt');
    lines.push('');

    writeFileSync(filePath, lines.join('\n'), 'utf-8');

    return {
        created: true,
        id,
        path: `arch/decisions/${filename}`,
        brokenAssumption: broken?.assumption ?? null,
        adrSource: broken?.adr ?? null,
        invariantsAtRisk,
    };
}

export function listInvestigations(cwd: string): { id: string; title: string; status: string; date: string }[] {
    const decisionsDir = join(cwd, '.devkit', 'arch', 'decisions');
    if (!existsSync(decisionsDir)) return [];

    return readdirSync(decisionsDir)
        .filter(f => f.startsWith('INV-') && f.endsWith('.md'))
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

export function resolveInvestigation(cwd: string, invId: string, option: string, rationale: string): { resolved: boolean; error?: string } {
    // Validate ID: only alphanumeric characters and hyphens allowed
    if (!/^[A-Za-z0-9-]+$/.test(invId)) {
        return { resolved: false, error: `Invalid Investigation ID "${invId}": only alphanumeric characters and hyphens are allowed.` };
    }

    const decisionsDir = join(cwd, '.devkit', 'arch', 'decisions');
    const filePath = join(decisionsDir, `${invId}.md`);

    // Verify resolved path stays within decisionsDir (defense-in-depth)
    const resolvedDecisionsDir = resolve(decisionsDir);
    const resolvedFilePath = resolve(filePath);
    if (!resolvedFilePath.startsWith(resolvedDecisionsDir + '/')) {
        return { resolved: false, error: `Invalid Investigation ID "${invId}": path traversal detected.` };
    }

    if (!existsSync(filePath)) {
        return { resolved: false, error: `${invId}.md not found in .devkit/arch/decisions/` };
    }

    const content = readFileSync(filePath, 'utf-8');
    const today = new Date().toISOString().split('T')[0];

    const lines = content.split('\n').map(line => {
        if (line.startsWith('STATUS:')) return 'STATUS: resolved';
        if (line.startsWith('CHOSEN:')) return `CHOSEN: ${option}`;
        if (line.startsWith('RATIONALE:')) return `RATIONALE: ${rationale}`;
        if (line.startsWith('DECIDED_BY:')) return 'DECIDED_BY: developer';
        if (line.startsWith('DATE_DECIDED:')) return `DATE_DECIDED: ${today}`;
        return line;
    });

    writeFileSync(filePath, lines.join('\n'), 'utf-8');

    return { resolved: true };
}
