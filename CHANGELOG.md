# Changelog

All notable changes to this project are documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

**CI / Discord:** GitHub Actions reads **`package.json` → `version`** and posts the matching **`## [x.y.z]`** block from this file (not `[Unreleased]`). Keep **`package.json` version** in sync with the release section you want announced. See [docs/steering/changelog-ci.md](docs/steering/changelog-ci.md).

## [Unreleased]

## [5.5.0] - 2026-04-12

### Added

- **`/mine`** — mining mini-game with depth-based progression.
  - 5 mineral tiers: Stone (45%), Iron (28%), Gold (15%), Diamond (8%), Emerald (4%) with scaling depth bonuses.
  - Collapse risk (5–15% by depth) costs coins and resets to last checkpoint.
  - Checkpoints auto-save at prime-numbered floors (2, 3, 5, 7, 11, 13…).
  - 4% star drop chance on successful mine. 2-hour cooldown.
- **`/dungeon`** — multi-encounter dungeon adventure with interactive buttons.
  - Up to 5 encounters per run: monster combat (50%), treasure (25%), traps (15%), NPC merchant (10%).
  - Turn-based combat with Attack (full damage), Defend (70% / 50%), and Run actions; 3-turn limit.
  - **NPC merchant**: buy healing, buffs (Attack ×1.3 / Defense ×0.7 / Luck), or exchange coins for gems.
  - Luck buff shifts encounter weights (treasure 25→35%, traps 15→5%).
  - Same prime-number checkpoint system as `/mine`. 3% star drop on wins/treasure. 1-hour cooldown.
  - `MerchantService` for dynamic pricing by floor.
- **Star drops** — 4% chance on `/pray`, `/curse`, `/work`, `/fish`; 4% on `/mine`; 3% on `/dungeon` win/treasure. Awards 1 star to global wallet.
- **Manga premium gate** — 3 free uses per day (UTC reset), then 1 star per use via global wallet. Refund on error.
- **Manga sources** — added `hentai2read` and `simply-hentai` commands.
- **Global shop** — cross-server shop using star currency (`/global-shop view`, `/global-shop buy`). Stock decrement → star deduction → inventory upsert with Redis idempotency.
- **Notification system** — per-guild welcome, goodbye, boost, milestone, and level-up notifications.
  - Events: `guildMemberAdd`, `guildMemberRemove`, `guildMemberUpdate` (boost), `messageCreate` / `voiceStateUpdate` (level-up).
  - `/settings notifications` subcommands for channel, message template, and toggle config.
  - `GuildNotificationConfig` model with Redis-cached config lookups.
  - i18n keys for all 5 notification types across 15 locales.
- **`/help`** — added support server button.
- **Landing — Mine & Dungeon**: command pages (EN + VI), user guides with strategy sections (EN + VI), economy guide updated with mine/dungeon sections and commands reference.
- **Steering docs** — `mine-system.md` and `dungeon-system.md` added to `docs/steering/`.

### Fixed

- **Dungeon**: prevent stale timeouts editing expired messages; clear merchant embed on purchase error; owner-check on all button handlers.

### Changed

- **Dependencies**: axios 1.14.0 → 1.15.0.

## [5.4.0] - 2026-04-09

### Added

- **Global Wallet System** — new bot-controlled **star** currency, completely separate from per-guild coins/gems.
  - **`/wallet view`** — check star balance, daily streak, and milestones claimed.
  - **`/wallet daily`** — claim 1–3 stars per day (UTC reset) with consecutive-day streak bonuses (+2/+5/+10/+20 at 3/7/14/30 days).
  - **`/wallet history`** — paginated global transaction history.
  - **Achievement milestones** — one-time star rewards for reaching level 10/25/50/100, pray streak 7/14/30, leaderboard top 3, and being active in 3/5/10 servers.
  - **Security**: no admin commands, no exchange with coin/gem, no transfer between users, atomic cooldown check to prevent double-claim.
  - **`UserWallet` model**, **`WalletService`** (core, daily claim, milestones), 4 new `global_*` transaction types.
  - **i18n**: wallet translation keys added to all 15 locales.
- **Landing — 4 new user guides** (EN + VI):
  - **Manga & NSFW** — 6 source commands, NSFW safety, search/read/random usage.
  - **Utility** — `/ping`, `/trans`, `/weather`.
  - **Info & Help** — `/help`, `/info bot`, `/avatar`.
  - **Settings & Language** — `/settings language`, `/settings server-language`, 15-language table, resolution priority.
- **Landing — Wallet command page** (EN + VI) with star currency, daily streak, and milestone documentation.
- **Landing — Economy guide**: new "Global Wallet & Star Currency" section + admin config commands (`reward-config-*`, `gambling-config-*`, `work-config-*`, `social-config-*`) + expanded Commands Reference table.

