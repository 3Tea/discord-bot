# Confession System — Design (MVP)

## Overview

**Anonymous confessions** for the 3AT bot: users submit text (and optionally one image) via slash commands; each guild configures either **instant posting** or **review before posting**. General behavior aligns with common confession bots (e.g. [confessions.bot](https://confessions.bot/), [ConfessionBot](https://github.com/yiays/ConfessionBot)) — **do not** copy third-party branding or trade names.

### Decisions (brainstorming)

| Topic | Decision |
|-------|----------|
| Posting mode | **Per-guild configuration:** `instant` or `review` |
| Content | **Text** + **at most one image** (optional) |
| User reporting | **Not** in MVP — moderators handle abuse via queue rejection or manual deletion of published posts |
| Cooldown | **Default** + **admin-configurable** within **1–120 minutes** |
| Review channel | Moderators **see** `authorId` / internal mention for enforcement; the **public channel** shows only anonymous content |

## Architecture

- **MongoDB** — source of truth for per-guild configuration and confession lifecycle (`pending` → `published` / `rejected`).
- **Redis** — **submission cooldown** only, keyed by `(guildId, userId)` (TTL seconds = `cooldownMinutes * 60`), consistent with other features in this repo.
- **Discord.js v14** — slash commands; **buttons** for Approve/Reject in the review channel (`buttons/` loader + `BUTTON_ID` in `util/config/button.ts`). Button `customId` may use a **prefix** (`confession_approve:<id>`) resolved by the button interaction router.

### Layers

- **Models** — Mongoose: `GuildConfessionConfig`, `Confession`.
- **Services** (recommended) — e.g. `services/confession/`: create confession, counter, state transitions, embed builders; keep business logic independent of `ChatInputCommandInteraction` except for parsed inputs.
- **Commands** — `commands/slash/confession.ts`: thin wrapper, `resolveLocale`, `t()`, ephemeral replies where appropriate.
- **Buttons** — e.g. `confessionApprove.button.ts`, `confessionReject.button.ts`: enforce moderator permissions, idempotent handling.

## Data Models

### GuildConfessionConfig (`guildConfessionConfig.model.ts`)

| Field | Type | Description |
|-------|------|-------------|
| guildId | string | Unique — one document per guild |
| enabled | boolean | Feature on/off |
| mode | `"instant"` \| `"review"` | Post directly or after moderation |
| publicChannelId | string | Channel where approved confessions appear (anonymous embed) |
| reviewChannelId | string \| null | Required when `mode === "review"`; moderator-only review channel |
| cooldownMinutes | number | 1–120; suggested default **10** |
| lastConfessionNumber | number | Atomically incremented when issuing the next confession number |
| createdAt / updatedAt | Date | Timestamps |

- Index: `{ guildId }` unique.
- Setup validation: if `mode === "review"` and `reviewChannelId` is missing, **reject** the setup command (do not save invalid state).

### Confession (`confession.model.ts`)

| Field | Type | Description |
|-------|------|-------------|
| guildId | string | Guild |
| number | number | Monotonic **per-guild** confession index (shown on public embeds) |
| authorId | string | Submitter (visible in review flow only; never on public posts) |
| content | string | Text body; safe length for embeds (e.g. ≤ 3500 characters — align with Discord limits at implementation time) |
| image | object \| null | Optional: URL and metadata needed to **re-post** to the public channel (download buffer / attachment on publish if needed) |
| status | `"pending"` \| `"published"` \| `"rejected"` | Lifecycle |
| reviewMessageId | string \| null | Message ID in the review channel (when applicable) |
| publicMessageId | string \| null | Message ID of the anonymous public post |
| createdAt | Date | Created |
| resolvedAt | Date \| null | Set when published or rejected |

- Indexes: `{ guildId, status }`, unique compound `{ guildId, number }`.
- **Numbering:** atomic increment on `GuildConfessionConfig.lastConfessionNumber` (e.g. `findOneAndUpdate` with `$inc`) to avoid duplicate numbers under concurrency.

## Slash Commands

- **`/confession submit`**
  - Options: `content` (string, required), `image` (attachment, optional, **one** image file).
  - Checks: guild has config with `enabled`, channels valid for the selected mode, Redis cooldown, length and file-type validation.
  - Response: ephemeral confirmation that the submission was received or queued (minimal copy to avoid leaking content unnecessarily).

- **`/confession setup`**
  - Permission: **Manage Guild**, consistent with other server configuration commands in this repo.
  - Options: `enabled`, `mode`, `public_channel`, `review_channel` (required when mode is `review`), `cooldown_minutes` (1–120).
  - Upserts `GuildConfessionConfig`.

Command and option **names** stay in English; **descriptions** are localized via `descriptionLocales` and `cmd.*` keys across all 15 locale files (per CLAUDE.md).

## Flows

### Instant mode

1. User runs `/confession submit` → passes validation and cooldown.
2. Atomically increment confession `number`; after a successful public send, persist `Confession` with `status: published` and `publicMessageId`.
3. Bot posts an **anonymous** message/embed to `publicChannelId`, with image if present.
4. Apply Redis cooldown for the submitter.

### Review mode

1. User submits → create a `Confession` in `pending` state with the next `number` (after reserving the number).
2. Bot posts an embed to `reviewChannelId` with: body, image if any, **submitter mention or user ID for moderators**, confession number, and **Approve** / **Reject** buttons.
3. **Approve:** post an **anonymous-only** embed (number + text + image) to `publicChannelId`; update `status`, `publicMessageId`, `resolvedAt`; update or disable the review message (e.g. resolved embed, components removed).
4. **Reject:** set `status: rejected`, `resolvedAt`; update the review message; do not post publicly.
5. **Cooldown:** apply after the submission is accepted into the pipeline (pending created or instant published) — **consistent rule:** start cooldown when submission handling succeeds, to limit queue spam.

### Button handlers

- `customId`: fixed **prefix** + MongoDB confession id (e.g. `confession_approve:<objectId>`), within Discord’s length limit.
- Permission: only members with **Manage Messages** may Approve/Reject **in that guild**.
- Idempotent: if `status !== "pending"`, respond ephemerally that the item was already handled / safe no-op without crashing.

## Error Handling & Edge Cases

| Situation | Behavior |
|-----------|----------|
| Not configured / no config document | Ephemeral: tell admins to run `/confession setup` |
| `enabled: false` | Ephemeral: feature is disabled |
| Review mode but `reviewChannelId` missing (bad data) | Reject submit; log internally; admin must fix setup |
| Bot lacks permission to send embeds/files in target channels | Catch API errors; ephemeral message to user or mod as appropriate |
| Cooldown active | Ephemeral: show remaining time when possible |
| Not an image or more than one attachment | Reject with clear guidance |
| Empty or overly long text | Validate before creating a document |
| Wrong guild or confession already closed | Safe rejection; idempotent |

## i18n

- All user-visible strings go through `t(locale, key)`; add keys to **all 15** locale files with prefixes such as `confession.*`, `cmd.confession.*`, and `btn.confession.*` where needed.

## Out of Scope (MVP)

- User-facing `/report` or a Report button on public embeds.
- Anonymous replies to threads/messages.
- Multiple confession channels, premium embed styling, public author logs.

## Testing & Verification

- `npm run build` must succeed.
- Manual checks on a dev guild: instant + review setup; cooldown; reject/approve; double-click on buttons; text + image; moderator permissions.

## Approval

This design was agreed during brainstorming (parts 1 and 2). Next step was an **implementation plan** (`writing-plans`), then implementation.
