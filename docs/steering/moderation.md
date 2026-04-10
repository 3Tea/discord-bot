# Moderation System

> Steering doc for AI assistants and contributors. Covers the `/moderation` command — timeout, untimeout, ban, unban, kick — with hierarchy enforcement, permission checks, and response styling.

## Overview

Server moderation via a single `/moderation` slash command with 5 subcommands. Every action enforces Discord's role hierarchy for both the executor and the bot before proceeding. All responses use color-coded embeds and locale-aware strings. No database models — actions go directly through the Discord API.

## Commands

| Subcommand | Parameters | Required Permission | Description |
|------------|-----------|---------------------|-------------|
| `timeout` | `user` (User, required), `duration` (Integer, required, min 1), `unit` (String choice: minutes/hours/days, required), `reason` (String, optional) | `ModerateMembers` | Mute a member in text and voice for a duration |
| `untimeout` | `user` (User, required) | `ModerateMembers` | Remove an active timeout from a member |
| `ban` | `user` (User, required), `reason` (String, optional), `delete_messages` (Integer, optional, 0-604800 seconds) | `BanMembers` | Ban a member (or any user by mention) from the server |
| `unban` | `user_id` (String, required, snowflake format), `reason` (String, optional) | `BanMembers` | Unban a user by their Discord snowflake ID |
| `kick` | `user` (User, required), `reason` (String, optional) | `KickMembers` | Kick a member from the server |

## Permission Requirements

Two layers of permission checks run before every action.

### Executor Permissions

| Subcommand | Discord Permission |
|------------|-------------------|
| `timeout` | `PermissionFlagsBits.ModerateMembers` |
| `untimeout` | `PermissionFlagsBits.ModerateMembers` |
| `ban` | `PermissionFlagsBits.BanMembers` |
| `unban` | `PermissionFlagsBits.BanMembers` |
| `kick` | `PermissionFlagsBits.KickMembers` |

### Bot Permissions

The bot checks its own permissions before each action:

| Subcommand | Bot check |
|------------|-----------|
| `timeout` / `untimeout` | `botMember.permissions.has(ModerateMembers)` and `member.moderatable` |
| `ban` | `botMember.permissions.has(BanMembers)` and `member.bannable` (if target is in guild) |
| `unban` | `botMember.permissions.has(BanMembers)` |
| `kick` | `botMember.permissions.has(KickMembers)` and `member.kickable` |

## Hierarchy Enforcement

Implemented in `invokerCanModerateTarget(guild, executor, target)`. Runs for `timeout`, `untimeout`, `ban` (when target is a guild member), and `kick`.

| Rule | Behavior |
|------|----------|
| **Owner bypass** | If executor is the guild owner, hierarchy check passes unconditionally |
| **Owner protection** | If target is the guild owner, hierarchy check fails unconditionally (no one can moderate the owner) |
| **Role position** | Target's highest role position must be strictly less than executor's highest role position |
| **Self-prevention** | `timeout`, `ban`, `kick` reject if `targetUser.id === interaction.user.id` |
| **Bot targeting prevention** | `timeout` rejects if `targetUser.bot`; `ban` and `kick` reject if `targetUser.id === client.user.id` |
| **Bot role position** | Discord.js `.moderatable`, `.bannable`, `.kickable` properties check the bot's role position against the target |

Note: `ban` can target users not currently in the guild (hackban). When the target is not a member, hierarchy and bannability checks are skipped — only the bot's `BanMembers` permission is verified.

## Response Styling

All success responses use `Reply.embed()` with color-coded embeds.

| Action | Hex Color | Discord Color Name | Semantic |
|--------|-----------|--------------------|----------|
| `timeout` | `0x57F287` | Green | Moderation applied (reversible) |
| `untimeout` | `0x57F287` | Green | Moderation removed |
| `ban` | `0xED4245` | Red | Severe action |
| `unban` | `0x57F287` | Green | Moderation removed |
| `kick` | `0xFEE75C` | Yellow | Moderate severity |

All error responses are ephemeral plain-text messages via `interaction.reply({ flags: MessageFlags.Ephemeral })`.

## Duration Formatting

