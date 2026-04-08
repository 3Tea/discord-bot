# Confession System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship anonymous **confession** for guilds: `/confession setup` (Manage Guild) configures mode (`instant` | `review`), public/review channels, cooldown 1–120 min, and enable flag; `/confession submit` sends text plus optional one image; review flow posts to a mod-only channel with author visibility, **Approve** / **Reject** buttons (**Manage Messages**); public posts are anonymous; Redis enforces per-user cooldown; MongoDB stores config and confession lifecycle.

**Architecture:** Two Mongoose models (`GuildConfessionConfig` holds `lastConfessionNumber` for atomic `$inc` per guild; `Confession` stores content, optional image metadata, status). A small `src/services/confession/` module owns numbering, validation, embed builders, and state transitions; slash command and button handlers stay thin and call the service. Redis key `confession:cd:{guildId}:{userId}` with TTL `cooldownMinutes * 60` seconds (via `redis.setKey`). Button `customId` format `confession_approve:{mongoId}` / `confession_reject:{mongoId}` — **`interactionCreateButton.ts` must resolve handlers by prefix** because `client.buttons.get(interaction.customId)` only matches exact keys (see Task 4).

**Tech Stack:** TypeScript strict, Discord.js v14 (`SlashCommandBuilder`, `EmbedBuilder`, `ButtonBuilder`, `ActionRowBuilder`, `AttachmentBuilder`, `PermissionFlagsBits`), Mongoose 8, existing `redis` singleton, `Reply`, `resolveLocale`, `t`, `descriptionLocales`.

**Spec:** [2026-04-08-confession-design.md](../specs/2026-04-08-confession-design.md)

**Verification note:** This repo has **no Jest/Vitest** in `package.json`. Replace “unit test” steps with `npm run build` (must exit 0) plus manual Discord checks listed per task.

---

## Constants (use everywhere)

| Name | Value | Purpose |
|------|-------|---------|
| `CONFESSION_CONTENT_MAX` | `3500` | Max characters for confession text (safe under embed limits) |
| `CONFESSION_COOLDOWN_MIN` | `1` | Minimum `cooldown_minutes` |
| `CONFESSION_COOLDOWN_MAX` | `120` | Maximum `cooldown_minutes` |
| `CONFESSION_COOLDOWN_DEFAULT` | `10` | Default minutes when creating config |

Redis cooldown key helper (conceptual): `confession:cd:${guildId}:${userId}`.

---

## File Structure

| File | Action | Responsibility |
|------|--------|------------------|
| `src/models/guildConfessionConfig.model.ts` | Create | Per-guild confession settings + `lastConfessionNumber` counter |
| `src/models/confession.model.ts` | Create | Individual confession documents + indexes |
| `src/services/confession/constants.ts` | Create | `CONFESSION_*` limits, redis key builder |
| `src/services/confession/confession.service.ts` | Create | Numbering, validation, submit/approve/reject, embed helpers |
| `src/util/config/button.ts` | Modify | `CONFESSION_APPROVE`, `CONFESSION_REJECT` string prefixes |
| `src/events/interactionCreateButton.ts` | Modify | Resolve button handler when `customId` is `prefix:id` |
| `src/buttons/confessionApprove.button.ts` | Create | Approve handler (parse id, permissions, idempotent) |
| `src/buttons/confessionReject.button.ts` | Create | Reject handler |
| `src/commands/slash/confession.ts` | Create | `setup` + `submit` subcommands |
| `src/locales/*.json` (15 files) | Modify | `cmd.confession.*` + `confession.*` strings |
| `docs/steering/commands.md` | Modify | Document `/confession` |

---

### Task 1: Mongoose models

**Files:**
- Create: `src/models/guildConfessionConfig.model.ts`
- Create: `src/models/confession.model.ts`

- [ ] **Step 1: Add `guildConfessionConfig.model.ts`**

```typescript
import { model, Schema, Document } from "mongoose";

export type ConfessionMode = "instant" | "review";

export interface IGuildConfessionConfig extends Document {
    guildId: string;
    enabled: boolean;
    mode: ConfessionMode;
    publicChannelId: string;
    reviewChannelId: string | null;
    cooldownMinutes: number;
    /** Increments atomically with each new confession number issued for this guild. */
    lastConfessionNumber: number;
}

const guildConfessionConfigSchema = new Schema(
    {
        guildId: { type: String, required: true, unique: true },
        enabled: { type: Boolean, default: false },
        mode: { type: String, enum: ["instant", "review"], default: "instant" },
        publicChannelId: { type: String, required: true },
        reviewChannelId: { type: String, default: null },
        cooldownMinutes: { type: Number, default: 10, min: 1, max: 120 },
        lastConfessionNumber: { type: Number, default: 0 },
    },
    { timestamps: true, collection: "GuildConfessionConfigs" }
);

export default model<IGuildConfessionConfig>("GuildConfessionConfig", guildConfessionConfigSchema);
```

