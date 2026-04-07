# `/moderation kick` Implementation Plan

> **For agentic workers:** Use checkbox steps; run `npm run build` before commit.

**Goal:** Add `kick` subcommand to `/moderation` per [2026-04-08-moderation-kick-subcommand-design.md](../specs/2026-04-08-moderation-kick-subcommand-design.md).

**Architecture:** Extend `moderation.ts` with new `SlashCommandBuilder` subcommand and `execute` branch; reuse `invokerCanModerateTarget`, `normalizeModerationReason`, `ephemeralError`, `Reply.embed`.

**Tech Stack:** Discord.js v14, `PermissionFlagsBits.KickMembers`, `GuildMember#kickable` / `#kick()`.

---

## File Structure

| File | Action |
|------|--------|
| `src/commands/slash/moderation.ts` | Add subcommand + handler |
| `src/locales/*.json` (×15) | `cmd.moderation.desc` update + 5 new keys |
| `docs/steering/commands.md` | One table row |
| `docs/superpowers/specs/2026-04-08-moderation-kick-subcommand-design.md` | Status Approved |

---

## Tasks

- [x] **Task 1:** Add i18n keys to all 15 locales (`cmd.moderation.kick.*`, `moderation.no_permission_kick`, `moderation.kick_success`; update `cmd.moderation.desc`).
- [x] **Task 2:** Implement `kick` in `moderation.ts` (order: permission → self/bot → reason → fetch member → invoker hierarchy → kickable → bot KickMembers → `kick` → success embed).
- [x] **Task 3:** Update `docs/steering/commands.md`.
- [x] **Task 4:** `npm run build`; commit with message `feat(moderation): add kick subcommand`.

## Spec coverage

| Requirement | Task |
|-------------|------|
| KickMembers invoker/bot | Task 2 |
| Reason 512 via helper | Task 2 |
| i18n ×15 | Task 1 |
| Steering doc | Task 3 |
