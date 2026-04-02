---
name: spec
description: SPEC methodology workflow - bridging product requirements and technical implementation. Use when users want to create, plan, discuss, or manage feature specifications. Triggers on /spec commands or requests like "create a spec for X", "plan feature Y", "discuss requirements".
---

# SPEC Methodology Workflow

The SPEC methodology transforms vague feature requests into well-structured specifications through three phases: **requirements**, **design**, and **tasks**. This skill manages the complete spec lifecycle.

## Quick Reference

### Creation Commands (Choose complexity level)

| Effort | Command | Format | Use For |
|--------|---------|--------|---------|
| < 1 day | `/spec micro <feature>` | What/Why/How/Accept | Command fix, config change, simple tweak |
| 1-3 days | `/spec quick <feature>` | Requirements + Tasks | New slash command, button handler, event |
| 3-10 days | `/spec new <feature>` | All 3 phases (lean) | Multi-handler feature, new subsystem |

### Collaborative Commands

| Command | Purpose |
|---------|---------|
| `/spec develop <feature>` | **Recommended**: Guided brainstorm through all phases |
| `/spec discuss <feature> [phase]` | Expert review and refinement |
| `/spec review <feature>` | Adversarial review (PM + Engineering lenses) |
| `/spec requirements <feature>` | Work on requirements phase |
| `/spec design <feature>` | Work on design phase |
| `/spec tasks <feature>` | Work on tasks phase |
| `/spec plan <feature>` | Refine and validate task breakdown |
| `/spec re-plan <feature>` | Mid-implementation task adjustment |

### Management Commands

| Command | Purpose |
|---------|---------|
| `/spec status [feature]` | Show spec status and progress |
| `/spec ready <feature>` | Mark spec as ready to build |
| `/spec build <feature>` | Start implementation from tasks |
| `/spec approve <feature> <phase>` | Approve a specific phase |
| `/spec archive <feature>` | Mark completed spec as done |

## Decision Tree

```
New Work Item
    |-- Effort > 1 day?
    |   |-- No -> /spec micro
    |   |-- Yes -> Multiple handlers (commands + buttons + events)?
    |       |-- No -> Single new command or handler?
    |       |   |-- Yes -> /spec quick
    |       |   |-- No -> /spec quick
    |       |-- Yes -> New loader/subsystem/model needed?
    |           |-- No -> /spec quick
    |           |-- Yes -> /spec new (standard)
```

### Discord-Bot Decision Helpers

| Change Type | Complexity | Recommended |
|------------|-----------|-------------|
| Fix command bug, config change | Micro | `/spec micro` |
| New slash command | Quick | `/spec quick` |
| New button handler + button ID | Quick | `/spec quick` |
| New event handler | Quick | `/spec quick` |
| Multi-handler feature (voice mgmt) | Standard | `/spec new` |
| New loader or subsystem | Standard | `/spec new` |

## Codebase Quick Reference

When writing specs, reference these established patterns:

### Key Utilities
- **Reply:** `Reply.embed(interaction, embed)` / `Reply.embedButtons(interaction, embed, row)` — auto-adds footer
- **Redis:** `redis.setJson(key, value, ttl)` / `redis.getJson(key)` — default 120s TTL
- **Config:** All env vars via `src/util/config/index.ts` — never `process.env` directly
- **Buttons:** IDs in `src/util/config/button.ts` (BUTTON_ID constant)
- **Logging:** `logger` from `src/util/log/logger.mixed.ts`
- **Types:** `src/types/common/discord.d.ts` for Client augmentation (commands, buttons Collections)

### File Structure
```
src/commands/slash/{name}.ts     # One file per slash command (auto-loaded)
src/buttons/{name}.button.ts     # One file per button handler (auto-loaded)
src/events/{name}.ts             # One file per event (auto-loaded)
src/models/{name}.model.ts       # Mongoose schemas
src/util/config/index.ts         # Typed env constants
src/util/config/button.ts        # Button ID constants
src/util/decorator/reply.ts      # Reply utility
src/connector/redis/index.ts     # RedisService singleton
```

### Key Constraints
- **3-second rule:** `reply()` or `deferReply()` within 3 seconds
- **After deferReply:** Use `editReply()` only
- **Types:** `ChatInputCommandInteraction` for commands, `ButtonInteraction` for buttons
- **Intents:** Current: Guilds, GuildMessages, GuildVoiceStates
- **Embed limits:** Title 256, Description 4096, Field name 256, Field value 1024, Total 6000

## Constitutional Gates

Run gates at phase transitions to catch over-engineering early. See [constitutional-gates.md](references/constitutional-gates.md).