- [ ] **Step 2: Add `confession.model.ts`**

```typescript
import { model, Schema, Document } from "mongoose";

export type ConfessionStatus = "pending" | "published" | "rejected";

export interface IConfessionImage {
    url: string;
    name: string | null;
    contentType: string | null;
}

export interface IConfession extends Document {
    guildId: string;
    number: number;
    authorId: string;
    content: string;
    image: IConfessionImage | null;
    status: ConfessionStatus;
    reviewMessageId: string | null;
    publicMessageId: string | null;
    resolvedAt: Date | null;
}

const confessionSchema = new Schema(
    {
        guildId: { type: String, required: true, index: true },
        number: { type: Number, required: true },
        authorId: { type: String, required: true },
        content: { type: String, required: true },
        image: {
            type: {
                url: { type: String, required: true },
                name: { type: String, default: null },
                contentType: { type: String, default: null },
            },
            default: null,
        },
        status: {
            type: String,
            enum: ["pending", "published", "rejected"],
            required: true,
            index: true,
        },
        reviewMessageId: { type: String, default: null },
        publicMessageId: { type: String, default: null },
        resolvedAt: { type: Date, default: null },
    },
    { timestamps: true, collection: "Confessions" }
);

confessionSchema.index({ guildId: 1, number: 1 }, { unique: true });
confessionSchema.index({ guildId: 1, status: 1 });

export default model<IConfession>("Confession", confessionSchema);
```

- [ ] **Step 3: Verify compile**

Run: `npm run build`  
Expected: exit code 0.

- [ ] **Step 4: Commit**

```bash
git add src/models/guildConfessionConfig.model.ts src/models/confession.model.ts
git commit -m "feat(confession): add GuildConfessionConfig and Confession models"
```

---

### Task 2: Service module (constants + core logic)

**Files:**
- Create: `src/services/confession/constants.ts`
- Create: `src/services/confession/confession.service.ts`

- [ ] **Step 1: Add `constants.ts`**

```typescript
export const CONFESSION_CONTENT_MAX = 3500;
export const CONFESSION_COOLDOWN_MIN = 1;
export const CONFESSION_COOLDOWN_MAX = 120;
export const CONFESSION_COOLDOWN_DEFAULT = 10;

export function confessionCooldownRedisKey(guildId: string, userId: string): string {
    return `confession:cd:${guildId}:${userId}`;
}
```

- [ ] **Step 2: Implement `confession.service.ts`** with exported functions (signatures must match usage in command/buttons):

- `getConfig(guildId: string): Promise<IGuildConfessionConfig | null>` — `findOne({ guildId })`.
- `upsertConfig(params): Promise<IGuildConfessionConfig>` — validate: if `mode === "review"` then `reviewChannelId` required; `cooldownMinutes` clamped 1–120; `enabled` boolean; set `publicChannelId` from channel id string.
- `reserveNextConfessionNumber(guildId: string): Promise<number>` — `findOneAndUpdate({ guildId }, { $inc: { lastConfessionNumber: 1 } }, { new: true, upsert: false })` on `GuildConfessionConfig`. **If no document**, throw a clear error (caller tells user to run setup).
- `isOnCooldown(guildId: string, userId: string): Promise<boolean>` — `redis.getKey(confessionCooldownRedisKey(...))` non-null OR `ttlKey` > 0.
- `setCooldown(guildId: string, userId: string, minutes: number): Promise<void>` — `redis.setKey(key, "1", minutes * 60)`.
- `validateAttachment(att: Attachment | null | undefined): { ok: true; image: IConfessionImage | null } | { ok: false; errorKey: string }` — if no attachment, `{ ok: true, image: null }`; if multiple attachments in interaction, reject (check `interaction.options.getAttachment` only — user passes one slot); require `contentType?.startsWith("image/")`.
- `buildPublicEmbed(number: number, content: string): EmbedBuilder` — title or description: anonymous confession `#number`, **no author**; description = content (truncate if needed).
- `buildReviewEmbed(params: { number: number; content: string; authorId: string; image: IConfessionImage | null }): EmbedBuilder` — include author line for mods: user id + `<@authorId>` or raw id text.

Use `import type { Attachment } from "discord.js"` for typing.

