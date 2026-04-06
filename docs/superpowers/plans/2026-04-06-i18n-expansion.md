# i18n Expansion — 8 New Languages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand bot i18n from 7 to 15 languages by adding Portuguese (BR), French, German, Russian, Turkish, Italian, Polish, Dutch — with AI translations and a helper for command description localizations.

**Architecture:** Add 8 locale JSON files with translated keys. Create a `descriptionLocales()` helper that reads i18next at deploy time to generate Discord's `setDescriptionLocalizations` objects. Update all 23 commands to use the helper instead of hardcoded `{ vi: "..." }` objects.

**Tech Stack:** TypeScript, i18next, Discord.js v14

---

### Task 1: Expand `SUPPORTED_LOCALES` and `mapDiscordLocale()`

**Files:**
- Modify: `src/util/i18n/index.ts`
- Modify: `src/util/i18n/locale.ts`

- [ ] **Step 1: Update `SUPPORTED_LOCALES` in `src/util/i18n/index.ts`**

Replace line 5:
```typescript
const SUPPORTED_LOCALES = ["en", "vi", "id", "es", "ja", "zh", "ko"] as const;
```
With:
```typescript
const SUPPORTED_LOCALES = [
    "en", "vi", "id", "es", "ja", "zh", "ko",
    "pt-BR", "fr", "de", "ru", "tr", "it", "pl", "nl",
] as const;
```

- [ ] **Step 2: Update `mapDiscordLocale()` in `src/util/i18n/locale.ts`**

Replace the `mapDiscordLocale` function (lines 33-42) with:
```typescript
function mapDiscordLocale(discordLocale: string): SupportedLocale {
    if (discordLocale === "vi") return "vi";
    if (discordLocale === "id") return "id";
    if (discordLocale.startsWith("es")) return "es";
    if (discordLocale === "ja") return "ja";
    if (discordLocale.startsWith("zh")) return "zh";
    if (discordLocale === "ko") return "ko";
    if (discordLocale === "pt-BR") return "pt-BR";
    if (discordLocale === "fr") return "fr";
    if (discordLocale === "de") return "de";
    if (discordLocale === "ru") return "ru";
    if (discordLocale === "tr") return "tr";
    if (discordLocale === "it") return "it";
    if (discordLocale === "pl") return "pl";
    if (discordLocale === "nl") return "nl";
    if (discordLocale.startsWith("en")) return "en";
    return DEFAULT_LOCALE;
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors (the new locale codes are valid string literals in the const array)

- [ ] **Step 4: Commit**

```bash
git add src/util/i18n/index.ts src/util/i18n/locale.ts
git commit -m "feat(i18n): expand SUPPORTED_LOCALES to 15 languages and update mapDiscordLocale"
```

---

### Task 2: Create `descriptionLocales()` helper

**Files:**
- Create: `src/util/i18n/commandLocales.ts`

- [ ] **Step 1: Create `src/util/i18n/commandLocales.ts`**

```typescript
import i18next from "i18next";
import { SUPPORTED_LOCALES } from "./index";

/**
 * Maps i18next locale codes to Discord API locale codes.
 * Discord requires specific locale formats for setDescriptionLocalizations().
 * See: https://discord.com/developers/docs/reference#locales
 */
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

