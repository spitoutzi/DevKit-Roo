# DevKit — AI-Native Development Methodology

> Полный цикл разработки с AI от идеи до верифицированного продукта.

---

## Проблема которую решает DevKit

Существующие инструменты AI-разработки (SpecKit и подобные) описывают только середину цикла — реализацию. Они не знают что было до и что будет после. Это приводит к:

- AI хитрит и упрощает потому что нет доказанного основания
- архитектурные решения принимаются молча внутри спек
- новые требования ломают всё потому что нет impact analysis
- баги в либах или UX проблемы обнаруживаются после реализации
- тесты проверяют код, а не архитектурные инварианты

DevKit — это **upstream layer** над SpecKit. Не конкурент, не форк — экосистема из пяти уровней где каждый генерирует артефакты для следующего.

Данный проект - форк официального от @x0rium, заточенный под Roo Code.

---

## Быстрый старт

### Установка CLI

```bash
# Вариант 1 — глобальная установка из форка (рекомендуется)
git clone <url-вашего-форка> && cd DevKit-Roo/cli
npm install && npm run build
npm link
# Теперь devkit доступен глобально

# Вариант 2 — через alias (без глобальной установки)
git clone <url-вашего-форка> && cd DevKit-Roo/cli
npm install && npm run build
alias devkit="node $(pwd)/dist/index.js"
```

> **Важно:** Установка через `npm i -g @x0rium/devkit-cli` поставит **оригинальную** версию, а не форк. Чтобы использовать изменения из форка, устанавливайте из исходников как описано выше. Если вы склонировали репозиторий с другим именем (не DevKit-Roo), замените `DevKit-Roo` на имя вашей директории.

### Первая сессия

```bash
# 1. Инициализация — DevKit определит состояние проекта
devkit init

# 2. Проверить текущий статус
devkit status

# 3. Валидировать артефакты
devkit validate

# 4. Начать работу с Agent Skills
#    В чате с AI вызовите /devkit-init
```

DevKit автоматически определит состояние проекта и выберет нужный режим.

---

## Режимы инициализации

| Что найдено в проекте | Режим | Что происходит |
|----------------------|-------|----------------|
| Пустая папка | Greenfield | Создаёт .devkit/, инжектит speckit-команды, старт с ResearchKit |
| Код без .devkit/ | Brownfield | Реконструирует инварианты из кода, выявляет gaps |
| .specify/ без .devkit/ | Upgrade | Извлекает артефакты из constitution.md, связывает |
| .devkit/ уже есть | Re-init | Пропускает существующее, обновляет skills и speckit-хуки, обновляет `.roo/` и `.roomodes` из шаблона |

---

## Пять уровней

```
[ResearchKit]   → "возможно ли это вообще?"
      ↓
[ProductKit]    → "что именно строим и для кого?"
      ↓
[ArchKit]       → "как это устроено технически?"
      ↓
[SpecKit]       → "строим" (github/spec-kit)
      ↓
[QAKit]         → "работает ли это как мы решили?"
      ↓
      └── эскалация событий на любой уровень вверх
```

---

## CLI — Справочник команд

### Общие опции

Все команды поддерживают флаг `--dir <path>` для указания директории проекта. По умолчанию используется текущая директория.

```bash
devkit status                          # текущая папка
devkit status --dir /path/to/project   # указать явно
```

---

### `devkit init` — Инициализация

Создаёт структуру `.devkit/` и определяет состояние проекта.

```bash
devkit init
```