### Gate 1: Simplicity (Requirements)
- Can this be solved by modifying an existing command/button/event?
- Are we adding a new loader when existing patterns suffice?
- Could we delete code instead of adding it?

**If any answer suggests simpler solution exists, simplify requirements first.**

### Gate 2: Anti-Abstraction (Design)
- Can we use existing Reply utility instead of custom response handling?
- Are we creating abstractions for a single use case?
- Could we hardcode values instead of making them configurable?

**Favor extending existing patterns over creating new abstractions.**

### Gate 3: Integration-First (Tasks)
- Does the first task produce a working slash command or button handler?
- Can we test by running the bot and interacting?
- Are all tasks 1-4 hours with file paths?

**First task should produce a testable interaction.**

## Phase Workflows

### `/spec develop <feature>` — Guided Brainstorm

The recommended entry point. Guides through all phases with gates.

#### Step 1: Explore project context
Check existing commands, buttons, events, models, recent commits. Understand what exists.

#### Step 2: Ask clarifying questions
- One question per message
- Prefer multiple choice when possible
- Focus on: purpose, constraints, success criteria
- Max 5 questions per phase

#### Step 3: Assess scope
If the request describes multiple independent features, decompose first. Each sub-feature gets its own spec.

#### Step 4: Propose 2-3 approaches
Present options with trade-offs and your recommendation. Lead with the recommended option.

#### Step 5: Present design in sections
Scale each section to its complexity. Ask after each section if it looks right.

#### Step 6: Spec self-review
Check for: placeholders/TBD, internal contradictions, scope creep, ambiguous requirements. Fix inline.

#### Step 7: User approves
Wait for explicit approval before proceeding.

#### Step 8: Proceed to Requirements Phase
Apply the appropriate template based on complexity.

**Key principles:** One question at a time, YAGNI ruthlessly, explore alternatives, incremental validation.

### Requirements Phase

**Act as top-class Product Manager:**
- Challenge value: "Why build this NOW vs other priorities?"
- Quantify impact: "What user behavior will change?"
- Define measurable success: "How do we know we succeeded?"

**Discord-bot red flags to fix:**
- Implementation details ("Add Redis cache to voice handler" -> "Voice channel state persists across bot restarts")
- Naming Discord.js internals ("Use ButtonBuilder" -> "Control panel shows management buttons")
- Referencing code patterns ("Extend VoiceStateUpdate event" -> "Bot detects when users join/leave voice")

### Design Phase

**Reuse-first mindset — Leverage existing patterns:**
- Can we use `Reply.embed()` / `Reply.embedButtons()` for responses?
- Does `RedisService` handle the caching we need?
- Can existing button handlers be extended or composed?
- Is the auto-discovery loader pattern sufficient (no custom registration)?

### Tasks Phase

**Small wins — Each task should be:**
- 1-4 hours max
- Clear success criteria
- End-to-end testable (run bot, interact, verify)
- Ordered by dependency
- Parallelizable tasks marked with [P]

**Discord-bot task ordering pattern:**
```markdown
## Phase 1: Foundation (parallel-ready)
- [ ] [P] Create slash command with basic response (1-2h)
  - File: src/commands/slash/{name}.ts
- [ ] [P] Add button IDs to config (0.5h)
  - File: src/util/config/button.ts

## Phase 2: Core Logic (depends on Phase 1)
- [ ] Implement command logic with embeds (2-3h)
  - File: src/commands/slash/{name}.ts
- [ ] Create button handlers (2-3h)
  - Files: src/buttons/{name}.button.ts

## Phase 3: Events & Integration
- [ ] Create event handler (2-3h)
  - File: src/events/{name}.ts
- [ ] Add Redis caching (1-2h)
```

## Plan Refinement

### `/spec plan <feature>` — Validate Task Breakdown

After Tasks phase, before implementation:
1. Load current tasks and analyze parallelization opportunities
2. Flag tasks >4 hours, suggest decomposition
3. Verify first task produces demonstrable result
4. Output refined plan with phase groupings and [P] markers

### `/spec re-plan <feature>` — Mid-Implementation Adjustment

When implementation reveals plan needs changes:
1. Assess: which tasks completed, which in progress, what triggered re-plan
2. Identify: tasks to add [ADDED], remove [REMOVED], split, merge
3. Preserve: completed tasks unchanged, in-progress context kept
4. Output: updated plan with change markers

## Adversarial Review

### `/spec review <feature>` — Holistic Challenge

Structured challenge before implementation. Unlike `discuss` (cooperative) or self-review (structural), this asks "should we build this?"

#### Step 1: Load all spec content

