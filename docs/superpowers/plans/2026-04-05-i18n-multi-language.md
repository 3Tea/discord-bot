# i18n Multi-Language Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add multi-language support (Vietnamese + English) to the Discord bot using i18next, with locale resolution chain (user > guild > auto-detect), Redis caching, and migration of all 21 commands.

**Architecture:** i18next with fs-backend loads flat JSON translation files (`src/locales/en.json`, `src/locales/vi.json`). A `resolveLocale(interaction)` function resolves locale via Redis-cached user/guild preferences falling back to `interaction.locale`. A `t(locale, key, options)` helper wraps `i18next.getFixedT()`. All 21 commands are migrated to use `t()` for user-facing strings. Command descriptions use Discord.js `setDescriptionLocalizations()`.

**Tech Stack:** i18next, i18next-fs-backend, Discord.js v14, Mongoose, ioredis

---

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install i18next and i18next-fs-backend**

Run:
```bash
npm install i18next i18next-fs-backend
```

- [ ] **Step 2: Verify installation**

Run:
```bash
node -e "require('i18next'); require('i18next-fs-backend'); console.log('OK')"
```
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add i18next and i18next-fs-backend dependencies"
```

---

### Task 2: Create i18next Initialization Module

**Files:**
- Create: `src/util/i18n/index.ts`

- [ ] **Step 1: Create the i18n initialization file**

```typescript
// src/util/i18n/index.ts
import i18next from "i18next";
import Backend from "i18next-fs-backend";
import path from "node:path";

const SUPPORTED_LOCALES = ["en", "vi"] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

const DEFAULT_LOCALE: SupportedLocale = "en";

async function initI18n(): Promise<void> {
    await i18next.use(Backend).init({
        lng: DEFAULT_LOCALE,
        fallbackLng: DEFAULT_LOCALE,
        supportedLngs: [...SUPPORTED_LOCALES],
        preload: [...SUPPORTED_LOCALES],
        ns: ["translation"],
        defaultNS: "translation",
        backend: {
            loadPath: path.join(__dirname, "../../locales/{{lng}}.json"),
        },
        interpolation: {
            escapeValue: false,
        },
    });
}

