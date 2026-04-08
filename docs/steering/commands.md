# Commands & Features Reference

> Steering doc for AI assistants and contributors. Lists all commands, buttons, events with business rules and constraints.

## Slash Commands

### General

| Command | Description | Options |
|---------|-------------|---------|
| `ping` | Bot latency check | None |
| `help` | List all commands + link buttons (Homepage, Discussions, Report Bug) | None |
| `info bot` | Bot metadata (version, Node.js, guild count) + link buttons | Subcommand: `bot` |
| `avatar` | Show user avatar (PNG, 2048px) | `target` (User, optional) |
| `trans` | Translate any language to Vietnamese via Google Translate API | `word` (String, required) |
| `weather` | Weather info via Open-Meteo API (locale-aware) | `location` (String, required, max 200) |

### Settings

| Command | Description | Options |
|---------|-------------|---------|
| `settings language` | Set personal language preference (en/vi/id/es/ja/zh/ko) | `locale` (String choice), `reset` (Boolean) |
| `settings server-language` | Set server default language (requires Manage Guild) | `locale` (String choice), `reset` (Boolean) |

### Voice Channel Management (`voice`)

Full temporary voice channel system. Users join a trigger channel (prefix `TEST `), bot auto-creates a personal channel (prefix `* `), and the creator becomes the owner.

| Subcommand | Description | Cooldown |
|------------|-------------|----------|
| `limit` | Set user limit (0-99) | 120s |
| `name` | Rename channel (max 50 chars) | 120s |
| `lock` | Deny @everyone Connect | 5s |
| `unlock` | Reset @everyone Connect | 5s |
| `hide` | Deny @everyone Connect + ViewChannel | 5s |
| `permit` | Allow specific user to join | 5s |
| `block` | Block user + disconnect if present | 5s |
| `kick` | Kick user (with optional block via confirmation buttons) | 5s |
| `transfer` | Transfer channel ownership (clears permit/block lists) | 5s |

**Business rules:**
- All actions require caller to be the channel owner (validated via Redis)
- All responses are ephemeral
- Self-actions (permit/block/kick/transfer yourself) are rejected
- Channel auto-deletes when empty or only bots remain
- Redis TTL: 12 hours for all voice state data

**Redis key patterns:**
- `{channelId}` -> owner userId
- `state:{channelId}` -> `locked` | `unlocked` | `hidden`
- `permitted:{channelId}` -> user ID array
- `blocked:{channelId}` -> user ID array
- `kick_target:{userId}:{channelId}` -> target userId (30s TTL)
- `cd:{action}:{channelId}` -> cooldown marker

### XP & Leveling

See [xp-system.md](xp-system.md) for full system documentation.

| Command | Description | Options |
|---------|-------------|---------|
| `rank` | View rank card — level, XP progress, server & global rank, activity stats | `user` (User, optional) |
| `leaderboard` | Paginated XP leaderboard with period filtering and mode selection | `mode` (server/global/servers) |
| `server-rank` | View server's total XP, ranking among all servers, activity breakdown | None |
| `xp set` | Set user's XP to exact amount (Admin, requires Manage Guild) | `user`, `amount` |
| `xp add` | Add XP to user (Admin) | `user`, `amount` |
| `xp remove` | Remove XP from user (Admin) | `user`, `amount` |
| `xp channel-blacklist add` | Blacklist channel from XP gains (Admin) | `channel` |
| `xp channel-blacklist remove` | Remove channel from blacklist (Admin) | `channel` |

### Economy

See [economy-system.md](economy-system.md) for full system documentation.