**Вывод:**
```
🚀 DevKit Init

  Detected: greenfield project

  Created:
    + .roo/
    + .roo/commands/00-devkit-init.md
    + .roo/commands/01-research-kit.md
    + .roo/commands/02-product-kit.md
    + .roo/commands/03-arch-kit.md
    + .roo/commands/04-spec-kit.md
    + .roo/commands/05-qa-kit.md
    + .roo/commands/speckit.plan.md
    + .roo/commands/speckit.specify.md
    + .roo/commands/speckit.implement.md
    + .roo/commands/speckit.analyze.md
    + .roo/commands/speckit.checklist.md
    + .roo/commands/speckit.clarify.md
    + .roo/commands/speckit.tasks.md
    + .roo/commands/arch-kit.md
    + .roo/commands/devkit-init.md
    + .roo/commands/qa-kit.md
    + .roo/commands/spec-kit.md
    + .roo/commands/speckit.constitution.md
    + .roo/commands/speckit.git.commit.md
    + .roo/commands/speckit.git.feature.md
    + .roo/commands/speckit.git.initialize.md
    + .roo/commands/speckit.git.remote.md
    + .roo/commands/speckit.git.validate.md
    + .roo/commands/speckit.taskstoissues.md
    + .roo/mcp.json
    + .roo/rules-devkit-coder/rules.md
    + .roomodes
    + .devkit/
    + .devkit/research/
    + .devkit/product/
    + .devkit/arch/
    + .devkit/arch/decisions/
    + .devkit/qa/
    + .devkit/qa/escalations/
    + .devkit/STATUS.md

  🧠 Agent Skills: 6 installed → .agent/skills/

  🔗 13 speckit commands enhanced with DevKit hooks

  Next steps:
    Start with: /research-kit
    Describe your idea and explore feasibility.
```

Команда идемпотентна — повторный вызов ничего не ломает. При инициализации автоматически инжектятся DevKit-хуки в speckit-команды (`.claude/, .roo/, .gemini/`).

---

### `devkit status` — Статус проекта

Показывает текущую фазу, прогресс, открытые эскалации и доступные команды.

```bash
devkit status
```

**Вывод:**
```
╔══════════════════════════════════════╗
║         DevKit Status                ║
╚══════════════════════════════════════╝

  Mode:        greenfield
  Initialized: 2026-02-19
  Phase:       ArchKit

  Progress:
    ✅ ResearchKit
    ✅ ProductKit
    ⬜ ArchKit ◀ current
    ⬜ SpecKit
    ⬜ QAKit

  Next: Define technical invariants. Run /arch-kit

  ⚡ Open escalations:
    📋 RFC-001: Add watch mode (RFC)
    🔬 INV-001: SQLite performance (Investigation)

  Available commands for this phase:
    devkit status
    devkit validate
    devkit gate
    devkit advance
    devkit coverage
    devkit dashboard
    devkit brief
    devkit generate-constitution
    devkit impact "..."
    devkit rfc "..."
    devkit investigate "..."
```

> **Progressive disclosure (U5):** команды показываются только если релевантны текущей фазе. В QAKit фазе появится `devkit escalate`, а в ArchKit — `devkit rfc`.

---

### `devkit validate` — Валидация артефактов

Проверяет все `.devkit/` артефакты на наличие обязательных секций и структурированных полей.

```bash
devkit validate
```

**Вывод при ошибках:**
```
🔍 DevKit Validate

  Checked: 4 artifacts

  Errors:
    ✗ .devkit/research/unknowns.md:0 — Missing section "## Unknown: [name]"
      Fix: Add section "## Unknown: [name]" to unknowns.md

    ✗ .devkit/research/unknowns.md:12 — Missing field BLOCKER
      Fix: Add "BLOCKER: yes / no" under each "## Unknown:" section
```

Каждая ошибка содержит: файл, строку, описание и **конкретную инструкцию по исправлению** (UX Invariant U3).

---

### `devkit gate` — Проверка перехода

Проверяет можно ли перейти на следующую фазу. Каждая фаза имеет свои условия.

```bash
devkit gate                    # проверить текущую фазу
devkit gate --phase research   # проверить конкретную фазу
```

**Вывод:**
```
🚧 DevKit Gate Check

  Gate: ResearchKit → ProductKit

    ✅ market.md exists
    ✅ feasibility.md exists
    ✅ unknowns.md exists
    ✅ assumptions.md exists
    ✅ No open blocker unknowns

  Result: ✅ GATE PASSED — transition allowed
```

**Если заблокировано:**
```
  Gate: ResearchKit → ProductKit

    ✅ market.md exists
    ✅ feasibility.md exists
    ✅ unknowns.md exists
    ❌ assumptions.md missing
    ❌ Open blocker unknowns: "Database scalability"

  Result: ❌ GATE BLOCKED — resolve conditions first
```

