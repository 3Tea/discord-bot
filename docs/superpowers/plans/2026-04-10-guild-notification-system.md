# Guild Notification System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a centralized, admin-configurable notification system supporting 5 types (welcome, goodbye, level-up, boost, milestone) with per-type toggle and channel assignment.

**Architecture:** Single `GuildNotificationConfig` model with compound index `(guildId, type)` — one document per notification type per guild. A shared `notificationService` handles config fetching (Redis-cached) and embed delivery. Events trigger notifications through the service. Admin manages via `/settings notifications` subcommands.

**Tech Stack:** Discord.js v14, Mongoose, ioredis, i18next (15 locales)

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `src/models/guildNotificationConfig.model.ts` | Mongoose schema, interface, NotificationType const |
| `src/services/notification/notificationService.ts` | `getConfig()`, `sendNotification()`, `invalidateCache()` |
| `src/services/notification/notificationEmbeds.ts` | Embed builders for all 5 notification types |
| `src/events/guildMemberAdd.ts` | Welcome + milestone triggers |
| `src/events/guildMemberRemove.ts` | Goodbye trigger |
| `src/events/guildMemberUpdate.ts` | Boost detection trigger |

### Modified Files

| File | Change |
|------|--------|
| `src/commands/slash/settings.ts` | Add `notifications` subcommand group |
| `src/events/messageCreate.ts` | Add level-up notification after line 78 |
| `src/events/voiceStateUpdate.ts` | Add level-up notification after line 223 |
| `src/client.ts` | Add TODO comment for GuildMembers intent |
| `src/locales/*.json` (15 files) | Add `notification.*` keys |

---

## Task 1: Notification Config Model

**Files:**
- Create: `src/models/guildNotificationConfig.model.ts`

- [ ] **Step 1: Create the model file**

```typescript
import { model, Schema, Document } from "mongoose";

export const NotificationType = {
    Welcome: "welcome",
    Goodbye: "goodbye",
    LevelUp: "level_up",
    Boost: "boost",
    Milestone: "milestone",
} as const;

export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export interface IGuildNotificationConfig extends Document {
    guildId: string;
    type: NotificationType;
    enabled: boolean;
    channelId: string | null;
    options: {
        thresholds?: number[];
    };
}

const guildNotificationConfigSchema = new Schema(
    {
        guildId: { type: String, required: true },
        type: {
            type: String,
            required: true,
            enum: ["welcome", "goodbye", "level_up", "boost", "milestone"],
        },
        enabled: { type: Boolean, default: false },
        channelId: { type: String, default: null },
        options: {
            thresholds: { type: [Number], default: undefined },
        },
    },
    {
        timestamps: true,
        collection: "GuildNotificationConfigs",
    }
);

guildNotificationConfigSchema.index({ guildId: 1, type: 1 }, { unique: true });

export default model<IGuildNotificationConfig>("GuildNotificationConfig", guildNotificationConfigSchema);
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors related to the new model.

- [ ] **Step 3: Commit**

```bash
git add src/models/guildNotificationConfig.model.ts
git commit -m "feat(notification): add GuildNotificationConfig model"
```

---

## Task 2: Notification Service

**Files:**
- Create: `src/services/notification/notificationService.ts`

- [ ] **Step 1: Create the service file**

```typescript
import { EmbedBuilder, Guild, PermissionFlagsBits, TextChannel } from "discord.js";
import GuildNotificationConfigModel, {
    IGuildNotificationConfig,
    NotificationType,
} from "../../models/guildNotificationConfig.model";
import redis from "../../connector/redis";
import { logger } from "../../util/log/logger.mixed";

const CONFIG_CACHE_TTL = 300; // 5 minutes

function cacheKey(guildId: string, type: NotificationType): string {
    return `notification_config:${guildId}:${type}`;
}

