# Constitutional Gates

Gates are checkpoints at phase transitions that catch over-engineering early. Run them before approving each phase.

## Overview

| Gate | Phase | Purpose |
|------|-------|---------|
| Simplicity Gate | Requirements | Ensure user-centric, measurable requirements |
| Anti-Abstraction Gate | Design | Prevent premature abstraction, leverage existing patterns |
| Integration-First Gate | Tasks | Ensure demonstrable first task (working command/handler) |

## Gate 1: Simplicity Gate

**Run at:** End of Requirements phase, before Design

### Questions to Ask

1. **Can this be solved by modifying an existing command/button/event?**
   - Check if an existing slash command can handle the new use case
   - Check if existing button handlers can be extended
   - If yes, consider micro-spec instead

2. **Are we solving a real problem or an imagined one?**
   - Is there evidence (user feedback, server usage) of the problem?
   - Could we solve it with a config change instead of new code?

3. **Could we delete code instead of adding it?**
   - Sometimes removal is the best feature
   - Check for deprecated commands hiding complexity

4. **Are all requirements user-centric?**
   - No implementation details ("add Redis cache", "use ButtonBuilder")
   - Focus on outcomes, not approach

5. **Are requirements measurable?**
   - Each should have testable acceptance criteria
   - Avoid vague terms without metrics

### Red Flags

| Red Flag | Discord Bot Example | Action |
|----------|-------------------|--------|
| Implementation detail | "Create VoiceStateManager class" | Rewrite: "Users can manage their voice channel" |
| Naming Discord.js internals | "Use ButtonBuilder with customId" | Rewrite: "Control panel shows management buttons" |
| Vague metric | "Improve bot response time" | Add specific: "Reply within 3 seconds" |
| Feature creep | 15+ requirements | Split spec |
| No affected files | Missing file references | Add: "Affects: commands/slash/, events/" |
| Gold plating | "Configurable everything" | Move configurability to Out of Scope |

### Pass Criteria

- [ ] All requirements describe user behaviors, not implementation
- [ ] Each requirement has measurable acceptance criteria
- [ ] Business context explains why this feature matters
- [ ] Requirements count <= 15
- [ ] Affected areas explicitly listed (commands, buttons, events, models)
- [ ] Dependencies on existing utilities identified (Reply, RedisService, etc.)

## Gate 2: Anti-Abstraction Gate

**Run at:** End of Design phase, before Tasks

### Questions to Ask

1. **Can we use existing utilities instead of creating new ones?**
   - `Reply.embed()` / `Reply.embedButtons()` for responses
   - `redis.setJson()` / `redis.getJson()` for caching
   - `logger` for logging
   - Don't reinvent what already works

2. **Are we creating abstractions for a single use case?**
   - Don't create a "BaseCommandHandler" for one command
   - Don't create a "ButtonManager" class when direct handler works
   - Reuse before creating

3. **Could we hardcode values instead of making them configurable?**
   - Hardcode Redis TTLs, channel limits, cooldown durations
   - Configure later when there's evidence of need

4. **Is this the simplest design that meets requirements?**
   - Remove components until it breaks
   - One file per command/button/event — follow existing patterns

5. **Are trade-offs explicit?**
   - Document what we're NOT doing
   - Acknowledge limitations intentionally

### Red Flags

| Red Flag | Discord Bot Example | Action |
|----------|-------------------|--------|
| New base class for one impl | `BaseVoiceHandler` with one child | Direct implementation in handler |
| Custom response utility | Own embed builder wrapper | Use existing `Reply.embed()` |
| Custom caching layer | Own cache manager class | Use `RedisService` methods directly |
| Strategy pattern for one strategy | `VoiceStrategy` with only `DefaultStrategy` | Direct implementation |
| Plugin system | "Extensible command system" | Use auto-discovery loader as-is |
| Ignoring existing patterns | New config reader | Use `src/util/config/index.ts` |

### Pass Criteria

- [ ] Design uses existing utilities (Reply, RedisService, logger, config)
- [ ] Follows auto-discovery loader pattern (commands/, buttons/, events/)
- [ ] No abstractions for single use cases
- [ ] Trade-offs are explicit and intentional
- [ ] Design alternatives <= 3
- [ ] No "future-proofing" without current evidence

## Gate 3: Integration-First Gate

**Run at:** End of Tasks phase, before Implementation

### Questions to Ask

1. **Does the first task produce a working command or handler?**
   - Should create a slash command that responds, or a button that triggers
   - Must be verifiable by running the bot and interacting
   - Not just "set up types" — that's not testable alone

2. **Can we verify by running the bot?**
   - Type a slash command and get a response
   - Click a button and see the result
   - Join a voice channel and observe behavior
   - Early verification catches wiring issues

3. **Are we parallelizing where dependencies allow?**
   - Command file and button handler can be parallel [P]
   - Model and config constants can be parallel [P]
   - Event handler depends on model — sequential

4. **Are all tasks 1-4 hours?**
   - Slash command + basic response: 1-2h
   - Button handler + interaction: 1-2h
   - Event handler + logic: 2-3h
   - Redis caching layer: 1-2h

5. **Do tasks include file paths?**
   - Every task should reference `src/commands/slash/`, `src/buttons/`, etc.
   - Helps verify correct placement in auto-discovery structure

### Red Flags

| Red Flag | Discord Bot Example | Action |
|----------|-------------------|--------|
| First task not testable | "Create TypeScript interfaces" | Start with "Create command + reply" |
| 8+ hour tasks | "Implement voice management (8h)" | Split: command (2h) + buttons (2h) + events (2h) |
| No parallel markers | All sequential tasks | Command + model can be parallel |
| Missing file paths | "Update the handler" | Add: "File: src/buttons/voiceLock.button.ts" |
| No button ID registration | Missing BUTTON_ID update | Add: "Register in src/util/config/button.ts" |
| Too many tasks | 25+ tasks | Split into multiple specs |

### Pass Criteria

- [ ] First task produces demonstrable result (working command/button)
- [ ] All tasks are 1-4 hours
- [ ] Parallelizable tasks marked with [P]
- [ ] Each task has clear acceptance criteria
- [ ] Each task includes file path(s)
- [ ] Task count <= 20

## Running Gates

### Manual Checklist

Before approving each phase:

1. Read the gate questions for current phase
2. Answer each honestly
3. If any answer suggests simpler approach (reuse existing pattern), simplify first
4. Document any intentional exceptions

## Gate Results

| Result | Meaning | Action |
|--------|---------|--------|
| PASS | All criteria met | Proceed to next phase |
| WARN | Minor issues found | Review and address if simple |
| FAIL | Critical issues found | Must fix before proceeding |

## Philosophy

Gates are not bureaucracy — they're thinking tools. The goal is to:

1. **Catch over-engineering early** — before code is written
2. **Encourage reuse** — leverage Reply, RedisService, auto-discovery loaders, existing patterns
3. **Document decisions** — explicit trade-offs
4. **Enable iteration** — ship small, learn fast

If gates consistently pass, you're building the right thing the right way.
If gates consistently fail, you're probably over-thinking or ignoring existing patterns.