---

### `devkit advance` — Переход на следующую фазу

Проверяет gate и продвигает проект на следующую фазу в STATUS.md.

```bash
devkit advance           # с проверкой gate
devkit advance --force   # без проверки (не рекомендуется)
```

**Вывод:**
```
⏩ Advance Phase

  ✅ Advanced: ResearchKit → ProductKit
```

---

### `devkit generate-constitution` — Генерация конституции

Собирает `constitution.md` из технических инвариантов, UX инвариантов и ADR решений.

```bash
devkit generate-constitution
```

**Вывод:**
```
📜 Generate Constitution

  ✅ Constitution generated!
     Technical invariants: 3
     UX invariants:        6
     ADR decisions:        2
     Output: .devkit/arch/constitution.md

  Run "devkit sync" to transform and sync to .specify/memory/constitution.md
```

**Источники:**
- `.devkit/arch/invariants.md` — технические инварианты (`## I1:`, `## I2:` ...)
- `.devkit/product/ux_invariants.md` — UX инварианты (`## U1:`, `## U2:` ...)
- `.devkit/arch/decisions/ADR-*.md` — Architecture Decision Records
- `.devkit/arch/decisions/RFC-*.md` — Active RFCs (listed separately)

---

### `devkit sync` — Синхронизация конституции

Трансформирует `constitution.md` из DevKit-формата (инварианты) в spec-kit формат (Core Principles) и записывает в `.specify/memory/constitution.md`.

```bash
devkit sync
```

**Вывод:**
```
🔄 Sync Constitution

  ✅ Synced!
     .devkit/arch/constitution.md → .specify/memory/constitution.md
```

---

### `devkit impact "описание"` — Анализ влияния

Анализирует как предложенное изменение повлияет на инварианты и компоненты.

```bash
devkit impact "add authentication to CLI"
devkit impact "remove offline mode"
devkit impact "change error format"
```

**Вывод:**
```
💥 Impact Analysis

Impact Analysis: "add authentication to CLI"
Risk: 🟡 MEDIUM

  Affected invariants:
    ⚡ U4: Non-invasive integration
    ⚡ U5: Progressive disclosure

  💡 This change touches 2 invariant(s). Open an RFC via "devkit rfc" before proceeding.
```

**Уровни риска:**
- 🟢 **LOW** — 0 затронутых инвариантов
- 🟡 **MEDIUM** — 1-2 затронутых инварианта
- 🔴 **HIGH** — 3+ затронутых инвариантов (exit code 1)

---

### `devkit rfc "описание"` — Создание RFC

Создаёт RFC (Request for Change) с автоматическим impact analysis.

```bash
devkit rfc "Add watch mode for validate command"
```

**Вывод:**
```
📋 Create RFC

  ✅ Created: RFC-001
     Path:   .devkit/arch/decisions/RFC-001.md
     Risk:   🔴 high

  Affected invariants:
    ⚡ U3: Artifact validation with actionable errors
    ⚡ U4: Non-invasive integration
    ⚡ U6: Offline-first

  Next: Fill Options and Decision in the RFC file.
  Then: devkit resolve-rfc RFC-001 "Option A" "rationale"
```

**Что происходит автоматически:**
1. Запускается `impact analysis`
2. Заполняются `Affected Invariants` и `Affected Specs`
3. Подсчитывается `Change Cost` (specs + invariants)
4. Генерируется шаблон с Options A/B и Post-Decision Actions

**Жизненный цикл RFC:**
```bash
devkit rfc "описание"                              # создать
devkit rfc-list                                      # посмотреть все
# (вручную заполнить Options в файле)
devkit resolve-rfc RFC-001 "Option A" "rationale"  # закрыть
devkit generate-constitution                         # обновить конституцию
devkit sync                                          # синхронизировать
```

---

### `devkit investigate "описание"` — Расследование

Создаёт Investigation для технического блокера или сломавшегося допущения.

```bash
devkit investigate "SQLite performance degrades under concurrent load"
```

