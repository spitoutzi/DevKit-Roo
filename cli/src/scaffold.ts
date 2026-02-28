import { mkdirSync, writeFileSync, existsSync, cpSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const STATUS_TEMPLATE = `# DevKit Status

MODE: {mode}
INITIALIZED: {date}
CURRENT_PHASE: research

## Phase Status
- [ ] ResearchKit
- [ ] ProductKit
- [ ] ArchKit
- [ ] SpecKit
- [ ] QAKit
`;

const DIRECTORIES = [
    '.devkit',
    '.devkit/research',
    '.devkit/product',
    '.devkit/arch',
    '.devkit/arch/decisions',
    '.devkit/qa',
    '.devkit/qa/escalations',
];

const SKILL_NAMES = [
    'devkit-init',
    'research-kit',
    'product-kit',
    'arch-kit',
    'spec-kit',
    'qa-kit',
];

export interface ScaffoldResult {
    created: string[];
    skipped: string[];
    mode: string;
    skillsInstalled: number;
    specKitFound: boolean;
}

function getSkillsSourceDir(): string | null {
    // Skills are bundled at cli/skills/ relative to the package root
    const thisFile = fileURLToPath(import.meta.url);
    const distDir = dirname(thisFile);       // cli/dist/
    const cliRoot = dirname(distDir);        // cli/
    const skillsDir = join(cliRoot, 'skills');

    if (existsSync(skillsDir)) return skillsDir;
    return null;
}

export function scaffoldDevkit(cwd: string, mode: string): ScaffoldResult {
    const created: string[] = [];
    const skipped: string[] = [];
    let skillsInstalled = 0;

    // Create .devkit/ directories
    for (const dir of DIRECTORIES) {
        const fullPath = join(cwd, dir);
        if (!existsSync(fullPath)) {
            mkdirSync(fullPath, { recursive: true });
            created.push(dir + '/');
        } else {
            skipped.push(dir + '/');
        }
    }

    // Create STATUS.md
    const statusPath = join(cwd, '.devkit', 'STATUS.md');
    if (!existsSync(statusPath)) {
        const today = new Date().toISOString().split('T')[0];
        const content = STATUS_TEMPLATE
            .replace('{mode}', mode)
            .replace('{date}', today!);
        writeFileSync(statusPath, content, 'utf-8');
        created.push('.devkit/STATUS.md');
    } else {
        skipped.push('.devkit/STATUS.md');
    }

    // Install Agent Skills → .agent/skills/
    const skillsSource = getSkillsSourceDir();
    if (skillsSource) {
        const agentSkillsDir = join(cwd, '.agent', 'skills');
        mkdirSync(agentSkillsDir, { recursive: true });

        for (const skillName of SKILL_NAMES) {
            const src = join(skillsSource, skillName);
            const dest = join(agentSkillsDir, skillName);

            if (existsSync(src) && !existsSync(dest)) {
                cpSync(src, dest, { recursive: true });
                created.push(`.agent/skills/${skillName}/`);
                skillsInstalled++;
            } else if (existsSync(dest)) {
                skipped.push(`.agent/skills/${skillName}/`);
            }
        }
    }

    // Check for spec-kit
    const specKitFound = existsSync(join(cwd, '.specify')) ||
        (() => { try { execFileSync('which', ['specify'], { stdio: 'ignore' }); return true; } catch { return false; } })();

    return { created, skipped, mode, skillsInstalled, specKitFound };
}