Used by `timeout` to display the applied duration in the success embed.

`formatDuration(locale, ms)` converts milliseconds into a locale-aware human-readable string.

| Component | i18n Key | Displayed when |
|-----------|----------|----------------|
| Days | `moderation.fmt.days` | `days > 0` |
| Hours | `moderation.fmt.hours` | `hours > 0` |
| Minutes | `moderation.fmt.minutes` | `minutes > 0` or no other component |

Parts are joined with a space. Example: `"2 days 3 hours"`, `"45 minutes"`, `"1 day 30 minutes"`.

## Error Handling

### Permission and Hierarchy Errors

All returned as ephemeral messages. No embed, no color.

| i18n Key | Trigger |
|----------|---------|
| `moderation.guild_only` | Command used outside a guild |
| `moderation.missing_member` | Executor member object not available |
| `moderation.no_permission_moderate` | Executor lacks `ModerateMembers` |
| `moderation.no_permission_ban` | Executor lacks `BanMembers` |
| `moderation.no_permission_kick` | Executor lacks `KickMembers` |
| `moderation.no_target_self` | Executor targeted themselves |
| `moderation.no_target_bot` | Target is a bot (timeout) or the bot itself (ban/kick) |
| `moderation.member_not_found` | Target user not in guild (timeout, untimeout, kick) |
| `moderation.cannot_moderate_owner` | Target is the guild owner |
| `moderation.invoker_hierarchy` | Executor's highest role is not above target's |
| `moderation.bot_hierarchy` | Bot's role is not above target (`.moderatable`/`.bannable`/`.kickable` is false) |
| `moderation.bot_missing_permission` | Bot lacks the required permission |
| `moderation.untimeout_not_timed_out` | Target has no active timeout |
| `moderation.unban_invalid_id` | Provided ID does not match snowflake pattern (`/^\d{17,20}$/`) |
| `moderation.duration_invalid` | Computed duration is zero or negative |
| `moderation.duration_too_long` | Duration exceeds 28-day maximum |

### Discord API Errors

Caught in a top-level `try/catch` block.

| Error Code | Handling |
|------------|---------|
| `10026` (Unknown Ban) | Returns `moderation.unban_not_banned` — user is not currently banned |
| Any other | Returns `moderation.api_error`. Checks `interaction.replied \|\| interaction.deferred` to choose `followUp()` vs `reply()` |

Error code extraction: reads `.code` from the caught `unknown` error via narrowing (`typeof error === "object" && "code" in error`).

## Business Rules

| Constraint | Value | Source |
|------------|-------|--------|
| Max timeout duration | 28 days (2,419,200,000 ms) | `MAX_TIMEOUT_MS` constant; Discord API limit |
| Reason max length | 512 characters | `MAX_MODERATION_REASON_LENGTH` constant; `normalizeModerationReason()` silently truncates |
| Ban delete_messages max | 604,800 seconds (7 days) | `setMaxValue(604800)` on the option; Discord API limit |
| Ban delete_messages min | 0 seconds | `setMinValue(0)` on the option |
| Timeout duration min | 1 (of selected unit) | `setMinValue(1)` on the option |
| Snowflake ID format | 17-20 digit string | `SNOWFLAKE_RE = /^\d{17,20}$/` |
| Reason normalization | Trimmed; empty becomes `undefined`; over 512 chars silently truncated | `normalizeModerationReason()` |
| Locale fallback | `"en"` | `resolveLocale(interaction).catch(fallbackLocale)` |

## i18n Keys

All keys use the `moderation.*` prefix. Duration formatting uses `moderation.fmt.*` with `{{ count }}` interpolation. Command and option descriptions use `cmd.moderation.*` keys registered via `descriptionLocales()`.

## Cross-References

| System | Relationship |
|--------|-------------|
| [Confession System](confession-system.md) | Confession bans (`/confession ban`) are a separate feature-level ban that blocks a user from submitting confessions. Unrelated to Discord-level moderation bans documented here |
| [Voice System](voice-system.md) | Voice kick and voice block are voice-channel-scoped actions managed by the voice room owner. They do not require server-wide moderation permissions and are independent of `/moderation kick` |
