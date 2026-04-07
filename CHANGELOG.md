# Changelog

All notable changes to this project are documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

**CI / Discord:** GitHub Actions reads **`package.json` → `version`** and posts the matching **`## [x.y.z]`** block from this file (not `[Unreleased]`). Keep **`package.json` version** in sync with the release section you want announced. See [docs/steering/changelog-ci.md](docs/steering/changelog-ci.md).

## [Unreleased]

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