| Command | Description | Options |
|---------|-------------|---------|
| `balance` | View coin/gem balance, pray streak, last activity | `user` (User, optional) |
| `pray` | Daily prayer for coins — streak bonuses at 3/7/14/30 days | `target` (User, optional) |
| `curse` | Daily curse for coins (lower rewards, no streak/gems) | `target` (User, optional) |
| `shop view` | Browse server shop items (paginated, 5 per page) | None |
| `shop buy` | Purchase a shop item | `item-id` (String, required) |
| `shop add` | Add item to server shop (Admin) | `item-id`, `name`, `description`, `type`, `price`, `currency`, `role?`, `stock?` |
| `shop remove` | Remove item from server shop (Admin) | `item-id` |
| `economy set-coin` | Set user's coin balance (Admin) | `user`, `amount` |
| `economy add-coin` | Add/subtract coins (Admin) | `user`, `amount` |
| `economy set-gem` | Set user's gem balance (Admin) | `user`, `amount` |
| `economy add-gem` | Add/subtract gems (Admin) | `user`, `amount` |
| `moderation timeout` | Timeout member — mute text and voice (≤28 days) | `user`, `duration`, `unit`, `reason?` |
| `moderation untimeout` | Remove an active timeout | `user` |
| `moderation ban` | Ban a member from the server | `user`, `reason?`, `delete_messages?` |
| `moderation kick` | Kick a member from the server (not banned) | `user`, `reason?` |
| `moderation unban` | Unban by user snowflake ID | `user_id`, `reason?` |

### Anonymous confessions (`confession`)

| Command | Description | Options |
|---------|-------------|---------|
| `confession setup` | Configure anonymous confessions per server (**Manage Server**) | `enabled`, `mode` (`instant` \| `review`), `public_channel`, `review_channel` (required if `review`), `cooldown_minutes` (1–120, optional; default 10) |
| `confession submit` | Send text + optional one image; **instant** posts anonymously to `public_channel`; **review** posts to `review_channel` for mods (author visible to mods only) | `content` (max 3500), `image` (attachment, optional) |

**Business rules:**
- **MongoDB**: `GuildConfessionConfig` + `Confession` collections; confession numbers increment per guild via `lastConfessionNumber`.
- **Cooldown**: Redis key `confession:cd:{guildId}:{userId}`, TTL = configured minutes × 60 seconds.
- **Moderation buttons** (review mode): `confession_approve` / `confession_reject` with `customId` `prefix:<mongoId>`; `interactionCreateButton.ts` resolves handlers by **prefix** before the first `:`.
- **Permissions**: `setup` — **Manage Guild** (checked in handler); Approve/Reject — **Manage Messages**.

### Manga Commands (NSFW)

Six sources sharing the same handler (`src/util/manga/handler.ts`). All require NSFW channel.

| Command | Source | Unique metadata fields |
|---------|--------|----------------------|
| `nhentai` | nhentai.net | Title (EN/JP/Pretty), Language, Artist, Group, Parodies, Characters, Last updated |
| `3hentai` | 3hentai.net | Title, Tags, Upload date |
| `asmhentai` | asmhentai.com | Title, Tags, Upload date |
| `hentaifox` | hentaifox.com | Title, Tags, Upload date |
| `nhentai-lite` | nhentai.to | Title, Tags |
| `pururin` | pururin.to | Title, Tags |

Each command has two subcommands:
- `read` — Read by ID (Integer, required)
- `random` — Get random manga

**Business rules:**
- **NSFW guard**: Channel must be NSFW, else ephemeral error
- **External API**: Calls `SERVER_HD` backend (`/{source}/random` or `/{source}/get?book={id}`)
- **Redis cache**: Images cached 10 min (key: `manga_read_{id}`)
- **Page limit**: Max 50 pages for in-Discord reading. Over 50 -> "Read Online" only
- **Button auto-removal**: 20 seconds after display

## Button Handlers

### Voice Control Panel Buttons

Displayed in the voice channel control panel. All validate channel ownership.

| Button ID | Action | Shows UI |
|-----------|--------|----------|
| `VOICE_PERMIT` | Select user to permit | User select menu |
| `VOICE_BLOCK` | Select user to block | User select menu |
| `VOICE_KICK` | Select user to kick | User select menu |
| `VOICE_TRANSFER` | Select user to transfer ownership | User select menu |
| `VOICE_LOCK` | Lock channel | Auto-delete confirmation (5s) |
| `VOICE_UNLOCK` | Unlock channel | Auto-delete confirmation (5s) |
| `VOICE_HIDE` | Hide channel | Auto-delete confirmation (5s) |
| `VOICE_LIMIT` | Set user limit | Modal (max 2 chars) |
| `VOICE_RENAME` | Rename channel | Modal (max 50 chars) |

### Voice Select Menu Results

