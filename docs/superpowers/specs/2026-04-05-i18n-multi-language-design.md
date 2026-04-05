# i18n Multi-Language Support Design

**Date**: 2026-04-05
**Status**: Approved
**Library**: [i18next](https://www.i18next.com/)

## Overview

Add multi-language support to the Discord bot using i18next. Currently the bot has a mix of hardcoded Vietnamese and English strings with no systematic approach. This design introduces a centralized i18n system with locale resolution, Redis caching, and full migration of all 21 commands.

**Supported languages**: Vietnamese (`vi`) + English (`en`, fallback). Architecture supports easy addition of new languages.

## Architecture

### Dependencies

- `i18next` — core i18n framework
- `i18next-fs-backend` — load translation JSON files from filesystem

### File Structure

```
src/
  locales/
    en.json              # English (fallback language)
    vi.json              # Vietnamese
  util/
    i18n/
      index.ts           # i18next initialization, load locales from fs
      t.ts               # t(locale, key, options) translation helper
      locale.ts          # resolveLocale(interaction) — locale resolution chain
```

## Locale Resolution

### Priority Chain (highest to lowest)

1. **Per-user preference** — `locale:user:{userId}` in Redis / `locale` field in User model
2. **Per-guild preference** — `locale:guild:{guildId}` in Redis / `locale` field in Guild model
3. **Auto-detect** — `interaction.locale` from Discord client settings
4. **Fallback** — `"en"`

### Resolution Flow

```
resolveLocale(interaction):
  1. redis.get("locale:user:{userId}")
     - value != "none" → return value
     - "none" → skip to step 2
     - null (cache miss) → query User model
       - found locale → cache in Redis + return
       - not found → cache "none" in Redis

  2. redis.get("locale:guild:{guildId}")
     - value != "none" → return value
     - "none" → skip to step 3
     - null (cache miss) → query Guild model
       - found locale → cache in Redis + return
       - not found → cache "none" in Redis

  3. Map interaction.locale to supported locale
     - "vi" → "vi"
     - "en-US" / "en-GB" → "en"
     - No match → "en" (fallback)
```

## Database Changes

### Existing Model Updates

No new models. Add optional `locale` field to existing models:

```typescript
// user.model.ts
locale?: string  // "vi" | "en" | undefined (undefined = not set)

// guild.model.ts
locale?: string  // "vi" | "en" | undefined
```

### Redis Caching

| Key pattern | Value | TTL | When set |
|---|---|---|---|
| `locale:user:{userId}` | `"vi"` / `"en"` / `"none"` | 30 days | After DB resolve or user set |
| `locale:guild:{guildId}` | `"vi"` / `"en"` / `"none"` | 30 days | After DB resolve or admin set |

- `"none"` = negative cache (queried DB, no preference set) — avoids repeated DB queries
- When user/admin sets language → update DB + Redis simultaneously
- When user/admin resets language → remove field from DB + set `"none"` in Redis

## Translation Files

### Key Naming Convention

```
{command/feature}.{context}.{detail}
```

- `common.*` — shared strings (errors, generic labels)
- `{command}.*` — command-specific strings
- `cmd.*` — command/option descriptions (used during deploy)

### Examples

```json
// en.json
{
  "common.error": "An error occurred. Please try again later.",
  "common.no_permission": "You don't have permission to do this.",
  "balance.title": "Wallet of {{username}}",
  "balance.coin": "Coin",
  "balance.gem": "Gem",
  "balance.pray_streak": "Pray Streak",
  "balance.pray_streak_days": "{{count}} days",
  "pray.self_error": "You cannot pray for yourself...",
  "pray.bot_error": "Cannot pray for a bot.",
  "pray.already_prayed": "You already prayed today...",
  "pray.texts.0": "praying under the moonlight...",
  "pray.texts.1": "devoutly praying to the gods...",
  "settings.language_set": "Language set to **{{language}}**.",
  "settings.language_reset": "Language preference reset.",
  "cmd.balance.description": "View your coin and gem balance",
  "cmd.pray.description": "Pray to earn coin"
}
```

```json
// vi.json
{
  "common.error": "Có lỗi xảy ra. Vui lòng thử lại sau.",
  "balance.title": "Ví của {{username}}",
  "balance.coin": "Coin",
  "balance.gem": "Gem",
  "balance.pray_streak": "Pray Streak",
  "balance.pray_streak_days": "{{count}} ngày",
  "pray.self_error": "Không thể cầu nguyện cho chính mình...",
  "pray.bot_error": "Không thể cầu nguyện cho bot.",
  "pray.already_prayed": "Bạn đã cầu nguyện hôm nay rồi...",
  "pray.texts.0": "cầu nguyện dưới ánh trăng...",
  "pray.texts.1": "thành tâm khấn vái thần linh...",
  "settings.language_set": "Đã đặt ngôn ngữ thành **{{language}}**.",
  "settings.language_reset": "Đã xóa tùy chọn ngôn ngữ.",
  "cmd.balance.description": "Xem số dư coin và gem",
  "cmd.pray.description": "Cầu nguyện để nhận coin"
}
```

## Command Integration

### Usage Pattern in Commands

```typescript
// Before:
embed.setTitle(`Ví của ${target.username}`);

// After:
const locale = await resolveLocale(interaction);
embed.setTitle(t(locale, "balance.title", { username: target.username }));
```

### Command Description Localizations

Commands use Discord.js built-in localization API during deploy:

```typescript
export default {
  data: new SlashCommandBuilder()
    .setName("balance")
    .setDescription("View your coin and gem balance")
    .setDescriptionLocalizations({
      vi: "Xem số dư coin và gem",
    })
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("Target user")
        .setDescriptionLocalizations({ vi: "Người dùng mục tiêu" })
    ),
  async execute(interaction) { ... }
}
```

Localizations are read from locale files during command data build (in loader or helper).

### Hardcoded Arrays Migration

Arrays like `PRAY_TEXTS`, `WMO_CODES`, `DAY_NAMES_VI` move into locale files:

```json
{
  "pray.texts.0": "praying under the moonlight...",
  "pray.texts.1": "devoutly praying to the gods..."
}
```

Accessed via: `t(locale, "pray.texts." + randomIndex)`

## Settings Command

New command `src/commands/slash/settings.ts`:

```
/settings language <locale>        → Set language for self (user-level)
/settings server-language <locale> → Set language for server (requires MANAGE_GUILD)
/settings language reset           → Remove preference, revert to auto-detect
```

- `<locale>` is a string choice: `vi` | `en`
- Server-language requires `PermissionFlagsBits.ManageGuild`
- After set → update DB + Redis, reply confirmation in the newly chosen language

## Migration Strategy

Big bang — all 21 commands migrated in a single PR. Order:

1. **Infrastructure**: i18next init, `t()` helper, `resolveLocale()`, Redis caching logic
2. **Locale files**: `en.json` + `vi.json` with all translation keys
3. **Model updates**: Add `locale` field to User + Guild models
4. **Settings command**: Create `/settings` command
5. **Command migration**: Update all 21 commands to use `t()`
6. **Command deploy**: Update loader to inject `setDescriptionLocalizations()`

## Out of Scope

- Command names remain in English (`balance`, `pray`, `rank`, etc.)
- Option names remain in English (`user`, `target`, `amount`, etc.)
- Internal logging stays in English
- No new languages beyond `vi` and `en` in this iteration