export { initI18n, SUPPORTED_LOCALES, DEFAULT_LOCALE };
export type { SupportedLocale };
```

- [ ] **Step 2: Create minimal locale files for testing**

Create `src/locales/en.json`:
```json
{
    "common.error": "An error occurred. Please try again later."
}
```

Create `src/locales/vi.json`:
```json
{
    "common.error": "Có lỗi xảy ra. Vui lòng thử lại sau."
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/util/i18n/index.ts src/locales/en.json src/locales/vi.json
git commit -m "feat(i18n): add i18next initialization module and base locale files"
```

---

### Task 3: Create Translation Helper (`t()`)

**Files:**
- Create: `src/util/i18n/t.ts`

- [ ] **Step 1: Create the `t()` helper**

```typescript
// src/util/i18n/t.ts
import i18next, { type TOptions } from "i18next";
import type { SupportedLocale } from "./index";

export function t(locale: SupportedLocale, key: string, options?: TOptions): string {
    return i18next.getFixedT(locale)(key, options ?? {});
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/util/i18n/t.ts
git commit -m "feat(i18n): add t() translation helper"
```

---

### Task 4: Create Locale Resolution Module

**Files:**
- Create: `src/util/i18n/locale.ts`
- Modify: `src/models/user.model.ts`
- Modify: `src/models/guild.model.ts`

- [ ] **Step 1: Add `locale` field to User model**

In `src/models/user.model.ts`, add to `IUser` interface:
```typescript
export interface IUser extends Document {
    userID: string;
    totalPoint: number;
    totalCoin: number;
    topAllServer: number;
    lastActivity: Date;
    status: boolean;
    locale?: string;
}
```

Add to `userSchema`:
```typescript
locale: {
    type: String,
    default: undefined,
},
```

- [ ] **Step 2: Add `locale` field to Guild model**

In `src/models/guild.model.ts`, add to `IGuild` interface:
```typescript
export interface IGuild extends Document {
    guildID: string;
    totalPoint: number;
    topAllGuild: number;
    status: boolean;
    verify: boolean;
    locale?: string;
}
```

Add to `guildSchema`:
```typescript
locale: {
    type: String,
    default: undefined,
},
```

- [ ] **Step 3: Create the locale resolution module**

```typescript
// src/util/i18n/locale.ts
import type { ChatInputCommandInteraction } from "discord.js";
import redis from "../../connector/redis";
import UserModel from "../../models/user.model";
import GuildModel from "../../models/guild.model";
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from "./index";
import type { SupportedLocale } from "./index";

const LOCALE_TTL = 60 * 60 * 24 * 30; // 30 days

function isSupportedLocale(value: string): value is SupportedLocale {
    return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

function mapDiscordLocale(discordLocale: string): SupportedLocale {
    if (discordLocale === "vi") return "vi";
    if (discordLocale.startsWith("en")) return "en";
    return DEFAULT_LOCALE;
}

async function resolveFromRedisOrDb(
    redisKey: string,
    dbLookup: () => Promise<string | undefined>
): Promise<SupportedLocale | null> {
    const cached = await redis.getKey(redisKey);

    if (cached === "none") return null;
    if (cached && isSupportedLocale(cached)) return cached;

    // Cache miss — query DB
    const dbValue = await dbLookup();
    if (dbValue && isSupportedLocale(dbValue)) {
        await redis.setKey(redisKey, dbValue, LOCALE_TTL);
        return dbValue;
    }

    // Negative cache
    await redis.setKey(redisKey, "none", LOCALE_TTL);
    return null;
}

export async function resolveLocale(interaction: ChatInputCommandInteraction): Promise<SupportedLocale> {
    const userId = interaction.user.id;
    const guildId = interaction.guildId;

    // 1. Per-user preference
    const userLocale = await resolveFromRedisOrDb(
        `locale:user:${userId}`,
        async () => {
            const user = await UserModel.findOne({ userID: userId }).select("locale").lean();
            return user?.locale;
        }
    );
    if (userLocale) return userLocale;

    // 2. Per-guild preference
    if (guildId) {
        const guildLocale = await resolveFromRedisOrDb(
            `locale:guild:${guildId}`,
            async () => {
                const guild = await GuildModel.findOne({ guildID: guildId }).select("locale").lean();
                return guild?.locale;
            }
        );
        if (guildLocale) return guildLocale;
    }

    // 3. Auto-detect from Discord client
    return mapDiscordLocale(interaction.locale);
}

export async function setUserLocale(userId: string, locale: SupportedLocale): Promise<void> {
    await UserModel.findOneAndUpdate(
        { userID: userId },
        { $set: { locale } },
        { upsert: true }
    );
    await redis.setKey(`locale:user:${userId}`, locale, LOCALE_TTL);
}

export async function resetUserLocale(userId: string): Promise<void> {
    await UserModel.findOneAndUpdate(
        { userID: userId },
        { $unset: { locale: 1 } }
    );
    await redis.setKey(`locale:user:${userId}`, "none", LOCALE_TTL);
}

export async function setGuildLocale(guildId: string, locale: SupportedLocale): Promise<void> {
    await GuildModel.findOneAndUpdate(
        { guildID: guildId },
        { $set: { locale } },
        { upsert: true }
    );
    await redis.setKey(`locale:guild:${guildId}`, locale, LOCALE_TTL);
}

export async function resetGuildLocale(guildId: string): Promise<void> {
    await GuildModel.findOneAndUpdate(
        { guildID: guildId },
        { $unset: { locale: 1 } }
    );
    await redis.setKey(`locale:guild:${guildId}`, "none", LOCALE_TTL);
}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/util/i18n/locale.ts src/models/user.model.ts src/models/guild.model.ts
git commit -m "feat(i18n): add locale resolution with Redis caching and model updates"
```

---

### Task 5: Wire i18n Into Bot Startup

**Files:**
- Modify: `src/client.ts`

- [ ] **Step 1: Read current client.ts**

Read `src/client.ts` to understand the current startup flow.

- [ ] **Step 2: Import and call `initI18n()` before command loading**

Add at the top of `src/client.ts`:
```typescript
import { initI18n } from "./util/i18n/index";
```

Call `await initI18n()` early in the startup sequence — before `loadCommands()`. The exact insertion point depends on the current structure of `client.ts`, but it must run before any command that uses `t()`.

- [ ] **Step 3: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/client.ts
git commit -m "feat(i18n): wire i18next initialization into bot startup"
```

---

### Task 6: Create Complete Translation Files

**Files:**
- Modify: `src/locales/en.json`
- Modify: `src/locales/vi.json`

- [ ] **Step 1: Write complete `en.json`**

Replace `src/locales/en.json` with the full English translation file. Every user-facing string from all 21 commands, button handlers, voice helpers, rank card embeds, and manga handler must be included.

```json
{
    "common.error": "An error occurred. Please try again later.",
    "common.no_permission": "You need Administrator permission.",
    "common.unknown_subcommand": "Unknown subcommand.",

    "balance.title": "Wallet of {{username}}",
    "balance.coin": "Coin",
    "balance.gem": "Gem",
    "balance.pray_streak": "Pray Streak",
    "balance.pray_streak_value": "**{{count}}** days",
    "balance.last_pray": "Last Pray",

    "pray.texts.0": "praying under the moonlight...",
    "pray.texts.1": "devoutly praying to the gods...",
    "pray.texts.2": "sending prayers to the sky...",
    "pray.texts.3": "lighting incense with devotion...",
    "pray.texts.4": "seeking blessings from heaven and earth...",
    "pray.flavor": "**{{username}}** {{text}}",
    "pray.reward_coin": "> +**{{coin}}** coin",
    "pray.reward_gem": " | +**{{gem}}** gem",
    "pray.target_reward": "> <@{{targetId}}> received +**{{coin}}** coin",
    "pray.streak": "Streak: **{{streak}}** days",
    "pray.milestone": "Milestone **{{days}} days**! Bonus: +**{{bonusCoin}}** coin",
    "pray.milestone_gem": " +**{{bonusGem}}** gem",
    "pray.bot_error": "Cannot pray for a bot.",
    "pray.self_error": "Cannot pray for yourself using target. Use `/pray` without a target.",
    "pray.cooldown": "You already prayed today. Come back tomorrow!",

    "curse.texts.0": "whispering curses in the darkness...",
    "curse.texts.1": "summoning eternal darkness...",
    "curse.texts.2": "sending curses into the void...",
    "curse.texts.3": "awakening dark powers...",
    "curse.texts.4": "sealing ancient darkness...",
    "curse.flavor": "**{{username}}** {{text}}",
    "curse.reward_coin": "> +**{{coin}}** coin",
    "curse.target_reward": "> <@{{targetId}}> received +**{{coin}}** coin",
    "curse.bot_error": "Cannot curse a bot.",
    "curse.self_error": "Cannot curse yourself using target. Use `/curse` without a target.",
    "curse.cooldown": "You already cursed today. Come back tomorrow!",

    "shop.empty": "The shop is currently empty.",
    "shop.title": "Shop",
    "shop.stock_unlimited": "Unlimited",
    "shop.stock_left": "{{count}} left",
    "shop.page_footer": "Page {{page}}/{{totalPages}}",
    "shop.buy_success": "Successfully purchased **{{name}}**!\nPaid: **{{amount}} {{currency}}**",
    "shop.item_not_found": "Item does not exist or has been removed.",
    "shop.out_of_stock": "Item is out of stock.",
    "shop.already_has_role": "You already have this role.",
    "shop.effect_failed": "Could not apply item. Refunded.",
    "shop.insufficient_funds": "You don't have enough to buy this item.",
    "shop.add_success": "Added **{{name}}** (ID: `{{itemId}}`) to the shop.",
    "shop.add_duplicate": "Item ID already exists. Choose a different ID.",
    "shop.add_role_required": "Must select a role for Role type items.",
    "shop.remove_success": "Removed item `{{itemId}}` from the shop.",
    "shop.remove_not_found": "Item not found.",

    "economy.set_coin": "Set coin for <@{{userId}}>: **{{amount}}** coin",
    "economy.add_coin": "Added **{{amount}}** coin to <@{{userId}}>\nTotal: **{{total}}** coin",
    "economy.set_gem": "Set gem for <@{{userId}}>: **{{amount}}** gem",
    "economy.add_gem": "Added **{{amount}}** gem to <@{{userId}}>\nTotal: **{{total}}** gem",

    "xp.set": "Set XP for <@{{userId}}>:\n**{{oldXP}}** XP (Level {{oldLevel}}) → **{{newXP}}** XP (Level {{newLevel}})",
    "xp.add": "Added **{{amount}}** XP to <@{{userId}}>\nTotal: **{{total}}** XP (Level {{level}})",
    "xp.remove": "Removed **{{amount}}** XP from <@{{userId}}>\nTotal: **{{total}}** XP (Level {{level}})",
    "xp.blacklist.already_in": "<#{{channelId}}> is already in the blacklist.",
    "xp.blacklist.not_in": "<#{{channelId}}> is not in the blacklist.",
    "xp.blacklist.title": "XP Channel Blacklist",
    "xp.blacklist.empty": "None",

    "rank.error": "Could not load rank card. Please try again later.",
    "rank.no_rank": "No rank yet",
    "rank.global_line": "Global **#{{globalRank}}** \u00b7 Total XP: **{{globalXP}}**",
    "rank.server_line": "Rank **#{{rank}}** on server \u00b7 Global **#{{globalRank}}**",
    "rank.total_xp": "Total XP: **{{globalXP}}**",
    "rank.level_up": "<@{{userId}}> reached **Level {{level}}**!",

    "leaderboard.error": "Could not load leaderboard. Please try again later.",
    "leaderboard.title": "Leaderboard",
    "leaderboard.global_title": "Global Leaderboard",
    "leaderboard.empty": "No one has XP yet!",

    "ping.pinging": "Pinging...",
    "ping.result": "Roundtrip latency: {{latency}}ms",

    "help.title": "3AT - Endless Paradox Slash CMD Support",

    "info.title": "3AT - Endless Paradox",
    "info.name": "Name: ",
    "info.version": "Version: ",
    "info.language": "Language: ",
    "info.runtime": "Runtime: ",
    "info.discord": "Discord: ",

    "avatar.description": "Get the avatar URL of the selected user, or your own avatar.",

    "trans.description": "Translate all languages to Vietnamese",

    "voice.not_in_channel": "You are not in a voice channel.",
    "voice.not_owner": "You are not the owner of this voice channel.",
    "voice.cooldown": "Please try again in {{seconds}}s.",
    "voice.limit_set": "User limit set to **{{limit}}**",
    "voice.renamed": "Channel renamed to **{{name}}**",
    "voice.locked": "Channel locked",
    "voice.unlocked": "Channel unlocked",
    "voice.hidden": "Channel hidden",
    "voice.permit_self": "You cannot permit yourself.",
    "voice.permitted": "<@{{userId}}> has been permitted",
    "voice.block_self": "You cannot block yourself.",
    "voice.blocked": "<@{{userId}}> has been blocked",
    "voice.kick_self": "You cannot kick yourself.",
    "voice.kick_not_in_channel": "That user is not in the voice channel.",
    "voice.kick_confirm": "Kick <@{{userId}}> from the voice channel?",
    "voice.transfer_self": "You are already the owner.",
    "voice.transferred": "Ownership transferred to <@{{userId}}>",
    "voice.panel.title": "Voice Control Panel",
    "voice.panel.owner": "**Owner:** <@{{ownerId}}>",
    "voice.panel.status": "**Status:** {{status}}",
    "voice.panel.status_unlocked": "Unlocked",
    "voice.panel.status_locked": "Locked",
    "voice.panel.status_hidden": "Hidden",
    "voice.panel.permitted": "Permitted",
    "voice.panel.blocked": "Blocked",
    "voice.panel.owner_mention": "<@{{ownerId}}> \u2014 Your voice control panel",

    "voice.btn.lock": "Lock",
    "voice.btn.unlock": "Unlock",
    "voice.btn.hide": "Hide",
    "voice.btn.rename": "Rename",
    "voice.btn.limit": "Limit",
    "voice.btn.permit": "Permit",
    "voice.btn.block": "Block",
    "voice.btn.kick": "Kick",
    "voice.btn.kick_block": "Kick & Block",
    "voice.btn.transfer": "Transfer",
    "voice.modal.rename_title": "Rename Voice Channel",
    "voice.modal.rename_label": "New channel name (max 50 chars)",

    "weather.not_found": "{{location}} not found",
    "weather.day.0": "Sunday",
    "weather.day.1": "Monday",
    "weather.day.2": "Tuesday",
    "weather.day.3": "Wednesday",
    "weather.day.4": "Thursday",
    "weather.day.5": "Friday",
    "weather.day.6": "Saturday",
    "weather.wmo.0": "Clear sky",
    "weather.wmo.1": "Mainly clear",
    "weather.wmo.2": "Partly cloudy",
    "weather.wmo.3": "Overcast",
    "weather.wmo.45": "Fog",
    "weather.wmo.48": "Fog",
    "weather.wmo.51": "Drizzle",
    "weather.wmo.53": "Drizzle",
    "weather.wmo.55": "Drizzle",
    "weather.wmo.56": "Freezing drizzle",
    "weather.wmo.57": "Freezing drizzle",
    "weather.wmo.61": "Rain",
    "weather.wmo.63": "Rain",
    "weather.wmo.65": "Rain",
    "weather.wmo.66": "Freezing rain",
    "weather.wmo.67": "Freezing rain",
    "weather.wmo.71": "Snowfall",
    "weather.wmo.73": "Snowfall",
    "weather.wmo.75": "Snowfall",
    "weather.wmo.77": "Snow grains",
    "weather.wmo.80": "Rain showers",
    "weather.wmo.81": "Rain showers",
    "weather.wmo.82": "Rain showers",
    "weather.wmo.85": "Snow showers",
    "weather.wmo.86": "Snow showers",
    "weather.wmo.95": "Thunderstorm",
    "weather.wmo.96": "Thunderstorm with hail",
    "weather.wmo.99": "Thunderstorm with hail",
    "weather.wmo.unknown": "Unknown",

    "manga.nsfw_only": "Only NSFW channel",
    "manga.maintenance": "Server maintenance",
    "manga.report_issue": "Report this issue",
    "manga.read": "Read",
    "manga.read_online": "Read Online",
    "manga.too_many_pages": "Please read it online. There are too many pages.",

    "settings.language_set": "Language set to **{{language}}**.",
    "settings.language_reset": "Language preference reset. Now using auto-detect.",
    "settings.server_language_set": "Server language set to **{{language}}**.",
    "settings.server_language_reset": "Server language preference reset.",

    "cmd.balance.description": "View your coin and gem balance",
    "cmd.balance.opt.user": "View another user's balance",
    "cmd.pray.description": "Pray to earn coin",
    "cmd.pray.opt.target": "Pray for someone else",
    "cmd.curse.description": "Curse to earn coin (less than pray)",
    "cmd.curse.opt.target": "Curse someone",
    "cmd.shop.description": "Server shop",
    "cmd.shop.view.description": "View item list",
    "cmd.shop.view.opt.page": "Page",
    "cmd.shop.buy.description": "Buy an item",
    "cmd.shop.buy.opt.item_id": "Item ID",
    "cmd.shop.add.description": "Add item to shop (Admin)",
    "cmd.shop.add.opt.item_id": "Unique ID",
    "cmd.shop.add.opt.name": "Item name",
    "cmd.shop.add.opt.description": "Description",
    "cmd.shop.add.opt.type": "Item type",
    "cmd.shop.add.opt.price": "Price",
    "cmd.shop.add.opt.currency": "Currency type",
    "cmd.shop.add.opt.role": "Role (if type=role)",
    "cmd.shop.add.opt.stock": "Quantity (empty = unlimited)",
    "cmd.shop.remove.description": "Remove item from shop (Admin)",
    "cmd.shop.remove.opt.item_id": "Item ID",
    "cmd.economy.description": "Economy management (admin)",
    "cmd.economy.set_coin.description": "Set a user's coin",
    "cmd.economy.add_coin.description": "Add coin to a user",
    "cmd.economy.set_gem.description": "Set a user's gem",
    "cmd.economy.add_gem.description": "Add gem to a user",
    "cmd.economy.opt.user": "Target user",
    "cmd.economy.opt.coin_amount": "Coin amount",
    "cmd.economy.opt.coin_to_add": "Coin to add",
    "cmd.economy.opt.gem_amount": "Gem amount",
    "cmd.economy.opt.gem_to_add": "Gem to add",
    "cmd.xp.description": "XP management (admin)",
    "cmd.xp.set.description": "Set a user's XP",
    "cmd.xp.add.description": "Add XP to a user",
    "cmd.xp.remove.description": "Remove XP from a user",
    "cmd.xp.opt.user": "Target user",
    "cmd.xp.opt.xp_amount": "XP amount",
    "cmd.xp.opt.xp_to_add": "XP to add",
    "cmd.xp.opt.xp_to_remove": "XP to remove",
    "cmd.xp.channel_blacklist.description": "Manage XP channel blacklist",
    "cmd.xp.channel_blacklist.add.description": "Blacklist a channel from XP",
    "cmd.xp.channel_blacklist.remove.description": "Remove a channel from blacklist",
    "cmd.xp.channel_blacklist.opt.channel": "Channel",
    "cmd.rank.description": "View your rank card or another user's",
    "cmd.rank.opt.user": "User to check rank for",
    "cmd.leaderboard.description": "View the XP leaderboard",
    "cmd.leaderboard.opt.mode": "Leaderboard type",
    "cmd.ping.description": "Replies with Pong!",
    "cmd.help.description": "Get the help commands",
    "cmd.info.description": "Information about bot",
    "cmd.info.bot.description": "Information about bot",
    "cmd.avatar.description": "Get the avatar URL of the selected user, or your own avatar.",
    "cmd.avatar.opt.target": "The user's avatar to show",
    "cmd.trans.description": "Translate all languages to Vietnamese",
    "cmd.trans.opt.word": "word or paragraph",
    "cmd.weather.description": "Get weather information.",
    "cmd.weather.opt.location": "Your location",
    "cmd.voice.description": "Voice channel management",
    "cmd.voice.limit.description": "Set the user limit for the voice channel",
    "cmd.voice.limit.opt.number": "Number of users (0-99)",
    "cmd.voice.name.description": "Change the voice channel name",
    "cmd.voice.name.opt.string": "New name",
    "cmd.voice.lock.description": "Lock the voice channel",
    "cmd.voice.unlock.description": "Unlock the voice channel",
    "cmd.voice.hide.description": "Hide the voice channel",
    "cmd.voice.permit.description": "Permit a user to join",
    "cmd.voice.permit.opt.user": "User to permit",
    "cmd.voice.block.description": "Block a user from the channel",
    "cmd.voice.block.opt.user": "User to block",
    "cmd.voice.kick.description": "Kick a user from the voice channel",
    "cmd.voice.kick.opt.user": "User to kick",
    "cmd.voice.transfer.description": "Transfer channel ownership",
    "cmd.voice.transfer.opt.user": "New owner",
    "cmd.settings.description": "Bot settings",
    "cmd.settings.language.description": "Set your preferred language",
    "cmd.settings.language.opt.locale": "Language",
    "cmd.settings.language.opt.reset": "Reset to auto-detect",
    "cmd.settings.server_language.description": "Set the server default language (Manage Guild)",
    "cmd.settings.server_language.opt.locale": "Language",
    "cmd.settings.server_language.opt.reset": "Reset to auto-detect",

    "btn.homepage": "Homepage",
    "btn.discussions": "Discussions",
    "btn.report_bug": "Report bug"
}
```

- [ ] **Step 2: Write complete `vi.json`**

Replace `src/locales/vi.json` with the full Vietnamese translation file:

```json
{
    "common.error": "Có lỗi xảy ra. Vui lòng thử lại sau.",
    "common.no_permission": "Bạn cần quyền Administrator.",
    "common.unknown_subcommand": "Lệnh con không xác định.",

    "balance.title": "Ví của {{username}}",
    "balance.coin": "Coin",
    "balance.gem": "Gem",
    "balance.pray_streak": "Pray Streak",
    "balance.pray_streak_value": "**{{count}}** ngày",
    "balance.last_pray": "Pray cuối",

    "pray.texts.0": "cầu nguyện dưới ánh trăng...",
    "pray.texts.1": "thành tâm khấn vái thần linh...",
    "pray.texts.2": "gửi lời nguyện lên trời cao...",
    "pray.texts.3": "thắp nén hương thành kính...",
    "pray.texts.4": "cầu phước lành từ đất trời...",
    "pray.flavor": "**{{username}}** {{text}}",
    "pray.reward_coin": "> +**{{coin}}** coin",
    "pray.reward_gem": " | +**{{gem}}** gem",
    "pray.target_reward": "> <@{{targetId}}> nhận +**{{coin}}** coin",
    "pray.streak": "Streak: **{{streak}}** ngày",
    "pray.milestone": "Milestone **{{days}} ngày**! Bonus: +**{{bonusCoin}}** coin",
    "pray.milestone_gem": " +**{{bonusGem}}** gem",
    "pray.bot_error": "Không thể cầu nguyện cho bot.",
    "pray.self_error": "Không thể cầu nguyện cho chính mình bằng target. Dùng `/pray` không có target.",
    "pray.cooldown": "Bạn đã cầu nguyện hôm nay rồi. Quay lại vào ngày mai nhé!",

    "curse.texts.0": "thì thầm lời nguyền trong bóng tối...",
    "curse.texts.1": "triệu hồi bóng đêm vĩnh cửu...",
    "curse.texts.2": "gửi lời rủa vào hư vô...",
    "curse.texts.3": "khơi dậy sức mạnh hắc ám...",
    "curse.texts.4": "phong ấn bóng tối cổ đại...",
    "curse.flavor": "**{{username}}** {{text}}",
    "curse.reward_coin": "> +**{{coin}}** coin",
    "curse.target_reward": "> <@{{targetId}}> nhận +**{{coin}}** coin",
    "curse.bot_error": "Không thể nguyền rủa bot.",
    "curse.self_error": "Không thể nguyền rủa chính mình bằng target. Dùng `/curse` không có target.",
    "curse.cooldown": "Bạn đã nguyền rủa hôm nay rồi. Quay lại vào ngày mai nhé!",

    "shop.empty": "Shop hiện tại trống.",
    "shop.title": "Shop",
    "shop.stock_unlimited": "Không giới hạn",
    "shop.stock_left": "Còn {{count}}",
    "shop.page_footer": "Trang {{page}}/{{totalPages}}",
    "shop.buy_success": "Mua thành công **{{name}}**!\nĐã trả: **{{amount}} {{currency}}**",
    "shop.item_not_found": "Item không tồn tại hoặc đã bị xóa.",
    "shop.out_of_stock": "Item đã hết hàng.",
    "shop.already_has_role": "Bạn đã có role này rồi.",
    "shop.effect_failed": "Không thể áp dụng item. Đã hoàn tiền.",
    "shop.insufficient_funds": "Bạn không đủ tiền để mua item này.",
    "shop.add_success": "Đã thêm **{{name}}** (ID: `{{itemId}}`) vào shop.",
    "shop.add_duplicate": "Item ID đã tồn tại. Chọn ID khác.",
    "shop.add_role_required": "Cần chọn role cho item loại Role.",
    "shop.remove_success": "Đã xóa item `{{itemId}}` khỏi shop.",
    "shop.remove_not_found": "Không tìm thấy item này.",

    "economy.set_coin": "Set coin cho <@{{userId}}>: **{{amount}}** coin",
    "economy.add_coin": "Đã thêm **{{amount}}** coin cho <@{{userId}}>\nTổng: **{{total}}** coin",
    "economy.set_gem": "Set gem cho <@{{userId}}>: **{{amount}}** gem",
    "economy.add_gem": "Đã thêm **{{amount}}** gem cho <@{{userId}}>\nTổng: **{{total}}** gem",

    "xp.set": "Set XP cho <@{{userId}}>:\n**{{oldXP}}** XP (Level {{oldLevel}}) → **{{newXP}}** XP (Level {{newLevel}})",
    "xp.add": "Đã thêm **{{amount}}** XP cho <@{{userId}}>\nTổng: **{{total}}** XP (Level {{level}})",
    "xp.remove": "Đã xóa **{{amount}}** XP từ <@{{userId}}>\nTổng: **{{total}}** XP (Level {{level}})",
    "xp.blacklist.already_in": "<#{{channelId}}> đã có trong blacklist.",
    "xp.blacklist.not_in": "<#{{channelId}}> không có trong blacklist.",
    "xp.blacklist.title": "XP Channel Blacklist",
    "xp.blacklist.empty": "Không có",

    "rank.error": "Không thể tải rank card. Vui lòng thử lại sau.",
    "rank.no_rank": "Chưa có xếp hạng",
    "rank.global_line": "Toàn cầu **#{{globalRank}}** \u00b7 Tổng XP: **{{globalXP}}**",
    "rank.server_line": "Rank **#{{rank}}** trên server \u00b7 Toàn cầu **#{{globalRank}}**",
    "rank.total_xp": "Tổng XP: **{{globalXP}}**",
    "rank.level_up": "<@{{userId}}> đã đạt **Level {{level}}**!",

    "leaderboard.error": "Không thể tải bảng xếp hạng. Vui lòng thử lại sau.",
    "leaderboard.title": "Bảng xếp hạng",
    "leaderboard.global_title": "Bảng xếp hạng toàn cầu",
    "leaderboard.empty": "Chưa có ai có XP!",

    "ping.pinging": "Đang ping...",
    "ping.result": "Độ trễ khứ hồi: {{latency}}ms",

    "help.title": "3AT - Endless Paradox Slash CMD Support",

    "info.title": "3AT - Endless Paradox",
    "info.name": "Tên: ",
    "info.version": "Phiên bản: ",
    "info.language": "Ngôn ngữ: ",
    "info.runtime": "Runtime: ",
    "info.discord": "Discord: ",

    "avatar.description": "Xem avatar của người dùng hoặc avatar của bạn.",

    "trans.description": "Dịch mọi ngôn ngữ sang Tiếng Việt",

    "voice.not_in_channel": "Bạn không ở trong kênh voice.",
    "voice.not_owner": "Bạn không phải chủ kênh voice này.",
    "voice.cooldown": "Vui lòng thử lại sau {{seconds}}s.",
    "voice.limit_set": "Đã đặt giới hạn **{{limit}}** người",
    "voice.renamed": "Đã đổi tên kênh thành **{{name}}**",
    "voice.locked": "Đã khóa kênh",
    "voice.unlocked": "Đã mở khóa kênh",
    "voice.hidden": "Đã ẩn kênh",
    "voice.permit_self": "Bạn không thể cấp quyền cho chính mình.",
    "voice.permitted": "Đã cấp quyền cho <@{{userId}}>",
    "voice.block_self": "Bạn không thể chặn chính mình.",
    "voice.blocked": "Đã chặn <@{{userId}}>",
    "voice.kick_self": "Bạn không thể kick chính mình.",
    "voice.kick_not_in_channel": "Người dùng đó không ở trong kênh voice.",
    "voice.kick_confirm": "Kick <@{{userId}}> khỏi kênh voice?",
    "voice.transfer_self": "Bạn đã là chủ kênh.",
    "voice.transferred": "Đã chuyển quyền sở hữu cho <@{{userId}}>",
    "voice.panel.title": "Bảng điều khiển Voice",
    "voice.panel.owner": "**Chủ kênh:** <@{{ownerId}}>",
    "voice.panel.status": "**Trạng thái:** {{status}}",
    "voice.panel.status_unlocked": "Mở",
    "voice.panel.status_locked": "Khóa",
    "voice.panel.status_hidden": "Ẩn",
    "voice.panel.permitted": "Được phép",
    "voice.panel.blocked": "Bị chặn",
    "voice.panel.owner_mention": "<@{{ownerId}}> \u2014 Bảng điều khiển voice của bạn",

    "voice.btn.lock": "Khóa",
    "voice.btn.unlock": "Mở khóa",
    "voice.btn.hide": "Ẩn",
    "voice.btn.rename": "Đổi tên",
    "voice.btn.limit": "Giới hạn",
    "voice.btn.permit": "Cấp quyền",
    "voice.btn.block": "Chặn",
    "voice.btn.kick": "Kick",
    "voice.btn.kick_block": "Kick & Chặn",
    "voice.btn.transfer": "Chuyển",
    "voice.modal.rename_title": "Đổi tên kênh Voice",
    "voice.modal.rename_label": "Tên kênh mới (tối đa 50 ký tự)",

    "weather.not_found": "Không tìm thấy {{location}}",
    "weather.day.0": "Chủ nhật",
    "weather.day.1": "Thứ hai",
    "weather.day.2": "Thứ ba",
    "weather.day.3": "Thứ tư",
    "weather.day.4": "Thứ năm",
    "weather.day.5": "Thứ sáu",
    "weather.day.6": "Thứ bảy",
    "weather.wmo.0": "Trời quang",
    "weather.wmo.1": "Gần như quang",
    "weather.wmo.2": "Có mây rải rác",
    "weather.wmo.3": "Nhiều mây",
    "weather.wmo.45": "Sương mù",
    "weather.wmo.48": "Sương mù",
    "weather.wmo.51": "Mưa phùn",
    "weather.wmo.53": "Mưa phùn",
    "weather.wmo.55": "Mưa phùn",
    "weather.wmo.56": "Mưa phùn đóng băng",
    "weather.wmo.57": "Mưa phùn đóng băng",
    "weather.wmo.61": "Mưa",
    "weather.wmo.63": "Mưa",
    "weather.wmo.65": "Mưa",
    "weather.wmo.66": "Mưa đóng băng",
    "weather.wmo.67": "Mưa đóng băng",
    "weather.wmo.71": "Tuyết rơi",
    "weather.wmo.73": "Tuyết rơi",
    "weather.wmo.75": "Tuyết rơi",
    "weather.wmo.77": "Hạt tuyết",
    "weather.wmo.80": "Mưa rào",
    "weather.wmo.81": "Mưa rào",
    "weather.wmo.82": "Mưa rào",
    "weather.wmo.85": "Mưa tuyết",
    "weather.wmo.86": "Mưa tuyết",
    "weather.wmo.95": "Giông bão",
    "weather.wmo.96": "Giông kèm mưa đá",
    "weather.wmo.99": "Giông kèm mưa đá",
    "weather.wmo.unknown": "Không rõ",

    "manga.nsfw_only": "Chỉ dùng trong kênh NSFW",
    "manga.maintenance": "Server đang bảo trì",
    "manga.report_issue": "Báo lỗi",
    "manga.read": "Đọc",
    "manga.read_online": "Đọc Online",
    "manga.too_many_pages": "Vui lòng đọc online. Quá nhiều trang.",

    "settings.language_set": "Đã đặt ngôn ngữ thành **{{language}}**.",
    "settings.language_reset": "Đã xóa tùy chọn ngôn ngữ. Sử dụng tự động phát hiện.",
    "settings.server_language_set": "Đã đặt ngôn ngữ server thành **{{language}}**.",
    "settings.server_language_reset": "Đã xóa tùy chọn ngôn ngữ server.",

    "cmd.balance.description": "Xem số dư coin và gem",
    "cmd.balance.opt.user": "Xem số dư của người khác",
    "cmd.pray.description": "Cầu nguyện để nhận coin",
    "cmd.pray.opt.target": "Cầu nguyện cho người khác",
    "cmd.curse.description": "Nguyền rủa để nhận coin (ít hơn pray)",
    "cmd.curse.opt.target": "Nguyền rủa ai đó",
    "cmd.shop.description": "Cửa hàng server",
    "cmd.shop.view.description": "Xem danh sách items",
    "cmd.shop.view.opt.page": "Trang",
    "cmd.shop.buy.description": "Mua item",
    "cmd.shop.buy.opt.item_id": "ID của item",
    "cmd.shop.add.description": "Thêm item vào shop (Admin)",
    "cmd.shop.add.opt.item_id": "Unique ID",
    "cmd.shop.add.opt.name": "Tên item",
    "cmd.shop.add.opt.description": "Mô tả",
    "cmd.shop.add.opt.type": "Loại item",
    "cmd.shop.add.opt.price": "Giá",
    "cmd.shop.add.opt.currency": "Loại tiền",
    "cmd.shop.add.opt.role": "Role (nếu type=role)",
    "cmd.shop.add.opt.stock": "Số lượng (bỏ trống = vô hạn)",
    "cmd.shop.remove.description": "Xóa item khỏi shop (Admin)",
    "cmd.shop.remove.opt.item_id": "ID của item",
    "cmd.economy.description": "Quản lý kinh tế (admin)",
    "cmd.economy.set_coin.description": "Đặt coin cho người dùng",
    "cmd.economy.add_coin.description": "Thêm coin cho người dùng",
    "cmd.economy.set_gem.description": "Đặt gem cho người dùng",
    "cmd.economy.add_gem.description": "Thêm gem cho người dùng",
    "cmd.economy.opt.user": "Người dùng mục tiêu",
    "cmd.economy.opt.coin_amount": "Số lượng coin",
    "cmd.economy.opt.coin_to_add": "Coin cần thêm",
    "cmd.economy.opt.gem_amount": "Số lượng gem",
    "cmd.economy.opt.gem_to_add": "Gem cần thêm",
    "cmd.xp.description": "Quản lý XP (admin)",
    "cmd.xp.set.description": "Đặt XP cho người dùng",
    "cmd.xp.add.description": "Thêm XP cho người dùng",
    "cmd.xp.remove.description": "Xóa XP từ người dùng",
    "cmd.xp.opt.user": "Người dùng mục tiêu",
    "cmd.xp.opt.xp_amount": "Số lượng XP",
    "cmd.xp.opt.xp_to_add": "XP cần thêm",
    "cmd.xp.opt.xp_to_remove": "XP cần xóa",
    "cmd.xp.channel_blacklist.description": "Quản lý blacklist kênh XP",
    "cmd.xp.channel_blacklist.add.description": "Thêm kênh vào blacklist XP",
    "cmd.xp.channel_blacklist.remove.description": "Xóa kênh khỏi blacklist",
    "cmd.xp.channel_blacklist.opt.channel": "Kênh",
    "cmd.rank.description": "Xem rank card của bạn hoặc người khác",
    "cmd.rank.opt.user": "Người dùng cần xem rank",
    "cmd.leaderboard.description": "Xem bảng xếp hạng XP",
    "cmd.leaderboard.opt.mode": "Loại bảng xếp hạng",
    "cmd.ping.description": "Kiểm tra độ trễ!",
    "cmd.help.description": "Xem danh sách lệnh",
    "cmd.info.description": "Thông tin về bot",
    "cmd.info.bot.description": "Thông tin về bot",
    "cmd.avatar.description": "Xem avatar của người dùng hoặc avatar của bạn.",
    "cmd.avatar.opt.target": "Avatar của ai",
    "cmd.trans.description": "Dịch mọi ngôn ngữ sang Tiếng Việt",
    "cmd.trans.opt.word": "từ hoặc đoạn văn",
    "cmd.weather.description": "Xem thông tin thời tiết.",
    "cmd.weather.opt.location": "Vị trí của bạn",
    "cmd.voice.description": "Quản lý kênh voice",
    "cmd.voice.limit.description": "Đặt giới hạn người trong kênh voice",
    "cmd.voice.limit.opt.number": "Số người (0-99)",
    "cmd.voice.name.description": "Đổi tên kênh voice",
    "cmd.voice.name.opt.string": "Tên mới",
    "cmd.voice.lock.description": "Khóa kênh voice",
    "cmd.voice.unlock.description": "Mở khóa kênh voice",
    "cmd.voice.hide.description": "Ẩn kênh voice",
    "cmd.voice.permit.description": "Cấp quyền cho người dùng",
    "cmd.voice.permit.opt.user": "Người được cấp quyền",
    "cmd.voice.block.description": "Chặn người dùng khỏi kênh",
    "cmd.voice.block.opt.user": "Người bị chặn",
    "cmd.voice.kick.description": "Kick người dùng khỏi kênh voice",
    "cmd.voice.kick.opt.user": "Người bị kick",
    "cmd.voice.transfer.description": "Chuyển quyền sở hữu kênh",
    "cmd.voice.transfer.opt.user": "Chủ mới",
    "cmd.settings.description": "Cài đặt bot",
    "cmd.settings.language.description": "Đặt ngôn ngữ ưu tiên",
    "cmd.settings.language.opt.locale": "Ngôn ngữ",
    "cmd.settings.language.opt.reset": "Đặt lại về tự động phát hiện",
    "cmd.settings.server_language.description": "Đặt ngôn ngữ mặc định cho server (Quản lý Guild)",
    "cmd.settings.server_language.opt.locale": "Ngôn ngữ",
    "cmd.settings.server_language.opt.reset": "Đặt lại về tự động phát hiện",

    "btn.homepage": "Trang chủ",
    "btn.discussions": "Thảo luận",
    "btn.report_bug": "Báo lỗi"
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/locales/en.json src/locales/vi.json
git commit -m "feat(i18n): add complete English and Vietnamese translation files"
```

---

### Task 7: Create `/settings` Command

**Files:**
- Create: `src/commands/slash/settings.ts`

- [ ] **Step 1: Create the settings command**

```typescript
// src/commands/slash/settings.ts
import {
    ChatInputCommandInteraction,
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder,
} from "discord.js";
import { resolveLocale, setUserLocale, resetUserLocale, setGuildLocale, resetGuildLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";
import { SUPPORTED_LOCALES } from "../../util/i18n/index";
import type { SupportedLocale } from "../../util/i18n/index";

export default {
    data: new SlashCommandBuilder()
        .setName("settings")
        .setDescription("Bot settings")
        .setDescriptionLocalizations({ vi: "Cài đặt bot" })
        .addSubcommand((sub) =>
            sub
                .setName("language")
                .setDescription("Set your preferred language")
                .setDescriptionLocalizations({ vi: "Đặt ngôn ngữ ưu tiên" })
                .addStringOption((opt) =>
                    opt
                        .setName("locale")
                        .setDescription("Language")
                        .setDescriptionLocalizations({ vi: "Ngôn ngữ" })
                        .addChoices(
                            { name: "English", value: "en" },
                            { name: "Tiếng Việt", value: "vi" }
                        )
                )
                .addBooleanOption((opt) =>
                    opt
                        .setName("reset")
                        .setDescription("Reset to auto-detect")
                        .setDescriptionLocalizations({ vi: "Đặt lại về tự động phát hiện" })
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("server-language")
                .setDescription("Set the server default language (Manage Guild)")
                .setDescriptionLocalizations({ vi: "Đặt ngôn ngữ mặc định cho server (Quản lý Guild)" })
                .addStringOption((opt) =>
                    opt
                        .setName("locale")
                        .setDescription("Language")
                        .setDescriptionLocalizations({ vi: "Ngôn ngữ" })
                        .addChoices(
                            { name: "English", value: "en" },
                            { name: "Tiếng Việt", value: "vi" }
                        )
                )
                .addBooleanOption((opt) =>
                    opt
                        .setName("reset")
                        .setDescription("Reset to auto-detect")
                        .setDescriptionLocalizations({ vi: "Đặt lại về tự động phát hiện" })
                )
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        const subcommand = interaction.options.getSubcommand(true);
        const locale = await resolveLocale(interaction);

        if (subcommand === "language") {
            const reset = interaction.options.getBoolean("reset");
            const newLocale = interaction.options.getString("locale") as SupportedLocale | null;

            if (reset) {
                await resetUserLocale(interaction.user.id);
                const responseLocale = await resolveLocale(interaction);
                await interaction.reply({
                    content: t(responseLocale, "settings.language_reset"),
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            if (newLocale && SUPPORTED_LOCALES.includes(newLocale)) {
                await setUserLocale(interaction.user.id, newLocale);
                await interaction.reply({
                    content: t(newLocale, "settings.language_set", { language: newLocale === "vi" ? "Tiếng Việt" : "English" }),
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            await interaction.reply({
                content: t(locale, "settings.language_set", { language: locale === "vi" ? "Tiếng Việt" : "English" }),
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        if (subcommand === "server-language") {
            const memberPerms = interaction.memberPermissions;
            if (!memberPerms?.has(PermissionFlagsBits.ManageGuild)) {
                await interaction.reply({
                    content: t(locale, "common.no_permission"),
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            const reset = interaction.options.getBoolean("reset");
            const newLocale = interaction.options.getString("locale") as SupportedLocale | null;
            const guildId = interaction.guildId!;

            if (reset) {
                await resetGuildLocale(guildId);
                const responseLocale = await resolveLocale(interaction);
                await interaction.reply({
                    content: t(responseLocale, "settings.server_language_reset"),
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            if (newLocale && SUPPORTED_LOCALES.includes(newLocale)) {
                await setGuildLocale(guildId, newLocale);
                await interaction.reply({
                    content: t(newLocale, "settings.server_language_set", { language: newLocale === "vi" ? "Tiếng Việt" : "English" }),
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            await interaction.reply({
                content: t(locale, "settings.server_language_set", { language: locale === "vi" ? "Tiếng Việt" : "English" }),
                flags: MessageFlags.Ephemeral,
            });
        }
    },
};
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/commands/slash/settings.ts
git commit -m "feat(i18n): add /settings command for language preferences"
```

---

### Task 8: Migrate Economy Commands (balance, pray, curse, shop, economy)

**Files:**
- Modify: `src/commands/slash/balance.ts`
- Modify: `src/commands/slash/pray.ts`
- Modify: `src/commands/slash/curse.ts`
- Modify: `src/commands/slash/shop.ts`
- Modify: `src/commands/slash/economy.ts`

- [ ] **Step 1: Migrate `balance.ts`**

Replace the full file content. Key changes:
- Import `resolveLocale` and `t`
- Add `setDescriptionLocalizations` to command builder
- Replace all hardcoded strings with `t()` calls

```typescript
import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import CurrencyService from "../../services/economy/currency.service";
import Reply from "../../util/decorator/reply";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";

export default {
    data: new SlashCommandBuilder()
        .setName("balance")
        .setDescription("View your coin and gem balance")
        .setDescriptionLocalizations({ vi: "Xem số dư coin và gem" })
        .addUserOption((option) =>
            option
                .setName("user")
                .setDescription("View another user's balance")
                .setDescriptionLocalizations({ vi: "Xem số dư của người khác" })
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        try {
            const locale = await resolveLocale(interaction);
            const target = interaction.options.getUser("user") ?? interaction.user;
            const guildId = interaction.guildId!;

            const balance = await CurrencyService.getBalance(target.id, guildId);

            const embed = new EmbedBuilder()
                .setColor(0x5865f2)
                .setTitle(t(locale, "balance.title", { username: target.username }))
                .addFields(
                    { name: t(locale, "balance.coin"), value: `**${balance.coin.toLocaleString()}**`, inline: true },
                    { name: t(locale, "balance.gem"), value: `**${balance.gem.toLocaleString()}**`, inline: true },
                    {
                        name: t(locale, "balance.pray_streak"),
                        value: t(locale, "balance.pray_streak_value", { count: balance.prayStreak }),
                        inline: true,
                    }
                )
                .setTimestamp();

            if (balance.lastPray) {
                embed.addFields({
                    name: t(locale, "balance.last_pray"),
                    value: `<t:${Math.floor(balance.lastPray.getTime() / 1000)}:R>`,
                    inline: true,
                });
            }

            await Reply.embedEdit(interaction, embed);
        } catch {
            const locale = await resolveLocale(interaction).catch(() => "en" as const);
            await interaction.editReply(t(locale, "common.error"));
        }
    },
};
```

- [ ] **Step 2: Migrate `pray.ts`**

Replace full file. Key changes: remove `PRAY_TEXTS` array, use `t()` for all strings.

```typescript
import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import PrayService, { PrayResult } from "../../services/economy/pray.service";
import Reply from "../../util/decorator/reply";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";
import type { SupportedLocale } from "../../util/i18n/index";

const PRAY_TEXT_COUNT = 5;

function randomIndex(max: number): number {
    return Math.floor(Math.random() * max);
}

function formatPrayEmbed(
    interaction: ChatInputCommandInteraction,
    result: PrayResult,
    locale: SupportedLocale
): EmbedBuilder {
    const embed = new EmbedBuilder().setColor(0xffd700).setTimestamp();

    const flavorText = t(locale, `pray.texts.${randomIndex(PRAY_TEXT_COUNT)}`);
    let description = t(locale, "pray.flavor", { username: interaction.user.username, text: flavorText }) + "\n\n";

    description += t(locale, "pray.reward_coin", { coin: result.userReward.coin });
    if (result.userReward.gem > 0) {
        description += t(locale, "pray.reward_gem", { gem: result.userReward.gem });
    }
    description += "\n";

    if (result.targetReward && result.targetId) {
        description += t(locale, "pray.target_reward", { targetId: result.targetId, coin: result.targetReward.coin }) + "\n";
    }

    if (result.streakInfo.streak > 1) {
        description += "\n" + t(locale, "pray.streak", { streak: result.streakInfo.streak });
    }

    if (result.streakInfo.milestoneHit) {
        const m = result.streakInfo.milestoneHit;
        description += "\n" + t(locale, "pray.milestone", { days: m.days, bonusCoin: m.bonusCoin });
        if (m.bonusGem > 0) {
            description += t(locale, "pray.milestone_gem", { bonusGem: m.bonusGem });
        }
    }

    embed.setDescription(description);
    return embed;
}

export default {
    data: new SlashCommandBuilder()
        .setName("pray")
        .setDescription("Pray to earn coin")
        .setDescriptionLocalizations({ vi: "Cầu nguyện để nhận coin" })
        .addUserOption((option) =>
            option
                .setName("target")
                .setDescription("Pray for someone else")
                .setDescriptionLocalizations({ vi: "Cầu nguyện cho người khác" })
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        try {
            const locale = await resolveLocale(interaction);
            const targetUser = interaction.options.getUser("target");
            const guildId = interaction.guildId!;
            const userId = interaction.user.id;

            if (targetUser?.bot) {
                await interaction.editReply(t(locale, "pray.bot_error"));
                return;
            }

            if (targetUser?.id === userId) {
                await interaction.editReply(t(locale, "pray.self_error"));
                return;
            }

            const result = await PrayService.pray(userId, guildId, targetUser?.id);
            const embed = formatPrayEmbed(interaction, result, locale);
            await Reply.embedEdit(interaction, embed);
        } catch (error) {
            const locale = await resolveLocale(interaction).catch(() => "en" as const);
            if (error instanceof Error && error.message === "PRAY_COOLDOWN") {
                await interaction.editReply(t(locale, "pray.cooldown"));
                return;
            }
            await interaction.editReply(t(locale, "common.error"));
        }
    },
};
```

- [ ] **Step 3: Migrate `curse.ts`**

Replace full file. Same pattern as pray — remove `CURSE_TEXTS`, use `t()`.

```typescript
import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import PrayService, { CurseResult } from "../../services/economy/pray.service";
import Reply from "../../util/decorator/reply";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";
import type { SupportedLocale } from "../../util/i18n/index";

const CURSE_TEXT_COUNT = 5;

function randomIndex(max: number): number {
    return Math.floor(Math.random() * max);
}

function formatCurseEmbed(
    interaction: ChatInputCommandInteraction,
    result: CurseResult,
    locale: SupportedLocale
): EmbedBuilder {
    const embed = new EmbedBuilder().setColor(0x800080).setTimestamp();

    const flavorText = t(locale, `curse.texts.${randomIndex(CURSE_TEXT_COUNT)}`);
    let description = t(locale, "curse.flavor", { username: interaction.user.username, text: flavorText }) + "\n\n";

    description += t(locale, "curse.reward_coin", { coin: result.userReward.coin }) + "\n";

    if (result.targetReward && result.targetId) {
        description += t(locale, "curse.target_reward", { targetId: result.targetId, coin: result.targetReward.coin }) + "\n";
    }

    embed.setDescription(description);
    return embed;
}

export default {
    data: new SlashCommandBuilder()
        .setName("curse")
        .setDescription("Curse to earn coin (less than pray)")
        .setDescriptionLocalizations({ vi: "Nguyền rủa để nhận coin (ít hơn pray)" })
        .addUserOption((option) =>
            option
                .setName("target")
                .setDescription("Curse someone")
                .setDescriptionLocalizations({ vi: "Nguyền rủa ai đó" })
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        try {
            const locale = await resolveLocale(interaction);
            const targetUser = interaction.options.getUser("target");
            const guildId = interaction.guildId!;
            const userId = interaction.user.id;

            if (targetUser?.bot) {
                await interaction.editReply(t(locale, "curse.bot_error"));
                return;
            }

            if (targetUser?.id === userId) {
                await interaction.editReply(t(locale, "curse.self_error"));
                return;
            }

            const result = await PrayService.curse(userId, guildId, targetUser?.id);
            const embed = formatCurseEmbed(interaction, result, locale);
            await Reply.embedEdit(interaction, embed);
        } catch (error) {
            const locale = await resolveLocale(interaction).catch(() => "en" as const);
            if (error instanceof Error && error.message === "CURSE_COOLDOWN") {
                await interaction.editReply(t(locale, "curse.cooldown"));
                return;
            }
            await interaction.editReply(t(locale, "common.error"));
        }
    },
};
```

- [ ] **Step 4: Migrate `shop.ts`**

Replace full file. Add `resolveLocale` and `t()` calls for all user-facing strings. Add `setDescriptionLocalizations` to all subcommands and options.

```typescript
import {
    ChatInputCommandInteraction,
    EmbedBuilder,
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder,
} from "discord.js";
import ShopService from "../../services/economy/shop.service";
import CurrencyService from "../../services/economy/currency.service";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";

function currencyEmoji(type: string): string {
    return type === "gem" ? "gem" : "coin";
}

export default {
    data: new SlashCommandBuilder()
        .setName("shop")
        .setDescription("Server shop")
        .setDescriptionLocalizations({ vi: "Cửa hàng server" })
        .addSubcommand((sub) =>
            sub
                .setName("view")
                .setDescription("View item list")
                .setDescriptionLocalizations({ vi: "Xem danh sách items" })
                .addIntegerOption((opt) =>
                    opt.setName("page").setDescription("Page").setDescriptionLocalizations({ vi: "Trang" }).setMinValue(1)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("buy")
                .setDescription("Buy an item")
                .setDescriptionLocalizations({ vi: "Mua item" })
                .addStringOption((opt) =>
                    opt
                        .setName("item-id")
                        .setDescription("Item ID")
                        .setDescriptionLocalizations({ vi: "ID của item" })
                        .setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("add")
                .setDescription("Add item to shop (Admin)")
                .setDescriptionLocalizations({ vi: "Thêm item vào shop (Admin)" })
                .addStringOption((opt) =>
                    opt.setName("item-id").setDescription("Unique ID").setDescriptionLocalizations({ vi: "Unique ID" }).setRequired(true)
                )
                .addStringOption((opt) =>
                    opt.setName("name").setDescription("Item name").setDescriptionLocalizations({ vi: "Tên item" }).setRequired(true)
                )
                .addStringOption((opt) =>
                    opt.setName("description").setDescription("Description").setDescriptionLocalizations({ vi: "Mô tả" }).setRequired(true)
                )
                .addStringOption((opt) =>
                    opt
                        .setName("type")
                        .setDescription("Item type")
                        .setDescriptionLocalizations({ vi: "Loại item" })
                        .setRequired(true)
                        .addChoices(
                            { name: "Role", value: "role" },
                            { name: "Cosmetic", value: "cosmetic" },
                            { name: "Currency Exchange", value: "currency_exchange" }
                        )
                )
                .addIntegerOption((opt) =>
                    opt.setName("price").setDescription("Price").setDescriptionLocalizations({ vi: "Giá" }).setMinValue(1).setRequired(true)
                )
                .addStringOption((opt) =>
                    opt
                        .setName("currency")
                        .setDescription("Currency type")
                        .setDescriptionLocalizations({ vi: "Loại tiền" })
                        .setRequired(true)
                        .addChoices({ name: "Coin", value: "coin" }, { name: "Gem", value: "gem" })
                )
                .addRoleOption((opt) =>
                    opt.setName("role").setDescription("Role (if type=role)").setDescriptionLocalizations({ vi: "Role (nếu type=role)" })
                )
                .addIntegerOption((opt) =>
                    opt
                        .setName("stock")
                        .setDescription("Quantity (empty = unlimited)")
                        .setDescriptionLocalizations({ vi: "Số lượng (bỏ trống = vô hạn)" })
                        .setMinValue(1)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("remove")
                .setDescription("Remove item from shop (Admin)")
                .setDescriptionLocalizations({ vi: "Xóa item khỏi shop (Admin)" })
                .addStringOption((opt) =>
                    opt
                        .setName("item-id")
                        .setDescription("Item ID")
                        .setDescriptionLocalizations({ vi: "ID của item" })
                        .setRequired(true)
                )
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        const subcommand = interaction.options.getSubcommand(true);
        const guildId = interaction.guildId!;
        const locale = await resolveLocale(interaction);

        if (subcommand === "view") {
            await interaction.deferReply();
            try {
                const page = interaction.options.getInteger("page") ?? 1;
                const { items, totalPages } = await ShopService.getItems(guildId, page);

                if (items.length === 0) {
                    await interaction.editReply(t(locale, "shop.empty"));
                    return;
                }

                const embed = new EmbedBuilder().setTitle(t(locale, "shop.title")).setColor(0xffd700).setTimestamp();

                for (const item of items) {
                    const stockText =
                        item.stock === null
                            ? t(locale, "shop.stock_unlimited")
                            : t(locale, "shop.stock_left", { count: item.stock });
                    embed.addFields({
                        name: `${item.name} — ${item.price} ${currencyEmoji(item.currencyType)}`,
                        value: `${item.description}\nID: \`${item.itemId}\` | Stock: ${stockText}`,
                    });
                }

                embed.setFooter({ text: t(locale, "shop.page_footer", { page, totalPages }) });
                await interaction.editReply({ embeds: [embed] });
            } catch {
                await interaction.editReply(t(locale, "common.error"));
            }
            return;
        }

        if (subcommand === "buy") {
            await interaction.deferReply();
            try {
                const itemId = interaction.options.getString("item-id", true);
                const result = await ShopService.buyItem(interaction.user.id, guildId, itemId, interaction.guild!);

                const embed = new EmbedBuilder()
                    .setColor(0x57f287)
                    .setDescription(
                        t(locale, "shop.buy_success", {
                            name: result.item.name,
                            amount: result.coinSpent > 0 ? result.coinSpent : result.gemSpent,
                            currency: result.coinSpent > 0 ? "coin" : "gem",
                        })
                    )
                    .setTimestamp();
                await interaction.editReply({ embeds: [embed] });
            } catch (error) {
                const msg = error instanceof Error ? error.message : "UNKNOWN";
                const errorKeys: Record<string, string> = {
                    ITEM_NOT_FOUND: "shop.item_not_found",
                    OUT_OF_STOCK: "shop.out_of_stock",
                    ALREADY_HAS_ROLE: "shop.already_has_role",
                    EFFECT_FAILED: "shop.effect_failed",
                };
                if (error instanceof CurrencyService.InsufficientFundsError) {
                    await interaction.editReply(t(locale, "shop.insufficient_funds"));
                    return;
                }
                await interaction.editReply(t(locale, errorKeys[msg] ?? "common.error"));
            }
            return;
        }

        // Admin commands: add and remove
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        if (subcommand === "add") {
            try {
                const memberPerms = interaction.memberPermissions;
                if (!memberPerms?.has(PermissionFlagsBits.Administrator)) {
                    await interaction.editReply(t(locale, "common.no_permission"));
                    return;
                }

                const type = interaction.options.getString("type", true) as "role" | "cosmetic" | "currency_exchange";
                const roleOption = interaction.options.getRole("role");

                if (type === "role" && !roleOption) {
                    await interaction.editReply(t(locale, "shop.add_role_required"));
                    return;
                }

                const item = await ShopService.addItem(guildId, {
                    itemId: interaction.options.getString("item-id", true),
                    name: interaction.options.getString("name", true),
                    description: interaction.options.getString("description", true),
                    type,
                    price: interaction.options.getInteger("price", true),
                    currencyType: interaction.options.getString("currency", true) as "coin" | "gem",
                    roleId: roleOption?.id,
                    stock: interaction.options.getInteger("stock") ?? null,
                });

                const embed = new EmbedBuilder()
                    .setColor(0x57f287)
                    .setDescription(t(locale, "shop.add_success", { name: item.name, itemId: item.itemId }))
                    .setTimestamp();
                await interaction.editReply({ embeds: [embed] });
            } catch (error) {
                if (error instanceof Error && error.message === "ITEM_ALREADY_EXISTS") {
                    await interaction.editReply(t(locale, "shop.add_duplicate"));
                    return;
                }
                await interaction.editReply(t(locale, "common.error"));
            }
            return;
        }

        if (subcommand === "remove") {
            try {
                const memberPerms = interaction.memberPermissions;
                if (!memberPerms?.has(PermissionFlagsBits.Administrator)) {
                    await interaction.editReply(t(locale, "common.no_permission"));
                    return;
                }

                const itemId = interaction.options.getString("item-id", true);
                await ShopService.removeItem(guildId, itemId);

                const embed = new EmbedBuilder()
                    .setColor(0xed4245)
                    .setDescription(t(locale, "shop.remove_success", { itemId }))
                    .setTimestamp();
                await interaction.editReply({ embeds: [embed] });
            } catch (error) {
                if (error instanceof Error && error.message === "ITEM_NOT_FOUND") {
                    await interaction.editReply(t(locale, "shop.remove_not_found"));
                    return;
                }
                await interaction.editReply(t(locale, "common.error"));
            }
        }
    },
};
```

- [ ] **Step 5: Migrate `economy.ts`**

Replace full file. Add `resolveLocale`, `t()`, and `setDescriptionLocalizations`.

```typescript
import {
    ChatInputCommandInteraction,
    EmbedBuilder,
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder,
} from "discord.js";
import CurrencyService from "../../services/economy/currency.service";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";

