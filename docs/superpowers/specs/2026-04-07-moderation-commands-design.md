# Moderation Slash Commands Design

**Date:** 2026-04-07
**Status:** Approved

## Overview

Add a single slash command group **`/moderation`** (name may be `moderation` in code; display strings localized) exposing server moderation actions for staff:

| Subcommand | Purpose |
|------------|---------|
| `timeout` | Apply Discord **Timeout** (disables text + voice in the guild) for a **duration ≤ 28 days** |
| `untimeout` | Remove an active timeout early |
| `ban` | Permanently remove a user from the guild (optional message purge window) |
| `unban` | Revoke a ban by **user ID** |

**Out of scope for this spec:** mute longer than 28 days without ban (requires roles or scheduling), channel-specific denies, kick (can be a follow-up), persistent audit log in MongoDB.

## Permissions

**Invoker (guild member running the command):**

- `timeout` / `untimeout`: **`ModerateMembers`**
- `ban` / `unban`: **`BanMembers`**

Rationale: matches Discord’s native permission model and allows moderators without full `Administrator`.

**Bot (guild member):** must have **`ModerateMembers`** for timeout, **`BanMembers`** for ban/unban, and role **above** the target member’s highest role when acting on a member. Document user-facing errors when hierarchy or missing permissions block the action.

**Optional hardening:** if product later requires “only Administrator,” gate with `PermissionFlagsBits.Administrator` instead—explicitly not the default in this spec.

## Slash Command Shape

- **Root:** `/moderation`
- **Subcommands:** `timeout`, `untimeout`, `ban`, `unban`
- **Options (conceptual):**

| Subcommand | Required options | Optional options |
|------------|------------------|------------------|
| `timeout` | `user` (USER), `duration` (see below) | `reason` (STRING, max length per Discord) |
| `untimeout` | `user` (USER) | — |
| `ban` | `user` (USER) | `reason` (STRING), `delete_message_seconds` (INTEGER choices: 0, 3600, 86400, 604800, 432000 as allowed by API) or equivalent safe mapping |
| `unban` | `user_id` (STRING — snowflake) | `reason` (STRING) |

**Duration input:** one clear pattern only (implementation detail): e.g. integer `duration` + `duration_unit` enum (`minutes`, `hours`, `days`) with validation that computed milliseconds ≤ **28 days** (Discord limit). Reject zero/negative.

## Behavior & Validation

1. **Guild-only:** reject DMs with a localized error (existing `common.*` pattern if available).
2. **Self-target / bot-target:** reject targeting self or the bot user with a clear message (optional: reject targeting the guild owner from non-owner—product choice: **allow** if permissions allow, Discord API will still enforce where applicable).
3. **Timeout:** `GuildMember#timeout(ms, reason)`; cap duration at 28 days; trim or validate `reason` length.
4. **Untimeout:** `GuildMember#timeout(null)` or equivalent; handle “not timed out” as informational success or explicit message—pick **explicit** (“user is not timed out”).
5. **Ban:** `GuildMember#ban` or `Guild#members.ban` with `deleteMessageSeconds` when supported; map option to API-allowed values only.
6. **Unban:** `Guild#bans.remove(userId)`; validate snowflake format before API call.

## Error Handling

- Wrap Discord API errors: use `catch (error: unknown)`, map `DiscordAPIError` codes where useful (e.g. missing permissions, unknown ban) to localized keys.
- Respect **3-second interaction rule:** `deferReply` if needed; typically direct API is fast enough—use **`await` on all interaction replies**.
- Ephemeral errors for permission/hierarchy/validation failures where appropriate.

## Internationalization

- Add keys under a consistent prefix (e.g. `moderation.*`, `cmd.moderation.*` for descriptions) to **all 15 locale files** per project rules.
- English primary in `setDescription`; localized descriptions via `descriptionLocales`.

## Technical Notes

- **Intents:** default client intents remain sufficient for slash flows; `unban` uses ID string, no extra intent required for MVP.
- **No new Mongoose models** for MVP (no persistent mod log in this spec).
- **Files:** new command module under `src/commands/slash/` (e.g. `moderation.ts`) following existing slash command patterns (`Reply`, `resolveLocale`, `t`).

## Testing / Verification

- Manual: run bot in dev guild, exercise each subcommand with mod account and confirm Discord UI reflects timeout/ban state.
- `npm run build` must pass.

## Self-Review Checklist

- [x] No contradictory requirements (28-day cap explicit; unban by ID explicit).
- [x] Scope bounded (no role-mute, no DB audit in v1).
- [x] Permission model explicit (`ModerateMembers` / `BanMembers`).
