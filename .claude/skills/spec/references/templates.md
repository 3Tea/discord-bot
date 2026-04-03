# Spec Templates

Templates for each complexity level, tailored for this Discord.js v14 + TypeScript + Mongoose bot.

## Micro Spec Template

**Use for:** < 1 day effort, command bug fixes, config changes, simple behavior tweaks

**File:** `micro-spec.md`

```markdown
# [Feature Name] - Micro Spec

## What
[One sentence describing what needs to be done]

## Why
[One sentence explaining the user/server value]

## How
[Brief implementation approach - 2-3 sentences max]
- File(s): src/commands/slash/... or src/buttons/... or src/events/...

## Acceptance Criteria
- [ ] [Specific testable criterion 1]
- [ ] [Specific testable criterion 2]
- [ ] [Specific testable criterion 3]

## Discord Bot Checklist
- [ ] 3-second interaction reply/deferReply rule followed?
- [ ] Embed field limits respected?
- [ ] Error responses use ephemeral messages?

---
Estimated effort: < 1 day
```

### Micro Spec Example

```markdown
# Fix Voice Lock Button Not Responding - Micro Spec

## What
Fix the voice_lock button failing silently when the bot lacks Manage Channels permission.

## Why
Users click the lock button and nothing happens — no feedback, no error message.

## How
Check bot permissions before attempting to modify channel overwrites. If missing, reply with an ephemeral error explaining the required permission.
- File(s): src/buttons/voiceLock.button.ts

## Acceptance Criteria
- [ ] Bot replies with ephemeral error when lacking Manage Channels permission
- [ ] Lock/unlock works correctly when bot has proper permissions
- [ ] Error embed follows Reply utility pattern with footer

## Discord Bot Checklist
- [x] 3-second interaction reply/deferReply rule followed
- [x] Embed field limits respected
- [x] Error responses use ephemeral messages

---
Estimated effort: 2 hours
```

## Quick Spec Template

**Use for:** 1-3 days effort, new slash commands, new button handlers, new event handlers

**Files:** `requirements.md`, `tasks.md`

### requirements.md

```markdown
# [Feature Name]

**Priority:** [Critical/High/Medium/Low]
**Estimated effort:** 1-3 days
**Affected Areas:** [commands/slash/, buttons/, events/, models/]

## Problem Statement
[What problem does this solve for users? Why now?]

## User Story
As a [guild member/admin/channel owner], I want to [action], so that [benefit].

## Requirements
- [ ] [Requirement 1 with measurable criterion]
- [ ] [Requirement 2 with measurable criterion]
- [ ] [Requirement 3 with measurable criterion]

## Out of Scope
- [Explicitly excluded item 1]
- [Explicitly excluded item 2]

## Discord Bot Checklist
- [ ] New button IDs added to `src/util/config/button.ts`?
- [ ] New intents required in `src/client.ts`?
- [ ] Redis keys with proper TTL defined?
- [ ] 3-second interaction reply/deferReply rule followed?
- [ ] Type augmentation needed in `src/types/common/discord.d.ts`?
- [ ] Embed field limits respected (title 256, desc 4096, total 6000)?
```

### tasks.md

```markdown
# [Feature Name] - Tasks

## Implementation Tasks

- [ ] [Task 1] (Xh)
  - [Acceptance criterion]
  - File: src/commands/slash/...

- [ ] [Task 2] (Xh)
  - [Acceptance criterion]
  - File: src/buttons/...

- [ ] [Task 3 - Integration] (Xh)
  - Verify command works end-to-end
  - Run bot and test interaction

## Verification
- [ ] Bot starts without errors (`npm run start:dev`)
- [ ] Slash command responds correctly
- [ ] Button interactions work as expected
- [ ] Error cases handled with ephemeral messages

## Progress Log

| Date | Task | Status | Notes |
|------|------|--------|-------|
| | | | |
```

### Quick Spec Example

```markdown
# requirements.md
# Playlist Queue Command

**Priority:** Medium
**Estimated effort:** 2 days
**Affected Areas:** commands/slash/, buttons/

## Problem Statement
Users cannot queue multiple songs — they must wait for each song to finish before adding the next. This disrupts the listening experience in voice channels.

## User Story
As a guild member in a voice channel, I want to queue songs so that music plays continuously without manual intervention.

## Requirements
- [ ] User can add songs to queue with `/queue add <url>`
- [ ] User can view current queue with `/queue list`
- [ ] User can skip current song with `/queue skip`
- [ ] Queue persists in Redis with 2h TTL per guild
- [ ] Queue is limited to 50 songs maximum

## Out of Scope
- Shuffle/repeat modes
- Queue saving/loading across sessions
- DJ role permissions

## Discord Bot Checklist
- [ ] New button IDs added to `src/util/config/button.ts`? — Yes: QUEUE_SKIP, QUEUE_CLEAR
- [ ] New intents required in `src/client.ts`? — No
- [ ] Redis keys with proper TTL defined? — Yes: `queue:{guildId}` with 2h TTL
- [ ] 3-second interaction reply/deferReply rule followed? — Yes, deferReply for add
- [ ] Type augmentation needed in `src/types/common/discord.d.ts`? — No
- [ ] Embed field limits respected? — Yes, paginate queue list at 10 per page
```