export default {
    data: new SlashCommandBuilder()
        .setName("economy")
        .setDescription("Economy management (admin)")
        .setDescriptionLocalizations({ vi: "Quản lý kinh tế (admin)" })
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand((sub) =>
            sub
                .setName("set-coin")
                .setDescription("Set a user's coin")
                .setDescriptionLocalizations({ vi: "Đặt coin cho người dùng" })
                .addUserOption((opt) =>
                    opt.setName("user").setDescription("Target user").setDescriptionLocalizations({ vi: "Người dùng mục tiêu" }).setRequired(true)
                )
                .addIntegerOption((opt) =>
                    opt.setName("amount").setDescription("Coin amount").setDescriptionLocalizations({ vi: "Số lượng coin" }).setMinValue(0).setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("add-coin")
                .setDescription("Add coin to a user")
                .setDescriptionLocalizations({ vi: "Thêm coin cho người dùng" })
                .addUserOption((opt) =>
                    opt.setName("user").setDescription("Target user").setDescriptionLocalizations({ vi: "Người dùng mục tiêu" }).setRequired(true)
                )
                .addIntegerOption((opt) =>
                    opt.setName("amount").setDescription("Coin to add").setDescriptionLocalizations({ vi: "Coin cần thêm" }).setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("set-gem")
                .setDescription("Set a user's gem")
                .setDescriptionLocalizations({ vi: "Đặt gem cho người dùng" })
                .addUserOption((opt) =>
                    opt.setName("user").setDescription("Target user").setDescriptionLocalizations({ vi: "Người dùng mục tiêu" }).setRequired(true)
                )
                .addIntegerOption((opt) =>
                    opt.setName("amount").setDescription("Gem amount").setDescriptionLocalizations({ vi: "Số lượng gem" }).setMinValue(0).setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("add-gem")
                .setDescription("Add gem to a user")
                .setDescriptionLocalizations({ vi: "Thêm gem cho người dùng" })
                .addUserOption((opt) =>
                    opt.setName("user").setDescription("Target user").setDescriptionLocalizations({ vi: "Người dùng mục tiêu" }).setRequired(true)
                )
                .addIntegerOption((opt) =>
                    opt.setName("amount").setDescription("Gem to add").setDescriptionLocalizations({ vi: "Gem cần thêm" }).setRequired(true)
                )
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const locale = await resolveLocale(interaction);
            const guildId = interaction.guildId!;
            const subcommand = interaction.options.getSubcommand(true);
            const target = interaction.options.getUser("user", true);
            const amount = interaction.options.getInteger("amount", true);

            let embed: EmbedBuilder;

            switch (subcommand) {
                case "set-coin": {
                    const updated = await CurrencyService.setCoin(target.id, guildId, amount);
                    embed = new EmbedBuilder()
                        .setDescription(t(locale, "economy.set_coin", { userId: target.id, amount: updated.coin.toLocaleString() }))
                        .setColor(0x5865f2);
                    break;
                }
                case "add-coin": {
                    const updated = await CurrencyService.addCoin(target.id, guildId, amount, "admin", { action: "add-coin" });
                    embed = new EmbedBuilder()
                        .setDescription(
                            t(locale, "economy.add_coin", {
                                amount: amount.toLocaleString(),
                                userId: target.id,
                                total: updated.coin.toLocaleString(),
                            })
                        )
                        .setColor(amount >= 0 ? 0x57f287 : 0xed4245);
                    break;
                }
                case "set-gem": {
                    const updated = await CurrencyService.setGem(target.id, guildId, amount);
                    embed = new EmbedBuilder()
                        .setDescription(t(locale, "economy.set_gem", { userId: target.id, amount: updated.gem.toLocaleString() }))
                        .setColor(0x5865f2);
                    break;
                }
                case "add-gem": {
                    const updated = await CurrencyService.addGem(target.id, guildId, amount, "admin", { action: "add-gem" });
                    embed = new EmbedBuilder()
                        .setDescription(
                            t(locale, "economy.add_gem", {
                                amount: amount.toLocaleString(),
                                userId: target.id,
                                total: updated.gem.toLocaleString(),
                            })
                        )
                        .setColor(amount >= 0 ? 0x57f287 : 0xed4245);
                    break;
                }
                default:
                    await interaction.editReply(t(locale, "common.unknown_subcommand"));
                    return;
            }

            await interaction.editReply({ embeds: [embed] });
        } catch {
            const locale = await resolveLocale(interaction).catch(() => "en" as const);
            await interaction.editReply(t(locale, "common.error"));
        }
    },
};
```

- [ ] **Step 6: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add src/commands/slash/balance.ts src/commands/slash/pray.ts src/commands/slash/curse.ts src/commands/slash/shop.ts src/commands/slash/economy.ts
git commit -m "feat(i18n): migrate economy commands to use i18n translations"
```

---

### Task 9: Migrate XP Commands (xp, rank, leaderboard) and Rank Utilities

**Files:**
- Modify: `src/commands/slash/xp.ts`
- Modify: `src/commands/slash/rank.ts`
- Modify: `src/commands/slash/leaderboard.ts`
- Modify: `src/util/xp/rankCard.ts`

- [ ] **Step 1: Migrate `src/util/xp/rankCard.ts`**

The rankCard utility builds embeds with hardcoded Vietnamese strings. All four exported functions need locale passed in. Key changes:
- Add `locale: SupportedLocale` parameter to `buildRankEmbed`, `buildLeaderboardEmbed`, `buildLevelUpEmbed`, `buildGlobalLeaderboardEmbed`
- Import and use `t()` for all strings

```typescript
import { EmbedBuilder } from "discord.js";
import type { IMemberXP } from "../../models/memberXP.model";
import type { IUser } from "../../models/user.model";
import { levelFromXP, progressToNextLevel, xpForLevel } from "./calculator";
import { t } from "../i18n/t";
import type { SupportedLocale } from "../i18n/index";

const PROGRESS_BAR_LENGTH = 20;
const FILLED = "▓";
const EMPTY = "░";

function buildProgressBar(percentage: number): string {
    const filled = Math.round((percentage / 100) * PROGRESS_BAR_LENGTH);
    const empty = PROGRESS_BAR_LENGTH - filled;
    return FILLED.repeat(filled) + EMPTY.repeat(empty);
}

function formatVoiceTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
}

export function buildRankEmbed(
    member: IMemberXP | null,
    username: string,
    rank: number,
    globalRank: number,
    globalXP: number,
    locale: SupportedLocale
): EmbedBuilder {
    if (!member) {
        const globalLine = globalRank
            ? `🌐 ${t(locale, "rank.global_line", { globalRank, globalXP: globalXP.toLocaleString() })}`
            : t(locale, "rank.no_rank");

        return new EmbedBuilder()
            .setTitle(`📊 ${username} — Level 0`)
            .setDescription(
                [
                    globalLine,
                    "",
                    `${buildProgressBar(0)} 0%`,
                    `0 / ${xpForLevel(1)} XP`,
                    "",
                    "💬 0  ·  🎤 0m  ·  ❤️ 0",
                ].join("\n")
            )
            .setColor(0x2b2d31);
    }

    const progress = progressToNextLevel(member.xp);

    return new EmbedBuilder()
        .setTitle(`📊 ${username} — Level ${progress.level}`)
        .setDescription(
            [
                t(locale, "rank.server_line", { rank, globalRank: globalRank || "—" }),
                "",
                `${buildProgressBar(progress.percentage)} ${progress.percentage}%`,
                `${member.xp.toLocaleString()} / ${xpForLevel(progress.level + 1).toLocaleString()} XP`,
                `🌐 ${t(locale, "rank.total_xp", { globalXP: globalXP.toLocaleString() })}`,
                "",
                `💬 ${member.messageCount.toLocaleString()}  ·  🎤 ${formatVoiceTime(member.voiceMinutes)}  ·  ❤️ ${member.reactionCount.toLocaleString()}`,
            ].join("\n")
        )
        .setColor(0x5865f2)
        .setTimestamp();
}

const MEDALS = ["🥇", "🥈", "🥉"] as const;

export function buildLeaderboardEmbed(members: IMemberXP[], guildName: string, locale: SupportedLocale): EmbedBuilder {
    if (members.length === 0) {
        return new EmbedBuilder()
            .setTitle(`🏆 ${t(locale, "leaderboard.title")}`)
            .setDescription(t(locale, "leaderboard.empty"))
            .setColor(0xf0b132);
    }

    const lines = members.map((m, i) => {
        const medal = i < 3 ? MEDALS[i] : "";
        const prefix = `#${i + 1}  ${medal}`;
        return `${prefix} <@${m.userId}> — Level ${m.level} (${m.xp.toLocaleString()} XP)`;
    });

    return new EmbedBuilder()
        .setTitle(`🏆 ${t(locale, "leaderboard.title")}`)
        .setDescription(lines.join("\n"))
        .setColor(0xf0b132)
        .setFooter({ text: guildName })
        .setTimestamp();
}

