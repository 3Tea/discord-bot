# CLAUDE.md — 3AT Discord Bot

## Project Overview

Discord bot "3AT - Endless Paradox" (v5.6.0) built with TypeScript, Discord.js v14, Mongoose, ioredis.
Runs on Node.js >= 24 via Gateway (WebSocket). Uses slash commands exclusively.

## Quick Reference

```bash
npm run start:dev    # Dev with hot reload (ts-node + nodemon)
npm run build        # Compile TypeScript to dist/
npm run build:start  # Clean build + run
npm start            # Run compiled dist/bin/www.js
```

```bash
docker build -t 3at-discord-bot .
docker run -d --env-file .env 3at-discord-bot
```

## Architecture

```
src/
  bin/www.ts              # Entry point: loads .env → initI18n() → imports bot + mongo
  bot.ts                  # client.login()
  client.ts               # Creates Client, runs loaders, deploys commands
  loaders/                # Auto-discovery loaders
    commands.ts           # Scans commands/slash/ → client.commands Collection
    events.ts             # Scans events/ → client.on/once
    buttons.ts            # Scans buttons/ → client.buttons Collection
    deploy.ts             # PUT commands to Discord API (guild or global)
  commands/slash/         # One file per slash command (auto-loaded)
  events/                 # One file per event (auto-loaded)
  buttons/                # One file per button handler (auto-loaded)
  models/                 # Mongoose schemas
    guild.model.ts        # Guild metadata + locale
    user.model.ts         # Global user data + totalPoint
    memberXP.model.ts     # Per-member, per-guild XP tracking
    guildXPConfig.model.ts # Server-specific XP settings
    xpSnapshot.model.ts   # Period-based XP snapshots (daily/weekly/monthly/yearly)
    guildStats.model.ts   # Server-wide XP aggregation
    guildStatsSnapshot.model.ts # Server period stats
    userEconomy.model.ts  # Per-guild currency (coin, gem, streak)
    shopItem.model.ts     # Server shop inventory
    transaction.model.ts  # Economy transaction history
    userWallet.model.ts   # Global star wallet + premium subscription fields
    globalShopItem.model.ts # Global shop item catalog
    globalInventory.model.ts # Per-user global shop inventory
    commandLog.model.ts   # Dev-only command usage analytics
    confession.model.ts   # Anonymous confession posts
    confessionVote.model.ts # Confession up/down votes
    confessionReply.model.ts # Anonymous confession replies
    confessionBan.model.ts # Confession-banned users
    guildConfessionConfig.model.ts # Per-guild confession settings
    guildNotificationConfig.model.ts # Welcome/goodbye/boost config
    guildEconomyRewardConfig.model.ts # XP→coin reward settings
    guildGamblingConfig.model.ts # Per-guild gambling settings
    guildSocialConfig.model.ts # Social command toggles
    guildWorkConfig.model.ts # Work command settings
  services/
    economy/              # Currency, pray/curse, shop, gambling, work services
      currency.service.ts # Coin/gem balance operations
      dungeon.service.ts  # Dungeon encounter/combat logic
      merchant.service.ts # NPC merchant shop in dungeon
      mine.service.ts     # Mining depth/mineral logic
      pray.service.ts     # Pray/curse daily actions
      shop.service.ts     # Per-guild shop buy/sell
      gambling.service.ts # Gambling games
      work.service.ts     # Work command rewards
      social.service.ts   # Social command toggles
      wallet.service.ts   # Global star wallet operations
      globalShop.service.ts # Global shop purchase flow
    premium/              # Subscription tier system
      premium.config.ts   # Tier definitions (free/star/galaxy) and benefit values
      premium.service.ts  # CRUD, status lookup, Redis caching (5min TTL)
      premiumExpiry.ts    # Background job: expires stale subscriptions every 10min
    confession/           # Confession system service
      confession.service.ts # Submit, vote, reply logic
    notification/         # Welcome/goodbye/boost notifications
      notificationService.ts  # Config lookup + send logic
      notificationEmbeds.ts   # Embed builders for notification types
    commandLog.service.ts # Buffered command usage analytics
  connector/
    mongo/index.ts        # MongoDB connection
    redis/index.ts        # RedisService singleton class
  locales/                # i18n translation files (15 languages)
    en.json               # English (fallback)
    vi.json               # Vietnamese
    id.json               # Indonesian
    es.json               # Spanish
    ja.json               # Japanese
    zh.json               # Chinese
    ko.json               # Korean
    pt-BR.json            # Portuguese (Brazil)
    fr.json               # French
    de.json               # German
    ru.json               # Russian
    tr.json               # Turkish
    it.json               # Italian
    pl.json               # Polish
    nl.json               # Dutch
  util/
    config/index.ts       # All env vars as typed constants
    config/button.ts      # Button ID constants (BUTTON_ID)
    decorator/reply.ts    # Reply utility (auto-adds footer to embeds)
    i18n/index.ts         # i18next initialization
    i18n/t.ts             # t(locale, key, options) translation helper
    i18n/locale.ts        # resolveLocale() — locale resolution chain
    log/logger.mixed.ts   # Winston (file) + Tracer (console) logging
    date/day.ts           # getNumberOfDays() helper
    xp/                   # XP system utilities
      calculator.ts       # levelFromXP(), progressToNextLevel(), xpForLevel()
      antiSpam.ts         # Message deduplication via hash
      globalXP.ts         # Aggregates guild XP to global rank
      snapshotSync.ts     # Syncs XP changes to period snapshots
      periodKey.ts        # ISO 8601 period key generation
      guildStatsAggregator.ts # Cron: aggregates GuildStats every 10 min
      rankCard.ts         # Embed builders for rank/leaderboard
      canvasRankCard.ts   # Canvas-based rank card image
      canvasServerRankCard.ts # Canvas-based server rank card image
      canvasHelpers.ts    # Shared canvas text rendering helpers
    manga/              # Manga command handler, sources, reader
      handler.ts        # mangaCommand() shared handler with star charge gate
      sources.ts        # MangaSource interface + MANGA_SOURCES config
      reader.ts         # Thread-based manga page reader
    help/               # Help command utilities
      commandCategories.ts # Command → help category mapping
    economy/            # Economy utilities
      starDrop.ts       # Star drop chance with premium multiplier
      activityReward.ts # XP→coin activity rewards
    voice/              # Voice system utilities
      helpers.ts        # Voice channel helper functions
      kick.ts           # Voice kick logic
  types/common/discord.d.ts  # Client type augmentation (commands, buttons)
```