/**
 * Generates a localization object for Discord's setDescriptionLocalizations()
 * by reading translations from i18next for a given key.
 *
 * Must be called after initI18n() has completed.
 */
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

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/util/i18n/commandLocales.ts
git commit -m "feat(i18n): add descriptionLocales helper for command localizations"
```

---

### Task 3: Add `cmd.*` keys to `en.json`

**Files:**
- Modify: `src/locales/en.json`

- [ ] **Step 1: Add `cmd.*` keys to `en.json`**

Add the following keys at the end of the JSON (before the closing `}`). These are the English descriptions for all commands, subcommands, and options — extracted from the current hardcoded values in command files:

```json
    "cmd.ping.desc": "Replies with Pong!",

    "cmd.help.desc": "Get the help commands",

    "cmd.info.desc": "Information about bot",
    "cmd.info.bot.desc": "Information about bot",

    "cmd.avatar.desc": "Get the avatar URL of the selected user, or your own avatar.",
    "cmd.avatar.target.desc": "The user's avatar to show",

    "cmd.trans.desc": "Translate all languages to Vietnamese",
    "cmd.trans.word.desc": "word or paragraph",

    "cmd.weather.desc": "Get weather information.",
    "cmd.weather.location.desc": "Your location",

    "cmd.balance.desc": "View your coin and gem balance",
    "cmd.balance.user.desc": "View another user's balance",

    "cmd.pray.desc": "Pray to receive coin",
    "cmd.pray.target.desc": "Pray for another user",

    "cmd.curse.desc": "Curse to receive coin (less than pray)",
    "cmd.curse.target.desc": "Curse someone",

    "cmd.economy.desc": "Economy management (admin)",
    "cmd.economy.set-coin.desc": "Set a user's coin",
    "cmd.economy.set-coin.user.desc": "Target user",
    "cmd.economy.set-coin.amount.desc": "Coin amount",
    "cmd.economy.add-coin.desc": "Add coin to a user",
    "cmd.economy.add-coin.user.desc": "Target user",
    "cmd.economy.add-coin.amount.desc": "Coin to add",
    "cmd.economy.set-gem.desc": "Set a user's gem",
    "cmd.economy.set-gem.user.desc": "Target user",
    "cmd.economy.set-gem.amount.desc": "Gem amount",
    "cmd.economy.add-gem.desc": "Add gem to a user",
    "cmd.economy.add-gem.user.desc": "Target user",
    "cmd.economy.add-gem.amount.desc": "Gem to add",

    "cmd.shop.desc": "Server shop",
    "cmd.shop.view.desc": "View items in the shop",
    "cmd.shop.view.page.desc": "Page number",
    "cmd.shop.buy.desc": "Buy an item",
    "cmd.shop.buy.item-id.desc": "Item ID",
    "cmd.shop.add.desc": "Add an item to the shop (Admin)",
    "cmd.shop.add.item-id.desc": "Unique ID",
    "cmd.shop.add.name.desc": "Item name",
    "cmd.shop.add.description.desc": "Description",
    "cmd.shop.add.type.desc": "Item type",
    "cmd.shop.add.price.desc": "Price",
    "cmd.shop.add.currency.desc": "Currency type",
    "cmd.shop.add.role.desc": "Role (if type=role)",
    "cmd.shop.add.stock.desc": "Stock quantity (leave empty = unlimited)",
    "cmd.shop.remove.desc": "Remove an item from the shop (Admin)",
    "cmd.shop.remove.item-id.desc": "Item ID",

    "cmd.rank.desc": "View your rank card or another user's",
    "cmd.rank.user.desc": "User to check rank for",

    "cmd.server-rank.desc": "View this server's XP stats and ranking",

    "cmd.leaderboard.desc": "View the XP leaderboard",
    "cmd.leaderboard.mode.desc": "Leaderboard type",

    "cmd.xp.desc": "XP management (admin)",
    "cmd.xp.set.desc": "Set a user's XP",
    "cmd.xp.set.user.desc": "Target user",
    "cmd.xp.set.amount.desc": "XP amount",
    "cmd.xp.add.desc": "Add XP to a user",
    "cmd.xp.add.user.desc": "Target user",
    "cmd.xp.add.amount.desc": "XP to add",
    "cmd.xp.remove.desc": "Remove XP from a user",
    "cmd.xp.remove.user.desc": "Target user",
    "cmd.xp.remove.amount.desc": "XP to remove",
    "cmd.xp.channel-blacklist.desc": "Manage XP channel blacklist",
    "cmd.xp.channel-blacklist.add.desc": "Blacklist a channel from XP",
    "cmd.xp.channel-blacklist.add.channel.desc": "Channel to blacklist",
    "cmd.xp.channel-blacklist.remove.desc": "Remove a channel from blacklist",
    "cmd.xp.channel-blacklist.remove.channel.desc": "Channel to remove",

    "cmd.settings.desc": "Bot settings",
    "cmd.settings.language.desc": "Set your preferred language",
    "cmd.settings.language.locale.desc": "Language",
    "cmd.settings.language.reset.desc": "Reset to auto-detect",
    "cmd.settings.server-language.desc": "Set the server default language (Manage Guild)",
    "cmd.settings.server-language.locale.desc": "Language",
    "cmd.settings.server-language.reset.desc": "Reset to auto-detect",

    "cmd.voice.desc": "Voice channel management",
    "cmd.voice.limit.desc": "Set the user limit for the voice channel",
    "cmd.voice.limit.number.desc": "Number of users (0-99)",
    "cmd.voice.name.desc": "Change the voice channel name",
    "cmd.voice.name.string.desc": "New name",
    "cmd.voice.lock.desc": "Lock the voice channel",
    "cmd.voice.unlock.desc": "Unlock the voice channel",
    "cmd.voice.hide.desc": "Hide the voice channel",
    "cmd.voice.permit.desc": "Permit a user to join",
    "cmd.voice.permit.user.desc": "User to permit",
    "cmd.voice.block.desc": "Block a user from the channel",
    "cmd.voice.block.user.desc": "User to block",
    "cmd.voice.kick.desc": "Kick a user from the voice channel",
    "cmd.voice.kick.user.desc": "User to kick",
    "cmd.voice.transfer.desc": "Transfer channel ownership",
    "cmd.voice.transfer.user.desc": "New owner",

    "cmd.manga.desc": "Read manga from {{source}}",
    "cmd.manga.read.desc": "Read H manga and D",
    "cmd.manga.read.id.desc": "The ID you wanna read",
    "cmd.manga.random.desc": "Random H and D from {{source}}"
