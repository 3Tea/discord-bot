# Changelog

All notable changes to this project are documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

**CI / Discord:** GitHub Actions reads **`package.json` → `version`** and posts the matching **`## [x.y.z]`** block from this file (not `[Unreleased]`). Keep **`package.json` version** in sync with the release section you want announced. See [docs/steering/changelog-ci.md](docs/steering/changelog-ci.md).

## [Unreleased]

### Added

- **Profile card** — `/profile` command showing comprehensive user stats (level, economy, streaks, activity). Canvas image for premium users (Star: anime theme, Galaxy: gold glow effects), embed for free tier.
- **Economy admin tools** — comprehensive server economy management via restructured `/economy` command.
  - Command restructured into 4 groups: `balance`, `config`, `admin`, `bulk` (breaking change: `/economy set-coin` → `/economy balance set-coin`).
  - Dashboard (`/economy admin dashboard`): circulation overview, 24h coin flow, source/sink breakdown, wealth distribution, week-over-week comparison, anomaly detection.
  - Audit tools: transaction history with pagination and filters, reverse specific transactions, freeze/unfreeze user economy access.
  - Reset system: flexible reset (coin/gem/streak/all) with auto-snapshot before reset and rollback capability.
  - Bulk operations: distribute or tax coin/gem to all members or by role, with confirmation gates and 60s cooldown.
  - Economy log channel: opt-in admin-configured channel for notable transactions (large amounts, gambling wins, rob success, admin actions).
  - Freeze enforcement: frozen users blocked from all 10 economy commands (pray, curse, work, fish, gamble, gift, rob, shop, mine, dungeon).
- **Daily quest system** — 3 random quests per day (1 easy + 1 medium + 1 hard) with hybrid rewards.
  - 18 quest templates across 3 difficulty tiers, deterministic generation via `SHA-256(userId + date)`.
  - `/quest view` shows today's quests + progress, `/quest claim` collects all-3-complete star bonus.
  - Coin rewards (per-server) paid automatically per quest. Star rewards (global) on claim.
  - Premium-tiered: Free (10/20/35 coin, +1 star), Star (15/30/50, +2), Galaxy (20/40/70, +3).
  - Quest streak: consecutive days → bonus stars at 3/7/14/30 day milestones.
  - 14 commands integrated for auto-tracking: pray, curse, rank, balance, wallet, work, fish, mine, gift, confession, shop, dungeon, gamble, rob.
- **Audio confession** — premium-only voice note attachment for confessions.
  - Star tier: 1 audio/day, 30s max, 2MB. Galaxy tier: unlimited, 60s max, 5MB.
  - Mutually exclusive with image attachment. Accepted formats: MP3, OGG, WAV, M4A, WebM.
  - Discord renders inline audio player. `🎙️ Voice Confession` label in embed.
  - Daily limit tracked via Redis with UTC midnight reset. Auto-refund on error.

## [5.6.0] - 2026-04-14

### Added

- **Premium subscription system** — two-tier premium (Star ⭐ + Galaxy 🌌) with per-user global benefits.
  - **Star tier**: 10 manga free uses/day (vs 3), 70 max pages (vs 35), halved cooldowns (work 2h, fish 30m, mine 1h, dungeon 30m), +50% star drop rate, free confession skip cooldown, Star badge on rank card.
  - **Galaxy tier**: Unlimited manga uses, 100 max pages, fastest cooldowns (work 1h, fish 15m, mine 30m, dungeon 15m), +100% star drop rate, free confession skip CD + VIP, +2 daily bonus stars, exclusive Galaxy badge + rank card theme.
  - Admin commands: `/premium grant`, `/premium revoke`, `/premium lookup` (bot owner only).
  - User commands: `/premium status`, `/premium compare`.
  - Premium expiry cron (10-minute interval) with DM notification on expiry.
  - Redis-cached premium status (5-minute TTL) for performance.
  - Supports flexible duration: 7d, 30d, 90d, 365d, lifetime.
- **Galaxy rank card theme** — exclusive visual for Galaxy tier: gold-to-purple accent stripe, gold/cyan stat accents, golden glow border.
- **Premium badge on rank card** — Star (⭐) or Galaxy (🌌) badge rendered below rank badges.
- **Landing — Star Currency guide** — comprehensive guide covering all star earning methods (daily claim, streaks, star drops, milestones) and spending (manga, global shop).
- **Landing — Premium guide** — tier comparison, pricing (USD + VND), Ko-fi purchase links, after-purchase instructions with support server invite.
- **Landing — Global Shop guide** — item types, purchasing flow, inventory management.
- **Landing — Missing command pages** — added `/premium`, `/global-shop`, `/global-inventory` command pages (EN + VI).
- **Landing — Manga source pages** — added `/hentai2read` and `/simply-hentai` command pages (EN + VI).
- **Landing — Navbar** — added Premium link to navigation.
- **`/help`** — added wallet, global-shop, global-inventory, premium to help categories.

### Fixed

- **LanguageSwitcher** — fixed broken URLs on guide/command detail pages (EN link was generating `/guide/slug` instead of `/en/guide/slug`). Removed duplicate switcher from detail page headers.
- **Manga error message** — replaced misleading `manga.premium_only` with new `manga.load_failed` i18n key for API errors.
- **Canvas rendering** — `drawPremiumBadge` now resets `textBaseline`/`textAlign` to prevent text corruption in subsequent renders.
- **Premium command** — localized hardcoded "Lifetime" string in grant response.

### Changed

- **Manga handler** — free daily uses and max pages now driven by premium tier config instead of hardcoded constants.
- **Cooldowns** — work, fish, mine, dungeon cooldowns now tier-aware. Work/fish use `Math.min(guildConfig, tierConfig)` to respect server settings.
- **Star drops** — drop rate multiplied by premium tier multiplier (1.0×/1.5×/2.0×), capped at 1.0.
- **Confession** — skip cooldown free for Star+, VIP embed free for Galaxy.
- **Wallet daily** — Galaxy tier receives +2 bonus stars per daily claim.
- **Economy guide** — star section simplified with link to dedicated Star guide.
- **Manga guide** — updated from 6 to 8 sources, added star cost section.

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
