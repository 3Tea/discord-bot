# EARS Format Guide

EARS (Easy Approach to Requirements Syntax) provides structured templates for writing unambiguous requirements.

## When to Use EARS

**Use EARS for:**
- Complex conditional behaviors (voice channel permissions, button state transitions)
- Event-driven responses (voiceStateUpdate triggers, button clicks with preconditions)
- State-dependent behaviors (channel locked, user in cooldown, bot disconnected)
- Error handling and edge cases

**Use checkboxes for:**
- Simple behaviors
- Static requirements
- Most common cases

```markdown
# Prefer checkboxes (most cases)
- [ ] User can create a temporary voice channel
- [ ] Bot replies with an embed showing server info

# Use EARS for complex conditions
WHEN user clicks voice_lock button THE SYSTEM SHALL deny Connect for @everyone
IF user is not the channel owner THEN THE SYSTEM SHALL reply with ephemeral error
```

## EARS Patterns

### 1. Ubiquitous (Always True)

**Format:** `THE SYSTEM SHALL <action>`

For requirements that always apply, without conditions.

```markdown
THE SYSTEM SHALL reply to slash commands within 3 seconds or defer the reply
THE SYSTEM SHALL add a footer to all embed responses via Reply utility
THE SYSTEM SHALL log errors via logger from util/log/logger.mixed.ts
```

### 2. Event-Driven (WHEN)

**Format:** `WHEN <trigger> THE SYSTEM SHALL <response>`

For requirements triggered by specific events.

```markdown
WHEN user joins a voice channel hub THE SYSTEM SHALL create a temporary channel for them
WHEN user clicks the voice_rename button THE SYSTEM SHALL show a modal for channel name input
WHEN voice channel becomes empty THE SYSTEM SHALL delete it after 30 seconds
WHEN slash command is invoked in DM THE SYSTEM SHALL reply with "This command is guild-only"
```

### 3. State-Driven (WHILE)

**Format:** `WHILE <state> THE SYSTEM SHALL <behavior>`

For requirements active during specific states.

```markdown
WHILE channel is locked THE SYSTEM SHALL show a lock indicator in the control panel embed
WHILE user is on cooldown THE SYSTEM SHALL reply with remaining time via redis.ttlKey()
WHILE bot has no voice connection THE SYSTEM SHALL disable playback buttons
```

### 4. Optional Feature (WHERE)

**Format:** `WHERE <feature enabled> THE SYSTEM SHALL <behavior>`

For configurable or optional behaviors.

```markdown
WHERE NSFW mode is enabled THE SYSTEM SHALL allow NSFW content commands
WHERE guild has premium features THE SYSTEM SHALL increase voice channel limit
WHERE development mode is active THE SYSTEM SHALL deploy commands to GUILD_ID only
```

### 5. Unwanted Behavior (IF-THEN)

**Format:** `IF <condition> THEN THE SYSTEM SHALL <response>`

For handling error conditions or exceptions.

```markdown
IF user is not the channel owner THEN THE SYSTEM SHALL reply with ephemeral error
IF interaction has already been replied to THEN THE SYSTEM SHALL use editReply() instead of reply()
IF Redis connection is lost THEN THE SYSTEM SHALL log warning and skip caching
IF embed exceeds 6000 total characters THEN THE SYSTEM SHALL truncate description field
IF MongoDB query fails THEN THE SYSTEM SHALL reply with generic error and log details
```

### 6. Complex (Combined)

**Format:** Combine patterns as needed

```markdown
WHILE user is in a temporary voice channel WHERE channel management is enabled
THE SYSTEM SHALL show a control panel with lock/unlock/rename/limit buttons

WHEN user clicks voice_limit button IF channel is not owned by user
THEN THE SYSTEM SHALL reply with ephemeral "You are not the owner of this channel"

WHEN voice channel becomes empty IF channel is a temporary channel
THEN THE SYSTEM SHALL:
  - Remove channel ownership from Redis
  - Delete the voice channel after 30 seconds
  - Clean up any associated control panel messages
```

## Common Mistakes

### Mistake 1: Vague Ubiquitous Statement

**Vague (avoid):**
```markdown
THE SYSTEM SHALL handle errors
```

**Better (specific):**
```markdown
THE SYSTEM SHALL reply with ephemeral embed containing error message for all command failures
```

### Mistake 2: Implementation Details

**Wrong:**
```markdown
WHEN user submits THE SYSTEM SHALL call redis.setJson() with 120s TTL
```

**Right:**
```markdown
WHEN user creates a temporary channel THE SYSTEM SHALL cache ownership for 12 hours
```

### Mistake 3: Vague Response

**Wrong:**
```markdown
WHEN button clicked THE SYSTEM SHALL handle it appropriately
```

**Right:**
```markdown
WHEN voice_lock button clicked THE SYSTEM SHALL toggle Connect permission for @everyone
```

### Mistake 4: Multiple Actions

**Wrong:**
```markdown
WHEN user joins voice hub THE SYSTEM SHALL create channel AND move user AND send panel AND cache ownership
```

**Right:**
```markdown
WHEN user joins voice hub THE SYSTEM SHALL:
  - Create a temporary voice channel with user's name
  - Move user to the new channel
  - Send control panel embed with management buttons
  - Cache channel ownership in Redis (12h TTL)
```

## EARS vs Checkboxes

| Requirement Type | Format | Example |
|-----------------|--------|---------|
| Simple feature | Checkbox | `- [ ] User can view server info with /info` |
| Permission check | Checkbox | `- [ ] Only admins can use /config command` |
| Error handling | EARS IF | `IF user not in voice THEN reply with ephemeral error` |
| Triggered action | EARS WHEN | `WHEN channel empty THE SYSTEM SHALL delete after 30s` |
| Active state | EARS WHILE | `WHILE locked THE SYSTEM SHALL deny Connect` |
| Optional behavior | EARS WHERE | `WHERE NSFW enabled THE SYSTEM SHALL allow content` |
| Constraint | Checkbox | `- [ ] Embed title must not exceed 256 characters` |

## Quick Reference

```
Ubiquitous:   THE SYSTEM SHALL <always do>
Event:        WHEN <trigger> THE SYSTEM SHALL <response>
State:        WHILE <condition> THE SYSTEM SHALL <behavior>
Feature:      WHERE <enabled> THE SYSTEM SHALL <behavior>
Exception:    IF <error> THEN THE SYSTEM SHALL <handle>
```
