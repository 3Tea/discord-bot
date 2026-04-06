# i18n Expansion — Add 8 New Languages

**Date:** 2026-04-06
**Status:** Approved

## Summary

Expand the bot's i18n support from 7 languages to 15 by adding the top 8 most popular languages on Discord globally. All translations will be AI-generated. All 23 slash commands will receive full description localizations via a new helper function.

## Current State

- **7 supported locales:** `en`, `vi`, `id`, `es`, `ja`, `zh`, `ko`
- **~228 translation keys** per locale file
- Command `setDescriptionLocalizations` only has `vi` entries (incomplete)
- Locale resolution: user preference → guild preference → Discord auto-detect → `"en"` fallback

## New Languages

| Language | i18next Code | Discord Locale Code | Native Name |
|----------|-------------|---------------------|-------------|
| Portuguese (Brazil) | `pt-BR` | `pt-BR` | Português (Brasil) |
| French | `fr` | `fr` | Français |
| German | `de` | `de` | Deutsch |
| Russian | `ru` | `ru` | Русский |
| Turkish | `tr` | `tr` | Türkçe |
| Italian | `it` | `it` | Italiano |
| Polish | `pl` | `pl` | Polski |
| Dutch | `nl` | `nl` | Nederlands |

## Design

### 1. Locale Files

Create 8 new JSON files in `src/locales/`:
- `pt-BR.json`, `fr.json`, `de.json`, `ru.json`, `tr.json`, `it.json`, `pl.json`, `nl.json`
- Each contains AI translations of all ~228 existing keys from `en.json`
- Each also contains new `cmd.*` keys for command description localizations

### 2. New `cmd.*` Translation Keys

Add a new key namespace `cmd.*` to **all 15 locale files** for command and option descriptions. Convention:

```
cmd.{command}.desc                          — command description
cmd.{command}.{subcommand}.desc             — subcommand description
cmd.{command}.{subcommand}.{option}.desc    — option description
cmd.{command}.{option}.desc                 — top-level option description
```

Estimated ~60-80 new keys covering all 23 commands, their subcommands, and options.

### 3. `src/util/i18n/index.ts` — Expand SUPPORTED_LOCALES

```typescript
const SUPPORTED_LOCALES = [
    "en", "vi", "id", "es", "ja", "zh", "ko",
    "pt-BR", "fr", "de", "ru", "tr", "it", "pl", "nl",
] as const;
```

### 4. `src/util/i18n/locale.ts` — Expand `mapDiscordLocale()`

Add direct mappings for 8 new locales:

```typescript
if (discordLocale === "pt-BR") return "pt-BR";
if (discordLocale === "fr") return "fr";
if (discordLocale === "de") return "de";
if (discordLocale === "ru") return "ru";
if (discordLocale === "tr") return "tr";
if (discordLocale === "it") return "it";
if (discordLocale === "pl") return "pl";
if (discordLocale === "nl") return "nl";
```

### 5. `src/util/i18n/commandLocales.ts` — New Helper

New file with a `descriptionLocales(key)` function that reads translations from i18next and returns a `Record<string, string>` compatible with Discord's `setDescriptionLocalizations()`.

- Maps i18next locale codes to Discord API locale codes (e.g., `"en"` → `"en-US"`, `"es"` → `"es-ES"`, `"zh"` → `"zh-CN"`)
- Skips `"en"` since it's the primary description
- Runs at command deploy time (after i18next init)

```typescript
const I18N_TO_DISCORD_LOCALE: Record<string, string> = {
    en: "en-US",
    vi: "vi",
    id: "id",
    es: "es-ES",
    ja: "ja",
    zh: "zh-CN",
    ko: "ko",
    "pt-BR": "pt-BR",
    fr: "fr",
    de: "de",
    ru: "ru",
    tr: "tr",
    it: "it",
    pl: "pl",
    nl: "nl",
};

export function descriptionLocales(key: string): Record<string, string> {
    const result: Record<string, string> = {};
    for (const locale of SUPPORTED_LOCALES) {
        if (locale === "en") continue;
        const discordCode = I18N_TO_DISCORD_LOCALE[locale];
        if (discordCode) {
            result[discordCode] = i18next.t(key, { lng: locale });
        }
    }
    return result;
}
```

### 6. Command Files — All 23 Commands

Each command file:
1. Imports `descriptionLocales` from `../../util/i18n/commandLocales`
2. Replaces hardcoded `setDescriptionLocalizations({ vi: "..." })` with `descriptionLocales("cmd.{command}.desc")`
3. Same pattern for subcommand and option descriptions

Commands: `3hentai`, `asmhentai`, `hentaifox`, `nhentai`, `nhentaiTo`, `pururin`, `avatar`, `balance`, `curse`, `economy`, `help`, `info`, `ping`, `pray`, `rank`, `server-rank`, `leaderboard`, `settings`, `shop`, `trans`, `voice`, `weather`, `xp`

### 7. `settings.ts` — Language Picker

- Add 8 new `addChoices()` entries to both `language` and `server-language` subcommands (total: 15 choices, under Discord's 25 max)
- Add 8 entries to `LANGUAGE_NAMES` map:

```typescript
"pt-BR": "Português (Brasil)",
fr: "Français",
de: "Deutsch",
ru: "Русский",
tr: "Türkçe",
it: "Italiano",
pl: "Polski",
nl: "Nederlands",
```

## What Does NOT Change

- **MongoDB models** — `locale` field remains a string, no schema changes
- **Redis caching logic** — same TTL, same key patterns
- **`resolveLocale()` flow** — same priority chain (user → guild → auto-detect → fallback)
- **`t()` helper** — no changes needed
- **Entry point / bot startup** — `initI18n()` already loads all `SUPPORTED_LOCALES`

## File Impact Summary

| Category | Files | Action |
|----------|-------|--------|
| New locale files | 8 | Create with AI translations |
| Existing locale files | 7 | Add `cmd.*` keys |
| `src/util/i18n/index.ts` | 1 | Expand `SUPPORTED_LOCALES` |
| `src/util/i18n/locale.ts` | 1 | Expand `mapDiscordLocale()` |
| `src/util/i18n/commandLocales.ts` | 1 | New helper file |
| Command files | 23 | Use `descriptionLocales()` helper |
| **Total** | **~41 files** | |