## Adding New Features

### New Slash Command

Create `src/commands/slash/{name}.ts` — auto-discovered by loader, no registration needed:

```typescript
import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import Reply from "../../util/decorator/reply";
import { descriptionLocales } from "../../util/i18n/commandLocales";
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";

export default {
    data: new SlashCommandBuilder()
        .setName("command-name")
        .setDescription("What it does in English")
        .setDescriptionLocalizations(descriptionLocales("cmd.command-name.desc")),
    async execute(interaction: ChatInputCommandInteraction) {
        const locale = await resolveLocale(interaction);
        const embed = new EmbedBuilder()
            .setColor("Random")
            .setTitle(t(locale, "command.title"))
            .setTimestamp();
        // logic — use t(locale, "key", { interpolation }) for all user-facing strings
        return Reply.embed(interaction, embed);
    },
};
```

### New Button Handler

Create `src/buttons/{name}.button.ts`:

```typescript
import { ButtonInteraction } from "discord.js";
import { BUTTON_ID } from "../util/config/button";
import { resolveLocale } from "../util/i18n/locale";
import { t } from "../util/i18n/t";

export default {
    id: BUTTON_ID.myButton,
    async execute(interaction: ButtonInteraction) {
        const locale = await resolveLocale(interaction);
        // use t(locale, "key") for all user-facing strings
    },
};
```

Add the button ID to `src/util/config/button.ts`.

### New Event

Create `src/events/{name}.ts`:

```typescript
import { Events } from "discord.js";

export default {
    name: Events.EventName,
    once: false,
    execute(...args: unknown[]) {
        // logic
    },
};
```

## Discord.js v14 Rules

### Interactions — MUST follow

- **3-second rule**: Call `reply()` or `deferReply()` within 3 seconds, or Discord shows error to user
- **After `deferReply()`**: Use `editReply()` only — never `reply()` again
- **Always `await`** all interaction methods: `reply()`, `deferReply()`, `editReply()`, `followUp()`
- **Error responses**: Check `interaction.replied || interaction.deferred` before choosing `reply()` vs `editReply()`
- **Ephemeral**: Set on first response — cannot change after. Use `{ flags: MessageFlags.Ephemeral }` for error messages

### Types — MUST use