**Вывод:**
```
🔬 Create Investigation

  ✅ Created: INV-001
     Path: .devkit/arch/decisions/INV-001.md

  🔗 Linked ADR: ADR-001
     Broken assumption: SQLite handles concurrent writes

  Invariants at risk:
    ⚠️  U2: Status at a glance
```

**Что происходит автоматически:**
1. Ищутся ADR файлы с assumption'ами содержащими ключевые слова
2. Если найден — линкуется как `ASSUMPTION_IN: ADR-XXX`
3. Определяются инварианты под угрозой

**Жизненный цикл Investigation:**
```bash
devkit investigate "описание"                                   # создать
devkit inv-list                                                  # посмотреть все
# (вручную заполнить Options и REALITY в файле)
devkit resolve-inv INV-001 "use WAL mode" "fixes concurrency"  # закрыть
devkit generate-constitution                                     # обновить
```

---

### `devkit escalate "описание"` — QA Эскалация

Создаёт эскалацию с автоматическим определением уровня.

```bash
devkit escalate "user finds error messages confusing and unintuitive"
devkit escalate "data loss from race condition in save"
devkit escalate "we assumed API would be free but it costs money"
devkit escalate "function returns wrong value"
```

**Автоматическая маршрутизация:**
```
🚨 QA Escalation

  ✅ Created: ESC-001
     Path:  .devkit/qa/escalations/ESC-001.md
     Level: 👤 productkit
     Why:   UX issue detected ("confusing"). Escalating to ProductKit.

  Action: Review .devkit/product/ux_invariants.md
```

**4 уровня эскалации:**

| Уровень | Когда | Пример ключевых слов | Действие |
|---------|-------|---------------------|----------|
| 🔧 speckit | Код ≠ спека | (по умолчанию) | Фикс в коде |
| 🏛️ archkit | Инвариант нарушен | invariant, race condition, data loss, security | `devkit investigate` |
| 👤 productkit | UX проблема | confusing, unintuitive, hard to use, awkward | Ревью UX инвариантов |
| 🔬 researchkit | Assumption ложный | assumed, turns out, wrong assumption | Ревизия research |

**Принудительный уровень:**
```bash
devkit escalate "some issue" --level archkit
```

---

### `devkit rfc-list` / `devkit inv-list` — Списки

```bash
devkit rfc-list
```
```
📋 RFCs

  🟡 RFC-001: Add watch mode [open]
  ✅ RFC-002: Change error format [accepted]
```

```bash
devkit inv-list
```
```
🔬 Investigations

  🟡 INV-001: SQLite performance [open]
  ✅ INV-002: Memory leak [resolved]
```

---

### `devkit coverage` — Карта покрытия инвариантов

Показывает какие инварианты покрыты тестами, а какие нет.

```bash
devkit coverage
```

**Вывод:**
```
📊 Coverage Map

Coverage: 6/6 invariants fully covered (100%)

  [██████████████████████████████] 100%

  UX Invariants:
    ✅ U1: Zero-config start
       ↳ qa/test_contracts.md
       ↳ cli/tests/constitution.test.ts
    ✅ U2: Status at a glance
       ↳ qa/test_contracts.md
       ↳ cli/tests/advance.test.ts
    ...
    ❌ U4: Non-invasive integration
       none
```

**Статусы:**
- ✅ **covered** — 2+ источника (тест-файл + test_contracts.md)
- 🟡 **partial** — 1 источник
- ❌ **uncovered** — не найдено ни одного упоминания

---

### `devkit watch` — Авто-валидация

Следит за `.devkit/` и автоматически запускает валидацию при изменении файлов.

```bash
devkit watch
```

**Вывод:**
```
👁️  Watch Mode — Validating on file changes

  Watching: .devkit/**/*.md
  Press Ctrl+C to stop.

  📝 Changed: .devkit/research/unknowns.md
  ─── 21:15:32 ───
  Checked 10 artifact(s)
  ✅ All clear!
```

---

### `devkit dashboard` — Веб-дашборд

Открывает веб-интерфейс с полной картиной проекта.

