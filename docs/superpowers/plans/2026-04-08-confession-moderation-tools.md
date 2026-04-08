# Confession Moderation Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add confession ban, keyword filter, and category tags to the confession system.

**Architecture:** New ConfessionBan model for banning. `blockedKeywords` array on GuildConfessionConfig for keyword filter. `tag` field on Confession model for categories. Six new subcommands on `/confession` (ban, unban, filter-add, filter-remove, filter-list + tag option on submit). Ban and keyword checks injected into submit flow before cooldown.

**Tech Stack:** TypeScript, Discord.js v14, Mongoose, i18next

**Spec:** `docs/superpowers/specs/2026-04-08-confession-moderation-tools-design.md`

---

## File Map

### New Files

| File | Responsibility |
|------|---------------|
| `src/models/confessionBan.model.ts` | ConfessionBan schema + interface |

### Modified Files

| File | Change |
|------|--------|
| `src/services/confession/constants.ts` | Add tag list, keyword limits |
| `src/models/confession.model.ts` | Add `tag: string \| null` |
| `src/models/guildConfessionConfig.model.ts` | Add `blockedKeywords: string[]` |
| `src/services/confession/confession.service.ts` | Add ban/filter/tag service functions, update embed builders for tag display |
| `src/commands/slash/confession.ts` | Add 6 subcommands, update execute router, update submit with ban/filter/tag checks |
| `src/locales/*.json` (15 files) | Add ~30 new i18n keys |

---

### Task 1: Constants and ConfessionBan Model

**Files:**
- Modify: `src/services/confession/constants.ts`
- Create: `src/models/confessionBan.model.ts`

- [ ] **Step 1: Add constants**

In `src/services/confession/constants.ts`, append after line 8 (`CONFESSION_REPLY_MAX_LENGTH`):

```typescript
export const CONFESSION_KEYWORD_MAX_LENGTH = 50;
export const CONFESSION_KEYWORDS_MAX_COUNT = 50;

export const CONFESSION_TAGS = ["heartfelt", "funny", "question", "sharing", "other"] as const;
export type ConfessionTag = typeof CONFESSION_TAGS[number];
```

- [ ] **Step 2: Create ConfessionBan model**

Create `src/models/confessionBan.model.ts`:

```typescript
import { model, Schema, Document } from "mongoose";

export interface IConfessionBan extends Document {
    guildId: string;
    userId: string;
    moderatorId: string;
    reason: string | null;
    expiresAt: Date | null;
    active: boolean;
}

const confessionBanSchema = new Schema(
    {
        guildId: { type: String, required: true },
        userId: { type: String, required: true },
        moderatorId: { type: String, required: true },
        reason: { type: String, default: null },
        expiresAt: { type: Date, default: null },
        active: { type: Boolean, default: true },
    },
    { timestamps: true, collection: "ConfessionBans" }
);

confessionBanSchema.index({ guildId: 1, userId: 1, active: 1 });

export default model<IConfessionBan>("ConfessionBan", confessionBanSchema);
```

- [ ] **Step 3: Verify build**

```bash
cd /Users/nguyenhuuhung/Documents/GitHub/discord-bot && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/services/confession/constants.ts src/models/confessionBan.model.ts
git commit -m "feat(confession): add moderation constants and ConfessionBan model"
```

---

### Task 2: Update Confession and GuildConfessionConfig Models

**Files:**
- Modify: `src/models/confession.model.ts`
- Modify: `src/models/guildConfessionConfig.model.ts`

- [ ] **Step 1: Add `tag` field to Confession model**

In `src/models/confession.model.ts`, add to IConfession interface after `replyCount: number;` (line 21):

```typescript
    tag: string | null;
```

Add to schema after `replyCount` field (after line 46):

```typescript
        tag: { type: String, default: null },
```

- [ ] **Step 2: Add `blockedKeywords` to GuildConfessionConfig model**

In `src/models/guildConfessionConfig.model.ts`, add to IGuildConfessionConfig interface after `lastConfessionNumber: number;` (line 13):

```typescript
    blockedKeywords: string[];
```

Add to schema after `lastConfessionNumber` field (after line 24):

```typescript
        blockedKeywords: { type: [String], default: [] },
```

- [ ] **Step 3: Verify build**