```

- [ ] **Step 2: Verify JSON is valid**

Run: `node -e "JSON.parse(require('fs').readFileSync('src/locales/en.json','utf8')); console.log('Valid JSON')"`
Expected: `Valid JSON`

- [ ] **Step 3: Commit**

```bash
git add src/locales/en.json
git commit -m "feat(i18n): add cmd.* description keys to en.json"
```

---

### Task 4: Add `cmd.*` keys to existing 6 locale files

**Files:**
- Modify: `src/locales/vi.json`
- Modify: `src/locales/id.json`
- Modify: `src/locales/es.json`
- Modify: `src/locales/ja.json`
- Modify: `src/locales/zh.json`
- Modify: `src/locales/ko.json`

- [ ] **Step 1: Add translated `cmd.*` keys to `vi.json`**

Add all `cmd.*` keys with Vietnamese translations. Use the existing hardcoded Vietnamese descriptions from command files as the source. For example:
```json
    "cmd.ping.desc": "Kiểm tra độ trễ!",
    "cmd.help.desc": "Xem danh sách lệnh",
    "cmd.info.desc": "Thông tin về bot",
    "cmd.info.bot.desc": "Thông tin về bot",
    "cmd.avatar.desc": "Xem avatar của người dùng hoặc avatar của bạn.",
    "cmd.avatar.target.desc": "Avatar của ai",
    "cmd.trans.desc": "Dịch mọi ngôn ngữ sang Tiếng Việt",
    "cmd.trans.word.desc": "từ hoặc đoạn văn",
    "cmd.weather.desc": "Xem thông tin thời tiết.",
    "cmd.weather.location.desc": "Vị trí của bạn",
    "cmd.balance.desc": "Xem số dư coin và gem",
    "cmd.balance.user.desc": "Xem số dư của người khác",
    "cmd.pray.desc": "Cầu nguyện để nhận coin",
    "cmd.pray.target.desc": "Cầu nguyện cho người khác",
    "cmd.curse.desc": "Nguyền rủa để nhận coin (ít hơn pray)",
    "cmd.curse.target.desc": "Nguyền rủa ai đó",
    "cmd.economy.desc": "Quản lý kinh tế (admin)",
    "cmd.economy.set-coin.desc": "Đặt coin cho người dùng",
    "cmd.economy.set-coin.user.desc": "Người dùng",
    "cmd.economy.set-coin.amount.desc": "Số coin",
    "cmd.economy.add-coin.desc": "Thêm coin cho người dùng",
    "cmd.economy.add-coin.user.desc": "Người dùng",
    "cmd.economy.add-coin.amount.desc": "Số coin thêm",
    "cmd.economy.set-gem.desc": "Đặt gem cho người dùng",
    "cmd.economy.set-gem.user.desc": "Người dùng",
    "cmd.economy.set-gem.amount.desc": "Số gem",
    "cmd.economy.add-gem.desc": "Thêm gem cho người dùng",
    "cmd.economy.add-gem.user.desc": "Người dùng",
    "cmd.economy.add-gem.amount.desc": "Số gem thêm",
    "cmd.shop.desc": "Cửa hàng server",
    "cmd.shop.view.desc": "Xem danh sách items",
    "cmd.shop.view.page.desc": "Trang",
    "cmd.shop.buy.desc": "Mua item",
    "cmd.shop.buy.item-id.desc": "ID của item",
    "cmd.shop.add.desc": "Thêm item vào shop (Admin)",
    "cmd.shop.add.item-id.desc": "ID duy nhất",
    "cmd.shop.add.name.desc": "Tên item",
    "cmd.shop.add.description.desc": "Mô tả",
    "cmd.shop.add.type.desc": "Loại item",
    "cmd.shop.add.price.desc": "Giá",
    "cmd.shop.add.currency.desc": "Loại tiền",
    "cmd.shop.add.role.desc": "Role (nếu type=role)",
    "cmd.shop.add.stock.desc": "Số lượng (bỏ trống = vô hạn)",
    "cmd.shop.remove.desc": "Xóa item khỏi shop (Admin)",
    "cmd.shop.remove.item-id.desc": "ID của item",
    "cmd.rank.desc": "Xem rank card của bạn hoặc người khác",
    "cmd.rank.user.desc": "Người dùng cần xem rank",
    "cmd.server-rank.desc": "Xem thống kê XP và xếp hạng server",
    "cmd.leaderboard.desc": "Xem bảng xếp hạng XP",
    "cmd.leaderboard.mode.desc": "Loại bảng xếp hạng",
    "cmd.xp.desc": "Quản lý XP (admin)",
    "cmd.xp.set.desc": "Đặt XP cho người dùng",
    "cmd.xp.set.user.desc": "Người dùng mục tiêu",
    "cmd.xp.set.amount.desc": "Số lượng XP",
    "cmd.xp.add.desc": "Thêm XP cho người dùng",
    "cmd.xp.add.user.desc": "Người dùng mục tiêu",
    "cmd.xp.add.amount.desc": "Số XP cần thêm",
    "cmd.xp.remove.desc": "Xóa XP từ người dùng",
    "cmd.xp.remove.user.desc": "Người dùng mục tiêu",
    "cmd.xp.remove.amount.desc": "Số XP cần xóa",
    "cmd.xp.channel-blacklist.desc": "Quản lý kênh bị chặn XP",
    "cmd.xp.channel-blacklist.add.desc": "Chặn kênh khỏi XP",
    "cmd.xp.channel-blacklist.add.channel.desc": "Kênh cần chặn",
    "cmd.xp.channel-blacklist.remove.desc": "Xóa kênh khỏi danh sách chặn",
    "cmd.xp.channel-blacklist.remove.channel.desc": "Kênh cần xóa",
    "cmd.settings.desc": "Cài đặt bot",
    "cmd.settings.language.desc": "Đặt ngôn ngữ ưu tiên",
    "cmd.settings.language.locale.desc": "Ngôn ngữ",
    "cmd.settings.language.reset.desc": "Đặt lại về tự động phát hiện",
    "cmd.settings.server-language.desc": "Đặt ngôn ngữ mặc định cho server (Quản lý Guild)",
    "cmd.settings.server-language.locale.desc": "Ngôn ngữ",
    "cmd.settings.server-language.reset.desc": "Đặt lại về tự động phát hiện",
    "cmd.voice.desc": "Quản lý kênh voice",
    "cmd.voice.limit.desc": "Đặt giới hạn người dùng cho kênh voice",
    "cmd.voice.limit.number.desc": "Số người dùng (0-99)",
    "cmd.voice.name.desc": "Đổi tên kênh voice",
    "cmd.voice.name.string.desc": "Tên mới",
    "cmd.voice.lock.desc": "Khóa kênh voice",
    "cmd.voice.unlock.desc": "Mở khóa kênh voice",
    "cmd.voice.hide.desc": "Ẩn kênh voice",
    "cmd.voice.permit.desc": "Cấp quyền cho người dùng",
    "cmd.voice.permit.user.desc": "Người dùng được cấp quyền",
    "cmd.voice.block.desc": "Chặn người dùng khỏi kênh",
    "cmd.voice.block.user.desc": "Người dùng cần chặn",
    "cmd.voice.kick.desc": "Kick người dùng khỏi kênh voice",
    "cmd.voice.kick.user.desc": "Người dùng cần kick",
    "cmd.voice.transfer.desc": "Chuyển quyền sở hữu kênh",
    "cmd.voice.transfer.user.desc": "Chủ mới",
    "cmd.manga.desc": "Đọc manga từ {{source}}",
    "cmd.manga.read.desc": "Đọc manga H và D",
    "cmd.manga.read.id.desc": "ID bạn muốn đọc",
    "cmd.manga.random.desc": "Random H và D từ {{source}}"