```bash
devkit dashboard              # порт 3141 по умолчанию
devkit dashboard --port 8080  # кастомный порт
```

**Что показывает:**
- Phase Progress — прогресс по фазам (ResearchKit → QAKit)
- Coverage — процент покрытия инвариантов тестами
- Validation — количество ошибок в артефактах
- Invariant Coverage Map — каждый инвариант + тестовые файлы
- RFCs / Investigations / Escalations — открытые и закрытые

Все данные live из файловой системы. Auto-refresh каждые 5 секунд.

---

### `devkit snapshot` — Снимок состояния

Сохраняет SHA-256 снэпшот текущего `.devkit/` для последующего сравнения.

```bash
devkit snapshot
```

**Вывод:**
```
📸 Snapshot

  ✅ Saved: 2026-02-19_18-39-24_qa.json
     Phase: qa
     Files: 13
     Invariants: 0 tech + 6 UX
     Coverage: 100%

  Use "devkit diff" to compare with next snapshot.
```

**Что сохраняется:**
- SHA-256 хэши всех `.md` файлов в `.devkit/`
- Количество инвариантов (tech + UX)
- Количество ADR, RFC, INV, ESC
- Coverage процент

---

### `devkit snapshot-list` — Список снэпшотов

```bash
devkit snapshot-list
```

```
📸 Snapshots

  [0] 2026-02-19_14-00-00_arch.json
      Phase: arch │ Files: 8 │ Coverage: 33%
  [1] 2026-02-19_18-39-24_qa.json
      Phase: qa │ Files: 13 │ Coverage: 100%
```

---

### `devkit diff` — Сравнение состояний

Показывает что изменилось: добавленные/изменённые/удалённые файлы + дельты по всем метрикам.

```bash
devkit diff                # последний снэпшот vs текущее состояние
devkit diff 0              # снэпшот [0] vs текущее состояние
devkit diff 0 1            # сравнить два снэпшота по индексу
```

**Вывод:**
```
🔍 Diff

  From: arch (2026-02-19)
  To:   qa (2026-02-19)

  Files: 5 change(s)
    ➕ qa/test_contracts.md
    ➕ qa/escalations/ESC-001.md
    ✏️  STATUS.md
    ✏️  product/ux_invariants.md

  Stats:
    ➖ Technical invariants: =
    📈 UX invariants: +2
    📈 RFCs: +1
    📈 Escalations: +1
    📈 Coverage: +67%
```

---

### `devkit inject` — Инжекция DevKit-хуков в speckit-команды

Автоматически инжектит DevKit-хуки (impact analysis, validate, coverage) в speckit slash-команды. Вызывается автоматически при `devkit init`, но можно запустить вручную.

```bash
devkit inject           # инжектировать / обновить хуки
devkit inject --force   # переписать даже если хуки актуальны
```

**Вывод (первый запуск):**
```
🔗 DevKit Inject

  Created (from bundle):
    + speckit.specify.md
    + speckit.clarify.md
    + speckit.plan.md
    + speckit.tasks.md
    + speckit.implement.md
    + speckit.analyze.md
    + speckit.checklist.md

  ✅ 7 speckit commands enhanced with DevKit hooks
```

**Повторный запуск:**
```
🔗 DevKit Inject

  Already current:
    ✓ speckit.specify.md
    ✓ speckit.clarify.md
    ...

  All speckit commands already up-to-date.
```

---

### `devkit brief` — Индекс проекта для AI-агентов

Генерирует `.devkit/BRIEF.md` — компактный индекс проекта (~60-100 строк), который AI-агент читает в начале сессии для получения актуального контекста.

```bash
devkit brief              # генерирует .devkit/BRIEF.md
devkit brief --stdout     # вывод в консоль
```

**Вывод:**
```
📄 Project Brief

  ✅ Generated: .devkit/BRIEF.md
     Invariants: 8 tech + 6 UX
     Open items: 0
     Lines: 62

  AI agents should read this file at session start.
  Regenerate anytime: devkit brief
```

**Что содержит BRIEF.md:**
- Текущая фаза и прогресс
- Все инварианты (ID + одна строка) — не полное описание
- Открытые RFC / INV / ESC
- Недавние решения (последние 5)
- Структура проекта
- Доступные команды devkit и npm scripts

