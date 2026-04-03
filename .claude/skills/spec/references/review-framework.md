# Adversarial Review Framework

Structured criteria for the holistic spec review (`/spec review`). Two lenses challenge the spec independently before a combined verdict.

## PM Lens — Should We Build This?

### 1. Problem Validity

**Questions:**
- Is the problem validated with evidence (user feedback, server usage)?
- Would guild members notice if we didn't build this?
- Are we solving the root cause or a symptom?

| Severity | Red Flag |
|----------|----------|
| CRITICAL | No evidence the problem exists |
| CRITICAL | Problem statement is actually a solution in disguise |
| WARNING | Problem affects very few guilds/users with no growth path |
| NOTE | Problem validated anecdotally but not measured |

### 2. Value Clarity

**Questions:**
- Can we state the expected outcome in one sentence?
- What user behavior changes, and how?
- What's the cost of NOT building this?

| Severity | Red Flag |
|----------|----------|
| CRITICAL | No measurable success criteria |
| WARNING | Success metric is a vanity metric (e.g., "more engagement") |
| WARNING | Value not justified against other feature priorities |
| NOTE | Value is real but hard to measure directly |

### 3. Longevity

**Questions:**
- Will this still matter in 6 months?
- Are we building for a temporary Discord API version?
- Does this create ongoing maintenance burden?

| Severity | Red Flag |
|----------|----------|
| CRITICAL | Solving a problem that will disappear (deprecated API, sunset feature) |
| WARNING | High maintenance cost relative to value |
| NOTE | Useful now but may need rethinking later |

### 4. Leverage

**Questions:**
- Does this unlock future capabilities or is it a dead end?
- Can other commands/features build on this?
- Are we creating reusable infrastructure or a one-off?

| Severity | Red Flag |
|----------|----------|
| WARNING | Zero reuse potential, pure one-off |
| WARNING | Blocks higher-priority work |
| NOTE | Leverage exists but isn't the primary motivation |

### 5. User Focus

**Questions:**
- Is the user interaction flow clearly described?
- Are edge cases and error states covered (with EARS format where needed)?
- Does the spec consider how users currently interact with the bot?

| Severity | Red Flag |
|----------|----------|
| CRITICAL | No user interaction flow defined |
| WARNING | Happy path only — no error/edge case handling |
| NOTE | User flow exists but lacks detail |

---

## Engineering Lens — Can We Build This Well?

### 1. First Principles

**Questions:**
- Is the simplest possible solution being proposed?
- Can we solve this by modifying an existing command/handler?
- Does the spec duplicate functionality that already exists?
- Are we using existing utilities (Reply, RedisService, config)?

| Severity | Red Flag |
|----------|----------|
| CRITICAL | Duplicates existing command/button/event functionality |
| CRITICAL | Over-engineered for the stated problem (new subsystem for simple feature) |
| WARNING | Could be solved by extending existing handler with a new option |
| NOTE | Simple solution exists but proposed approach has valid trade-offs |

**Discord-bot specific checks:**
- Search `src/commands/slash/` for commands that already handle similar use cases
- Search `src/buttons/` for button handlers that can be extended
- Check if `Reply.embed()` / `Reply.embedButtons()` covers the response needs
- Verify `RedisService` methods handle the caching requirements

### 2. Tech Debt

**Questions:**
- Does this add, reduce, or maintain tech debt?
- Are shortcuts explicitly marked as intentional?
- Is there a plan to address any new debt?

| Severity | Red Flag |
|----------|----------|
| CRITICAL | Introduces debt with no acknowledgment or plan |
| WARNING | Adds to an already-problematic area |
| WARNING | Workaround for a problem that should be fixed properly |
| NOTE | Acceptable debt with clear rationale |

### 3. Pattern Consistency

**Questions:**
- Does the design follow established patterns in this codebase?
- If introducing new patterns, is the justification clear?
- Are naming conventions and file structures consistent?

| Severity | Red Flag |
|----------|----------|
| CRITICAL | Contradicts established patterns with no justification |
| WARNING | Introduces new pattern without explaining why existing one won't work |
| NOTE | Minor style inconsistency |