```

- [ ] **Step 2: Add translated `cmd.*` keys to `id.json`**

Add all `cmd.*` keys with Indonesian translations. AI translate from English descriptions.

- [ ] **Step 3: Add translated `cmd.*` keys to `es.json`**

Add all `cmd.*` keys with Spanish translations.

- [ ] **Step 4: Add translated `cmd.*` keys to `ja.json`**

Add all `cmd.*` keys with Japanese translations.

- [ ] **Step 5: Add translated `cmd.*` keys to `zh.json`**

Add all `cmd.*` keys with Chinese translations.

- [ ] **Step 6: Add translated `cmd.*` keys to `ko.json`**

Add all `cmd.*` keys with Korean translations.

- [ ] **Step 7: Validate all JSON files**

Run: `for f in src/locales/*.json; do node -e "JSON.parse(require('fs').readFileSync('$f','utf8'))" && echo "$f OK" || echo "$f INVALID"; done`
Expected: All files print OK

- [ ] **Step 8: Commit**

```bash
git add src/locales/vi.json src/locales/id.json src/locales/es.json src/locales/ja.json src/locales/zh.json src/locales/ko.json
git commit -m "feat(i18n): add cmd.* description keys to existing 6 locale files"
```

---

### Task 5: Create 8 new locale files

**Files:**
- Create: `src/locales/pt-BR.json`
- Create: `src/locales/fr.json`
- Create: `src/locales/de.json`
- Create: `src/locales/ru.json`
- Create: `src/locales/tr.json`
- Create: `src/locales/it.json`
- Create: `src/locales/pl.json`
- Create: `src/locales/nl.json`

Each file must contain AI translations of ALL keys from `en.json` (both existing ~228 keys AND the new `cmd.*` keys added in Tasks 3-4).

- [ ] **Step 1: Create `src/locales/pt-BR.json`**

Translate all keys from `en.json` to Brazilian Portuguese. Maintain all `{{interpolation}}` placeholders exactly as-is. Keep Discord formatting (`**`, `>`, `<@{{userId}}>`, `<#{{channelId}}>`) intact.

- [ ] **Step 2: Create `src/locales/fr.json`**

Translate all keys to French.

- [ ] **Step 3: Create `src/locales/de.json`**

Translate all keys to German.

- [ ] **Step 4: Create `src/locales/ru.json`**

Translate all keys to Russian.

- [ ] **Step 5: Create `src/locales/tr.json`**

Translate all keys to Turkish.

- [ ] **Step 6: Create `src/locales/it.json`**

Translate all keys to Italian.

- [ ] **Step 7: Create `src/locales/pl.json`**

Translate all keys to Polish.

- [ ] **Step 8: Create `src/locales/nl.json`**

Translate all keys to Dutch.

- [ ] **Step 9: Validate all new JSON files**

Run: `for f in src/locales/pt-BR.json src/locales/fr.json src/locales/de.json src/locales/ru.json src/locales/tr.json src/locales/it.json src/locales/pl.json src/locales/nl.json; do node -e "JSON.parse(require('fs').readFileSync('$f','utf8'))" && echo "$f OK" || echo "$f INVALID"; done`
Expected: All 8 files print OK

- [ ] **Step 10: Verify key count parity**

Run: `for f in src/locales/*.json; do echo "$f: $(node -e "console.log(Object.keys(JSON.parse(require('fs').readFileSync('$f','utf8'))).length)")"; done`
Expected: All 15 files have the same number of keys

- [ ] **Step 11: Commit**

```bash
git add src/locales/pt-BR.json src/locales/fr.json src/locales/de.json src/locales/ru.json src/locales/tr.json src/locales/it.json src/locales/pl.json src/locales/nl.json
git commit -m "feat(i18n): add 8 new locale files (pt-BR, fr, de, ru, tr, it, pl, nl)"
```

---

### Task 6: Update manga handler to use `descriptionLocales()`

**Files:**
- Modify: `src/util/manga/handler.ts`

- [ ] **Step 1: Update manga handler**

In `src/util/manga/handler.ts`, add import and update the `mangaCommand` function's `SlashCommandBuilder` chain.

Add import at top:
```typescript
import { descriptionLocales } from "../i18n/commandLocales";
```

Replace the builder chain (lines 27-38):
```typescript
        data: new SlashCommandBuilder()
            .setName(source.name)
            .setDescription(source.description)
            .addSubcommand((sub) =>
                sub
                    .setName("read")
                    .setDescription("Read H manga and D")
                    .setDescriptionLocalizations(descriptionLocales("cmd.manga.read.desc"))
                    .addIntegerOption((opt) =>
                        opt
                            .setName("id")
                            .setDescription("The ID you wanna read")
                            .setDescriptionLocalizations(descriptionLocales("cmd.manga.read.id.desc"))
                            .setRequired(true)
                    )
            )
            .addSubcommand((sub) =>
                sub
                    .setName("random")
                    .setDescription(`Random H and D from ${source.name}`)
                    .setDescriptionLocalizations(descriptionLocales("cmd.manga.random.desc"))
            ),
```

Note: The top-level command description (`source.description`) and `source.name` come from the `MangaSource` config and are not localized (they are site names like "nhentai"). Only subcommand and option descriptions get localized.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/util/manga/handler.ts
git commit -m "feat(i18n): use descriptionLocales in manga handler"
```

---

### Task 7: Update utility commands to use `descriptionLocales()`

**Files:**
- Modify: `src/commands/slash/ping.ts`
- Modify: `src/commands/slash/help.ts`
- Modify: `src/commands/slash/info.ts`
- Modify: `src/commands/slash/avatar.ts`
- Modify: `src/commands/slash/trans.ts`
- Modify: `src/commands/slash/weather.ts`

- [ ] **Step 1: Update `ping.ts`**

Add import:
```typescript
import { descriptionLocales } from "../../util/i18n/commandLocales";
```

Replace:
```typescript
.setDescriptionLocalizations({ vi: "Kiểm tra độ trễ!" })
```
With:
```typescript
.setDescriptionLocalizations(descriptionLocales("cmd.ping.desc"))
```

- [ ] **Step 2: Update `help.ts`**

Add import:
```typescript
import { descriptionLocales } from "../../util/i18n/commandLocales";
```

Replace:
```typescript
.setDescriptionLocalizations({ vi: "Xem danh sách lệnh" })
```
With:
```typescript
.setDescriptionLocalizations(descriptionLocales("cmd.help.desc"))
```

- [ ] **Step 3: Update `info.ts`**

Add import:
```typescript
import { descriptionLocales } from "../../util/i18n/commandLocales";
```

Replace both `setDescriptionLocalizations` calls:
- Command: `{ vi: "Thông tin về bot" }` → `descriptionLocales("cmd.info.desc")`
- Subcommand `bot`: `{ vi: "Thông tin về bot" }` → `descriptionLocales("cmd.info.bot.desc")`

- [ ] **Step 4: Update `avatar.ts`**

Add import:
```typescript
import { descriptionLocales } from "../../util/i18n/commandLocales";
```

Replace both `setDescriptionLocalizations` calls:
- Command: `{ vi: "Xem avatar của người dùng hoặc avatar của bạn." }` → `descriptionLocales("cmd.avatar.desc")`
- Option `target`: `{ vi: "Avatar của ai" }` → `descriptionLocales("cmd.avatar.target.desc")`

- [ ] **Step 5: Update `trans.ts`**

Add import:
```typescript
import { descriptionLocales } from "../../util/i18n/commandLocales";
```

Replace both `setDescriptionLocalizations` calls:
- Command: `{ vi: "Dịch mọi ngôn ngữ sang Tiếng Việt" }` → `descriptionLocales("cmd.trans.desc")`
- Option `word`: `{ vi: "từ hoặc đoạn văn" }` → `descriptionLocales("cmd.trans.word.desc")`

- [ ] **Step 6: Update `weather.ts`**

Add import:
```typescript
import { descriptionLocales } from "../../util/i18n/commandLocales";
```

Replace both `setDescriptionLocalizations` calls:
- Command: `{ vi: "Xem thông tin thời tiết." }` → `descriptionLocales("cmd.weather.desc")`
- Option `location`: `{ vi: "Vị trí của bạn" }` → `descriptionLocales("cmd.weather.location.desc")`

- [ ] **Step 7: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 8: Commit**

```bash
git add src/commands/slash/ping.ts src/commands/slash/help.ts src/commands/slash/info.ts src/commands/slash/avatar.ts src/commands/slash/trans.ts src/commands/slash/weather.ts
git commit -m "feat(i18n): use descriptionLocales in utility commands"
```

---

### Task 8: Update economy commands to use `descriptionLocales()`

**Files:**
- Modify: `src/commands/slash/balance.ts`
- Modify: `src/commands/slash/pray.ts`
- Modify: `src/commands/slash/curse.ts`
- Modify: `src/commands/slash/economy.ts`
- Modify: `src/commands/slash/shop.ts`

- [ ] **Step 1: Update `balance.ts`**

Add import:
```typescript
import { descriptionLocales } from "../../util/i18n/commandLocales";
```

Replace `setDescriptionLocalizations` calls:
- Command: `{ vi: "Xem số dư coin và gem" }` → `descriptionLocales("cmd.balance.desc")`
- Option `user`: `{ vi: "Xem số dư của người khác" }` → `descriptionLocales("cmd.balance.user.desc")`

- [ ] **Step 2: Update `pray.ts`**

Add import:
```typescript
import { descriptionLocales } from "../../util/i18n/commandLocales";
```

Replace `setDescriptionLocalizations` calls:
- Command: `{ vi: "Cầu nguyện để nhận coin" }` → `descriptionLocales("cmd.pray.desc")`
- Option `target`: `{ vi: "Cầu nguyện cho người khác" }` → `descriptionLocales("cmd.pray.target.desc")`

- [ ] **Step 3: Update `curse.ts`**

Add import:
```typescript
import { descriptionLocales } from "../../util/i18n/commandLocales";
```

Replace `setDescriptionLocalizations` calls:
- Command: `{ vi: "Nguyền rủa để nhận coin (ít hơn pray)" }` → `descriptionLocales("cmd.curse.desc")`
- Option `target`: `{ vi: "Nguyền rủa ai đó" }` → `descriptionLocales("cmd.curse.target.desc")`

- [ ] **Step 4: Update `economy.ts`**

Add import:
```typescript
import { descriptionLocales } from "../../util/i18n/commandLocales";
```

Replace all `setDescriptionLocalizations` calls (13 total):
- Command: → `descriptionLocales("cmd.economy.desc")`
- Subcommand `set-coin`: → `descriptionLocales("cmd.economy.set-coin.desc")`
- Option `set-coin.user`: → `descriptionLocales("cmd.economy.set-coin.user.desc")`
- Option `set-coin.amount`: → `descriptionLocales("cmd.economy.set-coin.amount.desc")`
- Subcommand `add-coin`: → `descriptionLocales("cmd.economy.add-coin.desc")`
- Option `add-coin.user`: → `descriptionLocales("cmd.economy.add-coin.user.desc")`
- Option `add-coin.amount`: → `descriptionLocales("cmd.economy.add-coin.amount.desc")`
- Subcommand `set-gem`: → `descriptionLocales("cmd.economy.set-gem.desc")`
- Option `set-gem.user`: → `descriptionLocales("cmd.economy.set-gem.user.desc")`
- Option `set-gem.amount`: → `descriptionLocales("cmd.economy.set-gem.amount.desc")`
- Subcommand `add-gem`: → `descriptionLocales("cmd.economy.add-gem.desc")`
- Option `add-gem.user`: → `descriptionLocales("cmd.economy.add-gem.user.desc")`
- Option `add-gem.amount`: → `descriptionLocales("cmd.economy.add-gem.amount.desc")`

- [ ] **Step 5: Update `shop.ts`**

Add import:
```typescript
import { descriptionLocales } from "../../util/i18n/commandLocales";
```

Replace all `setDescriptionLocalizations` calls (18 total):
- Command: → `descriptionLocales("cmd.shop.desc")`
- Subcommand `view`: → `descriptionLocales("cmd.shop.view.desc")`
- Option `view.page`: → `descriptionLocales("cmd.shop.view.page.desc")`
- Subcommand `buy`: → `descriptionLocales("cmd.shop.buy.desc")`
- Option `buy.item-id`: → `descriptionLocales("cmd.shop.buy.item-id.desc")`
- Subcommand `add`: → `descriptionLocales("cmd.shop.add.desc")`
- Options `add.*`: → `descriptionLocales("cmd.shop.add.{option}.desc")` for each of: `item-id`, `name`, `description`, `type`, `price`, `currency`, `role`, `stock`
- Subcommand `remove`: → `descriptionLocales("cmd.shop.remove.desc")`
- Option `remove.item-id`: → `descriptionLocales("cmd.shop.remove.item-id.desc")`

- [ ] **Step 6: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add src/commands/slash/balance.ts src/commands/slash/pray.ts src/commands/slash/curse.ts src/commands/slash/economy.ts src/commands/slash/shop.ts
git commit -m "feat(i18n): use descriptionLocales in economy commands"
```

---

### Task 9: Update XP & ranking commands to use `descriptionLocales()`

**Files:**
- Modify: `src/commands/slash/rank.ts`
- Modify: `src/commands/slash/server-rank.ts`
- Modify: `src/commands/slash/leaderboard.ts`
- Modify: `src/commands/slash/xp.ts`

- [ ] **Step 1: Update `rank.ts`**

Add import:
```typescript
import { descriptionLocales } from "../../util/i18n/commandLocales";
```

Replace `setDescriptionLocalizations` calls:
- Command: `{ vi: "Xem rank card của bạn hoặc người khác" }` → `descriptionLocales("cmd.rank.desc")`
- Option `user`: `{ vi: "Người dùng cần xem rank" }` → `descriptionLocales("cmd.rank.user.desc")`

- [ ] **Step 2: Update `server-rank.ts`**

Add import:
```typescript
import { descriptionLocales } from "../../util/i18n/commandLocales";
```

Replace the long `setDescriptionLocalizations` object (which already has 6 languages):
```typescript
.setDescriptionLocalizations({ vi: "...", ja: "...", ko: "...", "zh-CN": "...", id: "...", "es-ES": "..." })
```
With:
```typescript
.setDescriptionLocalizations(descriptionLocales("cmd.server-rank.desc"))
```

- [ ] **Step 3: Update `leaderboard.ts`**

Add import:
```typescript
import { descriptionLocales } from "../../util/i18n/commandLocales";
```

Replace `setDescriptionLocalizations` calls:
- Command: → `descriptionLocales("cmd.leaderboard.desc")`
- Option `mode`: → `descriptionLocales("cmd.leaderboard.mode.desc")`

- [ ] **Step 4: Update `xp.ts`**

Add import:
```typescript
import { descriptionLocales } from "../../util/i18n/commandLocales";
```

Replace all `setDescriptionLocalizations` calls (17 total):
- Command: → `descriptionLocales("cmd.xp.desc")`
- Subcommands `set`, `add`, `remove`: → `descriptionLocales("cmd.xp.{sub}.desc")`
- Options `set.user`, `set.amount`, `add.user`, `add.amount`, `remove.user`, `remove.amount`: → matching `cmd.xp.{sub}.{opt}.desc`
- Subcommand group `channel-blacklist`: → `descriptionLocales("cmd.xp.channel-blacklist.desc")`
- Subcommands `channel-blacklist.add`, `channel-blacklist.remove`: → matching keys
- Options `channel-blacklist.add.channel`, `channel-blacklist.remove.channel`: → matching keys

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/commands/slash/rank.ts src/commands/slash/server-rank.ts src/commands/slash/leaderboard.ts src/commands/slash/xp.ts
git commit -m "feat(i18n): use descriptionLocales in XP and ranking commands"
```

---

### Task 10: Update `settings.ts` and `voice.ts`

**Files:**
- Modify: `src/commands/slash/settings.ts`
- Modify: `src/commands/slash/voice.ts`

- [ ] **Step 1: Update `settings.ts` — localizations**

Add import:
```typescript
import { descriptionLocales } from "../../util/i18n/commandLocales";
```

Replace all `setDescriptionLocalizations` calls (7 total) with `descriptionLocales()`:
- Command: → `descriptionLocales("cmd.settings.desc")`
- Subcommand `language`: → `descriptionLocales("cmd.settings.language.desc")`
- Option `language.locale`: → `descriptionLocales("cmd.settings.language.locale.desc")`
- Option `language.reset`: → `descriptionLocales("cmd.settings.language.reset.desc")`
- Subcommand `server-language`: → `descriptionLocales("cmd.settings.server-language.desc")`
- Option `server-language.locale`: → `descriptionLocales("cmd.settings.server-language.locale.desc")`
- Option `server-language.reset`: → `descriptionLocales("cmd.settings.server-language.reset.desc")`

- [ ] **Step 2: Update `settings.ts` — add 8 new language choices**

Update both `addChoices()` blocks (lines 28-36 and 55-63) to include the 8 new languages. Each block becomes:

```typescript
.addChoices(
    { name: "English", value: "en" },
    { name: "Tiếng Việt", value: "vi" },
    { name: "Bahasa Indonesia", value: "id" },
    { name: "Español", value: "es" },
    { name: "日本語", value: "ja" },
    { name: "中文", value: "zh" },
    { name: "한국어", value: "ko" },
    { name: "Português (Brasil)", value: "pt-BR" },
    { name: "Français", value: "fr" },
    { name: "Deutsch", value: "de" },
    { name: "Русский", value: "ru" },
    { name: "Türkçe", value: "tr" },
    { name: "Italiano", value: "it" },
    { name: "Polski", value: "pl" },
    { name: "Nederlands", value: "nl" }
)
```

- [ ] **Step 3: Update `settings.ts` — expand `LANGUAGE_NAMES`**

Update the `LANGUAGE_NAMES` object (lines 76-84) to include the 8 new entries:

```typescript
const LANGUAGE_NAMES: Record<string, string> = {
    en: "English",
    vi: "Tiếng Việt",
    id: "Bahasa Indonesia",
    es: "Español",
    ja: "日本語",
    zh: "中文",
    ko: "한국어",
    "pt-BR": "Português (Brasil)",
    fr: "Français",
    de: "Deutsch",
    ru: "Русский",
    tr: "Türkçe",
    it: "Italiano",
    pl: "Polski",
    nl: "Nederlands",
};
```

- [ ] **Step 4: Update `voice.ts`**

Add import:
```typescript
import { descriptionLocales } from "../../util/i18n/commandLocales";
```

Replace all existing `setDescriptionLocalizations` calls and add new ones for options that previously had none. All subcommands and options get `descriptionLocales()`:
- Command: → `descriptionLocales("cmd.voice.desc")`
- Subcommands `limit`, `name`, `lock`, `unlock`, `hide`, `permit`, `block`, `kick`, `transfer`: → matching `cmd.voice.{sub}.desc`
- Options `limit.number`, `name.string`, `permit.user`, `block.user`, `kick.user`, `transfer.user`: → matching `cmd.voice.{sub}.{opt}.desc`

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/commands/slash/settings.ts src/commands/slash/voice.ts
git commit -m "feat(i18n): use descriptionLocales in settings and voice commands, add 8 language choices"
```

---

### Task 11: Final verification

**Files:** None (verification only)

- [ ] **Step 1: Full TypeScript compile**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 2: Verify all locale files have matching keys**

Run: `node -e "const fs=require('fs');const en=Object.keys(JSON.parse(fs.readFileSync('src/locales/en.json','utf8')));const files=['vi','id','es','ja','zh','ko','pt-BR','fr','de','ru','tr','it','pl','nl'];files.forEach(f=>{const keys=Object.keys(JSON.parse(fs.readFileSync('src/locales/'+f+'.json','utf8')));const missing=en.filter(k=>!keys.includes(k));const extra=keys.filter(k=>!en.includes(k));if(missing.length)console.log(f+' MISSING:',missing);if(extra.length)console.log(f+' EXTRA:',extra);if(!missing.length&&!extra.length)console.log(f+' OK')})"`
Expected: All 14 files print OK

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: Build succeeds, `dist/locales/` contains all 15 JSON files

- [ ] **Step 4: Verify locale files copied to dist**

Run: `ls dist/locales/`
Expected: `de.json  en.json  es.json  fr.json  id.json  it.json  ja.json  ko.json  nl.json  pl.json  pt-BR.json  ru.json  tr.json  vi.json  zh.json`

- [ ] **Step 5: Commit build verification (if any fixes needed)**

Only commit if fixes were made during verification. Otherwise skip.