**Идея:** Agent-specific файлы (`CLAUDE.md`, `.gemini/`) ссылаются на `BRIEF.md`, а не дублируют информацию. Один brief, много потребителей.

---

**Какие хуки инжектятся:**

| Команда | Хук | Что делает |
|---------|-----|------------|
| speckit.specify | invariant-guard | Маппит фичу на инварианты, `devkit impact`, `devkit validate` |
| speckit.clarify | invariant-check | Флагает если кларификация задевает инвариант, предлагает `devkit rfc` |
| speckit.plan | constitution-precheck | `devkit validate` перед планированием |
| speckit.plan | plan-postcheck | `devkit validate` + `devkit impact` после плана |
| speckit.tasks | validate-checkpoints | Добавляет checkpoint-задачи `devkit validate` между фазами |
| speckit.implement | phase-guards | `devkit impact` перед архитектурными задачами, `devkit investigate` при сбоях |
| speckit.analyze | coverage-pass | Добавляет detection pass G: покрытие инвариантов через `devkit coverage` |
| speckit.checklist | invariant-category | Обязательная категория "DevKit Invariant Coverage" в чеклисте |

**Механизм:** хуки обёрнуты маркерами `<!-- DEVKIT:START:hook-name -->` / `<!-- DEVKIT:END:hook-name -->` для идемпотентности. При повторном запуске обновляется только содержимое между маркерами — остальной контент файла сохраняется.

---

## Типичные workflow

### Greenfield проект

```bash
specify init . --integration roo                  # установить spec-kit (.specify/)
devkit init                             # создать .devkit/ + .roomodes, .roo/, команды
# → Работа с AI через /research-kit
devkit validate                         # проверить артефакты
devkit gate                             # готовы ли к следующей фазе?
devkit advance                          # перейти к ProductKit
# → Работа через /product-kit
devkit advance                          # → ArchKit
devkit generate-constitution            # собрать конституцию
devkit sync                             # → .specify/memory/
# → Работа через /speckit.specify, /speckit.plan, /speckit.tasks ...
#   (speckit-команды теперь DevKit-aware: impact, validate, coverage)
devkit coverage                         # проверить покрытие
devkit brief                            # сгенерировать индекс для AI-агентов
devkit dashboard                        # открыть веб-панель
```

### Новое требование в середине разработки

```bash
devkit impact "add OAuth authentication"      # оценить влияние
# Risk: 🔴 HIGH — 3 инварианта затронуты
devkit rfc "add OAuth authentication"         # создать RFC
# → Заполнить Options в RFC-001.md
devkit resolve-rfc RFC-001 "OAuth2 + PKCE" "industry standard"
devkit generate-constitution                    # обновить
devkit sync                                     # синхронизировать
```

### Баг в QA

```bash
devkit escalate "benchmark shows 10x slowdown on large files"
# → Level: 🏛️ archkit — performance invariant
# → Action: devkit investigate "..."
devkit investigate "file processing performance regression"
# → Linked ADR: ADR-003, Invariant at risk: I2
# → Заполнить Options
devkit resolve-inv INV-001 "streaming parser" "O(1) memory"
devkit generate-constitution
```

---

## Ключевые принципы

### 1. Фазовая дисциплина
AI знает на каком уровне находится и не может перепрыгнуть вперёд. На каждом уровне есть явные ALLOWED и FORBIDDEN действия. Переход возможен только когда уровень закрыт.

### 2. Артефакты как источник истины
Каждый уровень производит машиночитаемые артефакты которые следующий уровень получает на вход. Не markdown для людей — структурированные документы со схемой.

### 3. Инварианты как контракты
Система описывается через то что она **гарантирует**, а не через то как реализована. Инварианты бывают технические (ArchKit) и UX (ProductKit). Нарушение инварианта — блокер.

### 4. Детектор событий
AI в процессе диалога распознаёт тип события и автоматически переключает уровень — без явных команд от разработчика:

