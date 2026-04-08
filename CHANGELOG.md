# Changelog

All notable changes to this project are documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

**CI / Discord:** GitHub Actions reads **`package.json` → `version`** and posts the matching **`## [x.y.z]`** block from this file (not `[Unreleased]`). Keep **`package.json` version** in sync with the release section you want announced. See [docs/steering/changelog-ci.md](docs/steering/changelog-ci.md).

## [Unreleased]

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