```bash
cd /Users/nguyenhuuhung/Documents/GitHub/discord-bot && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/models/confession.model.ts src/models/guildConfessionConfig.model.ts
git commit -m "feat(confession): add tag field and blockedKeywords to models"
```

---

### Task 3: Add Service Functions — Ban, Filter, Tag

**Files:**
- Modify: `src/services/confession/confession.service.ts`

- [ ] **Step 1: Add imports**

Add model import after existing model imports:

```typescript
import ConfessionBanModel from "../../models/confessionBan.model";
```

Update constants import to include new exports:

```typescript
import {
    CONFESSION_CONTENT_MAX,
    CONFESSION_COOLDOWN_MAX,
    CONFESSION_COOLDOWN_MIN,
    CONFESSION_VIP_COST_GEM,
    CONFESSION_SKIP_CD_COST_COIN,
    CONFESSION_REPLY_COST_COIN,
    CONFESSION_REPLY_MAX_LENGTH,
    CONFESSION_KEYWORD_MAX_LENGTH,
    CONFESSION_KEYWORDS_MAX_COUNT,
    CONFESSION_TAGS,
    confessionCooldownRedisKey,
} from "./constants";
```

Add re-exports:

```typescript
export { CONFESSION_KEYWORD_MAX_LENGTH, CONFESSION_KEYWORDS_MAX_COUNT, CONFESSION_TAGS } from "./constants";
export type { ConfessionTag } from "./constants";
```

- [ ] **Step 2: Add ban service functions**

Append after existing functions (before `buildConfessionInteractionRow`):

```typescript
// --- Confession Ban ---

export async function checkConfessionBan(
    guildId: string,
    userId: string
): Promise<{ banned: true; expiresAt: Date | null } | { banned: false }> {
    const ban = await ConfessionBanModel.findOne({ guildId, userId, active: true }).exec();
    if (!ban) return { banned: false };

    // Check if expired
    if (ban.expiresAt && ban.expiresAt <= new Date()) {
        ban.active = false;
        await ban.save();
        return { banned: false };
    }

    return { banned: true, expiresAt: ban.expiresAt };
}

export async function banConfessionUser(input: {
    guildId: string;
    userId: string;
    moderatorId: string;
    reason: string | null;
    expiresAt: Date | null;
}): Promise<void> {
    // Deactivate any existing ban first
    await ConfessionBanModel.updateMany(
        { guildId: input.guildId, userId: input.userId, active: true },
        { active: false }
    ).exec();

    await ConfessionBanModel.create({
        guildId: input.guildId,
        userId: input.userId,
        moderatorId: input.moderatorId,
        reason: input.reason,
        expiresAt: input.expiresAt,
        active: true,
    });
}

export async function unbanConfessionUser(guildId: string, userId: string): Promise<boolean> {
    const result = await ConfessionBanModel.updateMany(
        { guildId, userId, active: true },
        { active: false }
    ).exec();
    return result.modifiedCount > 0;
}
```

- [ ] **Step 3: Add keyword filter service functions**

Append after ban functions:

```typescript
// --- Keyword Filter ---

export async function addBlockedKeyword(guildId: string, keyword: string): Promise<"added" | "duplicate" | "max_reached" | "not_configured"> {
    const config = await GuildConfessionConfigModel.findOne({ guildId }).exec();
    if (!config) return "not_configured";

    const normalized = keyword.toLowerCase().trim().slice(0, CONFESSION_KEYWORD_MAX_LENGTH);
    if (config.blockedKeywords.includes(normalized)) return "duplicate";
    if (config.blockedKeywords.length >= CONFESSION_KEYWORDS_MAX_COUNT) return "max_reached";

    config.blockedKeywords.push(normalized);
    await config.save();
    return "added";
}

export async function removeBlockedKeyword(guildId: string, keyword: string): Promise<"removed" | "not_found" | "not_configured"> {
    const config = await GuildConfessionConfigModel.findOne({ guildId }).exec();
    if (!config) return "not_configured";

    const normalized = keyword.toLowerCase().trim();
    const idx = config.blockedKeywords.indexOf(normalized);
    if (idx === -1) return "not_found";

    config.blockedKeywords.splice(idx, 1);
    await config.save();
    return "removed";
}

export async function getBlockedKeywords(guildId: string): Promise<string[]> {
    const config = await GuildConfessionConfigModel.findOne({ guildId }).exec();
    return config?.blockedKeywords ?? [];
}

export function checkKeywordFilter(content: string, blockedKeywords: string[]): boolean {
    if (blockedKeywords.length === 0) return false;
    const lower = content.toLowerCase();
    return blockedKeywords.some((kw) => lower.includes(kw));
}
```

