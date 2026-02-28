import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { extractKeywords } from './utils.js';

export interface ImpactEntity {
    name: string;
    dependsOn: string[];
    dependedBy: string[];
    invariants: string[];
}

export interface ImpactResult {
    description: string;
    affectedInvariants: string[];
    affectedComponents: string[];
    affectedSpecs: string[];
    riskLevel: 'low' | 'medium' | 'high';
    recommendation: string;
}

function parseImpactMap(content: string): ImpactEntity[] {
    const entities: ImpactEntity[] = [];
    const sections = content.split(/^## /m).slice(1);

    for (const section of sections) {
        const lines = section.split('\n');
        const name = lines[0]?.trim() ?? '';

        const dependsOn: string[] = [];
        const dependedBy: string[] = [];
        const invariants: string[] = [];

        for (const line of lines) {
            const depOnMatch = line.match(/DEPENDS_ON:\s*\[(.+)\]/);
            if (depOnMatch) {
                dependsOn.push(...depOnMatch[1]!.split(',').map(s => s.trim()).filter(Boolean));
            }

            const depByMatch = line.match(/DEPENDED_BY:\s*\[(.+)\]/);
            if (depByMatch) {
                dependedBy.push(...depByMatch[1]!.split(',').map(s => s.trim()).filter(Boolean));
            }

            const invMatch = line.match(/INVARIANTS:\s*\[(.+)\]/);
            if (invMatch) {
                invariants.push(...invMatch[1]!.split(',').map(s => s.trim()).filter(Boolean));
            }
        }

        entities.push({ name, dependsOn, dependedBy, invariants });
    }

    return entities;
}

function findAffected(
    entities: ImpactEntity[],
    keywords: string[],
): { components: Set<string>; invariants: Set<string> } {
    const components = new Set<string>();
    const invariants = new Set<string>();
    const visited = new Set<string>();

    function walk(name: string) {
        if (visited.has(name)) return;
        visited.add(name);
        components.add(name);

        const entity = entities.find(e =>
            e.name.toLowerCase().includes(name.toLowerCase())
        );
        if (!entity) return;

        for (const inv of entity.invariants) {
            invariants.add(inv);
        }

        // Walk dependedBy (things that depend on this)
        for (const dep of entity.dependedBy) {
            walk(dep);
        }
    }

    // Start from entities that match keywords
    for (const entity of entities) {
        for (const keyword of keywords) {
            if (entity.name.toLowerCase().includes(keyword.toLowerCase())) {
                walk(entity.name);
            }
        }
    }

    return { components, invariants };
}

export function analyzeImpact(cwd: string, description: string): ImpactResult {
    const devkitDir = join(cwd, '.devkit');
    const impactPath = join(devkitDir, 'arch', 'impact.md');

    // Extract keywords from description
    const keywords = extractKeywords(description);

    if (!existsSync(impactPath)) {
        // No impact map — do best-effort analysis from invariants
        const invPath = join(devkitDir, 'arch', 'invariants.md');
        const uxPath = join(devkitDir, 'product', 'ux_invariants.md');
        const affectedInvariants: string[] = [];

        for (const path of [invPath, uxPath]) {
            if (!existsSync(path)) continue;
            const content = readFileSync(path, 'utf-8');

            // Find invariants whose text mentions any keyword
            const sections = content.split(/^## /m).slice(1);
            for (const section of sections) {
                const header = section.split('\n')[0]?.trim() ?? '';
                for (const keyword of keywords) {
                    if (section.toLowerCase().includes(keyword)) {
                        affectedInvariants.push(header);
                        break;
                    }
                }
            }
        }

        // Check specs
        const affectedSpecs: string[] = [];
        const specsDir = join(cwd, '.specify', 'specs');
        if (existsSync(specsDir)) {
            const specs = readdirSync(specsDir).filter(f => f.endsWith('.md'));
            for (const spec of specs) {
                const content = readFileSync(join(specsDir, spec), 'utf-8');
                for (const keyword of keywords) {
                    if (content.toLowerCase().includes(keyword)) {
                        affectedSpecs.push(spec.replace('.md', ''));
                        break;
                    }
                }
            }
        }

        const riskLevel = affectedInvariants.length >= 3
            ? 'high'
            : affectedInvariants.length >= 1
                ? 'medium'
                : 'low';

        const recommendation = affectedInvariants.length > 0
            ? `This change touches ${affectedInvariants.length} invariant(s). Open an RFC via "devkit rfc" before proceeding.`
            : 'No invariants directly affected. Proceed with caution and validate after implementation.';

        return {
            description,
            affectedInvariants,
            affectedComponents: [],
            affectedSpecs,
            riskLevel,
            recommendation,
        };
    }

    // Full analysis with impact map
    const impactContent = readFileSync(impactPath, 'utf-8');
    const entities = parseImpactMap(impactContent);
    const { components, invariants } = findAffected(entities, keywords);

    const affectedSpecs: string[] = [];
    const specsDir = join(cwd, '.specify', 'specs');
    if (existsSync(specsDir)) {
        const specs = readdirSync(specsDir).filter(f => f.endsWith('.md'));
        for (const spec of specs) {
            const content = readFileSync(join(specsDir, spec), 'utf-8');
            for (const keyword of keywords) {
                if (content.toLowerCase().includes(keyword)) {
                    affectedSpecs.push(spec.replace('.md', ''));
                    break;
                }
            }
        }
    }

    const riskLevel = invariants.size >= 3
        ? 'high'
        : invariants.size >= 1
            ? 'medium'
            : 'low';

    const recommendation = invariants.size > 0
        ? `This change touches ${invariants.size} invariant(s) across ${components.size} component(s). Open an RFC via "devkit rfc" before proceeding.`
        : 'No invariants directly affected. Proceed with normal spec-kit workflow.';

    return {
        description,
        affectedInvariants: [...invariants],
        affectedComponents: [...components],
        affectedSpecs,
        riskLevel,
        recommendation,
    };
}

export function formatImpact(result: ImpactResult): string {
    const lines: string[] = [];

    const riskEmoji = result.riskLevel === 'high' ? '🔴' :
        result.riskLevel === 'medium' ? '🟡' : '🟢';

    lines.push(`Impact Analysis: "${result.description}"`);
    lines.push(`Risk: ${riskEmoji} ${result.riskLevel.toUpperCase()}`);
    lines.push('');

    if (result.affectedInvariants.length > 0) {
        lines.push('  Affected invariants:');
        for (const inv of result.affectedInvariants) {
            lines.push(`    ⚡ ${inv}`);
        }
        lines.push('');
    }

    if (result.affectedComponents.length > 0) {
        lines.push('  Affected components:');
        for (const comp of result.affectedComponents) {
            lines.push(`    📦 ${comp}`);
        }
        lines.push('');
    }

    if (result.affectedSpecs.length > 0) {
        lines.push('  Affected specs:');
        for (const spec of result.affectedSpecs) {
            lines.push(`    📄 ${spec}`);
        }
        lines.push('');
    }

    if (result.affectedInvariants.length === 0 && result.affectedComponents.length === 0) {
        lines.push('  No direct impact detected on existing invariants or components.');
        lines.push('');
    }

    lines.push(`  💡 ${result.recommendation}`);

    return lines.join('\n');
}
