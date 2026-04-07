# Moderation — `kick` Subcommand Design

**Date:** 2026-04-08  
**Status:** Approved  
**Parent:** [2026-04-07-moderation-commands-design.md](./2026-04-07-moderation-commands-design.md) (implemented + post-review fixes in code)

## Overview

Add **`kick`** as a fifth subcommand under **`/moderation`**, removing a member from the guild **without** placing a ban (they may rejoin with a valid invite).

## Permissions

| Actor | Permission |
|-------|------------|
| Invoker | **`KickMembers`** |
| Bot | **`KickMembers`** |

**Rationale:** Matches Discord’s native permission for `GuildMember#kick()`. Same pattern as other subcommands: **no** `setDefaultMemberPermissions` on the root command; enforce in `execute`.

## Slash Command Shape

| Subcommand | Required | Optional |
|------------|----------|----------|
| `kick` | `user` (USER) | `reason` (STRING) |

Descriptions: `cmd.moderation.kick.desc`, `cmd.moderation.kick.user.desc`, `cmd.moderation.kick.reason.desc` — add to **all 15** locale files.

## Behavior & Validation

1. **Guild-only** — same as existing moderation handlers.
2. **Missing `interaction.member`** — `moderation.missing_member`.
3. **Self / bot client** — reject with existing keys (`moderation.no_target_self`, `moderation.no_target_bot`).
4. **Invoker permission** — `KickMembers`; else `moderation.no_permission_kick` (new key).
5. **Target must be in guild** — fetch `GuildMember`; if missing, `moderation.member_not_found`.
6. **Invoker hierarchy** — reuse `invokerCanModerateTarget`; if owner mismatch, `moderation.cannot_moderate_owner`; if role order, `moderation.invoker_hierarchy`.
7. **Bot** — `member.kickable` false → `moderation.bot_hierarchy`; bot lacks `KickMembers` → `moderation.bot_missing_permission_kick` **or** reuse `moderation.bot_missing_permission` with generic text. **Decision:** reuse **`moderation.bot_missing_permission`** (already states bot lacks permission) to avoid extra key sprawl; only add **`moderation.no_permission_kick`** for invoker.
8. **Reason** — `normalizeModerationReason` (512 chars max), same as `timeout` / `ban`).
9. **API** — `await member.kick(reason)` (reason optional).
10. **Success** — embed `moderation.kick_success` with `{{username}}` (or `tag`).

### Out of scope

- Kick-by-ID (user not in member picker) — not in MVP; re-fetch by ID could be a follow-up.
- Audit log in MongoDB — unchanged.

## Error Handling

- Wrap in existing `try/catch`; map Discord errors to `moderation.api_error` unless a specific code is added later.
- Ephemeral for permission/denial paths; public embed for success.

## Internationalization

New keys (minimum):

- `cmd.moderation.kick.desc`
- `cmd.moderation.kick.user.desc`
- `cmd.moderation.kick.reason.desc`
- `moderation.no_permission_kick`
- `moderation.kick_success`

All **15** locale files (`en`, `vi`, `id`, `es`, `ja`, `zh`, `ko`, `pt-BR`, `fr`, `de`, `ru`, `tr`, `it`, `pl`, `nl`).

## Technical Notes

- **File:** extend `src/commands/slash/moderation.ts` — add `.addSubcommand` for `kick` and branch in `execute`.
- **No new intents** or Mongoose models.
- **Docs:** add row to `docs/steering/commands.md` command table.

## Testing / Verification

- Manual: kick a test alt in dev guild; confirm user removed and can rejoin via invite.
- `npm run build` must pass.

## Self-Review

- [x] Permission bit explicit (`KickMembers`).
- [x] Aligned with existing hierarchy + reason helpers.
- [x] Scope bounded (no DB, no kick-by-ID).