| Button ID | Action | Notes |
|-----------|--------|-------|
| `VOICE_SELECT_PERMIT` | Grant access | Removes from blocked list if present |
| `VOICE_SELECT_BLOCK` | Deny access + disconnect | Removes from permitted list if present |
| `VOICE_SELECT_KICK` | Store kick target | Shows Kick / Kick & Block confirmation buttons |
| `VOICE_SELECT_TRANSFER` | Transfer ownership | Clears all permit/block lists |

### Kick Confirmation

| Button ID | Action |
|-----------|--------|
| `VOICE_KICK_ONLY` | Kick without blocking |
| `VOICE_KICK_BLOCK` | Kick and block |

### Leaderboard Buttons

| Button ID | Action |
|-----------|--------|
| `lb_period_all` | Show all-time leaderboard |
| `lb_period_daily` | Filter by current day |
| `lb_period_weekly` | Filter by current ISO week |
| `lb_period_monthly` | Filter by current month |
| `lb_period_yearly` | Filter by current year |
| Prev / Next | Page navigation (10 entries/page, max 100 results) |

Leaderboard buttons auto-disable after 60s idle timeout.

### Manga

| Button ID | Action |
|-----------|--------|
| `manga_read` | Paginated manga reader (images from Redis cache) |

### Confession (review mode)

| Button ID | Action |
|-----------|--------|
| `confession_approve` | Approve pending confession; posts anonymous copy to public channel (`customId`: `confession_approve:<Confession _id>`) |
| `confession_reject` | Reject pending confession (`customId`: `confession_reject:<Confession _id>`) |

## Events

| Event | File | Purpose |
|-------|------|---------|
| `ClientReady` | `ready.ts` | Log guild/user count, set "Watching" presence with version + uptime |
| `InteractionCreate` | `interactionCreate.ts` | Route slash commands to handlers |
| `InteractionCreate` | `interactionCreateButton.ts` | Route button clicks to handlers |
| `InteractionCreate` | `interactionCreateSelectMenu.ts` | Route user select menus to handlers |
| `InteractionCreate` | `interactionCreateModal.ts` | Handle modal submissions (voice rename + limit) |
| `VoiceStateUpdate` | `voiceStateUpdate.ts` | Auto-create temp channels, track voice XP, auto-delete on leave |
| `MessageCreate` | `messageCreate.ts` | Award message XP (anti-spam, cooldown, level-up detection) |
| `MessageReactionAdd` | `messageReactionAdd.ts` | Award reaction XP (30s cooldown per user per guild) |

### Voice State Update Details

- **Join trigger channel** (prefix `TEST `): Creates temp channel with `* ` prefix, inherits bitrate, 23 user limit, owner stored in Redis, sends control panel
- **Leave temp channel** (prefix `* `): Deletes channel if empty/bots-only, cleans up Redis keys
- **Voice XP sessions**: Tracked in Redis set `voice_xp_sessions`, checked every 60s, requires 2+ non-bot members and not server-deafened

### Message Create Details

- Validates: guild context, non-bot author, no webhooks, config enabled, channel not blacklisted
- Anti-spam: message hash dedup (MD5), 60s cooldown, minimum 3 characters
- Awards 15-25 XP (base 20, variance ±5), increments messageCount
- Syncs to period snapshots and guild stats
- Triggers level-up detection

### Message Reaction Add Details

- Validates: guild context, non-bot, config enabled, channel not blacklisted, not own message
- Cooldown: 30s per user per guild (Redis key `reaction_xp:guildId:userId`)
- Awards configurable XP (default 3), increments reactionCount
- Syncs to period snapshots and guild stats
- Triggers level-up detection

## i18n (Multi-Language)

All user-facing strings are translated via i18next. Supported languages: English (`en`, fallback), Vietnamese (`vi`), Indonesian (`id`), Spanish (`es`), Japanese (`ja`), Chinese (`zh`), Korean (`ko`).

**Locale resolution**: per-user > per-guild > Discord client locale > `"en"` fallback.

**Settings**: Users set language via `/settings language`, guild admins via `/settings server-language` (requires Manage Guild). Preferences cached in Redis (30-day TTL).

**Translation files**: `src/locales/{en,vi,id,es,ja,zh,ko}.json`. All commands, button labels, error messages, embed titles/fields, voice panel, weather descriptions, XP/economy messages, and manga handler use `t(locale, "key")`.

**What is NOT translated**: Command names, option names, internal logs.