| Событие | Триггер | Действие |
|---------|---------|----------|
| RFC | "нам ещё нужно X", "добавь Y" | Стоп SpecKit → ArchKit delta-цикл |
| Investigation | "баг в либе", "бенчмарк упал" | Стоп SpecKit → ArchKit Investigation |
| Product Blocker | "неудобно использовать" | Стоп SpecKit → ProductKit investigation |
| QA Эскалация | тест упал | Анализ уровня → эскалация куда нужно |

### 5. Явная цена изменений
Любое изменение проходит impact analysis до принятия решения. Разработчик видит стоимость до действия, а не после.

---

## Структура артефактов

```
.devkit/
  STATUS.md               ← текущая фаза, прогресс
  research/
    market.md             ← аналоги, ниши, конкуренты
    feasibility.md        ← техническая реализуемость
    unknowns.md           ← карта неизвестного
    assumptions.md        ← что предполагаем, риск каждого
  product/
    users.md              ← кто пользователь, сценарии
    ux_invariants.md      ← UX гарантии системы
    roadmap.md            ← фазы, приоритеты, anti-scope
  arch/
    invariants.md         ← технические инварианты
    impact.md             ← карта зависимостей решений
    constitution.md       ← генерируется → копируется в .specify/
    decisions/
      ADR-XXX.md          ← Architecture Decision Records
      RFC-XXX.md          ← Requests for Change
      INV-XXX.md          ← Investigations
  qa/
    test_contracts.md     ← тест для каждого инварианта
    assumption_checks.md  ← валидация assumptions из research
    coverage_map.md       ← какие инварианты покрыты
    escalations/
      ESC-XXX.md          ← история QA эскалаций

.roomodes                 ← Custom Modes для Roo Code (3 режима: devkit-coder, devkit-research, devkit-architect)

.roo/                     ← Roo Code конфигурация (копируется из DevKit/.roo/)
  mcp.json                ← MCP-серверы (memory, context7)
  commands/               ← слэш-команды с DevKit-хуками
  rules-devkit-coder/     ← правила режима Devkit Coder
    rules.md

.specify/                 ← github/spec-kit (не редактировать вручную)
  memory/
    constitution.md       ← OWNED BY ArchKit, не редактировать

.claude/, .roo/commands/, .gemini/   ← speckit slash-команды с DevKit-хуками
  speckit.specify.md      ← /speckit.specify + invariant-guard
  speckit.clarify.md      ← /speckit.clarify + invariant-check
  speckit.plan.md         ← /speckit.plan + constitution-precheck + plan-postcheck
  speckit.tasks.md        ← /speckit.tasks + validate-checkpoints
  speckit.implement.md    ← /speckit.implement + phase-guards
  speckit.analyze.md      ← /speckit.analyze + coverage-pass
  speckit.checklist.md    ← /speckit.checklist + invariant-category
```

---

## Отношение к github/spec-kit

DevKit не заменяет spec-kit. SpecKit — это уровень 4 экосистемы.

```
Без DevKit:
  разработчик → пишет constitution вручную
             → AI додумывает архитектуру сам
             → хитрит потому что основания нет

С DevKit:
  ArchKit генерирует constitution.md из верифицированных решений
  SpecKit получает доказанное основание
  AI не может отклониться — инварианты зафиксированы
```

**Интеграция через `devkit inject`:**

`devkit init` автоматически инжектит DevKit-хуки в speckit slash-команды (`.claude/, .roo/, .gemini/`). Это превращает стандартный spec-kit workflow в DevKit-aware: каждая speckit-команда теперь запускает `devkit validate`, `devkit impact`, `devkit coverage` в нужных точках. Spec-kit продолжает работать как execution engine, а DevKit обеспечивает контроль инвариантов.

```
specify init . --integration roo         # ① spec-kit: скрипты, шаблоны, memory
devkit init                    # ② devkit: .devkit/ + .roomodes, .roo/, хуки
/speckit.specify ...           # ③ speckit-команда запускает devkit impact/validate
```

---

## Agent Skills

