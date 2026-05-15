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

/**
 * Resolve path to DevKit/.roomodes template.
 *
 * Strategy (tried in order):
 *   1. cwd/DevKit/.roomodes              — development mode (repo root)
 *   2. <package-root>/DevKit/.roomodes    — npm-installed mode (bundled asset)
 *
 * Returns null if not found.
 */
function resolveRoomodesSrc(cwd: string): string | null {
    // 1. Try cwd/DevKit/.roomodes (development mode — repo root)
    const devKitDir = join(cwd, 'DevKit');
    const localPath = join(devKitDir, '.roomodes');
    if (existsSync(localPath)) return localPath;

    // 2. Try <package-root>/DevKit/.roomodes (npm-installed mode)
    //    cliRoot = @x0rium/devkit-cli/ (parent of dist/ or src/)
    const thisFile = fileURLToPath(import.meta.url);
    const distDir = dirname(thisFile);       // cli/dist/ or cli/src/
    const cliRoot = dirname(distDir);        // cli/ (package root)
    const bundledPath = join(cliRoot, 'DevKit', '.roomodes');

    if (existsSync(bundledPath)) return bundledPath;
    return null;
}

/**
 * Recursively copy directory contents from src to dest.
 * - Creates subdirectories as needed
 * - Copies files that don't exist yet (won't overwrite)
 * - Appends relative paths of copied files to the `copied` array
 */
function copyDirContents(src: string, dest: string, baseDir: string, copied: string[]): void {
    if (!existsSync(src) || !existsSync(dest)) return;

    const entries = readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = join(src, entry.name);
        const destPath = join(dest, entry.name);
        // Relative path from cwd for reporting
        const relativePath = destPath.replace(baseDir + '/', '');

        if (entry.isDirectory()) {
            if (!existsSync(destPath)) {
                mkdirSync(destPath);
            }
            copyDirContents(srcPath, destPath, baseDir, copied);
        } else {
            if (!existsSync(destPath)) {
                cpSync(srcPath, destPath);
                copied.push(relativePath);
            }
        }
    }
}

export function scaffoldDevkit(cwd: string, mode: string): ScaffoldResult {
    const created: string[] = [];
    const skipped: string[] = [];
    let skillsInstalled = 0;

    // Install Roo configurations: .roo/ (directory) + .roomodes (file)
    const devkitDir = join(cwd, 'DevKit');

    // 1. Copy entire DevKit/.roo/ → .roo/ recursively
    const rooTemplateDir = join(devkitDir, '.roo');
    const rooDestDir = join(cwd, '.roo');

    if (existsSync(rooTemplateDir)) {
        if (!existsSync(rooDestDir)) {
            mkdirSync(rooDestDir, { recursive: true });
            created.push('.roo/');
        }

        // Copy files from template → dest (overwrites only matching files, preserves others)
        const copiedRooFiles: string[] = [];
        copyDirContents(rooTemplateDir, rooDestDir, cwd, copiedRooFiles);

        if (copiedRooFiles.length > 0) {
            for (const f of copiedRooFiles) {
                created.push(f);
            }
        }
    } else {
        // Template .roo/ not found — create minimal directory if needed
        if (!existsSync(rooDestDir)) {
            mkdirSync(rooDestDir, { recursive: true });
            created.push('.roo/');
        } else {
            skipped.push('.roo/');
        }
    }

    // 2. Copy DevKit/.roomodes → .roomodes (always overwrite — template is source of truth)
    const roomodesSrc = resolveRoomodesSrc(cwd);
    const roomodesDest = join(cwd, '.roomodes');

    if (roomodesSrc) {
        if (!existsSync(roomodesDest)) {
            cpSync(roomodesSrc, roomodesDest);
            created.push('.roomodes');
        } else {
            // Overwrite with template version
            cpSync(roomodesSrc, roomodesDest);
            created.push('.roomodes (updated)');
        }
    } else {
        // If template not found, create a minimal .roomodes placeholder
        // so the project still works with Roo
        if (!existsSync(roomodesDest)) {
            writeFileSync(roomodesDest, 'customModes: []\n', 'utf-8');
            created.push('.roomodes (minimal)');
        } else {
            skipped.push('.roomodes');
        }
    }

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
