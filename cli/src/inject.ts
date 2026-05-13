import { existsSync, readFileSync, writeFileSync, mkdirSync, cpSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface InjectResult {
    injected: string[];   // hooks updated/inserted
    created: string[];    // copied from bundle (file didn't exist)
    skipped: string[];    // already current
    errors: string[];
}

const MARKER_START = (hookName: string) => `<!-- DEVKIT:START:${hookName} -->`;
const MARKER_END = (hookName: string) => `<!-- DEVKIT:END:${hookName} -->`;

/**
 * Command → hook mappings.
 * Each entry: [commandBaseName, hookName, hookFragmentFile]
 */
const HOOK_MAP: Array<[string, string]> = [
    ['speckit.specify', 'invariant-guard'],
    ['speckit.clarify', 'invariant-check'],
    ['speckit.plan', 'constitution-precheck'],
    ['speckit.plan', 'plan-postcheck'],
    ['speckit.tasks', 'validate-checkpoints'],
    ['speckit.implement', 'phase-guards'],
    ['speckit.analyze', 'coverage-pass'],
    ['speckit.checklist', 'invariant-category'],
];

/** All unique command names that have hooks */
const COMMAND_NAMES = [...new Set(HOOK_MAP.map(([cmd]) => cmd))];

/** Additional methodology commands for all Markdown-based agents */
const METHODOLOGY_COMMANDS = [
    '00-devkit-init',
    '01-research-kit',
    '02-product-kit',
    '03-arch-kit',
    '04-spec-kit',
    '05-qa-kit'
];

function getSpecKitDir(): string | null {
    const thisFile = fileURLToPath(import.meta.url);
    const distDir = dirname(thisFile);       // cli/dist/
    const cliRoot = dirname(distDir);        // cli/
    const specKitDir = join(cliRoot, 'skills', 'spec-kit');

    if (existsSync(specKitDir)) return specKitDir;
    return null;
}

function getBundledCommandPath(specKitDir: string, commandName: string): string {
    return join(specKitDir, 'commands', `${commandName}.md`);
}

function getHookFragmentPath(specKitDir: string, commandName: string, hookName: string): string {
    // Hook files follow: {commandBaseName}.{hookName}.md
    // e.g. specify.invariant-guard.md (strip 'speckit.' prefix)
    const baseName = commandName.replace('speckit.', '');
    return join(specKitDir, 'hooks', `${baseName}.${hookName}.md`);
}

interface AgentConfig {
    dir: string;
    ext: string;
}

const SUPPORTED_AGENTS: Record<string, AgentConfig> = {
    claude: { dir: '.claude/commands', ext: '.md' },
    roo: { dir: '.roo/commands', ext: '.md' },
    gemini: { dir: '.gemini/commands', ext: '.toml' },
};

function getTargetCommandPath(cwd: string, agent: string, commandName: string): string {
    const config = SUPPORTED_AGENTS[agent];
    if (!config) throw new Error(`Unsupported agent: ${agent}`);
    return join(cwd, config.dir, `${commandName}${config.ext}`);
}

/**
 * Extract content between DEVKIT markers in a file.
 * Returns null if markers not found.
 */
function extractMarkerContent(content: string, hookName: string): string | null {
    const startMarker = MARKER_START(hookName);
    const endMarker = MARKER_END(hookName);
    const startIdx = content.indexOf(startMarker);
    const endIdx = content.indexOf(endMarker);

    if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) return null;

    const afterStart = startIdx + startMarker.length;
    return content.substring(afterStart, endIdx);
}

/**
 * Replace content between DEVKIT markers, or return null if markers not found.
 */
function replaceMarkerContent(content: string, hookName: string, newInnerContent: string): string | null {
    const startMarker = MARKER_START(hookName);
    const endMarker = MARKER_END(hookName);
    const startIdx = content.indexOf(startMarker);
    const endIdx = content.indexOf(endMarker);

    if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) return null;

    const before = content.substring(0, startIdx + startMarker.length);
    const after = content.substring(endIdx);

    return before + newInnerContent + after;
}