#### Step 2: Spawn two subagents in parallel

**PM Lens** (subagent_type=Explore):
Evaluate: Problem Validity, Value Clarity, Longevity, Leverage, User Focus.
Each dimension: PASS / WARNING / CRITICAL with evidence.

**Engineering Lens** (subagent_type=Explore):
Evaluate: First Principles, Tech Debt, Pattern Consistency, Scale, Blast Radius.
Cross-reference codebase for pattern violations and existing solutions.
Check: src/commands/slash/, src/buttons/, src/events/, src/util/, src/connector/

#### Step 3: Synthesize findings
Merge, deduplicate, sort by severity: CRITICAL -> WARNING -> NOTE

#### Step 4: Deliver verdict
- **APPROVE** — Zero CRITICAL, <3 WARNING, mitigations noted
- **REVISE** — 1-2 addressable CRITICALs or 3+ WARNINGs
- **RETHINK** — 3+ CRITICALs or fundamental mismatch

See [review-framework.md](references/review-framework.md) for detailed criteria and example output.

## Build & Execution

### `/spec build <feature>` — Task-Aware Execution

For each uncompleted task:

1. **ANNOUNCE:** "Starting Task N: <title>"
2. **PRE-CHECK:** Are dependencies complete? If missing, skip to next independent task
3. **EXECUTE:** Follow task steps sequentially
   - TDD by default: write failing test -> implement -> refactor
   - Each step should be 2-5 minutes of work
   - No placeholders, no TODOs, no "implement later"
4. **VERIFY:** Run `npm run build`, test the interaction
   - Evidence before claims — actually run the bot and verify
5. **UPDATE SPEC:** Mark task complete in tasks.md (`- [ ]` -> `- [x]`)
6. **COMMIT:** Atomic commit per task, reference spec in message
7. **BLOCKED?** Stop and ask. Never guess or force through.

**Execution principles:**
- Bite-sized steps (2-5 min each)
- File structure first (map responsibilities before coding)
- Progress tracking in spec (crash-resilient — anyone can pick up)
- Stop on blockers (missing dep -> skip, unclear req -> ask, wrong plan -> re-plan)

## Quality Limits

| Limit | Value | Rationale |
|-------|-------|-----------|
| Max questions per phase | 5 | Focus on critical unknowns |
| Max requirements | 15 | Scope creep prevention |
| Max design alternatives | 3 | Avoid analysis paralysis |
| Max tasks | 20 | Keep specs actionable |
| Task duration | 1-4 hours | Half-day completable |

**If limits exceeded, split into multiple specs.**

## EARS Validation

Use EARS format for complex conditional requirements:
```markdown
WHEN user clicks voice_lock button THE SYSTEM SHALL deny Connect for @everyone
IF user is not channel owner THEN THE SYSTEM SHALL reply with ephemeral error
```

For simple requirements, prefer checkboxes:
```markdown
- [ ] User can create a temporary voice channel
```

See [ears-format.md](references/ears-format.md) for syntax guide.

## Templates

Templates for each complexity level. See [templates.md](references/templates.md).

- **Micro**: Single markdown file — What/Why/How/Accept
- **Quick**: requirements.md + tasks.md
- **Standard**: requirements.md + design.md + tasks.md

## Spec Directory Convention

All specs live in `docs/specs/` at the project root:

```
docs/specs/YYYYMMDD-feature-name/
```

Examples:
```
docs/specs/20260402-voice-channel-management/
docs/specs/20260403-playlist-queue/
docs/specs/20260405-fix-nsfw-filter/
```

## Philosophy

**The spec process is NOT documentation for documentation's sake.**
It's a collaborative thinking tool where Claude acts as your:

- **Product Partner** — Challenging requirements until crystal clear
- **Technical Mentor** — Suggesting simpler patterns from the existing codebase
- **Devil's Advocate** — Finding holes before code is written

**Key principle:** It's easier to fix a bad idea in a spec than in code.

## Examples

### Creating a spec (guided)
```
User: /spec develop voice-channel-management
Claude: [Guides through requirements -> design -> tasks, referencing
        existing voiceStateUpdate.ts, RedisService patterns, BUTTON_ID]
```

### Quick implementation
```
User: /spec micro fix-voice-lock-button
Claude: [Creates minimal What/Why/How/Accept spec for button fix]
```

### New command spec
```
User: /spec quick playlist-queue
Claude: [Creates requirements + tasks for new /queue command with
        Redis caching and button controls]
```

### Adversarial review
```
User: /spec review voice-channel-management
Claude: [Spawns PM + Engineering lens subagents, delivers APPROVE/REVISE/RETHINK verdict]
```