**Discord-bot pattern checklist:**
- Commands export `{ data: SlashCommandBuilder, execute(ChatInputCommandInteraction) }`
- Buttons export `{ id: BUTTON_ID.xxx, execute(ButtonInteraction) }`
- Events export `{ name: Events.XXX, once: boolean, execute(...args) }`
- Responses use `Reply.embed()` or `Reply.embedButtons()` with auto-footer
- Config accessed via `src/util/config/index.ts`, not `process.env`
- Redis via `RedisService` singleton, not direct ioredis calls
- Types use `ChatInputCommandInteraction` (not `CommandInteraction`)
- Button IDs registered in `src/util/config/button.ts`

### 4. Scale

**Questions:**
- Does the design handle realistic growth (more guilds, more users)?
- Is Redis caching configured with appropriate TTL?
- Are there obvious bottlenecks (N+1 API calls, missing rate limits)?

| Severity | Red Flag |
|----------|----------|
| CRITICAL | Design breaks with concurrent guild usage |
| WARNING | No consideration of Discord API rate limits |
| WARNING | Missing cache TTL or unreasonable durations |
| NOTE | Scales adequately for now but may need revisiting |

### 5. Blast Radius

**Questions:**
- How many files does this change touch?
- Does it modify shared utilities (`Reply`, `RedisService`, `config`)?
- Can this be rolled back easily (revert commit)?
- Does it require new Discord intents or permissions?

| Severity | Red Flag |
|----------|----------|
| CRITICAL | No rollback possible; requires Discord Developer Portal changes |
| CRITICAL | Modifies shared utilities (Reply, RedisService) in breaking ways |
| WARNING | Touches >5 independent files |
| WARNING | Requires new privileged intents (MessageContent, GuildMembers) |
| NOTE | Blast radius is contained but worth monitoring |

---

## Verdict Rubric

### APPROVE

All of the following:
- Zero CRITICAL findings
- Fewer than 3 WARNING findings
- Warnings have clear mitigations noted

### REVISE

Any of the following:
- 1-2 CRITICAL findings that are addressable without rethinking the approach
- 3+ WARNING findings
- Significant gaps in one lens but solid in the other

### RETHINK

Any of the following:
- 3+ CRITICAL findings
- CRITICAL findings in both lenses
- Fundamental mismatch between problem and proposed solution

---

## Finding Limits

To prevent noise and keep reviews actionable:

| Severity | Max Per Lens | Max Combined |
|----------|-------------|--------------|
| CRITICAL | 5 | 5 (deduplicated) |
| WARNING | 7 | 7 (deduplicated) |
| NOTE | 5 | 5 (deduplicated) |

If a lens produces more findings than the limit, keep only the highest-impact ones and note "N additional findings omitted".

---

## Example Output

```
SPEC REVIEW VERDICT: voice-channel-management
==========================================

Overall: REVISE

CRITICAL (1):
1. [ENG: First Principles] Proposed VoiceChannelManager class duplicates
   logic already in voiceStateUpdate.ts event handler. The existing handler
   already tracks channel creation and deletion.
   -> Consider: extending the event handler with ownership tracking
   instead of creating a new manager class.

WARNING (3):
1. [PM: Value Clarity] Success metric "voice channels work better" is not
   measurable. Define: channel creation success rate, user satisfaction,
   or error rate reduction.

2. [ENG: Pattern Consistency] New VoiceService class doesn't follow the
   one-file-per-handler pattern. Commands, buttons, and events should each
   be in their own files following auto-discovery loader convention.

3. [ENG: Blast Radius] Changes touch voiceStateUpdate.ts, 4 new button
   handlers, new model, and RedisService key patterns — 7+ files.
   No rollback strategy described for the Redis key changes.

NOTE (2):
1. [PM: Leverage] Voice management infrastructure enables future features
   like voice channel templates and persistent rooms — good leverage.

2. [ENG: Scale] Redis ownership cache with 12h TTL is appropriate.
   Consider what happens if Redis is flushed — fallback behavior needed.

RECOMMENDATION:
Address the CRITICAL finding first — evaluate extending existing
voiceStateUpdate.ts instead of creating VoiceChannelManager.
Re-run review after revisions.
```
