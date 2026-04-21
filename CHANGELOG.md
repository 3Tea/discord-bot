# Changelog

All notable changes to this project are documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

**CI / Discord:** GitHub Actions reads **`package.json` → `version`** and posts the matching **`## [x.y.z]`** block from this file (not `[Unreleased]`). Keep **`package.json` version** in sync with the release section you want announced. See [docs/steering/changelog-ci.md](docs/steering/changelog-ci.md).

## [Unreleased]

### Changed

- **Upgrade Mongoose from v8 to v9** — bump `mongoose` to `^9.5.0`, migrate all 36 model files from `extends Document` to `HydratedDocument<T>` pattern with exported `<Name>Doc` type aliases, adopt `QueryFilter` / `UpdateQuery` typing across services and utilities, replace deprecated `new: true` option with `returnDocument: "after"` (48 occurrences). No database schema change — all modifications are application-layer.
- **Economy cooldowns no longer admin-configurable** — work/fish cooldowns now determined by premium tier; gamble (30s) and rob (6h + 2h immunity) are fixed constants. Prevents premium value erosion and economy imbalance.

### Fixed

- **Dungeon combat race** — added per-user Redis mutex (`setKeyNX` on `dungeon_lock:{userId}`) around attack/skill/ultimate/defend/run/heal buttons so rapid-fire clicks can no longer double-spend MP or claim duplicate rewards. Silent defer on lock contention; ephemeral permission reply when a different user clicks your dungeon buttons.
- **Dungeon timer leaks** — tracked `setTimeout` handles in `Map<userId, NodeJS.Timeout>` registries with `cancelCombatTimeout` / `cancelMerchantTimeout` helpers called on win/loss/run/leave/continue/heal, preventing handle accumulation and stale interaction references in the event loop. Added `MERCHANT_TIMEOUT_MS` to mirror `COMBAT_TIMEOUT_MS`.
- **Dungeon merchant heal** — HP-full check now runs before the merchant state is deleted (eliminating the race-prone delete-then-reinsert pattern) and uses live `runState.hp` instead of the stale merchant snapshot for both the guard and `MerchantService.calculateHeal`.
- **RPG combat state consistency** — removed Redis read-modify-write race windows in PvP/team-dungeon action submission and ensured team-dungeon party cleanup always runs even if one member cooldown write fails.

### Added

- **Achievement system** — 50 achievements across 10 categories (economy, XP, mining, dungeon, social, gambling, voice, activity, quests, stars) with tiered rewards (coin, gem, star). `/achievements` command with paginated category display. Integrated into `/profile` card. Config-driven — new achievements can be added without code changes.
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
- **Gamble replay buttons** — Play Again, game-switch dropdown, Change Bet modal for `/gamble`. 30s collector with owner-only enforcement.
- **Premium upgrade button** — ⭐ Upgrade Premium link button at all premium gates (manga, confession audio, cooldown hints, `/premium status` and `compare`).
- **RPG character system** — `/adventure` command with character creation (6 classes), stat system (HP/STR/DEF/MAG/MAG_DEF/SPD), equipment (6 slots × 6 rarities), Gold global currency, leveling from dungeon + message XP.
- **RPG dungeon rework** — Dungeon converted to global RPG system: stat-based combat, class skills (2 per class), MP system (50 + level×5), boss encounters every 5 floors, Gold/EXP/material/equipment/crate rewards. Team dungeon supports 2-4 player co-op.
- **Equipment crafting & gacha** — `/adventure craft` (materials → equipment), `/adventure crate` (open crates), `/adventure shop` (buy crates with Gold). 6 material tiers, class-weighted drop tables.
- **Adventurer Guild** — `/guild` command: registration, 10 ranks (F→Legendary), daily board quests (3 shared) + personal quests (2 per user), 12 quest action types with fire-and-forget tracking, guild ranking leaderboard.
- **Branch guilds** — `/guild-admin setup/config/disband` for per-server branches. Weekly cooperative quests (3/week, scaled by server size). Monthly competitive events (6 rotating themes, per-capita scoring, top 3 rewards).
- **Class advancement** — `/adventure advance` at level 20: 12 advanced classes (2 paths per base class), ultimate skills (1 per combat, 50 MP), stat percentage bonuses.
- **PvP system** — `/pvp challenge @user` with simultaneous turn combat. Both players choose actions privately, reveal simultaneously. Elo rating (starting 1000), win/loss tracking.
- **Adventure — Create Character button** — the no-character response on all `/adventure` subcommands now includes a "🗡️ Create Character" button that opens the class-selection flow directly. Handled by a new persistent button (`adventure_create:<userId>`) so the button stays clickable even after chat scroll; cross-user clicks are routed to an ephemeral hint instead of hijacking the original message.
- **Adventure — `/adventure dev-reset`** — developer-only subcommand (gated by `DEV_USER_ID + GUILD_ID`, same pattern as `/audit`) that wipes the caller's RPG state: character, equipment inventory, guild memberships, and PvP/per-user Redis match keys. Confirm/cancel gate (30s), partial-failure-tolerant cleanup, fire-and-forget audit log.

## [5.7.0] - 2026-04-17

### Added

- **Audit system** — dev-only runtime observability: `/audit setup` configures two Discord text channels (critical events + all commands) with permission checks, `/audit query guilds|guild|history|summary` for Mongo-backed lookups, and a 24h cron that snapshots per-guild member counts.
- **Guild lifecycle tracking** — `guildCreate` / `guildDelete` events persist to `GuildAudit` collection and post embeds to the critical channel. `ready` reconciles guilds (marks bot-left guilds) and posts a startup summary.
- **Background error forwarding** — `premiumExpiry`, `guildStatsAggregator`, and `CommandLogService.flush` now emit errors to the audit critical channel.

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