- [ ] **Step 4: Update embed builders to show tag**

Update `buildPublicConfessionEmbed` — replace the function:

```typescript
export function buildPublicConfessionEmbed(confessionNumber: number, content: string, tag?: string | null): EmbedBuilder {
    const tagLine = tag ? `[🏷️ ${tag.charAt(0).toUpperCase() + tag.slice(1)}]\n` : "";
    const desc = tagLine + content;
    const embed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle(`Anonymous Confession (#${confessionNumber})`)
        .setDescription(desc.length > CONFESSION_CONTENT_MAX ? desc.slice(0, CONFESSION_CONTENT_MAX) : desc)
        .setTimestamp();
    applyConfessionFooter(embed);
    return embed;
}
```

Update `buildVipPublicConfessionEmbed`:

```typescript
export function buildVipPublicConfessionEmbed(confessionNumber: number, content: string, tag?: string | null): EmbedBuilder {
    const tagLine = tag ? `[🏷️ ${tag.charAt(0).toUpperCase() + tag.slice(1)}]\n` : "";
    const desc = tagLine + content;
    const embed = new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle(`✨ Confession (#${confessionNumber})`)
        .setDescription(desc.length > CONFESSION_CONTENT_MAX ? desc.slice(0, CONFESSION_CONTENT_MAX) : desc)
        .setTimestamp();
    embed.setFooter({
        text: "VIP Confession",
        ...(FOOTER.icon ? { iconURL: FOOTER.icon } : {}),
    });
    return embed;
}
```

Update `buildReviewConfessionEmbed` — add `tag` to params:

```typescript
export function buildReviewConfessionEmbed(params: {
    confessionNumber: number;
    content: string;
    authorId: string;
    isVip?: boolean;
    tag?: string | null;
}): EmbedBuilder {
    const title = params.isVip
        ? `✨ Confession review (#${params.confessionNumber}) — VIP`
        : `Confession review (#${params.confessionNumber})`;
    const tagLine = params.tag ? `[🏷️ ${params.tag.charAt(0).toUpperCase() + params.tag.slice(1)}]\n` : "";
    const desc = tagLine + params.content;
    const embed = new EmbedBuilder()
        .setColor(params.isVip ? 0xf1c40f : 0xe67e22)
        .setTitle(title)
        .setDescription(
            desc.length > CONFESSION_CONTENT_MAX ? desc.slice(0, CONFESSION_CONTENT_MAX) : desc
        )
        .addFields({
            name: "Author (moderators only)",
            value: `<@${params.authorId}> — \`${params.authorId}\``,
        })
        .setTimestamp();
    applyConfessionFooter(embed);
    return embed;
}
```

- [ ] **Step 5: Update `sendAnonymousConfessionToChannel` to pass tag**

Update signature and body:

```typescript
export async function sendAnonymousConfessionToChannel(
    channel: TextChannel,
    confessionNumber: number,
    content: string,
    image: IConfessionImage | null,
    isVip = false,
    mongoId?: string,
    tag?: string | null
): Promise<{ messageId: string } | { error: true }> {
    try {
        const embed = isVip
            ? buildVipPublicConfessionEmbed(confessionNumber, content, tag)
            : buildPublicConfessionEmbed(confessionNumber, content, tag);
        const files = await buildConfessionAttachmentFiles(image);
        const components = mongoId ? [buildConfessionInteractionRow(mongoId)] : [];
        const msg = await channel.send({
            embeds: [embed],
            files: files.length ? files : undefined,
            components: components.length ? components : undefined,
        });
        return { messageId: msg.id };
    } catch (error) {
        logger.error(
            `confession: sendAnonymousConfessionToChannel failed: ${error instanceof Error ? error.message : String(error)}`
        );
        return { error: true };
    }
}
```

- [ ] **Step 6: Update `approveConfession` to pass tag**

In `approveConfession`, find the `sendAnonymousConfessionToChannel` call and add `doc.tag`:

```typescript
    const sendResult = await sendAnonymousConfessionToChannel(textChannel, doc.number, doc.content, doc.image, doc.isVip, rawId, doc.tag);
