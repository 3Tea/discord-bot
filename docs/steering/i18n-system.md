# Internationalization (i18n) System

> Steering doc for AI assistants and contributors. Covers locale resolution, translation helpers, settings commands, key conventions, and caching.

## Overview

All user-facing strings are translated via [i18next](https://www.i18next.com/) with `i18next-fs-backend`. Each locale file is a flat JSON object (~619 keys). The bot supports 15 languages. English (`en`) is the primary language and the fallback for missing translations. Internal logging stays in English. Command/option names stay in English; only descriptions are localized.

## Supported Languages

| i18next Code | Language | Native Name | Discord Locale Code |
|-------------|----------|-------------|-------------------|
| `en` | English | English | `en-US` |
| `vi` | Vietnamese | Tieng Viet | `vi` |
| `id` | Indonesian | Bahasa Indonesia | `id` |
| `es` | Spanish | Espanol | `es-ES` |
| `ja` | Japanese | 日本語 | `ja` |
| `zh` | Chinese | 中文 | `zh-CN` |
| `ko` | Korean | 한국어 | `ko` |
| `pt-BR` | Portuguese (Brazil) | Portugues (Brasil) | `pt-BR` |
| `fr` | French | Francais | `fr` |
| `de` | German | Deutsch | `de` |
| `ru` | Russian | Русский | `ru` |
| `tr` | Turkish | Turkce | `tr` |
| `it` | Italian | Italiano | `it` |
| `pl` | Polish | Polski | `pl` |
| `nl` | Dutch | Nederlands | `nl` |

The mapping between i18next codes and Discord API locale codes lives in `src/util/i18n/commandLocales.ts` (`I18N_TO_DISCORD_LOCALE`). Discord locales that start with `es` map to `es`, `zh` to `zh`, `en` to `en`; exact matches for the rest.

## Initialization

`initI18n()` in `src/util/i18n/index.ts` is called at startup in `src/bin/www.ts` before anything else loads (before MongoDB, before `client.login()`).

| Config option | Value | Purpose |
|--------------|-------|---------|
| `lng` | `"en"` | Default language |
| `fallbackLng` | `"en"` | Fallback when key missing in requested locale |
| `supportedLngs` | All 15 codes | Reject unknown locale codes |
| `preload` | All 15 codes | Load all locale files into memory at startup |
| `ns` | `["translation"]` | Single namespace |
| `defaultNS` | `"translation"` | Default namespace |
| `backend.loadPath` | `src/locales/{{lng}}.json` | File path template |
| `interpolation.escapeValue` | `false` | No HTML escaping (Discord messages, not HTML) |

Startup order in `www.ts`: `.env` load -> `validateEnv()` -> `initI18n()` -> MongoDB -> `client.login()`.

## Locale Resolution Chain

Four tiers, checked in order. First non-null result wins.

### Tier 1: User Preference

Redis key `locale:user:{userId}` or `User.locale` field in MongoDB.

Set via `/settings language`. Follows the user across all servers. Highest priority — overrides everything.

### Tier 2: Guild Preference

Redis key `locale:guild:{guildId}` or `Guild.locale` field in MongoDB.

Set via `/settings server-language` (requires Manage Guild permission). Applies to all users in that server who have no personal preference set.

### Tier 3: Discord Auto-Detect

`interaction.locale` from the user's Discord client settings. Mapped through `mapDiscordLocale()` which handles prefix matching (e.g., `es-419` -> `es`, `zh-TW` -> `zh`, `en-GB` -> `en`).

### Tier 4: Fallback

Hard-coded `"en"` (`DEFAULT_LOCALE`).

### Resolution Functions

| Function | Context | Tiers used |
|----------|---------|-----------|
| `resolveLocale(interaction)` | Slash commands, buttons, modals, select menus | 1 -> 2 -> 3 -> 4 |
| `resolveGuildLocale(guildId)` | Events (no interaction available) | 2 -> 4 |

`resolveLocale()` accepts a union type `LocaleInteraction` covering `ChatInputCommandInteraction`, `ButtonInteraction`, `ModalSubmitInteraction`, and all select menu interaction types.

### Redis-or-DB Lookup

Both functions use `resolveFromRedisOrDb()` internally:

1. Check Redis for cached value
2. If `"none"` cached -> return `null` (negative cache, no preference set)
3. If valid locale cached -> return it
4. Query MongoDB
5. If DB has valid locale -> cache in Redis with 30-day TTL, return it
6. If DB has no locale -> cache `"none"` in Redis with 30-day TTL, return `null`

## Translation Helper Functions

### `t(locale, key, options?)` — `src/util/i18n/t.ts`

Primary translation function. Maintains an in-memory `Map<string, TFunction>` cache of `i18next.getFixedT()` translators. One translator per locale, created on first use, reused thereafter.

```typescript
import { t } from "../../util/i18n/t";
const text = t(locale, "balance.title", { username: "Alice" });
// -> "Wallet of Alice"
```

Interpolation uses `{{variable}}` syntax in JSON files. Escaping is disabled (`escapeValue: false`).

### `descriptionLocales(key, options?)` — `src/util/i18n/commandLocales.ts`

Generates the localization object for Discord's `setDescriptionLocalizations()`. Iterates all supported locales except `"en"` (English is the primary description), maps each to its Discord locale code, and reads the translation from i18next.

Must be called after `initI18n()` has completed (which it always is, since commands are loaded after initialization).

```typescript
import { descriptionLocales } from "../../util/i18n/commandLocales";

new SlashCommandBuilder()
    .setDescription("Set your preferred language")
    .setDescriptionLocalizations(descriptionLocales("cmd.settings.language.desc"))
```

## Settings Commands

### `/settings language`

Sets or resets the user's personal language preference.

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `locale` | String (choice) | No | One of the 15 supported languages |
| `reset` | Boolean | No | Reset to auto-detect (clears user preference) |

**Behavior**:
- With `locale`: calls `setUserLocale()` -> updates `User.locale` in MongoDB + caches in Redis. Response uses the new locale.
- With `reset: true`: calls `resetUserLocale()` -> `$unset` locale in MongoDB + caches `"none"` in Redis. Response uses the re-resolved locale (falls through to guild/auto-detect).
- With neither: shows current effective language.
- No permission required. Ephemeral response.

### `/settings server-language`

Sets or resets the server's default language.

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `locale` | String (choice) | No | One of the 15 supported languages |
| `reset` | Boolean | No | Reset to auto-detect |

**Behavior**:
- Same as `/settings language` but operates on `Guild.locale` via `setGuildLocale()` / `resetGuildLocale()`.
- Requires **Manage Guild** permission. Returns `common.no_permission` if missing.
- Ephemeral response.

### Setter/Resetter Functions

| Function | MongoDB operation | Redis operation |
|----------|------------------|----------------|
| `setUserLocale(userId, locale)` | `findOneAndUpdate` with `$set`, upsert | `setKey("locale:user:{id}", locale, 30d)` |
| `resetUserLocale(userId)` | `findOneAndUpdate` with `$unset` | `setKey("locale:user:{id}", "none", 30d)` |
| `setGuildLocale(guildId, locale)` | `findOneAndUpdate` with `$set`, upsert | `setKey("locale:guild:{id}", locale, 30d)` |
| `resetGuildLocale(guildId)` | `findOneAndUpdate` with `$unset` | `setKey("locale:guild:{id}", "none", 30d)` |

## Translation Key Convention

Flat JSON structure with dot-separated keys: `{feature}.{context}.{detail}`.

### Category Breakdown

| Prefix | Description | Approx. keys |
|--------|-------------|-------------|
| `cmd.*` | Command/option descriptions for Discord API localization | ~120 |
| `confession.*` | Confession system messages | ~40 |
| `voice.*` | Voice channel control panel, buttons, modals, select menus | ~35 |
| `weather.*` | Weather command, day names, WMO weather codes | ~30 |
| `moderation.*` | Moderation messages (timeout, ban, kick, permissions) | ~25 |
| `gamble.*` + `gambling_config.*` | Gambling mini-games and config | ~25 |
| `fish.*` | Fishing command, rarity names, fish names | ~25 |
| `gift.*` + `rob.*` + `social_config.*` | Social interaction commands and config | ~25 |
| `work.*` + `work_config.*` | Work command, flavor texts, config | ~20 |
| `notification.*` | Notification messages and settings | ~20 |
| `wallet.*` | Global wallet, daily star, history | ~15 |
| `leaderboard.*` | Leaderboard titles, periods, pagination | ~14 |
| `economy.*` + `economy.reward_config.*` | Admin economy commands and reward config | ~16 |
| `shop.*` | Shop messages (buy, add, remove, stock) | ~12 |
| `server_rank.*` | Server stats and ranking | ~12 |
| `pray.*` | Pray command, flavor texts, streaks, milestones | ~11 |
| `rank.*` | Rank card messages and level-up | ~10 |
| `help.*` | Help command categories | ~8 |
| `info.*` | Bot info display | ~7 |
| `xp.*` | XP admin commands and blacklist | ~7 |
| `curse.*` | Curse command messages | ~7 |
| `btn.*` | Shared button labels (homepage, report bug, etc.) | ~7 |
| `balance.*` | Balance display fields | ~5 |
| `manga.*` | Manga reader messages | ~5 |
| `settings.*` | Language settings responses | ~4 |
| `common.*` | Shared error/permission messages | ~3 |
| `ping.*` | Ping command | ~2 |

### Naming Patterns

| Pattern | Usage | Example |
|---------|-------|---------|
| `{command}.{message}` | Direct command output | `pray.cooldown` |
| `{command}.{context}.{detail}` | Nested context | `voice.panel.title` |
| `{feature}.texts.{n}` | Indexed flavor/random texts | `pray.texts.0` through `pray.texts.4` |
| `{feature}.{rarity}.{n}` | Indexed items by category | `fish.common.0` through `fish.legendary.4` |
| `cmd.{command}.desc` | Command description | `cmd.pray.desc` |
| `cmd.{command}.{option}.desc` | Option description | `cmd.pray.target.desc` |
| `cmd.{command}.{sub}.{option}.desc` | Subcommand option | `cmd.shop.buy.item-id.desc` |
| `btn.{label}` | Shared button labels | `btn.homepage` |
| `common.{key}` | Global shared strings | `common.error` |

## Adding New Translation Keys

1. Add the key and English value to `src/locales/en.json`
2. Add the same key to **all 14 other locale files** with translated values (`vi.json`, `id.json`, `es.json`, `ja.json`, `zh.json`, `ko.json`, `pt-BR.json`, `fr.json`, `de.json`, `ru.json`, `tr.json`, `it.json`, `pl.json`, `nl.json`)
3. Use `t(locale, "your.new.key")` in code with `{{variable}}` interpolation as needed
4. For command descriptions, add a `cmd.*` key and use `descriptionLocales("cmd.{command}.desc")`

Missing keys in any locale file will show the raw key string to users in that language.

## Data Models

### User (`src/models/user.model.ts`)

| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| `locale` | String | `undefined` | User language preference. Absent = no preference |

### Guild (`src/models/guild.model.ts`)

| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| `locale` | String | `undefined` | Server default language. Absent = no preference |

Both use `$set` to store and `$unset` to clear. The `undefined` default means the field is absent from the document when no preference is set.

## Redis Caching

| Key pattern | Value | TTL | Set by |
|-------------|-------|-----|--------|
| `locale:user:{userId}` | Locale code (`"vi"`, `"en"`, etc.) or `"none"` | 30 days | `setUserLocale()` / `resetUserLocale()` |
| `locale:guild:{guildId}` | Locale code or `"none"` | 30 days | `setGuildLocale()` / `resetGuildLocale()` |

**Negative caching**: When a user or guild has no locale preference in the database, `"none"` is cached. This prevents repeated database queries for users/guilds that have never set a preference. The `resolveFromRedisOrDb()` function treats `"none"` as a definitive "no preference" and returns `null` immediately.

**Fallback**: If Redis is unavailable, `RedisService` falls through to an in-memory `NodeCache` instance with the same TTL semantics.

## Usage Patterns

### In Slash Commands

```typescript
import { resolveLocale } from "../../util/i18n/locale";
import { t } from "../../util/i18n/t";

async execute(interaction: ChatInputCommandInteraction) {
    const locale = await resolveLocale(interaction);
    const embed = new EmbedBuilder()
        .setTitle(t(locale, "balance.title", { username: user.username }));
    return Reply.embed(interaction, embed);
}
```

### In Button Handlers

```typescript
import { resolveLocale } from "../util/i18n/locale";
import { t } from "../util/i18n/t";

async execute(interaction: ButtonInteraction) {
    const locale = await resolveLocale(interaction);
    // same t() usage
}
```

### In Events (No Interaction)

```typescript
import { resolveGuildLocale } from "../util/i18n/locale";
import { t } from "../util/i18n/t";

async execute(member: GuildMember) {
    const locale = await resolveGuildLocale(member.guild.id);
    const text = t(locale, "notification.welcome.description", {
        user: `<@${member.id}>`,
        server: member.guild.name,
        memberCount: member.guild.memberCount.toString(),
    });
}
```

### In Error Catch Blocks

```typescript
const locale = await resolveLocale(interaction).catch(() => "en" as const);
```

### For Command Descriptions

```typescript
import { descriptionLocales } from "../../util/i18n/commandLocales";

new SlashCommandBuilder()
    .setName("pray")
    .setDescription("Pray to receive coin")
    .setDescriptionLocalizations(descriptionLocales("cmd.pray.desc"))
```

## Build

`npm run build` compiles TypeScript and copies `src/locales/` to `dist/locales/` automatically. The `backend.loadPath` resolves relative to the compiled `dist/util/i18n/` directory at runtime.

## Cross-References

- [commands.md](commands.md) — full command inventory including `/settings language` and `/settings server-language`
- [economy-system.md](economy-system.md) — economy commands that use i18n for all user-facing output
- [xp-system.md](xp-system.md) — XP/leveling system with localized rank cards and leaderboards
- Landing page i18n is covered separately in `docs/superpowers/specs/2026-04-09-landing-i18n-design.md` — uses a different pattern (shared components with EN/VI wrappers and translation keys) distinct from the bot's i18next setup