export function buildLevelUpEmbed(userId: string, newLevel: number, locale: SupportedLocale, globalRank?: number): EmbedBuilder {
    const lines = [`🎉 ${t(locale, "rank.level_up", { userId, level: newLevel })}`];
    if (globalRank) {
        lines.push(`🌐 Global Rank: **#${globalRank}**`);
    }

    return new EmbedBuilder().setDescription(lines.join("\n")).setColor(0xf0b132);
}

export function buildGlobalLeaderboardEmbed(users: IUser[], usernames: Map<string, string>, locale: SupportedLocale): EmbedBuilder {
    if (users.length === 0) {
        return new EmbedBuilder()
            .setTitle(`🌐 ${t(locale, "leaderboard.global_title")}`)
            .setDescription(t(locale, "leaderboard.empty"))
            .setColor(0xf0b132);
    }

    const lines = users.map((u, i) => {
        const medal = i < 3 ? MEDALS[i] : "";
        const prefix = `#${i + 1}  ${medal}`;
        const level = levelFromXP(u.totalPoint);
        const name = usernames.get(u.userID) ?? `<@${u.userID}>`;
        return `${prefix} @${name} — Level ${level} (${u.totalPoint.toLocaleString()} XP)`;
    });

    return new EmbedBuilder()
        .setTitle(`🌐 ${t(locale, "leaderboard.global_title")}`)
        .setDescription(lines.join("\n"))
        .setColor(0xf0b132)
        .setFooter({ text: "Global" })
        .setTimestamp();
}
```

- [ ] **Step 2: Migrate `rank.ts`**

Add `resolveLocale` and pass `locale` to `buildRankEmbed`.

```typescript
import { AttachmentBuilder, ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

import MemberXPModel from "../../models/memberXP.model";
import { progressToNextLevel, xpForLevel } from "../../util/xp/calculator";
import { buildRankEmbed } from "../../util/xp/rankCard";
import { renderRankCard } from "../../util/xp/canvasRankCard";
import { getGlobalRank } from "../../util/xp/globalXP";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";

export default {
    data: new SlashCommandBuilder()
        .setName("rank")
        .setDescription("View your rank card or another user's")
        .setDescriptionLocalizations({ vi: "Xem rank card của bạn hoặc người khác" })
        .addUserOption((option) =>
            option
                .setName("user")
                .setDescription("User to check rank for")
                .setDescriptionLocalizations({ vi: "Người dùng cần xem rank" })
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        try {
            const locale = await resolveLocale(interaction);
            const target = interaction.options.getUser("user") ?? interaction.user;
            const guildId = interaction.guildId!;

            const member = await MemberXPModel.findOne({ guildId, userId: target.id });

            let rank = 0;
            if (member) {
                const higherCount = await MemberXPModel.countDocuments({ guildId, xp: { $gt: member.xp } });
                rank = higherCount + 1;
            }

            const { rank: globalRank, totalPoint: globalXP } = await getGlobalRank(target.id);
            const progress = progressToNextLevel(member?.xp ?? 0);

            try {
                const avatarURL = target.displayAvatarURL({ extension: "png", size: 256 });
                const pngBuffer = await renderRankCard({
                    username: target.username,
                    avatarURL,
                    level: progress.level,
                    rank,
                    globalRank,
                    xp: member?.xp ?? 0,
                    xpForNextLevel: xpForLevel(progress.level + 1),
                    percentage: progress.percentage,
                    messageCount: member?.messageCount ?? 0,
                    voiceMinutes: member?.voiceMinutes ?? 0,
                    reactionCount: member?.reactionCount ?? 0,
                    totalXP: globalXP,
                });

                const attachment = new AttachmentBuilder(pngBuffer, { name: "rank.png" });
                await interaction.editReply({ files: [attachment] });
            } catch {
                const embed = buildRankEmbed(member, target.username, rank, globalRank, globalXP, locale);
                await interaction.editReply({ embeds: [embed] });
            }
        } catch {
            const locale = await resolveLocale(interaction).catch(() => "en" as const);
            await interaction.editReply(t(locale, "rank.error"));
        }
    },
};
```

- [ ] **Step 3: Migrate `leaderboard.ts`**

```typescript
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

import client from "../../client";
import MemberXPModel from "../../models/memberXP.model";
import UserModel from "../../models/user.model";
import { buildLeaderboardEmbed, buildGlobalLeaderboardEmbed } from "../../util/xp/rankCard";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";

export default {
    data: new SlashCommandBuilder()
        .setName("leaderboard")
        .setDescription("View the XP leaderboard")
        .setDescriptionLocalizations({ vi: "Xem bảng xếp hạng XP" })
        .addStringOption((option) =>
            option
                .setName("mode")
                .setDescription("Leaderboard type")
                .setDescriptionLocalizations({ vi: "Loại bảng xếp hạng" })
                .addChoices({ name: "Server", value: "server" }, { name: "Global", value: "global" })
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        try {
            const locale = await resolveLocale(interaction);
            const mode = interaction.options.getString("mode") ?? "server";

            if (mode === "global") {
                const topUsers = await UserModel.find().sort({ totalPoint: -1 }).limit(10);

                const usernames = new Map<string, string>();
                await Promise.all(
                    topUsers.map(async (u) => {
                        try {
                            const member = await interaction.guild?.members.fetch(u.userID);
                            if (member) {
                                usernames.set(u.userID, member.displayName);
                                return;
                            }
                        } catch {
                            // Not in this guild
                        }
                        try {
                            const user = await client.users.fetch(u.userID);
                            usernames.set(u.userID, user.displayName);
                        } catch {
                            // User not fetchable
                        }
                    })
                );

                const embed = buildGlobalLeaderboardEmbed(topUsers, usernames, locale);
                await interaction.editReply({ embeds: [embed] });
            } else {
                const guildId = interaction.guildId!;
                const topMembers = await MemberXPModel.find({ guildId }).sort({ xp: -1 }).limit(10);

                const guildName = interaction.guild?.name ?? "Server";
                const embed = buildLeaderboardEmbed(topMembers, guildName, locale);
                await interaction.editReply({ embeds: [embed] });
            }
        } catch {
            const locale = await resolveLocale(interaction).catch(() => "en" as const);
            await interaction.editReply(t(locale, "leaderboard.error"));
        }
    },
};
```

- [ ] **Step 4: Migrate `xp.ts`**

Add `resolveLocale` and `t()`. Replace all hardcoded strings.

```typescript
import {
    ChatInputCommandInteraction,
    EmbedBuilder,
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder,
} from "discord.js";

import MemberXPModel from "../../models/memberXP.model";
import GuildXPConfigModel from "../../models/guildXPConfig.model";
import { levelFromXP } from "../../util/xp/calculator";
import { syncGlobalXP } from "../../util/xp/globalXP";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";
import type { SupportedLocale } from "../../util/i18n/index";

export default {
    data: new SlashCommandBuilder()
        .setName("xp")
        .setDescription("XP management (admin)")
        .setDescriptionLocalizations({ vi: "Quản lý XP (admin)" })
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand((sub) =>
            sub
                .setName("set")
                .setDescription("Set a user's XP")
                .setDescriptionLocalizations({ vi: "Đặt XP cho người dùng" })
                .addUserOption((opt) =>
                    opt.setName("user").setDescription("Target user").setDescriptionLocalizations({ vi: "Người dùng mục tiêu" }).setRequired(true)
                )
                .addIntegerOption((opt) =>
                    opt.setName("amount").setDescription("XP amount").setDescriptionLocalizations({ vi: "Số lượng XP" }).setMinValue(0).setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("add")
                .setDescription("Add XP to a user")
                .setDescriptionLocalizations({ vi: "Thêm XP cho người dùng" })
                .addUserOption((opt) =>
                    opt.setName("user").setDescription("Target user").setDescriptionLocalizations({ vi: "Người dùng mục tiêu" }).setRequired(true)
                )
                .addIntegerOption((opt) =>
                    opt.setName("amount").setDescription("XP to add").setDescriptionLocalizations({ vi: "XP cần thêm" }).setMinValue(1).setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("remove")
                .setDescription("Remove XP from a user")
                .setDescriptionLocalizations({ vi: "Xóa XP từ người dùng" })
                .addUserOption((opt) =>
                    opt.setName("user").setDescription("Target user").setDescriptionLocalizations({ vi: "Người dùng mục tiêu" }).setRequired(true)
                )
                .addIntegerOption((opt) =>
                    opt.setName("amount").setDescription("XP to remove").setDescriptionLocalizations({ vi: "XP cần xóa" }).setMinValue(1).setRequired(true)
                )
        )
        .addSubcommandGroup((group) =>
            group
                .setName("channel-blacklist")
                .setDescription("Manage XP channel blacklist")
                .setDescriptionLocalizations({ vi: "Quản lý blacklist kênh XP" })
                .addSubcommand((sub) =>
                    sub
                        .setName("add")
                        .setDescription("Blacklist a channel from XP")
                        .setDescriptionLocalizations({ vi: "Thêm kênh vào blacklist XP" })
                        .addChannelOption((opt) =>
                            opt.setName("channel").setDescription("Channel to blacklist").setDescriptionLocalizations({ vi: "Kênh" }).setRequired(true)
                        )
                )
                .addSubcommand((sub) =>
                    sub
                        .setName("remove")
                        .setDescription("Remove a channel from blacklist")
                        .setDescriptionLocalizations({ vi: "Xóa kênh khỏi blacklist" })
                        .addChannelOption((opt) =>
                            opt.setName("channel").setDescription("Channel to remove").setDescriptionLocalizations({ vi: "Kênh" }).setRequired(true)
                        )
                )
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const locale = await resolveLocale(interaction);
            const guildId = interaction.guildId!;
            const subcommandGroup = interaction.options.getSubcommandGroup();
            const subcommand = interaction.options.getSubcommand(true);

            if (subcommandGroup === "channel-blacklist") {
                await handleChannelBlacklist(interaction, guildId, subcommand, locale);
                return;
            }

            const target = interaction.options.getUser("user", true);
            const amount = interaction.options.getInteger("amount", true);

            switch (subcommand) {
                case "set": {
                    const oldMember = await MemberXPModel.findOne({ guildId, userId: target.id });
                    const oldXP = oldMember?.xp ?? 0;
                    const oldLevel = oldMember?.level ?? 0;
                    const newLevel = levelFromXP(amount);

                    await MemberXPModel.findOneAndUpdate(
                        { guildId, userId: target.id },
                        {
                            $set: { xp: amount, level: newLevel },
                            $setOnInsert: {
                                guildId,
                                userId: target.id,
                                messageCount: 0,
                                voiceMinutes: 0,
                                reactionCount: 0,
                                lastMessageAt: null,
                                lastMessageHash: "",
                            },
                        },
                        { upsert: true }
                    );

                    const delta = amount - oldXP;
                    await syncGlobalXP(target.id, delta);

                    const embed = new EmbedBuilder()
                        .setDescription(
                            t(locale, "xp.set", {
                                userId: target.id,
                                oldXP: oldXP.toLocaleString(),
                                oldLevel,
                                newXP: amount.toLocaleString(),
                                newLevel,
                            })
                        )
                        .setColor(0x5865f2);
                    await interaction.editReply({ embeds: [embed] });
                    break;
                }
                case "add": {
                    const updated = await MemberXPModel.findOneAndUpdate(
                        { guildId, userId: target.id },
                        {
                            $inc: { xp: amount },
                            $setOnInsert: {
                                guildId,
                                userId: target.id,
                                level: 0,
                                messageCount: 0,
                                voiceMinutes: 0,
                                reactionCount: 0,
                                lastMessageAt: null,
                                lastMessageHash: "",
                            },
                        },
                        { upsert: true, new: true }
                    );

                    const newLevel = levelFromXP(updated.xp);
                    if (newLevel > updated.level) {
                        await MemberXPModel.updateOne({ _id: updated._id }, { $set: { level: newLevel } });
                    }

                    await syncGlobalXP(target.id, amount);

                    const embed = new EmbedBuilder()
                        .setDescription(
                            t(locale, "xp.add", {
                                amount: amount.toLocaleString(),
                                userId: target.id,
                                total: updated.xp.toLocaleString(),
                                level: newLevel,
                            })
                        )
                        .setColor(0x57f287);
                    await interaction.editReply({ embeds: [embed] });
                    break;
                }
                case "remove": {
                    const member = await MemberXPModel.findOne({ guildId, userId: target.id });
                    const currentXP = member?.xp ?? 0;
                    const newXP = Math.max(0, currentXP - amount);
                    const newLevel = levelFromXP(newXP);

                    await MemberXPModel.findOneAndUpdate(
                        { guildId, userId: target.id },
                        {
                            $set: { xp: newXP, level: newLevel },
                            $setOnInsert: {
                                guildId,
                                userId: target.id,
                                messageCount: 0,
                                voiceMinutes: 0,
                                reactionCount: 0,
                                lastMessageAt: null,
                                lastMessageHash: "",
                            },
                        },
                        { upsert: true }
                    );

                    const actualRemoved = currentXP - newXP;
                    await syncGlobalXP(target.id, -actualRemoved);

                    const embed = new EmbedBuilder()
                        .setDescription(
                            t(locale, "xp.remove", {
                                amount: amount.toLocaleString(),
                                userId: target.id,
                                total: newXP.toLocaleString(),
                                level: newLevel,
                            })
                        )
                        .setColor(0xed4245);
                    await interaction.editReply({ embeds: [embed] });
                    break;
                }
            }
        } catch {
            const locale = await resolveLocale(interaction).catch(() => "en" as const);
            await interaction.editReply(t(locale, "common.error"));
        }
    },
};

async function handleChannelBlacklist(
    interaction: ChatInputCommandInteraction,
    guildId: string,
    subcommand: string,
    locale: SupportedLocale
): Promise<void> {
    const channel = interaction.options.getChannel("channel", true);

    const config = await GuildXPConfigModel.findOneAndUpdate(
        { guildId },
        { $setOnInsert: { guildId } },
        { upsert: true, new: true }
    );

    if (subcommand === "add") {
        if (config.blacklistedChannels.includes(channel.id)) {
            await interaction.editReply(t(locale, "xp.blacklist.already_in", { channelId: channel.id }));
            return;
        }

        config.blacklistedChannels.push(channel.id);
        await config.save();
    } else if (subcommand === "remove") {
        const index = config.blacklistedChannels.indexOf(channel.id);
        if (index === -1) {
            await interaction.editReply(t(locale, "xp.blacklist.not_in", { channelId: channel.id }));
            return;
        }

        config.blacklistedChannels.splice(index, 1);
        await config.save();
    }

    const list = config.blacklistedChannels.length > 0
        ? config.blacklistedChannels.map((id) => `<#${id}>`).join(", ")
        : t(locale, "xp.blacklist.empty");

    const embed = new EmbedBuilder()
        .setTitle(`📋 ${t(locale, "xp.blacklist.title")}`)
        .setDescription(list)
        .setColor(0x5865f2);
    await interaction.editReply({ embeds: [embed] });
}
```

- [ ] **Step 5: Find and update any callers of `buildLevelUpEmbed`**

Search for `buildLevelUpEmbed` usage in event handlers and pass locale. Since level-up events don't have an interaction (they fire on message), use the guild's locale or default to `"en"`. The caller needs to resolve locale from `guildId` — use `resolveFromRedisOrDb` pattern or export a simpler function. This depends on the event handler structure — the implementer should grep for `buildLevelUpEmbed` and update each call site to pass the locale.

- [ ] **Step 6: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add src/commands/slash/xp.ts src/commands/slash/rank.ts src/commands/slash/leaderboard.ts src/util/xp/rankCard.ts
git commit -m "feat(i18n): migrate XP commands and rank utilities to use i18n"
```

---

### Task 10: Migrate General Commands (ping, help, info, avatar, trans)

**Files:**
- Modify: `src/commands/slash/ping.ts`
- Modify: `src/commands/slash/help.ts`
- Modify: `src/commands/slash/info.ts`
- Modify: `src/commands/slash/avatar.ts`
- Modify: `src/commands/slash/trans.ts`

- [ ] **Step 1: Migrate `ping.ts`**

```typescript
import { bold, ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";

export default {
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Replies with Pong!")
        .setDescriptionLocalizations({ vi: "Kiểm tra độ trễ!" }),

    async execute(interaction: ChatInputCommandInteraction) {
        const locale = await resolveLocale(interaction);
        const { resource: sent } = await interaction.reply({
            content: t(locale, "ping.pinging"),
            withResponse: true,
        });
        if (sent?.message) {
            await interaction.editReply(
                bold(`🧈 ${t(locale, "ping.result", { latency: sent.message.createdTimestamp - interaction.createdTimestamp })}`)
            );
        }
    },
};
```

- [ ] **Step 2: Migrate `help.ts`**

```typescript
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    EmbedBuilder,
    SlashCommandBuilder,
} from "discord.js";

import client from "../../client";
import Reply from "../../util/decorator/reply";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";

export default {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Get the help commands")
        .setDescriptionLocalizations({ vi: "Xem danh sách lệnh" }),
    async execute(interaction: ChatInputCommandInteraction) {
        const locale = await resolveLocale(interaction);
        const embed = new EmbedBuilder().setColor("Random").setTimestamp();

        embed.setTitle(`${t(locale, "help.title")} 💖`);

        for (const i of client.commands) {
            const field = i[1].data.toJSON();
            embed.addFields({
                name: field.name,
                value: field.description,
            });
        }

        const homepage = new ButtonBuilder()
            .setLabel(t(locale, "btn.homepage"))
            .setURL(`${process.env.URL_HOMEPAGE}`)
            .setStyle(ButtonStyle.Link);

        const discussions = new ButtonBuilder()
            .setLabel(t(locale, "btn.discussions"))
            .setURL(`${process.env.URL_DISCUSSIONS}`)
            .setStyle(ButtonStyle.Link);

        const reportBug = new ButtonBuilder()
            .setLabel(t(locale, "btn.report_bug"))
            .setURL(`${process.env.URL_REPORT_BUG}`)
            .setStyle(ButtonStyle.Link);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(homepage, discussions, reportBug);
        return Reply.embedButtons(interaction, embed, row);
    },
};
```

- [ ] **Step 3: Migrate `info.ts`**

```typescript
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    EmbedBuilder,
    SlashCommandBuilder,
} from "discord.js";

import infoBot from "../../../package.json";
import reply from "../../util/decorator/reply";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";

export default {
    data: new SlashCommandBuilder()
        .setName("info")
        .setDescription("Information about bot")
        .setDescriptionLocalizations({ vi: "Thông tin về bot" })
        .addSubcommand((subcommand) =>
            subcommand
                .setName("bot")
                .setDescription("Information about bot")
                .setDescriptionLocalizations({ vi: "Thông tin về bot" })
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        const locale = await resolveLocale(interaction);
        const subcommand = interaction.options.getSubcommand(true);
        const embed = new EmbedBuilder().setColor("Random").setTimestamp();

        switch (subcommand) {
            case "bot":
                embed.setTitle(t(locale, "info.title"));
                embed.addFields(
                    { name: t(locale, "info.name"), value: `3AT - Endless Paradox`, inline: true },
                    { name: t(locale, "info.version"), value: `${infoBot.version}`, inline: true },
                    { name: t(locale, "info.language"), value: `TypeScript`, inline: true },
                    { name: t(locale, "info.runtime"), value: `Node.js ${process.version}`, inline: true },
                    { name: t(locale, "info.discord"), value: `Discord.js v14`, inline: true }
                );
                break;

            default:
                break;
        }

        const homepage = new ButtonBuilder()
            .setLabel(t(locale, "btn.homepage"))
            .setURL(`${process.env.URL_HOMEPAGE}`)
            .setStyle(ButtonStyle.Link);

        const discussions = new ButtonBuilder()
            .setLabel(t(locale, "btn.discussions"))
            .setURL(`${process.env.URL_DISCUSSIONS}`)
            .setStyle(ButtonStyle.Link);

        const reportBug = new ButtonBuilder()
            .setLabel(t(locale, "btn.report_bug"))
            .setURL(`${process.env.URL_REPORT_BUG}`)
            .setStyle(ButtonStyle.Link);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(homepage, discussions, reportBug);
        await reply.embedButtons(interaction, embed, row);
        return;
    },
};

export function getInfoBot(interaction: ChatInputCommandInteraction) {
    return interaction.client.guilds.cache.reduce((a, g) => a + g.memberCount, 0);
}
```

- [ ] **Step 4: Migrate `avatar.ts`**

```typescript
import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";

import Reply from "../../util/decorator/reply";

export default {
    data: new SlashCommandBuilder()
        .setName("avatar")
        .setDescription("Get the avatar URL of the selected user, or your own avatar.")
        .setDescriptionLocalizations({ vi: "Xem avatar của người dùng hoặc avatar của bạn." })
        .addUserOption((option) =>
            option
                .setName("target")
                .setDescription("The user's avatar to show")
                .setDescriptionLocalizations({ vi: "Avatar của ai" })
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        const user = interaction.options.getUser("target");
        const embed = new EmbedBuilder().setColor("Random").setTimestamp();

        if (user) {
            embed.setImage(`${user.avatarURL({ extension: "png", size: 2048, forceStatic: true })}`);
        } else {
            embed.setImage(`${interaction.user.avatarURL({ extension: "png", size: 2048, forceStatic: true })}`);
        }

        return Reply.embed(interaction, embed);
    },
};
```

- [ ] **Step 5: Migrate `trans.ts`**

```typescript
import axios from "axios";
import { bold, ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";

import Reply from "../../util/decorator/reply";

async function translate(text: string, to: string): Promise<string> {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
    const { data } = await axios.get(url);
    return (data[0] as [string, string][]).map((s) => s[0]).join("");
}

export default {
    data: new SlashCommandBuilder()
        .setName("trans")
        .setDescription("Translate all languages to Vietnamese")
        .setDescriptionLocalizations({ vi: "Dịch mọi ngôn ngữ sang Tiếng Việt" })
        .addStringOption((option) =>
            option
                .setName("word")
                .setDescription("word or paragraph")
                .setDescriptionLocalizations({ vi: "từ hoặc đoạn văn" })
                .setRequired(true)
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();
        try {
            const content = interaction.options.getString("word", true);
            const translated = await translate(content, "vi");

            const embed = new EmbedBuilder()
                .setColor("#00ff44")
                .setTimestamp()
                .setTitle(`${content}`)
                .setDescription(`${bold(translated)}`);

            return Reply.embedEdit(interaction, embed);
        } catch (error) {
            const content = interaction.options.getString("word", true);
            const embed = new EmbedBuilder()
                .setColor("#00ff44")
                .setTimestamp()
                .setTitle(`${content}`)
                .setDescription(`${bold((error as Error).message)}`);

            return Reply.embedEdit(interaction, embed);
        }
    },
};
```

- [ ] **Step 6: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add src/commands/slash/ping.ts src/commands/slash/help.ts src/commands/slash/info.ts src/commands/slash/avatar.ts src/commands/slash/trans.ts
git commit -m "feat(i18n): migrate general commands (ping, help, info, avatar, trans)"
```

---

### Task 11: Migrate Voice Command and Voice Helpers

**Files:**
- Modify: `src/commands/slash/voice.ts`
- Modify: `src/util/voice/helpers.ts`

- [ ] **Step 1: Migrate `src/util/voice/helpers.ts`**

The voice helpers use hardcoded English strings. Since button interactions don't have `ChatInputCommandInteraction`, and `resolveLocale` is typed for that — we need to create a more generic locale resolver or accept locale as a parameter. The simplest approach: button handlers resolve locale themselves and pass it to helpers.

Add `locale` parameter to `buildPanelEmbed`, `buildPanelRows`, and `sendPanel`. For `validateOwner` and `checkCooldown`, accept locale as parameter too.

Key changes to `helpers.ts`:
- Import `t` and `SupportedLocale`
- Add `locale` parameter to `validateOwner`, `checkCooldown`, `buildPanelEmbed`, `buildPanelRows`, `sendPanel`
- Replace all hardcoded strings with `t()` calls

Note: This also requires updating all 16 button handlers in `src/buttons/` to resolve locale and pass it. Since button handlers use `ButtonInteraction`, we need a `resolveLocaleFromButton` helper or generalize `resolveLocale` to accept `ButtonInteraction`. The simplest approach: make `resolveLocale` accept any interaction with a `user` and optional `guildId`.

Update `src/util/i18n/locale.ts` — change `resolveLocale` to accept a more generic type:

```typescript
import type { ChatInputCommandInteraction, ButtonInteraction, ModalSubmitInteraction } from "discord.js";

type LocaleInteraction = ChatInputCommandInteraction | ButtonInteraction | ModalSubmitInteraction;

export async function resolveLocale(interaction: LocaleInteraction): Promise<SupportedLocale> {
    // ... same implementation, interaction.user.id and interaction.guildId work on all these types
}
```

Then update helpers.ts to accept and use locale. This is a large change — the implementer should follow the same pattern used in slash commands but adapt it for button interaction context.

- [ ] **Step 2: Migrate `voice.ts` command**

Same pattern as other commands — add `resolveLocale`, `t()`, `setDescriptionLocalizations`. Replace all inline strings like `"You are not in a voice channel."` with `t(locale, "voice.not_in_channel")`, etc.

- [ ] **Step 3: Update button handlers to pass locale**

All 16 button handlers in `src/buttons/` need to resolve locale and pass it to helpers. This is mechanical — each handler calls `resolveLocale(interaction)` at the top and passes `locale` to `validateOwner`, `checkCooldown`, `buildPanelEmbed`, etc.

- [ ] **Step 4: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/commands/slash/voice.ts src/util/voice/helpers.ts src/util/i18n/locale.ts src/buttons/
git commit -m "feat(i18n): migrate voice command, helpers, and all button handlers"
```

---

### Task 12: Migrate Weather Command

**Files:**
- Modify: `src/commands/slash/weather.ts`

- [ ] **Step 1: Migrate `weather.ts`**

Key changes:
- Remove `WMO_CODES` object and `DAY_NAMES_VI` array — use `t()` with `weather.wmo.{code}` and `weather.day.{index}` keys
- Remove `getWeatherDescription` function — replace with `t(locale, "weather.wmo." + code)` with fallback
- Add `resolveLocale` and pass locale through the command
- Update date formatting to use locale-appropriate `toLocaleTimeString` / `toLocaleDateString`
- Add `setDescriptionLocalizations`

```typescript
import axios from "axios";
import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder, bold } from "discord.js";

import Reply from "../../util/decorator/reply";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";
import type { SupportedLocale } from "../../util/i18n/index";

// ... keep interfaces (GeocodingResult, etc.) ...
// ... keep getWeatherEmoji, getWeatherColor, COMPASS_DIRECTIONS, getWindDirection ...

function getWeatherDescription(code: number, locale: SupportedLocale): string {
    return t(locale, `weather.wmo.${code}`) || t(locale, "weather.wmo.unknown");
}

function getDayName(dateStr: string, locale: SupportedLocale): string {
    const date = new Date(dateStr);
    return t(locale, `weather.day.${date.getUTCDay()}`);
}

// In execute:
// const locale = await resolveLocale(interaction);
// Replace all getWeatherDescription(code) with getWeatherDescription(code, locale)
// Replace getDayName(dateStr) with getDayName(dateStr, locale)
// Replace DAY_NAMES_VI[currentDate.getDay()] with t(locale, `weather.day.${currentDate.getDay()}`)
// Replace "vi-VN" in toLocaleTimeString/toLocaleDateString with locale === "vi" ? "vi-VN" : "en-US"
// Replace bold(location) + " not found" with t(locale, "weather.not_found", { location })
// Update geocode to pass locale for API language param
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/commands/slash/weather.ts
git commit -m "feat(i18n): migrate weather command — replace WMO_CODES and DAY_NAMES_VI with i18n keys"
```

---

### Task 13: Migrate Manga Commands and Handler

**Files:**
- Modify: `src/util/manga/handler.ts`

- [ ] **Step 1: Migrate `handler.ts`**

The manga handler is shared by 6 commands (3hentai, asmhentai, hentaifox, nhentai, nhentaiTo, pururin). Since the `execute` function receives a `ChatInputCommandInteraction`, we can use `resolveLocale` directly.

Key changes:
- Import `resolveLocale` and `t`
- Replace `"Only NSFW channel"` with `t(locale, "manga.nsfw_only")`
- Replace `"Server maintenance"` with `t(locale, "manga.maintenance")`
- Replace `"Report this issue"` with `t(locale, "manga.report_issue")`
- Replace `"Read"` button label with `t(locale, "manga.read")`
- Replace `"Read Online"` with `t(locale, "manga.read_online")`
- Replace `"Please read it online..."` with `t(locale, "manga.too_many_pages")`
- The 6 command files (3hentai.ts, etc.) don't need changes — they delegate to `mangaCommand()`

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/util/manga/handler.ts
git commit -m "feat(i18n): migrate manga handler — all 6 manga commands now use i18n"
```

---

### Task 14: Final Build Verification and Format

- [ ] **Step 1: Run full TypeScript build**

Run:
```bash
npx tsc --noEmit
```
Expected: No errors

- [ ] **Step 2: Run format check**

Run:
```bash
npm run format
```

- [ ] **Step 3: Verify locale files are valid JSON**

Run:
```bash
node -e "require('./src/locales/en.json'); require('./src/locales/vi.json'); console.log('JSON OK')"
```
Expected: `JSON OK`

- [ ] **Step 4: Verify all translation keys match between en.json and vi.json**

Run:
```bash
node -e "const en = Object.keys(require('./src/locales/en.json')); const vi = Object.keys(require('./src/locales/vi.json')); const missing = en.filter(k => !vi.includes(k)); const extra = vi.filter(k => !en.includes(k)); if (missing.length) console.log('Missing in vi:', missing); if (extra.length) console.log('Extra in vi:', extra); if (!missing.length && !extra.length) console.log('Keys match!')"
```
Expected: `Keys match!`

- [ ] **Step 5: Commit any formatting changes**

```bash
git add -A
git commit -m "style(i18n): format all i18n-migrated files"
```