```

- [ ] **Step 7: Update record creation functions to accept tag**

Update `createPublishedConfessionRecord` input type — add `tag?: string | null` and pass it:

```typescript
export async function createPublishedConfessionRecord(input: {
    guildId: string;
    number: number;
    authorId: string;
    content: string;
    image: IConfessionImage | null;
    publicMessageId: string;
    isVip?: boolean;
    tag?: string | null;
}): Promise<IConfession> {
    return ConfessionModel.create({
        guildId: input.guildId,
        number: input.number,
        authorId: input.authorId,
        content: input.content,
        image: input.image,
        isVip: input.isVip ?? false,
        tag: input.tag ?? null,
        status: "published",
        reviewMessageId: null,
        publicMessageId: input.publicMessageId,
        resolvedAt: new Date(),
    });
}
```

Update `createPendingConfessionRecord` similarly:

```typescript
export async function createPendingConfessionRecord(input: {
    guildId: string;
    number: number;
    authorId: string;
    content: string;
    image: IConfessionImage | null;
    isVip?: boolean;
    tag?: string | null;
}): Promise<IConfession> {
    return ConfessionModel.create({
        guildId: input.guildId,
        number: input.number,
        authorId: input.authorId,
        content: input.content,
        image: input.image,
        isVip: input.isVip ?? false,
        tag: input.tag ?? null,
        status: "pending",
        reviewMessageId: null,
        publicMessageId: null,
        resolvedAt: null,
    });
}
```

- [ ] **Step 8: Verify build**

```bash
cd /Users/nguyenhuuhung/Documents/GitHub/discord-bot && npx tsc --noEmit
```

- [ ] **Step 9: Commit**

```bash
git add src/services/confession/confession.service.ts
git commit -m "feat(confession): add ban, keyword filter, and tag service functions"
```

---

### Task 4: Update Confession Command — Add Subcommands + Ban/Filter/Tag in Submit

**Files:**
- Modify: `src/commands/slash/confession.ts`

This is the largest task. The command file needs 6 new subcommands and updated submit flow.

- [ ] **Step 1: Add imports**

Add to the confession service import block:

```typescript
    banConfessionUser,
    checkConfessionBan,
    unbanConfessionUser,
    addBlockedKeyword,
    removeBlockedKeyword,
    getBlockedKeywords,
    checkKeywordFilter,
    CONFESSION_TAGS,