### Fixed

- **Landing — XP guide**: detailed leaderboard modes (Server/Global/Servers), reaction XP note, level-up economy rewards.
- **Landing — Voice guide**: ownership expiry, kick behavior, transfer details, rename rate limit.
- **Landing — Confessions guide**: added VIP cost (5 gems), skip cooldown cost (50 coins), reply pricing (first free, 5 coins after), privacy note for review mode.
- **Landing — Moderation guide**: bot permission requirements, "strictly above" role hierarchy clarification.

### Changed

- **`/xp set` / `add` / `remove`** restricted to `DEV_USER_ID` only — no longer available to server admins. Channel blacklist remains admin-accessible.

## [5.3.0] - 2026-04-08

### Added

- **`/confession submit vip:true`** — VIP confession with gold embed (`✨`), costs **5 gems** per use.
- **`/confession submit skip_cooldown:true`** — bypass active cooldown for **50 coins** (only charged when on cooldown).
- **`/confession submit tag:heartfelt`** — optional category tags (Heartfelt, Funny, Question, Sharing, Other) displayed as `[🏷️ Tag]` badge on embeds.
- **Confession voting** — every published confession has `👍` / `👎` / `💬 Reply` buttons; vote counts update in real-time.
- **Anonymous reply threads** — click 💬 Reply to open a modal, reply posted anonymously into a Discord thread; first reply free, **5 coins** per additional reply.
- **`/confession ban` / `unban`** — ban users from confessing (timed: 1h/6h/1d/7d/30d, or permanent); requires Manage Guild or Manage Messages.
- **`/confession filter-add` / `filter-remove` / `filter-list`** — keyword blacklist (up to 50 per server, case-insensitive substring match); auto-rejects confessions containing blocked words.
- **New models:** `ConfessionVote`, `ConfessionReply`, `ConfessionBan`; extended `Confession` with `isVip`, `upvotes`, `downvotes`, `threadId`, `replyCount`, `tag`; extended `GuildConfessionConfig` with `blockedKeywords`.
- **Transaction types:** `confession_vip`, `confession_skip_cd`, `confession_refund`, `confession_reply` for economy audit trail.
- **Landing — Confession guide** updated with full premium feature documentation (EN + VI).

## [5.2.0] - 2026-04-08

### Added

- **Landing — Command Guide Pages**: per-command detail pages with usage guides, syntax tables, and step-by-step instructions for complex commands. Powered by Astro Content Collections with Markdown.
  - **i18n**: English + Vietnamese, with language switcher (EN ↔ VI) on each guide page.
  - **25 commands** documented: voice, rank, leaderboard, server-rank, xp, balance, pray, curse, shop, economy, moderation, confession, settings, nhentai, 3hentai, asmhentai, hentaifox, nhentai-lite, pururin, ping, help, info, avatar, trans, weather.
  - **Navigation**: clickable command cards on `/commands` with "Guide →" hover text; breadcrumb, related commands, and back link on each guide page.
  - **SEO**: `hreflang` alternate links for EN/VI on every guide page.
- **Landing — Confession command**: added `/confession` to the commands listing page.

### Fixed

- **CI (changelog → Discord webhook):** normalize the secret URL (strip BOM, use the first line only), validate known Discord webhook host prefixes, send a **`User-Agent`** header, and log Discord’s **HTTP response body** on failure to simplify debugging (e.g. 403 vs invalid token).

### Changed

- **Docs:** `docs/steering/changelog-ci.md` — notes on repository secrets, one-line URL pasting, and when the notify job runs (**only if `CHANGELOG.md` changes** in the push).

## [5.1.0] - 2026-04-07

### Added

- **`/moderation`** slash command: `timeout`, `untimeout`, `ban`, `unban`, and **`kick`**, with permission checks and localized strings (all supported locales).
- **`/help`**: single embed listing slash commands **grouped by category** (General, XP, Economy, Voice, Moderation, Manga, etc.).
- **`/info bot`**: shows bot version plus **guild count**, **approximate total members** (across guilds), and **process uptime**.
- **Landing site**: **Moderation** category and `/moderation` on the commands page and sidebar; refreshed **`/help`** and **`/info`** descriptions.
- **CI**: on push to **`develop`**, after a successful bot build, if **`CHANGELOG.md`** changed, post the release section matching **`package.json` version** to Discord via webhook (see `docs/steering/changelog-ci.md`).

### Changed

- **Landing**: UI polish — typography, depth, focus states, and **reduced-motion** handling.

### Fixed

- **Moderation**: stricter **moderator vs target** role hierarchy checks, clearer errors when a member is missing, and a **maximum reason length** aligned with Discord limits.