DevKit распространяется как набор [Agent Skills](https://agentskills.io) — работает с любым совместимым агентом: Claude Code, Cursor, VS Code Copilot и другими.

| Skill | Когда активируется |
|-------|-------------------|
| [devkit-init](./devkit-init/) | "init devkit", старт проекта |
| [research-kit](./ResearchKit/) | новая идея, feasibility вопросы |
| [product-kit](./ProductKit/) | "кто пользователь", "что MVP" |
| [arch-kit](./ArchKit/) | архитектура, RFC, Investigation |
| [spec-kit](./SpecKit/) | реализация + детектор событий |
| [qa-kit](./QAKit/) | тестирование, эскалации |

---

## Лицензия

MIT

### Интеграция с Roo Code

DevKit-Roo автоматически настраивает Roo Code для работы по методологии через Custom Modes.

#### Пять уровней методологии в Roo Code:
1. **[ResearchKit]** → "возможно ли это вообще?" (Анализ рынка, техническая осуществимость).
2. **[ProductKit]** → "что именно строим и для кого?" (UX инварианты, роадмап).
3. **[ArchKit]** → "как это устроено технически?" (Технические инварианты, ADR, RFC).
4. **[SpecKit]** → "строим" (Интеграция с github/spec-kit).
5. **[QAKit]** → "работает ли это как мы решили?" (Контракты тестов, эскалации).

#### Custom Modes (`.roomodes`):
При запуске `devkit init` в корне проекта создаётся файл `.roomodes` с тремя режимами:

| Режим | Slug | Назначение |
|-------|------|------------|
| **Devkit Coder** | `devkit-coder` | Основной режим разработки. Честная и верифицируемая разработка: проверяй зависимости, не предполагай, сначала читай потом пиши. 17 правил честной разработки. |
| **Devkit Research** | `devkit-research` | Анализ идеи, конкуренты, feasibility. Используй поиск и свои знания. Не пиши код. |
| **Devkit Architect** | `devkit-architect` | Создание спецификаций, архитектурных решений, ADR, RFC. Не переходи к коду. |

Файл `.roomodes` пишется в YAML-формате (предпочтительный для Roo Code с версии 3.18). При повторном `devkit init` он обновляется из шаблона.

#### `.roo/` — конфигурация для Roo Code:
При инициализации из шаблона `DevKit/.roo/` копируется полная структура:
- **`mcp.json`** — предустановленные MCP-серверы: `memory` (память между сессиями), `context7` (документация библиотек)
- **`commands/*.md`** — слэш-команды для всех уровней методологии (`/devkit-init`, `/research-kit`, `/speckit.plan`, ...)
- **`rules-devkit-coder/rules.md`** — 17 правил режима Devkit Coder

Все speckit-команды автоматически дополняются хуками `devkit validate`, `devkit impact`, `devkit coverage`. Это гарантирует, что агент не сможет перейти к реализации, пока архитектурные артефакты не пройдут валидацию.

---

## Обновление проекта (Upgrade)

Если вы начинали проект с предыдущей версии DevKit и хотите применить изменения:

```bash
# Убедитесь, что используется актуальная сборка из вашего форка
cd DevKit/cli && npm install && npm run build

# Запустите init повторно — он безопасен (idempotent)
devkit init

# Результат:
# - .roomodes будет обновлён из шаблона (3 режима вместо старых SpecKit-режимов)
# - .roo/ пополнится новыми файлами (mcp.json, правила devkit-coder)
# - .devkit/ останется без изменений
```

Что происходит при повторном `devkit init`:

| Что | Поведение |
|-----|-----------|
| `.roomodes` | **Обновляется** — перезаписывается из шаблона `DevKit/.roomodes` (YAML, 3 режима) |
| `.roo/` | **Дополняется** — новые файлы добавляются, существующие не трогаются |
| `.devkit/` | **Пропускается** — существующие артефакты не изменяются |
| `.agent/skills/` | **Пропускается** — уже установленные навыки не перезаписываются |
| Speckit-команды | **Обновляются** — DevKit-хуки инжектятся в существующие файлы |

Если вы вручную меняли `.roomodes` и не хотите их терять — сохраните копию перед `devkit init`, затем примените свои изменения поверх обновлённого файла.