export async function getNotificationConfig(
    guildId: string,
    type: NotificationType
): Promise<IGuildNotificationConfig> {
    const key = cacheKey(guildId, type);
    const cached = await redis.getJson(key);
    if (cached) return cached as IGuildNotificationConfig;

    const config = await GuildNotificationConfigModel.findOneAndUpdate(
        { guildId, type },
        { $setOnInsert: { guildId, type } },
        { upsert: true, new: true }
    );

    await redis.setJson(key, config.toObject(), CONFIG_CACHE_TTL);
    return config;
}

export async function invalidateNotificationCache(guildId: string, type: NotificationType): Promise<void> {
    await redis.deleteKey(cacheKey(guildId, type));
}

export async function sendNotification(
    guild: Guild,
    channelId: string,
    embed: EmbedBuilder
): Promise<boolean> {
    try {
        const channel = guild.channels.cache.get(channelId);
        if (!channel || !channel.isTextBased()) return false;

        const textChannel = channel as TextChannel;
        const me = guild.members.me;
        if (!me) return false;

        const permissions = textChannel.permissionsFor(me);
        if (!permissions?.has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
            return false;
        }

        await textChannel.send({ embeds: [embed] });
        return true;
    } catch (error) {
        logger.error(`[notification:send] ${error instanceof Error ? error.message : "Unknown error"}`);
        return false;
    }
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/services/notification/notificationService.ts
git commit -m "feat(notification): add notification service with config caching"
```

---

## Task 3: Notification Embed Builders

**Files:**
- Create: `src/services/notification/notificationEmbeds.ts`

- [ ] **Step 1: Create embed builders**

```typescript
import { EmbedBuilder, GuildMember, Guild } from "discord.js";
import { t } from "../../util/i18n/t";
import { progressToNextLevel } from "../../util/xp/calculator";

export function buildWelcomeEmbed(member: GuildMember, locale: string): EmbedBuilder {
    return new EmbedBuilder()
        .setColor(0x57f287)
        .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
        .setTitle(t(locale, "notification.welcome.title"))
        .setDescription(
            t(locale, "notification.welcome.description", {
                user: `<@${member.id}>`,
                server: member.guild.name,
                count: String(member.guild.memberCount),
            })
        )
        .setTimestamp();
}

export function buildGoodbyeEmbed(member: GuildMember, locale: string): EmbedBuilder {
    return new EmbedBuilder()
        .setColor(0xed4245)
        .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
        .setTitle(t(locale, "notification.goodbye.title"))
        .setDescription(
            t(locale, "notification.goodbye.description", {
                username: member.user.username,
                server: member.guild.name,
            })
        )
        .setTimestamp();
}

export function buildLevelUpEmbed(
    userId: string,
    avatarURL: string,
    newLevel: number,
    totalXP: number,
    locale: string
): EmbedBuilder {
    const progress = progressToNextLevel(totalXP);
    const barLength = 10;
    const filled = Math.round((progress.percentage / 100) * barLength);
    const progressBar = "\u2588".repeat(filled) + "\u2591".repeat(barLength - filled);

    return new EmbedBuilder()
        .setColor(0xfee75c)
        .setThumbnail(avatarURL)
        .setTitle(t(locale, "notification.level_up.title"))
        .setDescription(
            t(locale, "notification.level_up.description", {
                user: `<@${userId}>`,
                level: String(newLevel),
                progressBar,
                currentXP: String(progress.currentXP),
                requiredXP: String(progress.requiredXP),
            })
        )
        .setTimestamp();
}

export function buildBoostEmbed(member: GuildMember, locale: string): EmbedBuilder {
    return new EmbedBuilder()
        .setColor(0xf47fff)
        .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
        .setTitle(t(locale, "notification.boost.title"))
        .setDescription(
            t(locale, "notification.boost.description", {
                user: `<@${member.id}>`,
                boostCount: String(member.guild.premiumSubscriptionCount ?? 0),
            })
        )
        .setTimestamp();
}

export function buildMilestoneEmbed(guild: Guild, memberCount: number, locale: string): EmbedBuilder {
    const iconURL = guild.iconURL({ size: 256 });
    const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(t(locale, "notification.milestone.title"))
        .setDescription(
            t(locale, "notification.milestone.description", {
                server: guild.name,
                count: String(memberCount),
            })
        )
        .setTimestamp();

    if (iconURL) embed.setThumbnail(iconURL);
    return embed;
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: Will show errors for missing i18n keys at runtime only (not compile time). No TS errors.

- [ ] **Step 3: Commit**

```bash
git add src/services/notification/notificationEmbeds.ts
git commit -m "feat(notification): add embed builders for all 5 notification types"
```

---

## Task 4: i18n Keys (All 15 Locales)

**Files:**
- Modify: `src/locales/en.json`
- Modify: `src/locales/vi.json`
- Modify: `src/locales/id.json`, `es.json`, `ja.json`, `zh.json`, `ko.json`, `pt-BR.json`, `fr.json`, `de.json`, `ru.json`, `tr.json`, `it.json`, `pl.json`, `nl.json`

- [ ] **Step 1: Add English keys to `en.json`**

Add these keys (flat dot-notation, matching existing pattern):

```json
"notification.welcome.title": "Welcome!",
"notification.welcome.description": "{{user}} just joined **{{server}}**! We now have **{{count}}** members.",
"notification.goodbye.title": "Goodbye!",
"notification.goodbye.description": "**{{username}}** has left **{{server}}**.",
"notification.level_up.title": "Level Up!",
"notification.level_up.description": "{{user}} reached **Level {{level}}**!\n{{progressBar}} {{currentXP}}/{{requiredXP}} XP",
"notification.boost.title": "Server Boosted!",
"notification.boost.description": "{{user}} just boosted the server! We now have **{{boostCount}}** boosts.",
"notification.milestone.title": "Milestone Reached!",
"notification.milestone.description": "**{{server}}** just reached **{{count}} members**!",
"notification.settings.title": "Notification Settings",
"notification.settings.toggled_on": "**{{type}}** notification has been **enabled**.",
"notification.settings.toggled_off": "**{{type}}** notification has been **disabled**.",
"notification.settings.channel_set": "**{{type}}** notification channel set to {{channel}}.",
"notification.settings.thresholds_set": "Milestone thresholds set to: {{thresholds}}.",
"notification.settings.no_channel": "Not set",
"notification.settings.current_channel": "Current channel",
"cmd.settings.notifications.desc": "Configure server notifications",
"cmd.settings.notifications.view.desc": "View notification settings",
"cmd.settings.notifications.toggle.desc": "Toggle a notification type on/off",
"cmd.settings.notifications.toggle.type.desc": "Notification type",
"cmd.settings.notifications.channel.desc": "Set notification channel",
"cmd.settings.notifications.channel.type.desc": "Notification type",
"cmd.settings.notifications.channel.channel.desc": "Target channel",
"cmd.settings.notifications.milestone-thresholds.desc": "Set milestone member thresholds",
"cmd.settings.notifications.milestone-thresholds.thresholds.desc": "Comma-separated numbers (e.g. 50,100,500,1000)"
```

- [ ] **Step 2: Add Vietnamese keys to `vi.json`**

```json
"notification.welcome.title": "Chào mừng!",
"notification.welcome.description": "{{user}} vừa tham gia **{{server}}**! Chúng ta đã có **{{count}}** thành viên.",
"notification.goodbye.title": "Tạm biệt!",
"notification.goodbye.description": "**{{username}}** đã rời khỏi **{{server}}**.",
"notification.level_up.title": "Lên cấp!",
"notification.level_up.description": "{{user}} đã đạt **Cấp {{level}}**!\n{{progressBar}} {{currentXP}}/{{requiredXP}} XP",
"notification.boost.title": "Server được Boost!",
"notification.boost.description": "{{user}} vừa boost server! Hiện có **{{boostCount}}** boost.",
"notification.milestone.title": "Cột mốc!",
"notification.milestone.description": "**{{server}}** vừa đạt **{{count}} thành viên**!",
"notification.settings.title": "Cài đặt thông báo",
"notification.settings.toggled_on": "Thông báo **{{type}}** đã được **bật**.",
"notification.settings.toggled_off": "Thông báo **{{type}}** đã được **tắt**.",
"notification.settings.channel_set": "Kênh thông báo **{{type}}** đã đặt thành {{channel}}.",
"notification.settings.thresholds_set": "Cột mốc thành viên đã đặt: {{thresholds}}.",
"notification.settings.no_channel": "Chưa đặt",
"notification.settings.current_channel": "Kênh hiện tại",
"cmd.settings.notifications.desc": "Cấu hình thông báo server",
"cmd.settings.notifications.view.desc": "Xem cài đặt thông báo",
"cmd.settings.notifications.toggle.desc": "Bật/tắt một loại thông báo",
"cmd.settings.notifications.toggle.type.desc": "Loại thông báo",
"cmd.settings.notifications.channel.desc": "Đặt kênh thông báo",
"cmd.settings.notifications.channel.type.desc": "Loại thông báo",
"cmd.settings.notifications.channel.channel.desc": "Kênh đích",
"cmd.settings.notifications.milestone-thresholds.desc": "Đặt cột mốc thành viên",
"cmd.settings.notifications.milestone-thresholds.thresholds.desc": "Các số cách nhau bởi dấu phẩy (vd: 50,100,500,1000)"
```

- [ ] **Step 3: Add keys to remaining 13 locale files**

For each of the 13 remaining locales (`id.json`, `es.json`, `ja.json`, `zh.json`, `ko.json`, `pt-BR.json`, `fr.json`, `de.json`, `ru.json`, `tr.json`, `it.json`, `pl.json`, `nl.json`), add appropriately translated versions of all the same keys. Use the English text as a base and translate naturally for each language.

- [ ] **Step 4: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/locales/*.json
git commit -m "feat(notification): add i18n keys for notification system (15 locales)"
```

---

## Task 5: Level-Up Notification (messageCreate)

**Files:**
- Modify: `src/events/messageCreate.ts:76-87`

- [ ] **Step 1: Add notification import at top of file**

Add after the existing imports (after line 10 `import { rewardLevelUp } from "../util/economy/activityReward";`):

```typescript
import { getNotificationConfig, sendNotification } from "../services/notification/notificationService";
import { buildLevelUpEmbed } from "../services/notification/notificationEmbeds";
import { NotificationType } from "../models/guildNotificationConfig.model";
import { resolveGuildLocale } from "../util/i18n/locale";
```

- [ ] **Step 2: Add level-up notification after rewardLevelUp call**

Inside the `if (newLevel > updated.level)` block (after line 78 `await rewardLevelUp(...)`), add:

```typescript
                // Level-up notification
                try {
                    const notifConfig = await getNotificationConfig(message.guild.id, NotificationType.LevelUp);
                    if (notifConfig.enabled) {
                        const notifLocale = await resolveGuildLocale(message.guild.id);
                        const embed = buildLevelUpEmbed(
                            message.author.id,
                            message.author.displayAvatarURL({ size: 256 }),
                            newLevel,
                            updated.xp,
                            notifLocale
                        );
                        const targetChannelId = notifConfig.channelId ?? message.channel.id;
                        await sendNotification(message.guild, targetChannelId, embed);
                    }
                } catch (err) {
                    logger.error(`[messageCreate:levelNotif] ${err instanceof Error ? err.message : "Unknown error"}`);
                }
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/events/messageCreate.ts
git commit -m "feat(notification): add level-up notification to messageCreate"
```

---

## Task 6: Level-Up Notification (voiceStateUpdate)

**Files:**
- Modify: `src/events/voiceStateUpdate.ts:220-224`

- [ ] **Step 1: Add notification imports at top of file**

Add after existing imports:

```typescript
import { getNotificationConfig, sendNotification } from "../services/notification/notificationService";
import { buildLevelUpEmbed } from "../services/notification/notificationEmbeds";
import { NotificationType } from "../models/guildNotificationConfig.model";
import { resolveGuildLocale } from "../util/i18n/locale";
```

- [ ] **Step 2: Add level-up notification in voice XP interval**

After line 223 (`await rewardLevelUp(sUserId, sGuildId, newLevel);`), inside the `if (newLevel > updated.level)` block, add:

```typescript
                    // Level-up notification
                    try {
                        const notifConfig = await getNotificationConfig(sGuildId, NotificationType.LevelUp);
                        if (notifConfig.enabled && notifConfig.channelId) {
                            const guild = oldState.client.guilds.cache.get(sGuildId);
                            if (guild) {
                                const user = await oldState.client.users.fetch(sUserId).catch(() => null);
                                if (user) {
                                    const notifLocale = await resolveGuildLocale(sGuildId);
                                    const embed = buildLevelUpEmbed(
                                        sUserId,
                                        user.displayAvatarURL({ size: 256 }),
                                        newLevel,
                                        updated.xp,
                                        notifLocale
                                    );
                                    await sendNotification(guild, notifConfig.channelId, embed);
                                }
                            }
                        }
                    } catch (err) {
                        logger.error(`[voiceXP:levelNotif] ${err instanceof Error ? err.message : "Unknown error"}`);
                    }
```

Note: For voice level-ups, if `channelId` is null we skip (no "current channel" context for voice XP ticks). Only sends when a dedicated channel is configured.

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/events/voiceStateUpdate.ts
git commit -m "feat(notification): add level-up notification to voiceStateUpdate"
```

---

## Task 7: Welcome & Milestone Event

**Files:**
- Create: `src/events/guildMemberAdd.ts`

- [ ] **Step 1: Create the event file**

```typescript
import { Events, GuildMember } from "discord.js";
import { getNotificationConfig, sendNotification } from "../services/notification/notificationService";
import { buildWelcomeEmbed, buildMilestoneEmbed } from "../services/notification/notificationEmbeds";
import { NotificationType } from "../models/guildNotificationConfig.model";
import { resolveGuildLocale } from "../util/i18n/locale";
import { logger } from "../util/log/logger.mixed";

export default {
    name: Events.GuildMemberAdd,
    once: false,
    async execute(member: GuildMember) {
        try {
            const guildId = member.guild.id;
            const locale = await resolveGuildLocale(guildId);

            // Welcome notification
            const welcomeConfig = await getNotificationConfig(guildId, NotificationType.Welcome);
            if (welcomeConfig.enabled && welcomeConfig.channelId) {
                const embed = buildWelcomeEmbed(member, locale);
                await sendNotification(member.guild, welcomeConfig.channelId, embed);
            }

            // Milestone notification
            const milestoneConfig = await getNotificationConfig(guildId, NotificationType.Milestone);
            if (milestoneConfig.enabled && milestoneConfig.channelId) {
                const thresholds = milestoneConfig.options?.thresholds ?? [50, 100, 250, 500, 1000];
                const memberCount = member.guild.memberCount;
                if (thresholds.includes(memberCount)) {
                    const embed = buildMilestoneEmbed(member.guild, memberCount, locale);
                    await sendNotification(member.guild, milestoneConfig.channelId, embed);
                }
            }
        } catch (error) {
            logger.error(`[guildMemberAdd] ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    },
};
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/events/guildMemberAdd.ts
git commit -m "feat(notification): add welcome and milestone events"
```

---

## Task 8: Goodbye Event

**Files:**
- Create: `src/events/guildMemberRemove.ts`

- [ ] **Step 1: Create the event file**

```typescript
import { Events, GuildMember, PartialGuildMember } from "discord.js";
import { getNotificationConfig, sendNotification } from "../services/notification/notificationService";
import { buildGoodbyeEmbed } from "../services/notification/notificationEmbeds";
import { NotificationType } from "../models/guildNotificationConfig.model";
import { resolveGuildLocale } from "../util/i18n/locale";
import { logger } from "../util/log/logger.mixed";

export default {
    name: Events.GuildMemberRemove,
    once: false,
    async execute(member: GuildMember | PartialGuildMember) {
        try {
            if (member.partial) return;

            const guildId = member.guild.id;
            const config = await getNotificationConfig(guildId, NotificationType.Goodbye);
            if (!config.enabled || !config.channelId) return;

            const locale = await resolveGuildLocale(guildId);
            const embed = buildGoodbyeEmbed(member as GuildMember, locale);
            await sendNotification(member.guild, config.channelId, embed);
        } catch (error) {
            logger.error(`[guildMemberRemove] ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    },
};
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/events/guildMemberRemove.ts
git commit -m "feat(notification): add goodbye event"
```

---

## Task 9: Boost Event

**Files:**
- Create: `src/events/guildMemberUpdate.ts`

- [ ] **Step 1: Create the event file**

```typescript
import { Events, GuildMember, PartialGuildMember } from "discord.js";
import { getNotificationConfig, sendNotification } from "../services/notification/notificationService";
import { buildBoostEmbed } from "../services/notification/notificationEmbeds";
import { NotificationType } from "../models/guildNotificationConfig.model";
import { resolveGuildLocale } from "../util/i18n/locale";
import { logger } from "../util/log/logger.mixed";

export default {
    name: Events.GuildMemberUpdate,
    once: false,
    async execute(oldMember: GuildMember | PartialGuildMember, newMember: GuildMember) {
        try {
            // Detect new boost: premiumSince was null, now has value
            const wasBoosting = oldMember.premiumSince !== null;
            const isBoosting = newMember.premiumSince !== null;
            if (wasBoosting || !isBoosting) return;

            const guildId = newMember.guild.id;
            const config = await getNotificationConfig(guildId, NotificationType.Boost);
            if (!config.enabled || !config.channelId) return;

            const locale = await resolveGuildLocale(guildId);
            const embed = buildBoostEmbed(newMember, locale);
            await sendNotification(newMember.guild, config.channelId, embed);
        } catch (error) {
            logger.error(`[guildMemberUpdate:boost] ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    },
};
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/events/guildMemberUpdate.ts
git commit -m "feat(notification): add boost detection event"
```

---

## Task 10: Settings Command — Notification Subcommands

**Files:**
- Modify: `src/commands/slash/settings.ts`

- [ ] **Step 1: Add imports at top of file**

Add after existing imports:

```typescript
import { ChannelType, EmbedBuilder, TextChannel } from "discord.js";
import GuildNotificationConfigModel, { NotificationType } from "../../models/guildNotificationConfig.model";
import { invalidateNotificationCache, getNotificationConfig } from "../../services/notification/notificationService";
```

- [ ] **Step 2: Add subcommand group to the command builder**

Add after the last `.addSubcommand()` in the `data` builder (after the `server-language` subcommand), add a subcommand group:

```typescript
        .addSubcommandGroup((group) =>
            group
                .setName("notifications")
                .setDescription("Configure server notifications")
                .setDescriptionLocalizations(descriptionLocales("cmd.settings.notifications.desc"))
                .addSubcommand((sub) =>
                    sub
                        .setName("view")
                        .setDescription("View notification settings")
                        .setDescriptionLocalizations(descriptionLocales("cmd.settings.notifications.view.desc"))
                )
                .addSubcommand((sub) =>
                    sub
                        .setName("toggle")
                        .setDescription("Toggle a notification type on/off")
                        .setDescriptionLocalizations(descriptionLocales("cmd.settings.notifications.toggle.desc"))
                        .addStringOption((opt) =>
                            opt
                                .setName("type")
                                .setDescription("Notification type")
                                .setDescriptionLocalizations(
                                    descriptionLocales("cmd.settings.notifications.toggle.type.desc")
                                )
                                .setRequired(true)
                                .addChoices(
                                    { name: "Welcome", value: "welcome" },
                                    { name: "Goodbye", value: "goodbye" },
                                    { name: "Level Up", value: "level_up" },
                                    { name: "Boost", value: "boost" },
                                    { name: "Milestone", value: "milestone" }
                                )
                        )
                )
                .addSubcommand((sub) =>
                    sub
                        .setName("channel")
                        .setDescription("Set notification channel")
                        .setDescriptionLocalizations(descriptionLocales("cmd.settings.notifications.channel.desc"))
                        .addStringOption((opt) =>
                            opt
                                .setName("type")
                                .setDescription("Notification type")
                                .setDescriptionLocalizations(
                                    descriptionLocales("cmd.settings.notifications.channel.type.desc")
                                )
                                .setRequired(true)
                                .addChoices(
                                    { name: "Welcome", value: "welcome" },
                                    { name: "Goodbye", value: "goodbye" },
                                    { name: "Level Up", value: "level_up" },
                                    { name: "Boost", value: "boost" },
                                    { name: "Milestone", value: "milestone" }
                                )
                        )
                        .addChannelOption((opt) =>
                            opt
                                .setName("channel")
                                .setDescription("Target channel")
                                .setDescriptionLocalizations(
                                    descriptionLocales("cmd.settings.notifications.channel.channel.desc")
                                )
                                .setRequired(true)
                                .addChannelTypes(ChannelType.GuildText)
                        )
                )
                .addSubcommand((sub) =>
                    sub
                        .setName("milestone-thresholds")
                        .setDescription("Set milestone member thresholds")
                        .setDescriptionLocalizations(
                            descriptionLocales("cmd.settings.notifications.milestone-thresholds.desc")
                        )
                        .addStringOption((opt) =>
                            opt
                                .setName("thresholds")
                                .setDescription("Comma-separated numbers (e.g. 50,100,500,1000)")
                                .setDescriptionLocalizations(
                                    descriptionLocales(
                                        "cmd.settings.notifications.milestone-thresholds.thresholds.desc"
                                    )
                                )
                                .setRequired(true)
                        )
                )
        )
```

- [ ] **Step 3: Add handler logic in execute function**

In the `execute` function, the current code uses `interaction.options.getSubcommand(true)`. With a subcommand group, we need to also check `getSubcommandGroup()`. Add this block before the existing `if (subcommand === "language")` check:

```typescript
        const subcommandGroup = interaction.options.getSubcommandGroup(false);

        if (subcommandGroup === "notifications") {
            // Require ManageGuild
            if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
                await interaction.reply({
                    content: t(locale, "common.no_permission"),
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            const guildId = interaction.guildId!;

            if (subcommand === "view") {
                const types = Object.values(NotificationType);
                const labels: Record<string, string> = {
                    welcome: "\uD83D\uDCE5 Welcome",
                    goodbye: "\uD83D\uDCE4 Goodbye",
                    level_up: "\u2B06\uFE0F Level Up",
                    boost: "\uD83D\uDE80 Boost",
                    milestone: "\uD83C\uDFAF Milestone",
                };

                const lines: string[] = [];
                for (const type of types) {
                    const config = await getNotificationConfig(guildId, type);
                    const status = config.enabled ? "\u2705 Enabled" : "\u274C Disabled";
                    let channel = t(locale, "notification.settings.no_channel");
                    if (config.channelId) {
                        channel = `<#${config.channelId}>`;
                    } else if (type === "level_up" && config.enabled) {
                        channel = t(locale, "notification.settings.current_channel");
                    }
                    let line = `${labels[type]} — ${status} \u2192 ${channel}`;
                    if (type === "milestone" && config.options?.thresholds?.length) {
                        line += ` (${config.options.thresholds.join(", ")})`;
                    }
                    lines.push(line);
                }

                const embed = new EmbedBuilder()
                    .setColor(0x5865f2)
                    .setTitle(t(locale, "notification.settings.title"))
                    .setDescription(lines.join("\n"))
                    .setTimestamp();

                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                return;
            }

            if (subcommand === "toggle") {
                const type = interaction.options.getString("type", true) as NotificationType;
                const config = await GuildNotificationConfigModel.findOneAndUpdate(
                    { guildId, type },
                    { $setOnInsert: { guildId, type } },
                    { upsert: true, new: true }
                );
                config.enabled = !config.enabled;
                await config.save();
                await invalidateNotificationCache(guildId, type);

                const key = config.enabled
                    ? "notification.settings.toggled_on"
                    : "notification.settings.toggled_off";
                await interaction.reply({
                    content: t(locale, key, { type }),
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            if (subcommand === "channel") {
                const type = interaction.options.getString("type", true) as NotificationType;
                const channel = interaction.options.getChannel("channel", true) as TextChannel;

                await GuildNotificationConfigModel.findOneAndUpdate(
                    { guildId, type },
                    { $set: { channelId: channel.id }, $setOnInsert: { guildId, type } },
                    { upsert: true }
                );
                await invalidateNotificationCache(guildId, type);

                await interaction.reply({
                    content: t(locale, "notification.settings.channel_set", {
                        type,
                        channel: `<#${channel.id}>`,
                    }),
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            if (subcommand === "milestone-thresholds") {
                const raw = interaction.options.getString("thresholds", true);
                const thresholds = raw
                    .split(",")
                    .map((s) => parseInt(s.trim(), 10))
                    .filter((n) => !isNaN(n) && n > 0)
                    .sort((a, b) => a - b);

                if (thresholds.length === 0) {
                    await interaction.reply({
                        content: t(locale, "common.error"),
                        flags: MessageFlags.Ephemeral,
                    });
                    return;
                }

                await GuildNotificationConfigModel.findOneAndUpdate(
                    { guildId, type: NotificationType.Milestone },
                    {
                        $set: { "options.thresholds": thresholds },
                        $setOnInsert: { guildId, type: NotificationType.Milestone },
                    },
                    { upsert: true }
                );
                await invalidateNotificationCache(guildId, NotificationType.Milestone);

                await interaction.reply({
                    content: t(locale, "notification.settings.thresholds_set", {
                        thresholds: thresholds.join(", "),
                    }),
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }
        }
```

- [ ] **Step 4: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/commands/slash/settings.ts
git commit -m "feat(notification): add /settings notifications subcommands"
```

---

## Task 11: Client Intent TODO + Final Verification

**Files:**
- Modify: `src/client.ts`

- [ ] **Step 1: Add TODO comment for GuildMembers intent**

In `src/client.ts`, inside the intents array, add a comment after the existing TODO:

```typescript
            // TODO: Enable GuildMembers intent for welcome/goodbye/boost/milestone notifications
            // Requires approval in Discord Developer Portal (privileged intent)
            // GatewayIntentBits.GuildMembers,
```

- [ ] **Step 2: Full build verification**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/client.ts
git commit -m "chore: add TODO for GuildMembers intent (notification system)"
```

---

## Task 12: Manual Integration Test

- [ ] **Step 1: Start dev server**

Run: `npm run start:dev`
Expected: Bot starts without errors, connects to Discord.

- [ ] **Step 2: Test `/settings notifications view`**

In a Discord server, run `/settings notifications view`.
Expected: Embed showing all 5 types as disabled with "Not set" channels.

- [ ] **Step 3: Test toggle and channel**

Run: `/settings notifications toggle type:level_up`
Then: `/settings notifications view`
Expected: Level Up shows as enabled, channel shows "Current channel".

Run: `/settings notifications channel type:level_up channel:#some-channel`
Then: `/settings notifications view`
Expected: Level Up shows channel as the selected channel.

- [ ] **Step 4: Test level-up notification**

Use `/xp add` (if dev user) to push a user past a level boundary.
Expected: Level-up embed appears in configured channel (or current channel if no channel set).

- [ ] **Step 5: Test milestone thresholds**

Run: `/settings notifications milestone-thresholds thresholds:50,100,500`
Then: `/settings notifications view`
Expected: Milestone shows thresholds `(50, 100, 500)`.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat(notification): guild notification system complete"
```