```

Also add `PermissionFlagsBits` to the discord.js import if not already there (it's already there from the existing code).

- [ ] **Step 2: Add 6 new subcommands to the command builder**

After the last `.addSubcommand` (the `submit` subcommand ending around line 122 `)` ), add before the closing of the builder chain:

```typescript
        .addSubcommand((sub) =>
            sub
                .setName("ban")
                .setDescription("Ban a user from confessions")
                .setDescriptionLocalizations(descriptionLocales("cmd.confession.ban.desc"))
                .addUserOption((opt) =>
                    opt.setName("user").setDescription("User to ban").setDescriptionLocalizations(descriptionLocales("cmd.confession.ban.user.desc")).setRequired(true)
                )
                .addStringOption((opt) =>
                    opt
                        .setName("duration")
                        .setDescription("Ban duration (empty = permanent)")
                        .setDescriptionLocalizations(descriptionLocales("cmd.confession.ban.duration.desc"))
                        .setRequired(false)
                        .addChoices(
                            { name: "1 hour", value: "1h" },
                            { name: "6 hours", value: "6h" },
                            { name: "1 day", value: "1d" },
                            { name: "7 days", value: "7d" },
                            { name: "30 days", value: "30d" }
                        )
                )
                .addStringOption((opt) =>
                    opt.setName("reason").setDescription("Reason for ban").setDescriptionLocalizations(descriptionLocales("cmd.confession.ban.reason.desc")).setRequired(false)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("unban")
                .setDescription("Remove a confession ban")
                .setDescriptionLocalizations(descriptionLocales("cmd.confession.unban.desc"))
                .addUserOption((opt) =>
                    opt.setName("user").setDescription("User to unban").setDescriptionLocalizations(descriptionLocales("cmd.confession.unban.user.desc")).setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("filter-add")
                .setDescription("Add a keyword to the confession blacklist")
                .setDescriptionLocalizations(descriptionLocales("cmd.confession.filter_add.desc"))
                .addStringOption((opt) =>
                    opt.setName("keyword").setDescription("Keyword to block").setDescriptionLocalizations(descriptionLocales("cmd.confession.filter_add.keyword.desc")).setRequired(true).setMaxLength(50)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("filter-remove")
                .setDescription("Remove a keyword from the blacklist")
                .setDescriptionLocalizations(descriptionLocales("cmd.confession.filter_remove.desc"))
                .addStringOption((opt) =>
                    opt.setName("keyword").setDescription("Keyword to remove").setDescriptionLocalizations(descriptionLocales("cmd.confession.filter_remove.keyword.desc")).setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("filter-list")
                .setDescription("View all blocked keywords")
                .setDescriptionLocalizations(descriptionLocales("cmd.confession.filter_list.desc"))
        )
```

Also add the `tag` option to the **submit** subcommand, after the `skip_cooldown` option (before the closing `)` of the submit subcommand):

```typescript
                .addStringOption((opt) =>
                    opt
                        .setName("tag")
                        .setDescription("Category tag for your confession")
                        .setDescriptionLocalizations(descriptionLocales("cmd.confession.submit.tag.desc"))
                        .setRequired(false)
                        .addChoices(
                            { name: "Heartfelt", value: "heartfelt" },
                            { name: "Funny", value: "funny" },
                            { name: "Question", value: "question" },
                            { name: "Sharing", value: "sharing" },
                            { name: "Other", value: "other" }
                        )
                )
```

- [ ] **Step 3: Update execute router**

Replace the current `execute` function (lines 123-133):

```typescript
    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const locale = await resolveLocale(interaction);
        const sub = interaction.options.getSubcommand(true);

        if (sub === "setup") return executeSetup(interaction, locale);
        if (sub === "submit") return executeSubmit(interaction, locale);
        if (sub === "ban") return executeBan(interaction, locale);
        if (sub === "unban") return executeUnban(interaction, locale);
        if (sub === "filter-add") return executeFilterAdd(interaction, locale);
        if (sub === "filter-remove") return executeFilterRemove(interaction, locale);
        if (sub === "filter-list") return executeFilterList(interaction, locale);
    },
```

- [ ] **Step 4: Add ban/unban handler functions**

Add after `executeSetup` function:

```typescript
function hasModPermission(interaction: ChatInputCommandInteraction): boolean {
    const perms = interaction.memberPermissions;
    return !!perms && (perms.has(PermissionFlagsBits.ManageGuild) || perms.has(PermissionFlagsBits.ManageMessages));
}

function parseDuration(value: string | null): Date | null {
    if (!value) return null;
    const now = Date.now();
    const durations: Record<string, number> = {
        "1h": 3600_000,
        "6h": 21600_000,
        "1d": 86400_000,
        "7d": 604800_000,
        "30d": 2592000_000,
    };
    const ms = durations[value];
    return ms ? new Date(now + ms) : null;
}

async function executeBan(
    interaction: ChatInputCommandInteraction,
    locale: Awaited<ReturnType<typeof resolveLocale>>
): Promise<void> {
    if (!interaction.inGuild() || !interaction.guildId) {
        await interaction.reply({ flags: MessageFlags.Ephemeral, content: t(locale, "confession.guild_only") });
        return;
    }
    if (!hasModPermission(interaction)) {
        await interaction.reply({ flags: MessageFlags.Ephemeral, content: t(locale, "confession.no_permission_setup") });
        return;
    }

    const user = interaction.options.getUser("user", true);
    const durationRaw = interaction.options.getString("duration");
    const reason = interaction.options.getString("reason");
    const expiresAt = parseDuration(durationRaw);

    await banConfessionUser({
        guildId: interaction.guildId,
        userId: user.id,
        moderatorId: interaction.user.id,
        reason,
        expiresAt,
    });

    const durationText = durationRaw
        ? t(locale, "confession.ban_duration", { time: durationRaw })
        : "";

    await interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: t(locale, "confession.ban_success", { user: user.toString(), duration: durationText }),
    });
}