## Standard Spec Template

**Use for:** 3-10 days effort, multi-handler features, new subsystems with commands + buttons + events

**Files:** `requirements.md`, `design.md`, `tasks.md`

### requirements.md

```markdown
# [Feature Name]

**Priority:** [Critical/High/Medium/Low]
**Target Users:** [Who benefits from this feature]
**Affected Areas:** [commands/slash/, buttons/, events/, models/, connector/redis/]

## Problem Statement
[What problem does this solve? 2-3 sentences]

**Why Now:** [Business/community urgency]
**Expected Impact:** [Quantified outcomes]

## Functional Requirements

### Feature: [Name]

**User Story:** As a [user type], I want to [action], so that [benefit].

- [ ] [Requirement with measurable criterion]
- [ ] [Requirement with measurable criterion]
- [ ] [Requirement with measurable criterion]

### Edge Cases
- WHEN [trigger] THE SYSTEM SHALL [response]
- IF [condition] THEN THE SYSTEM SHALL [response]

## Non-Functional Requirements

### Performance
- [ ] [e.g., "Reply within 3 seconds, deferReply for longer operations"]

### Reliability
- [ ] [e.g., "Bot recovers voice state after restart"]

## Success Metrics

### Technical
- [ ] [Technical metric]

### User Experience
- [ ] [UX metric]

## Dependencies
- [Existing utility/model/connector to reuse]

## Out of Scope
- [Excluded item 1]

## Discord Bot Checklist
- [ ] New button IDs added to `src/util/config/button.ts`?
- [ ] New intents required in `src/client.ts`?
- [ ] Redis keys with proper TTL defined?
- [ ] 3-second interaction reply/deferReply rule followed?
- [ ] Type augmentation needed in `src/types/common/discord.d.ts`?
- [ ] Embed field limits respected (title 256, desc 4096, total 6000)?
- [ ] New Mongoose model needed? Schema defined?
```

### design.md

```markdown
# [Feature Name] - Design

## Technical Approach

[2-3 paragraphs describing the implementation approach]

## Component Design

### Command: /[name]
- File: `src/commands/slash/[name].ts`
- Subcommands: [list if any]
- Interaction type: `ChatInputCommandInteraction`

### Button Handlers
- Files: `src/buttons/[name].button.ts`
- Button IDs: [list, registered in BUTTON_ID]

### Event Handlers
- File: `src/events/[name].ts`
- Event: `Events.[EventName]`
- once: [true/false]

### Model (if needed)
- File: `src/models/[name].model.ts`
- Interface: `I[Name]`
- Schema fields: [list]

### Redis Keys
- `[prefix]:{id}` — TTL: [duration], Purpose: [what]

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| [Decision 1] | [Choice] | [Why] |

## Trade-offs

**Optimizing for:** [What we prioritize]

**Accepting:**
- [Intentional limitation 1]

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| [Risk 1] | [Mitigation] |
```

### tasks.md

```markdown
# [Feature Name] - Tasks

## Phase 1: Foundation (parallel-ready)

- [ ] [P] Create slash command with basic response (Xh)
  - File: src/commands/slash/[name].ts

- [ ] [P] Add button IDs to config (0.5h)
  - File: src/util/config/button.ts

- [ ] [P] Create Mongoose model (if needed) (Xh)
  - File: src/models/[name].model.ts

## Phase 2: Core Logic (depends on Phase 1)

- [ ] Implement main command logic (Xh)
  - File: src/commands/slash/[name].ts

- [ ] Create button handlers (Xh)
  - Files: src/buttons/[name].button.ts

## Phase 3: Events & Integration

- [ ] Create event handler (Xh)
  - File: src/events/[name].ts

- [ ] Add Redis caching layer (Xh)
  - Using: redis.setJson(), redis.getJson()

## Phase 4: Polish & Testing

- [ ] Add error handling and edge cases (Xh)
- [ ] [P] Test all slash command interactions (1h)
- [ ] [P] Test all button interactions (1h)
- [ ] [P] Test event handler triggers (1h)

## Verification Checklist
- [ ] `npm run build` succeeds
- [ ] Bot starts without errors (`npm run start:dev`)
- [ ] Slash command responds correctly
- [ ] Button interactions work
- [ ] Event handler triggers properly
- [ ] Error cases show ephemeral messages
- [ ] Embeds have footer via Reply utility
- [ ] Redis caching works with correct TTL

## Progress Log

| Date | Task | Status | Notes |
|------|------|--------|-------|
| | | | |
```

## Template Selection Guidance

| Characteristic | Micro | Quick | Standard |
|---------------|-------|-------|----------|
| Effort | < 1 day | 1-3 days | 3-10 days |
| Files affected | 1-2 | 2-4 | 5+ |
| New commands | 0 | 0-1 | 1+ |
| New button handlers | 0 | 0-2 | 2+ |
| New event handlers | 0 | 0-1 | 1+ |
| New models | 0 | 0 | 0-1 |
| Design needed | No | Minimal | Yes |
| Risk level | Low | Low-Med | Medium |

**If effort exceeds 10 days:** Decompose into multiple specs. Each spec should be independently shippable.