- `ChatInputCommandInteraction` for slash commands (not generic `CommandInteraction`)
- `ButtonInteraction` for buttons
- `ActionRowBuilder<ButtonBuilder>` for button rows (always specify generic)
- `TextChannel` cast for `.nsfw` access: `(interaction.channel as TextChannel)?.nsfw`
- `GuildMember` cast for `.voice` access: `(interaction.member as GuildMember).voice`
- `Events` enum for event names (not string literals)

### Embeds — Limits

| Field | Max chars |
|-------|-----------|
| Title | 256 |
| Description | 4096 |
| Field name | 256 |
| Field value | 1024 |
| Footer | 2048 |
| Fields per embed | 25 |
| Total chars | 6000 |

### Intents

Current: `Guilds`, `GuildMessages`, `GuildVoiceStates`, `GuildMessageReactions`. Add intents in `src/client.ts` if needed. Privileged intents (`MessageContent`, `GuildMembers`, `GuildPresences`) require Developer Portal approval.

## TypeScript v5 Rules

### Strict Mode (enabled)

- No implicit `any` — every variable, parameter, return type must be known
- Strict null checks — handle `null`/`undefined` explicitly, no assumptions
- Strict function types — parameter types must match exactly

### Types & Assertions

- **Never** use `| any` union — cast specifically: `as GuildMember`, `as TextChannel`
- **Prefer** `unknown` over `any` for untyped data, then narrow with type guards
- **Non-null assertion** (`!`) only when value is guaranteed (e.g., required command options)
- **Type narrowing** over casting — use `if`, `in`, `instanceof` before accessing properties
- **`satisfies`** for validating object literals match a type without widening:
  ```typescript
  const config = { port: 4263, host: "localhost" } satisfies ServerConfig;
  ```

### Imports & Modules

- Use `node:` prefix for Node.js built-ins: `import fs from "node:fs"`
- Use `import type { X }` for type-only imports (not included in runtime bundle):
  ```typescript
  import type { Document } from "mongoose";
  import { model, Schema } from "mongoose";
  ```
- No `require()` — use ES `import` syntax only
- Barrel exports (`index.ts`) only for `util/config/` — avoid elsewhere

### Functions & Parameters

- Use explicit return types on exported functions
- Use `const` assertions for literal types: `as const`
- Prefer **optional parameters** (`param?: Type`) over `param: Type | undefined`
- Use **default parameters** over manual defaults: `function f(x = 10)` not `x ?? 10`
- Use **rest parameters** with tuple types for variadic functions:
  ```typescript
  function log(...args: [message: string, level?: TLog]): void
  ```

### Error Handling

- Catch blocks: type as `unknown`, then narrow:
  ```typescript
  catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
  }
  ```
- Never `catch (error: any)` — use `catch (error)` (defaults to `unknown` in strict)

### Linting

- SonarQube rule `S3776`: max cognitive complexity 15 per function. Extract helpers to reduce branching.

### Enums & Constants

- Prefer `as const` objects over `enum` for new code:
  ```typescript
  const Direction = { Up: "UP", Down: "DOWN" } as const;
  type Direction = typeof Direction[keyof typeof Direction];
  ```
- Existing enums (Discord.js `Events`, `GatewayIntentBits`, etc.) — use as-is

## Project Conventions

### Naming

| Type | Convention | Example |
|------|-----------|---------|
| Command files | kebab-case | `voice.ts`, `3hentai.ts` |
| Button files | camelCase + `.button.ts` | `nhentai.button.ts` |
| Model files | camelCase + `.model.ts` | `guild.model.ts` |
| Constants | SCREAMING_SNAKE_CASE | `BUTTON_ID`, `APPLICATION_ID` |
| Interfaces | PascalCase, `I` prefix for models | `IGuild`, `IUser` |

### Patterns

- **One export per file**: Commands, buttons, events each export one `default`
- **Reply utility**: Use `Reply.embed()` / `Reply.embedButtons()` / `Reply.embedEdit()` — auto-adds footer
- **Config**: All env vars in `src/util/config/index.ts` — never read `process.env` directly in commands
- **Redis caching**: Use `redis.setJson(key, value, ttlSeconds)` / `redis.getJson(key)` — default TTL 120s
- **Rate limiting**: Use `redis.ttlKey(key)` to check cooldown before action
- **Logging**: Use `logger` from `src/util/log/logger.mixed.ts` for structured logging
- **i18n**: All user-facing strings must use `t(locale, "key")` — see i18n section below

### Do NOT