async function executeUnban(
    interaction: ChatInputCommandInteraction,
    locale: Awaited<ReturnType<typeof resolveLocale>>
): Promise<void> {
    if (!interaction.inGuild() || !interaction.guildId) {
        await interaction.reply({ flags: MessageFlags.Ephemeral, content: t(locale, "confession.guild_only") });
        return;
    }
    if (!hasModPermission(interaction)) {
        await interaction.reply({ flags: MessageFlags.Ephemeral, content: t(locale, "confession.no_permission_setup") });
        return;
    }

    const user = interaction.options.getUser("user", true);
    const removed = await unbanConfessionUser(interaction.guildId, user.id);

    if (!removed) {
        await interaction.reply({ flags: MessageFlags.Ephemeral, content: t(locale, "confession.unban_not_found") });
        return;
    }

    await interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: t(locale, "confession.unban_success", { user: user.toString() }),
    });
}
```

- [ ] **Step 5: Add filter handler functions**

Add after `executeUnban`:

```typescript
async function executeFilterAdd(
    interaction: ChatInputCommandInteraction,
    locale: Awaited<ReturnType<typeof resolveLocale>>
): Promise<void> {
    if (!interaction.inGuild() || !interaction.guildId) {
        await interaction.reply({ flags: MessageFlags.Ephemeral, content: t(locale, "confession.guild_only") });
        return;
    }
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.reply({ flags: MessageFlags.Ephemeral, content: t(locale, "confession.no_permission_setup") });
        return;
    }

    const keyword = interaction.options.getString("keyword", true);
    const result = await addBlockedKeyword(interaction.guildId, keyword);

    const messages: Record<string, string> = {
        added: t(locale, "confession.filter_added", { keyword: keyword.toLowerCase().trim() }),
        duplicate: t(locale, "confession.filter_duplicate", { keyword: keyword.toLowerCase().trim() }),
        max_reached: t(locale, "confession.filter_max"),
        not_configured: t(locale, "confession.not_configured"),
    };

    await interaction.reply({ flags: MessageFlags.Ephemeral, content: messages[result] });
}

async function executeFilterRemove(
    interaction: ChatInputCommandInteraction,
    locale: Awaited<ReturnType<typeof resolveLocale>>
): Promise<void> {
    if (!interaction.inGuild() || !interaction.guildId) {
        await interaction.reply({ flags: MessageFlags.Ephemeral, content: t(locale, "confession.guild_only") });
        return;
    }
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.reply({ flags: MessageFlags.Ephemeral, content: t(locale, "confession.no_permission_setup") });
        return;
    }

    const keyword = interaction.options.getString("keyword", true);
    const result = await removeBlockedKeyword(interaction.guildId, keyword);

    const messages: Record<string, string> = {
        removed: t(locale, "confession.filter_removed", { keyword: keyword.toLowerCase().trim() }),
        not_found: t(locale, "confession.filter_not_found", { keyword: keyword.toLowerCase().trim() }),
        not_configured: t(locale, "confession.not_configured"),
    };

    await interaction.reply({ flags: MessageFlags.Ephemeral, content: messages[result] });
}

async function executeFilterList(
    interaction: ChatInputCommandInteraction,
    locale: Awaited<ReturnType<typeof resolveLocale>>
): Promise<void> {
    if (!interaction.inGuild() || !interaction.guildId) {
        await interaction.reply({ flags: MessageFlags.Ephemeral, content: t(locale, "confession.guild_only") });
        return;
    }
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.reply({ flags: MessageFlags.Ephemeral, content: t(locale, "confession.no_permission_setup") });
        return;
    }

    const keywords = await getBlockedKeywords(interaction.guildId);

    if (keywords.length === 0) {
        await interaction.reply({ flags: MessageFlags.Ephemeral, content: t(locale, "confession.filter_list_empty") });
        return;
    }

    const embed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle(t(locale, "confession.filter_list_title"))
        .setDescription(keywords.map((kw) => `\`${kw}\``).join(", "))
        .setTimestamp();

    await interaction.reply({ flags: MessageFlags.Ephemeral, embeds: [embed] });
}
```

Note: Add `EmbedBuilder` to the discord.js import at the top if not already there.

- [ ] **Step 6: Update `executeSubmit` — add ban check, keyword filter, and tag**

In `executeSubmit`, make 3 insertions:

**6a.** After the config validation block (after `config.mode === "review" && !config.reviewChannelId` check), add ban check:

```typescript
    // --- Ban check ---
    const banResult = await checkConfessionBan(interaction.guildId, userId);
    if (banResult.banned) {
        if (banResult.expiresAt) {
            await interaction.editReply({
                content: t(locale, "confession.banned_until", {
                    time: `<t:${Math.floor(banResult.expiresAt.getTime() / 1000)}:R>`,
                }),
            });
        } else {
            await interaction.editReply({ content: t(locale, "confession.banned") });
        }
        return;
    }

    // --- Keyword filter ---
    if (checkKeywordFilter(content, config.blockedKeywords ?? [])) {
        await interaction.editReply({ content: t(locale, "confession.keyword_blocked") });
        return;
    }
