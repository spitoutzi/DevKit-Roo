# Assumptions — DevKit Tooling

## Assumption: Developers want structured AI methodology
STATEMENT: Разработчики которые уже используют AI-агенты чувствуют потребность в фазовой дисциплине
BASIS: Рост интереса к SDD (spec-driven development), появление spec-kit от GitHub (~70K stars за 6 мес), статьи о "vibe coding" проблемах
RISK: medium
VALIDATION_METHOD: опросить 5+ разработчиков использующих AI, спросить про боли
STATUS: assumed
FINDING: spec-kit набрал ~70K stars — валидация рынком. Microsoft Developer Blog, LogRocket, Visual Studio Magazine написали статьи. Потребность подтверждена adoption.

## Assumption: Agent Skills standard will persist
STATEMENT: Формат Agent Skills (SKILL.md + references/) станет де-факто стандартом для AI-агентов
BASIS: Anthropic официально поддерживает, Vercel выпустил agent-skills, растущая экосистема
RISK: medium
VALIDATION_METHOD: отслеживать adoption в 2026, проверять поддержку в новых агентах
STATUS: assumed
FINDING: spec-kit не использует Agent Skills стандарт. Использует per-agent command files (`.claude/commands/*.md`, `.gemini/commands/*.toml`). Каждый агент — свой формат. Стандарта Agent Skills пока нет — есть конвенции.

## Assumption: CLI enhances but doesn't replace methodology
STATEMENT: CLI — опциональный усилитель. Методология DevKit ценна даже без CLI только как набор Skills
BASIS: Текущий DevKit уже работает как чистые Skills без рантайма
RISK: low
VALIDATION_METHOD: использовать DevKit на реальном проекте без CLI, измерить friction
STATUS: validated
FINDING: Подтверждено self-bootstrap. Skills работают без CLI, но CLI добавляет: валидацию артефактов, gate checking, coverage tracking, snapshot/diff, impact analysis. Без CLI эти проверки делаются вручную (error-prone).

## Assumption: TypeScript is the right choice for CLI
STATEMENT: TypeScript/Node — оптимальный рантайм для DevKit CLI
BASIS: Совместимость с npm/npx, экосистема spec-kit, знакомство ЦА с JS/TS
RISK: low
VALIDATION_METHOD: проверить что все нужные библиотеки (markdown parser, YAML, JSON Schema) доступны в npm
STATUS: validated
FINDING: CLI работает. 60 тестов, ESM, zero external runtime deps (кроме chalk и chokidar). Примечание: spec-kit использует Python (uv), не Node. Совместимость не через runtime, а через артефакты (.specify/).

## Assumption: Markdown artifacts are sufficient
STATEMENT: Structured markdown (YAML frontmatter + markdown body) достаточен для всех артефактов DevKit
BASIS: spec-kit использует такой же подход, Git-friendly, человекочитаемый
RISK: low
VALIDATION_METHOD: описать schema для каждого типа артефакта, проверить что все поля парсятся без потерь
STATUS: validated
FINDING: Подтверждено. 15 артефактов парсятся валидатором без потерь. Единственное ограничение: inline fields (`STATUS: open`) парсятся regex — могут false-positive на freetext с двоеточием. Допустимо для текущего масштаба.

## Assumption: DevKit constitution format is compatible with spec-kit
STATEMENT: Конституция сгенерированная DevKit (инварианты + решения) будет приниматься spec-kit
BASIS: spec-kit описывает constitution.md без жёсткого формата
RISK: high
VALIDATION_METHOD: сгенерировать constitution DevKit-ом, запустить spec-kit workflow
STATUS: invalidated → resolved
FINDING: НЕСОВМЕСТИМО. DevKit писал в `.specify/constitution.md` (инварианты I1-I8, UX U1-U6). spec-kit ожидает `.specify/memory/constitution.md` с "Core Principles" (декларативные MUST/SHOULD), semver, governance section. РЕШЕНИЕ (INV-002, Option A): построен трансформер в `constitution.ts` (`transformToSpecKitFormat`), `devkit sync` теперь пишет в `.specify/memory/constitution.md` в формате spec-kit principles. Gate L3→L4 проверяет наличие spec-kit и формат конституции.