/**
 * Inject DevKit hooks into speckit commands for all supported agents.
 *
 * For each of 7 commands across all detected agents:
 *   1. No file exists → copy from bundle (only for Markdown agents) → "created"
 *   2. File exists + no markers → copy from bundle (overwrite with enhanced version) → "injected"
 *   3. File exists + markers + content matches → "skipped"
 *   4. File exists + markers + content differs → replace between markers → "injected"
 */
export function injectDevkitHooks(cwd: string, opts?: { force?: boolean }): InjectResult {
    const result: InjectResult = {
        injected: [],
        created: [],
        skipped: [],
        errors: [],
    };

    const specKitDir = getSpecKitDir();
    if (!specKitDir) {
        result.errors.push('Could not locate cli/skills/spec-kit/ directory');
        return result;
    }

    // Detect which agents are initialized in the project
    let activeAgents = Object.keys(SUPPORTED_AGENTS).filter(agent => {
        const agentDir = join(cwd, SUPPORTED_AGENTS[agent]!.dir);
        return existsSync(agentDir);
    });

    // Special case: if .roo/ exists but .roo/commands doesn't, we still consider it active
    // to ensure .roomodes is generated and commands are created.
    if (!activeAgents.includes('roo') && existsSync(join(cwd, '.roo'))) {
        activeAgents.push('roo');
    }

    if (activeAgents.length === 0) {
        // If no agents detected, we activate both Claude and Roo by default
        // to support greenfield init and ensure Roo Code is ready.
        activeAgents.push('claude', 'roo');
    }

    // Ensure directories exist for all active agents
    for (const agent of activeAgents) {
        const agentDir = join(cwd, SUPPORTED_AGENTS[agent]!.dir);
        if (!existsSync(agentDir)) {
            mkdirSync(agentDir, { recursive: true });
        }
    }

    for (const agent of activeAgents) {
        const config = SUPPORTED_AGENTS[agent]!;
        const isMarkdown = config.ext === '.md';

        // Determine which commands to process for this agent
        const commandsToProcess = [...COMMAND_NAMES];
        if (isMarkdown) {
            commandsToProcess.push(...METHODOLOGY_COMMANDS);
        }

        // Process each command
        for (const commandName of commandsToProcess) {
            const targetPath = getTargetCommandPath(cwd, agent, commandName);
            const bundledPath = getBundledCommandPath(specKitDir, commandName);

            if (!existsSync(bundledPath)) {
                if (!result.errors.includes(`Bundled command not found: ${commandName}`)) {
                    result.errors.push(`Bundled command not found: ${commandName}`);
                }
                continue;
            }

            const bundledContent = readFileSync(bundledPath, 'utf-8');

            // Case 1: Target file doesn't exist
            if (!existsSync(targetPath)) {
                // We only create missing files for Markdown agents (Claude, Roo)
                // For TOML agents (Gemini), we rely on specify init to create them,
                // because our bundle is Markdown and we can't just copy it as TOML.
                if (isMarkdown) {
                    writeFileSync(targetPath, bundledContent, 'utf-8');
                    result.created.push(`${agent}:${commandName}`);
                }
                continue;
            }

            // File exists — check each hook for this command
            let currentContent = readFileSync(targetPath, 'utf-8');
            const hooksForCommand = HOOK_MAP.filter(([cmd]) => cmd === commandName);
            let commandModified = false;
            let allHooksCurrent = true;

            for (const [, hookName] of hooksForCommand) {
                const existingHookContent = extractMarkerContent(currentContent, hookName);
                const bundledHookContent = extractMarkerContent(bundledContent, hookName);

                if (bundledHookContent === null) {
                    // No hook in bundle — shouldn't happen but skip
                    continue;
                }

                if (existingHookContent === null) {
                    // No markers in target
                    if (isMarkdown) {
                        // For Markdown, we can replace the whole file with the enhanced bundle
                        if (opts?.force || !commandModified) {
                            currentContent = bundledContent;
                            commandModified = true;
                            allHooksCurrent = false;
                        }
                        break; // Replaced whole file, no need to check other hooks
                    } else {
                        // For TOML (Gemini), we can't replace the whole file.
                        // We must inject the hook at the end of the prompt string.
                        // This is a simplified approach: append the hook to the file.
                        // A robust TOML parser would be better, but this works for spec-kit's format.
                        const hookToInject = `\n${MARKER_START(hookName)}\n${bundledHookContent}\n${MARKER_END(hookName)}\n`;
                        
                        // Try to insert before the final closing quotes of the prompt
                        const promptEndIdx = currentContent.lastIndexOf('"""');
                        if (promptEndIdx !== -1 && promptEndIdx > currentContent.indexOf('prompt = """')) {
                            currentContent = currentContent.substring(0, promptEndIdx) + hookToInject + currentContent.substring(promptEndIdx);
                            commandModified = true;
                            allHooksCurrent = false;
                        } else {
                            // Fallback: just append
                            currentContent += hookToInject;
                            commandModified = true;
                            allHooksCurrent = false;
                        }
                    }
                } else {
                    // Markers exist — compare content
                    if (existingHookContent.trim() === bundledHookContent.trim() && !opts?.force) {
                        // Content matches — skip this hook
                        continue;
                    }

                    // Content differs or force mode — replace between markers
                    const updated = replaceMarkerContent(currentContent, hookName, bundledHookContent);
                    if (updated) {
                        currentContent = updated;
                        commandModified = true;
                        allHooksCurrent = false;
                    }
                }
            }

            if (commandModified) {
                writeFileSync(targetPath, currentContent, 'utf-8');
                result.injected.push(`${agent}:${commandName}`);
            } else if (allHooksCurrent) {
                result.skipped.push(`${agent}:${commandName}`);
            }
        }
    }

    // Generate .roomodes for Roo Code if roo is active
    if (activeAgents.includes('roo')) {
        generateRooModes(cwd);
    }

    return result;
}