```

**6b.** After parsing `wantSkipCd`, add tag parsing:

```typescript
    const tag = interaction.options.getString("tag") ?? null;
```

**6c.** In the instant mode block, add `tag` to `createPublishedConfessionRecord`, `sendAnonymousConfessionToChannel`, and `buildReviewConfessionEmbed` calls. Specifically:

In instant mode, update the send call:
```typescript
        const sendResult = await sendAnonymousConfessionToChannel(textPublic, confessionNumber, content, image, isVip, mongoId, tag);
```

Update `createPublishedConfessionRecord` call — add `tag`:
```typescript
            publishedDoc = await createPublishedConfessionRecord({
                guildId,
                number: confessionNumber,
                authorId,
                content,
                image,
                publicMessageId: "pending",
                isVip,
                tag,
            });
```

In review mode, update `createPendingConfessionRecord` — add `tag`:
```typescript
        pendingDoc = await createPendingConfessionRecord({
            guildId,
            number: confessionNumber,
            authorId,
            content,
            image,
            isVip,
            tag,
        });
```

Update `buildReviewConfessionEmbed` call — add `tag`:
```typescript
    const reviewEmbed = buildReviewConfessionEmbed({
        confessionNumber,
        content,
        authorId,
        isVip,
        tag,
    });
```

- [ ] **Step 7: Verify build**

```bash
cd /Users/nguyenhuuhung/Documents/GitHub/discord-bot && npx tsc --noEmit
```

- [ ] **Step 8: Commit**

```bash
git add src/commands/slash/confession.ts
git commit -m "feat(confession): add ban, unban, filter, and tag subcommands"
```

---

### Task 5: Add i18n Keys

**Files:**
- Modify: All 15 locale files in `src/locales/`

- [ ] **Step 1: Add keys to en.json**

Add after the last confession key:

```json
    "cmd.confession.ban.desc": "Ban a user from the confession system",
    "cmd.confession.ban.user.desc": "User to ban",
    "cmd.confession.ban.duration.desc": "Ban duration (empty = permanent)",
    "cmd.confession.ban.reason.desc": "Reason for ban",
    "cmd.confession.unban.desc": "Remove a confession ban",
    "cmd.confession.unban.user.desc": "User to unban",
    "confession.ban_success": "**{{user}}** has been banned from confessions{{duration}}.",
    "confession.ban_duration": " for {{time}}",
    "confession.unban_success": "**{{user}}** has been unbanned from confessions.",
    "confession.unban_not_found": "This user is not banned from confessions.",
    "confession.banned": "You are banned from confessions on this server.",
    "confession.banned_until": "You are banned from confessions until {{time}}.",
    "cmd.confession.filter_add.desc": "Add a keyword to the confession blacklist",
    "cmd.confession.filter_add.keyword.desc": "Keyword to block",
    "cmd.confession.filter_remove.desc": "Remove a keyword from the blacklist",
    "cmd.confession.filter_remove.keyword.desc": "Keyword to remove",
    "cmd.confession.filter_list.desc": "View all blocked keywords",
    "confession.filter_added": "Keyword **{{keyword}}** added to blacklist.",
    "confession.filter_removed": "Keyword **{{keyword}}** removed from blacklist.",
    "confession.filter_not_found": "Keyword **{{keyword}}** is not in the blacklist.",
    "confession.filter_duplicate": "Keyword **{{keyword}}** is already blocked.",
    "confession.filter_max": "Maximum 50 keywords allowed.",
    "confession.filter_list_title": "Blocked Keywords",
    "confession.filter_list_empty": "No keywords configured.",
    "confession.keyword_blocked": "Your confession contains content that is not allowed.",
    "cmd.confession.submit.tag.desc": "Category tag for your confession",
    "confession.tag.heartfelt": "Heartfelt",
    "confession.tag.funny": "Funny",
    "confession.tag.question": "Question",
    "confession.tag.sharing": "Sharing",
    "confession.tag.other": "Other"