- Access `.env` files directly (use `.env.example` for documentation)
- Add `require()` calls — use ES `import` syntax
- Use `CommandInteraction` — always use `ChatInputCommandInteraction`
- Register commands manually — loader handles auto-discovery
- Deploy commands on every startup unnecessarily — it's rate-limited

## Command Deployment

- **Development** (`NODE_ENV=development`): Deploys to `GUILD_ID` — instant update
- **Production**: Deploys globally — takes up to 1 hour for Discord cache

## i18n (Internationalization)

Uses [i18next](https://www.i18next.com/) with `i18next-fs-backend`. Supported languages: English (`en`, fallback), Vietnamese (`vi`), Indonesian (`id`), Spanish (`es`), Japanese (`ja`), Chinese (`zh`), Korean (`ko`), Portuguese Brazil (`pt-BR`), French (`fr`), German (`de`), Russian (`ru`), Turkish (`tr`), Italian (`it`), Polish (`pl`), Dutch (`nl`).

### Locale Resolution Priority

1. **Per-user preference** — Redis `locale:user:{userId}` / User model `locale` field
2. **Per-guild preference** — Redis `locale:guild:{guildId}` / Guild model `locale` field
3. **Auto-detect** — `interaction.locale` from Discord client settings
4. **Fallback** — `"en"`

### How to Use

```typescript
// In slash commands and button handlers:
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";

const locale = await resolveLocale(interaction);
const text = t(locale, "balance.title", { username: user.username });

// In events (no interaction available):
import { resolveGuildLocale } from "../util/i18n/locale";

const locale = await resolveGuildLocale(guildId);
```

### Translation Key Convention

```
{command/feature}.{context}.{detail}
```

| Prefix | Usage | Example |
|--------|-------|---------|
| `common.*` | Shared strings | `common.error`, `common.no_permission` |
| `{command}.*` | Command-specific | `balance.title`, `pray.cooldown` |
| `voice.*` | Voice system | `voice.locked`, `voice.panel.title` |
| `rank.*` / `leaderboard.*` | XP system | `rank.level_up`, `leaderboard.empty` |
| `btn.*` | Shared button labels | `btn.homepage`, `btn.report_bug` |
| `premium.*` | Premium system | `premium.status.title`, `premium.compare.yes` |

### Rules — MUST follow

- **Never hardcode user-facing strings** — always use `t(locale, "key")`
- **English is the primary description** in `setDescription()`, localizations via `setDescriptionLocalizations(descriptionLocales("cmd.{command}.desc"))` — add `cmd.*` keys to all 15 locale files
- **Add keys to ALL 15 locale files** (`en.json`, `vi.json`, `id.json`, `es.json`, `ja.json`, `zh.json`, `ko.json`, `pt-BR.json`, `fr.json`, `de.json`, `ru.json`, `tr.json`, `it.json`, `pl.json`, `nl.json`) when adding new strings
- **Non-English locales must have native translations** — never commit English placeholder text in non-EN files
- **Use interpolation** for dynamic values: `t(locale, "key", { name: value })` with `{{name}}` in JSON
- **Error catch blocks**: resolve locale with fallback: `await resolveLocale(interaction).catch(() => "en" as const)`
- **Event handlers**: use `resolveGuildLocale(guildId)` since there's no interaction
- **Internal logging stays in English** — only translate user-facing strings
- **Command/option names stay in English** — only descriptions are localized
- **Build step**: `npm run build` copies `src/locales/` to `dist/locales/` automatically

### Adding a New Translation Key

1. Add the key to `src/locales/en.json` (English — primary)
2. Add the same key with native translations to all other 14 locale files
3. Use `t(locale, "your.new.key")` in code
4. Keys must exist in all files — mismatches will show raw keys to users

### Redis Caching

| Key | Value | TTL |
|-----|-------|-----|
| `locale:user:{userId}` | `"vi"` / `"en"` / `"none"` | 30 days |
| `locale:guild:{guildId}` | `"vi"` / `"en"` / `"none"` | 30 days |

`"none"` = negative cache (user/guild has no preference set). Managed via `/settings language` and `/settings server-language` commands.

## XP & Leveling System

### How It Works

- **Message XP**: Awards XP per message (default 20) with anti-spam (60s cooldown, message hash dedup, 3-char min length)
- **Voice XP**: Awards XP per minute in voice (default 5), tracked via `voiceStateUpdate` event
- **Reaction XP**: Awards XP per reaction (default 3) with 30s cooldown per user per channel
- **Level-up**: Detected after each XP change, notification sent to channel
- **Global XP**: Aggregated from all guilds to `User.totalPoint`

### Period Snapshots

XP changes sync to `XPSnapshot` for time-filtered leaderboards (daily/weekly/monthly/yearly). Period keys use ISO 8601 format (e.g., `2026-W14` for weeks, `2026-04-06` for daily).

### Server Stats

`GuildStats` aggregated every 10 minutes by cron (`guildStatsAggregator`). Tracks totalXP, totalMessages, totalVoiceMinutes, totalReactions, activeMembers. `GuildStatsSnapshot` stores period-based server stats for the servers leaderboard.

### Configuration

Per-server via `GuildXPConfig`: xpPerMessage (20), xpPerVoiceMinute (5), xpPerReaction (3), messageCooldown (60s), minMessageLength (3), blacklistedChannels[], enabled flag.

### Canvas Rendering

Rank cards and server rank cards rendered as images via `@napi-rs/canvas` with embed fallback if canvas fails.

## Economy System

### Currency

Two currencies per guild: **coin** and **gem**. Tracked in `UserEconomy` model per (userId, guildId).

### Pray & Curse

- Daily actions (24h cooldown, UTC-based)
- **Targeted pray**: 100-200 coin, 5% gem chance
- **Self pray**: 50-150 coin
- **Streak tracking**: Consecutive daily prays with milestone bonuses at 3/7/14/30 days
- Curse mirrors pray mechanics

### Shop

Server-configurable shop items (`ShopItem` model) with types: role assignment, cosmetic, currency exchange. Transactions logged in `Transaction` model.

### Global Shop (Cross-Server)

Global wallet uses `guildId: "global"` in `Transaction` model, reusing `coinDelta` for star amounts.
Purchase flow order: stock decrement → star deduction → inventory upsert (avoids refund noise on race).
Redis `setKeyNX` for atomic idempotency; `setKey` for cooldowns. Both keys cleaned up on validation failure.

### Admin Commands

`/economy set-coin|add-coin|set-gem|add-gem` — requires Administrator permission.

## Premium Subscription System

Two paid tiers (**Star**, **Galaxy**) on `UserWallet` model. `PremiumService.getConfig(userId)` returns a `TierConfig` with benefit values (cooldowns, limits, multipliers, flags). All premium-dependent code reads from this config — falls back to free-tier defaults for non-subscribers. Background job expires stale subscriptions every 10min. See [docs/steering/premium-system.md](docs/steering/premium-system.md) for full details.

### Background Jobs

- **Premium expiry**: `startPremiumExpiry()` in `src/bin/www.ts` — runs every 10min, clears expired subscriptions, DMs users, logs `premium_expire` transaction
- **Guild stats aggregator**: `startGuildStatsAggregator()` — runs every 10min, aggregates GuildStats
- **Command log flusher**: `CommandLogService` — flushes buffered writes every 10s or at 50-entry threshold

## Manga System

Shared handler pattern: `mangaCommand(source)` in `src/util/manga/handler.ts` generates slash commands from `MangaSource` config in `src/util/manga/sources.ts`. Each source file in `commands/slash/` is a one-liner: `export default mangaCommand(MANGA_SOURCES.key)`. Sources with `supportsRandom: false` only get the `read` subcommand. Star charge gate (free uses/day from premium tier config, then 1 star via `WalletService.deductStar`) with refund on error is built into the handler. Max pages also tier-dependent.

## Database

### MongoDB (Mongoose v8)

- Connection: `src/connector/mongo/index.ts`
- Models define TypeScript interfaces (`IGuild`, `IUser`, `IMemberXP`, etc.) with `Document`
- Error handler checks `MongoServerError` (not `MongoError`)
- Timestamps auto-managed (`createdAt`, `updatedAt`)
- Key indexes: `MemberXP(guildId, xp DESC)`, `XPSnapshot(userId, guildId, period, periodKey)`
- **Transaction model two-place edit**: Adding a `TransactionType` requires updating BOTH the TypeScript union (line ~3) AND the schema `enum` array (line ~44) in `transaction.model.ts` — missing either causes runtime errors TypeScript won't catch. Current premium types: `premium_activate`, `premium_extend`, `premium_upgrade`, `premium_downgrade`, `premium_expire`, `premium_revoke`

### Redis (ioredis)

- Singleton: `import redis from "../connector/redis"`
- Methods: `setJson`, `getJson`, `deleteKey`, `ttlKey`, `flushdb`
- `setKeyNX(key, value, ttl)` — atomic set-if-not-exists (uses `SET NX EX`), returns `boolean`
- No native `incr` — for counters use `getJson`/`setJson`: `const n = await redis.getJson(key) as number | null; await redis.setJson(key, (n ?? 0) + 1, ttl);`
- Used for: image cache (10min TTL), voice channel ownership (12hr TTL), rate limiting (120s default), locale preferences (30-day TTL), XP anti-spam cooldowns, manga free-use counter (UTC-midnight TTL), premium status cache (5min TTL)

## Environment

All variables documented in `.env.example`. Critical ones:

| Variable | Required | Purpose |
|----------|----------|---------|
| `DISCORD_TOKEN` | Yes | Bot authentication |
| `APPLICATION_ID` | Yes | Slash command registration |
| `GUILD_ID` | Dev only | Guild-scoped command deployment |
| `NODE_ENV` | Yes | `development` or `production` |
| `DB_URL` | Yes | MongoDB connection string |
| `REDIS_URL` | No | Redis connection string (fallback: in-memory cache) |

## Feature Documentation

| Document | Contents |
|----------|----------|
| [docs/steering/commands.md](docs/steering/commands.md) | Full command inventory, button handlers, events, i18n, and business rules |
| [docs/steering/xp-system.md](docs/steering/xp-system.md) | XP earning, leveling formula, snapshots, server stats, leaderboards, canvas rendering |
| [docs/steering/economy-system.md](docs/steering/economy-system.md) | Coins, gems, pray/curse, streaks, shop, transactions, services |
| [docs/steering/changelog-ci.md](docs/steering/changelog-ci.md) | Root `CHANGELOG.md` + `package.json` version; CI posts the matching `## [x.y.z]` section to Discord |
| [docs/steering/landing-page.md](docs/steering/landing-page.md) | Astro 6 landing site: routes, components, i18n, content collections, design system, deployment |
| [docs/steering/confession-system.md](docs/steering/confession-system.md) | Anonymous confessions: submit flows, voting, replies, moderation, economy integration |
| [docs/steering/i18n-system.md](docs/steering/i18n-system.md) | i18next: 15 languages, resolution chain, caching, settings, translation keys |
| [docs/steering/canvas-rendering.md](docs/steering/canvas-rendering.md) | @napi-rs/canvas rank cards: anime theme, layout, helpers, embed fallback |
| [docs/steering/moderation.md](docs/steering/moderation.md) | Timeout, ban, kick, unban: hierarchy enforcement, permissions, response styling |
| [docs/steering/notification-system.md](docs/steering/notification-system.md) | Welcome, goodbye, boost, milestone: per-guild config, embeds, Redis caching |
| [docs/steering/voice-system.md](docs/steering/voice-system.md) | Temporary voice channels: join-to-create, control panel, states, Redis ownership |
| [docs/steering/global-wallet.md](docs/steering/global-wallet.md) | Global star currency: daily claims, streaks, milestones, cross-server |
| [docs/steering/mine-system.md](docs/steering/mine-system.md) | Mining mini-game: minerals, depth progression, checkpoints, collapse risk, star drops |
| [docs/steering/dungeon-system.md](docs/steering/dungeon-system.md) | Dungeon mini-game: multi-encounter runs, combat, NPC merchant, buffs, traps, floor progression |
| [docs/steering/command-logging.md](docs/steering/command-logging.md) | Dev-only analytics: command stats, user/command history, buffered writes |
| [docs/steering/premium-system.md](docs/steering/premium-system.md) | Premium tiers (Star/Galaxy): benefits, integration points, caching, expiry, admin commands |

## Changelog & release notes

- **`package.json` `version`** is the shipped semver (also shown by **`/info bot`**). In **`CHANGELOG.md`**, use **`## [Unreleased]`** for drafts and a **`## [x.y.z] - date`** block for each release where **`[x.y.z]`** matches `package.json`. CI sends **that release section** to Discord (not `[Unreleased]`) after a successful `develop` build when `CHANGELOG.md` changes, if `DISCORD_CHANGELOG_WEBHOOK_URL` is set. See [docs/steering/changelog-ci.md](docs/steering/changelog-ci.md).

## Docker

Multi-stage Dockerfile: build stage compiles TS, production stage runs compiled JS as non-root `node` user. Needs `--env-file .env` and external MongoDB/Redis access.