- [ ] **Step 3: Add `createPendingConfession`, `publishToPublic`, `approveConfession`, `rejectConfession`** as needed — these perform `Confession` create/update and return data for Discord message sends. **Approve:** load `Confession` by id, ensure `guildId` matches button guild, `status === "pending"`; set `published`, `publicMessageId`, `resolvedAt`; **public message** must use `buildPublicEmbed` + optional `AttachmentBuilder` from fetched image URL.

- [ ] **Step 4: Verify compile**

Run: `npm run build`  
Expected: exit code 0.

- [ ] **Step 5: Commit**

```bash
git add src/services/confession/constants.ts src/services/confession/confession.service.ts
git commit -m "feat(confession): add confession service (config, numbering, cooldown helpers)"
```

---

### Task 3: Button IDs and prefix routing

**Files:**
- Modify: `src/util/config/button.ts`
- Modify: `src/events/interactionCreateButton.ts`

- [ ] **Step 1: Extend `BUTTON_ID` in `button.ts`**

```typescript
    CONFESSION_APPROVE: "confession_approve",
    CONFESSION_REJECT: "confession_reject",
```

- [ ] **Step 2: Update `interactionCreateButton.ts`** after `get(interaction.customId)` fails:

```typescript
        let button = client?.buttons.get(interaction.customId);
        if (!button && interaction.customId.includes(":")) {
            const prefix = interaction.customId.split(":")[0] ?? "";
            button = client?.buttons.get(prefix);
        }
```

Keep existing behavior when `customId` matches exactly.

- [ ] **Step 3: Verify compile**

Run: `npm run build`

- [ ] **Step 4: Commit**

```bash
git add src/util/config/button.ts src/events/interactionCreateButton.ts
git commit -m "feat(confession): route dynamic confession button customIds by prefix"
```

---

### Task 4: Button handlers

**Files:**
- Create: `src/buttons/confessionApprove.button.ts`
- Create: `src/buttons/confessionReject.button.ts`

- [ ] **Step 1: `confessionApprove.button.ts`**

- Export `id: BUTTON_ID.CONFESSION_APPROVE` (value `"confession_approve"`).
- In `execute`, read Mongo id: `interaction.customId.split(":")[1]` — if missing, reply ephemeral error key `confession.button.invalid`.
- `if (!interaction.inGuild())` return.
- Permission: `interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages) !== true` → ephemeral `confession.no_permission_review`.
- Call service `approveConfession(interaction.guildId, mongoId, interaction.user.id)` — if not pending / wrong guild → ephemeral `confession.already_resolved` (idempotent).
- On success: edit original message (remove components or disable buttons) + optional ephemeral `confession.approve_success` for moderator.

- [ ] **Step 2: `confessionReject.button.ts`** — same pattern with `rejectConfession`, ephemeral `confession.reject_success`.

- [ ] **Step 3: Verify compile**

Run: `npm run build`

- [ ] **Step 4: Commit**

```bash
git add src/buttons/confessionApprove.button.ts src/buttons/confessionReject.button.ts
git commit -m "feat(confession): add approve/reject button handlers"
```

---

### Task 5: Slash command `confession.ts`

**Files:**
- Create: `src/commands/slash/confession.ts`

- [ ] **Step 1: Structure**

- `new SlashCommandBuilder().setName("confession").setDescription(...).setDescriptionLocalizations(descriptionLocales("cmd.confession.desc"))`.
- **Do not** call `setDefaultMemberPermissions` on the **root** command: that would require Manage Guild for `/confession submit` as well. Leave default `@everyone` for the command tree; inside `setup` only, require `interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)` and reply ephemeral `confession.no_permission_setup` if false (same pattern as `moderation.ts` enforcing per-action permissions).
- Options for `setup`: `enabled` (boolean), `mode` (string: `instant` | `review`), `public_channel` (Channel), `review_channel` (Channel, optional), `cooldown_minutes` (integer min 1 max 120).
- Subcommand `submit`: `content` (string, required, max_length 3500), `image` (attachment, optional).

- [ ] **Step 2: `submit` handler flow**

1. `guild` required — else `confession.guild_only`.
2. Load config; if null → `confession.not_configured`; if `!enabled` → `confession.disabled`; if `mode === "review"` and `!reviewChannelId` → `confession.review_misconfigured` + logger.warn.
3. Trim `content` — empty → `confession.empty_content`; length → `confession.content_too_long`.
4. Validate attachment via service.
5. If `await isOnCooldown(...)` → `confession.cooldown` (optional: include remaining via `ttlKey`).
6. `reserveNextConfessionNumber` → `number`.
7. Create `Confession` document (`pending` for review, or skip to publish for instant).
8. **Instant:** send public channel message with embed + files; save `publicMessageId`, status `published`, `setCooldown`.
9. **Review:** send review channel embed (with author) + image attachment + row with two buttons:  
   `customId: \`${BUTTON_ID.CONFESSION_APPROVE}:${doc._id}\`` and same for reject. Save `reviewMessageId`, `setCooldown`.

