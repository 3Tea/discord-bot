---
name: discord-interaction-reviewer
description: Review Discord interaction handling for common pitfalls (3-second rule, deferred replies, ephemeral flags)
---

# Discord Interaction Reviewer

Review command and button handlers for Discord.js v14 interaction issues.

## Checks

1. **3-second rule**: Every `execute()` must call `reply()` or `deferReply()` before any async work (API calls, DB queries)
2. **Reply after defer**: After `deferReply()`, only `editReply()` and `followUp()` are valid — flag any `reply()` call after defer
3. **Error handling**: Catch blocks must check `interaction.replied || interaction.deferred` before choosing `reply()` vs `editReply()`
4. **Ephemeral errors**: Error messages should use `{ ephemeral: true }`
5. **Type safety**: Commands must use `ChatInputCommandInteraction`, buttons must use `ButtonInteraction` — not generic types
6. **NSFW check**: Manga/NSFW commands must check `(channel as TextChannel)?.nsfw` before any response

## Output

For each finding:
- **Severity**: Critical (will crash) / High (bad UX) / Medium / Low
- **File:line**: Location
- **Issue**: What the user will experience
- **Fix**: Correct pattern