```

- [ ] **Step 2: Add keys to vi.json**

```json
    "cmd.confession.ban.desc": "Cấm người dùng khỏi hệ thống confession",
    "cmd.confession.ban.user.desc": "Người dùng cần cấm",
    "cmd.confession.ban.duration.desc": "Thời hạn cấm (bỏ trống = vĩnh viễn)",
    "cmd.confession.ban.reason.desc": "Lý do cấm",
    "cmd.confession.unban.desc": "Gỡ lệnh cấm confession",
    "cmd.confession.unban.user.desc": "Người dùng cần gỡ cấm",
    "confession.ban_success": "**{{user}}** đã bị cấm confession{{duration}}.",
    "confession.ban_duration": " trong {{time}}",
    "confession.unban_success": "**{{user}}** đã được gỡ cấm confession.",
    "confession.unban_not_found": "Người dùng này không bị cấm confession.",
    "confession.banned": "Bạn đã bị cấm confession trong server này.",
    "confession.banned_until": "Bạn bị cấm confession đến {{time}}.",
    "cmd.confession.filter_add.desc": "Thêm từ khóa vào danh sách chặn confession",
    "cmd.confession.filter_add.keyword.desc": "Từ khóa cần chặn",
    "cmd.confession.filter_remove.desc": "Xóa từ khóa khỏi danh sách chặn",
    "cmd.confession.filter_remove.keyword.desc": "Từ khóa cần xóa",
    "cmd.confession.filter_list.desc": "Xem tất cả từ khóa bị chặn",
    "confession.filter_added": "Đã thêm từ khóa **{{keyword}}** vào danh sách chặn.",
    "confession.filter_removed": "Đã xóa từ khóa **{{keyword}}** khỏi danh sách chặn.",
    "confession.filter_not_found": "Từ khóa **{{keyword}}** không có trong danh sách chặn.",
    "confession.filter_duplicate": "Từ khóa **{{keyword}}** đã bị chặn rồi.",
    "confession.filter_max": "Tối đa 50 từ khóa.",
    "confession.filter_list_title": "Từ khóa bị chặn",
    "confession.filter_list_empty": "Chưa có từ khóa nào.",
    "confession.keyword_blocked": "Confession của bạn chứa nội dung không được phép.",
    "cmd.confession.submit.tag.desc": "Danh mục cho confession",
    "confession.tag.heartfelt": "Tâm sự",
    "confession.tag.funny": "Hài hước",
    "confession.tag.question": "Hỏi đáp",
    "confession.tag.sharing": "Chia sẻ",
    "confession.tag.other": "Khác"
```

- [ ] **Step 3: Add English keys to remaining 13 locale files**

Add the same English text (from Step 1) to: `id.json`, `es.json`, `ja.json`, `zh.json`, `ko.json`, `pt-BR.json`, `fr.json`, `de.json`, `ru.json`, `tr.json`, `it.json`, `pl.json`, `nl.json`.

- [ ] **Step 4: Verify build**

```bash
cd /Users/nguyenhuuhung/Documents/GitHub/discord-bot && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/locales/
git commit -m "feat(confession): add i18n keys for ban, filter, and tag features"
```

---

### Task 6: Final Build Verification

- [ ] **Step 1: Full TypeScript check**

```bash
cd /Users/nguyenhuuhung/Documents/GitHub/discord-bot && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 2: Verify model exists**

```bash
ls src/models/confessionBan.model.ts
```

Expected: File exists.

- [ ] **Step 3: Verify i18n key consistency**

```bash
grep -l "confession.banned" src/locales/*.json | wc -l
```

Expected: 15.

- [ ] **Step 4: Verify all confession subcommands are routed**

```bash
grep -c "sub ===" src/commands/slash/confession.ts
```

Expected: At least 7 (setup, submit, ban, unban, filter-add, filter-remove, filter-list).