Use `TextChannel` cast if needed for `send()`. Wrap Discord API in try/catch → `confession.send_failed` ephemeral.

- [ ] **Step 3: `setup` handler** — upsert config; reply ephemeral success `confession.setup_success`.

- [ ] **Step 4: Verify compile**

Run: `npm run build`

- [ ] **Step 5: Commit**

```bash
git add src/commands/slash/confession.ts
git commit -m "feat(confession): add /confession setup and submit"
```

---

### Task 6: i18n — English keys

**Files:**
- Modify: `src/locales/en.json`

- [ ] **Step 1: Add keys** (valid JSON — comma placement). Minimum set:

`cmd.confession.desc`, `cmd.confession.setup.desc`, `cmd.confession.submit.desc`, option descriptions for setup/submit, and all `confession.*` user strings referenced in tasks 4–5 (`confession.guild_only`, `confession.not_configured`, `confession.disabled`, `confession.review_misconfigured`, `confession.empty_content`, `confession.content_too_long`, `confession.invalid_image`, `confession.cooldown`, `confession.send_failed`, `confession.submit_success_instant`, `confession.submit_success_review`, `confession.setup_success`, `confession.no_permission_setup`, `confession.no_permission_review`, `confession.button.invalid`, `confession.already_resolved`, `confession.approve_success`, `confession.reject_success`, plus any validation strings).

- [ ] **Step 2: Commit**

```bash
git add src/locales/en.json
git commit -m "i18n(en): add confession command strings"
```

---

### Task 7: i18n — all other locales

**Files:**
- Modify: `src/locales/vi.json`, `id.json`, `es.json`, `ja.json`, `zh.json`, `ko.json`, `pt-BR.json`, `fr.json`, `de.json`, `ru.json`, `tr.json`, `it.json`, `pl.json`, `nl.json`

- [ ] **Step 1:** Copy **every new key** from `en.json` into all 14 files. Values may be English for non-`vi` files to ship quickly; `vi.json` should be Vietnamese.

- [ ] **Step 2: Commit**

```bash
git add src/locales/*.json
git commit -m "i18n: add confession strings for all locales"
```

---

### Task 8: Steering documentation

**Files:**
- Modify: `docs/steering/commands.md`

- [ ] **Step 1:** Add a subsection under slash commands for `/confession` documenting `setup` (Manage Guild) and `submit`, modes, cooldown, and mod buttons (Manage Messages).

- [ ] **Step 2: Commit**

```bash
git add docs/steering/commands.md
git commit -m "docs(steering): document /confession"
```

---

### Task 9: Final verification

- [ ] **Step 1: Build**

```bash
npm run build
```

Expected: exit code 0.

- [ ] **Step 2: Manual Discord checklist (dev guild)**

- [ ] `/confession setup` instant + public channel → submit text-only → appears anonymous.
- [ ] Submit with PNG → image in public message.
- [ ] Switch to review + review channel → submit → mod sees author + buttons; member without Manage Messages cannot approve.
- [ ] Approve → public anonymous post; Reject → no public post; double-click → idempotent message.
- [ ] Cooldown blocks second submit within window.

- [ ] **Step 3: Commit** (only if doc/build fixes needed)

---

## Spec coverage (self-review)

| Spec section | Task(s) |
|--------------|---------|
| GuildConfessionConfig fields + review validation | Task 1, 2, 5 |
| Confession lifecycle + indexes | Task 1, 2, 4, 5 |
| Redis cooldown 1–120 | Task 2, 5 |
| `/confession submit` + `/confession setup` | Task 5 |
| Instant vs review flows | Task 5, 4 |
| Public embed anonymous; review shows author | Task 2, 5 |
| Manage Guild / Manage Messages | Task 5, 4 |
| i18n 15 locales | Task 6–7 |
| No user /report in MVP | (omitted intentionally) |

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-08-confession-system.md`. Two execution options:

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration. **REQUIRED SUB-SKILL:** superpowers:subagent-driven-development.

2. **Inline execution** — run tasks in this session with checkpoints. **REQUIRED SUB-SKILL:** superpowers:executing-plans.

Which approach do you want?