/**
 * Generates or updates .roomodes file to include speckit commands as custom modes.
 */
function generateRooModes(cwd: string): void {
    const roomodesPath = join(cwd, '.roomodes');
    
    const devkitCustomModes = [
        {
            slug: "speckit-architect",
            name: "SpecKit Architect",
            roleDefinition: "You are an expert software architect focused on technical invariants and system design. Your goal is to ensure that all specifications align with the project's technical constitution.",
            groups: ["read", "edit", "browser", "command", "mcp"]
        },
        {
            slug: "speckit-developer",
            name: "SpecKit Developer",
            roleDefinition: "You are a senior developer focused on implementing features according to specifications while maintaining technical invariants. You use DevKit hooks to validate your progress.",
            groups: ["read", "edit", "browser", "command", "mcp"]
        }
    ];

    let existingModes: any = { customModes: [] };
    if (existsSync(roomodesPath)) {
        try {
            existingModes = JSON.parse(readFileSync(roomodesPath, 'utf-8'));
        } catch (e) {
            // If invalid JSON, we'll overwrite
        }
    }

    if (!existingModes.customModes) existingModes.customModes = [];

    for (const mode of devkitCustomModes) {
        const index = existingModes.customModes.findIndex((m: any) => m.slug === mode.slug);
        if (index !== -1) {
            existingModes.customModes[index] = { ...existingModes.customModes[index], ...mode };
        } else {
            existingModes.customModes.push(mode);
        }
    }

    writeFileSync(roomodesPath, JSON.stringify(existingModes, null, 2), 'utf-8');
}

/**
 * Get the list of hook fragment files available.
 */
export function listHookFragments(): Array<{ command: string; hook: string }> {
    return HOOK_MAP.map(([cmd, hook]) => ({ command: cmd, hook }));
}
