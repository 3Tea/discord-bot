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
| `settings language` | Set personal language preference | `locale` (String choice), `reset` (Boolean) |
| `settings server-language` | Set server default language (requires Manage Guild) | `locale` (String choice), `reset` (Boolean) |
| `settings notifications` | Configure welcome/goodbye/boost/milestone notifications (Manage Guild) | `type`, `enabled`, `channel`, etc. |

### Voice Channel Management (`voice`)

Full temporary voice channel system. Users join a trigger channel (prefix `3AT `), bot auto-creates a personal channel (prefix `* `), and the creator becomes the owner.

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
| `rank` | View rank card — level, XP progress, server & global rank, activity stats, premium badge | `user` (User, optional) |
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
| `work` | Work for coins (cooldown: 4h free / 2h Star / 1h Galaxy) | None |
| `fish` | Fish for coins (cooldown: 1h free / 30m Star / 15m Galaxy) | None |
| `gamble` | Gamble coins with risk/reward | `amount` (Number, required) |
| `gift` | Gift coins to another user | `user`, `amount` |
| `rob` | Attempt to steal coins from another user | `user` |
| `shop view` | Browse server shop items (paginated, 5 per page) | None |
| `shop buy` | Purchase a shop item | `item-id` (String, required) |
| `shop add` | Add item to server shop (Admin) | `item-id`, `name`, `description`, `type`, `price`, `currency`, `role?`, `stock?` |
| `shop remove` | Remove item from server shop (Admin) | `item-id` |
| `economy set-coin` | Set user's coin balance (Admin) | `user`, `amount` |
| `economy add-coin` | Add/subtract coins (Admin) | `user`, `amount` |
| `economy set-gem` | Set user's gem balance (Admin) | `user`, `amount` |
| `economy add-gem` | Add/subtract gems (Admin) | `user`, `amount` |

### Global Wallet & Shop

See [global-wallet.md](global-wallet.md) for full wallet documentation.

| Command | Description | Options |
|---------|-------------|---------|
| `wallet view` | Display star balance, streak, milestone progress | None |
| `wallet daily` | Claim daily star reward (once per UTC day) | None |
| `wallet history` | View paginated global transaction log | `page` (Integer, optional) |
| `global-shop view` | Browse global shop items | None |
| `global-shop buy` | Purchase a global shop item with stars | `item-id` (String, required) |
| `global-inventory` | View purchased global shop items | None |

### Premium

See [premium-system.md](premium-system.md) for full documentation.

| Command | Description | Access |
|---------|-------------|--------|
| `premium status` | View your premium tier, expiry, and active benefits | Public (ephemeral) |
| `premium compare` | Side-by-side Free vs Star vs Galaxy benefits table | Public (ephemeral) |
| `premium grant` | Grant/extend/upgrade premium to a user | `DEV_USER_ID` only |
| `premium revoke` | Revoke premium with optional reason | `DEV_USER_ID` only |
| `premium lookup` | Inspect any user's premium status | `DEV_USER_ID` only |

### Mini-Games

| Command | Description | Cooldown | Reference |
|---------|-------------|----------|-----------|
| `mine` | Mining mini-game — minerals, depth, collapse risk | 2h / 1h / 30m (free/Star/Galaxy) | [mine-system.md](mine-system.md) |
| `dungeon` | Dungeon exploration — combat, treasure, traps, merchants | 1h / 30m / 15m (free/Star/Galaxy) | [dungeon-system.md](dungeon-system.md) |

### Moderation

See [moderation.md](moderation.md) for full documentation.

| Command | Description | Permission |
|---------|-------------|-----------|
| `moderation timeout` | Timeout member — mute text and voice (<=28 days) | Moderate Members |
| `moderation untimeout` | Remove an active timeout | Moderate Members |
| `moderation ban` | Ban a member from the server (supports hackban) | Ban Members |
| `moderation kick` | Kick a member from the server | Kick Members |
| `moderation unban` | Unban by user snowflake ID | Ban Members |

### Anonymous Confessions (`confession`)

See [confession-system.md](confession-system.md) for full documentation.

| Command | Description | Options |
|---------|-------------|---------|
| `confession setup` | Configure anonymous confessions per server (**Manage Server**) | `enabled`, `mode` (`instant` \| `review`), `public_channel`, `review_channel`, `cooldown_minutes` (1-120) |
| `confession submit` | Send text + optional image; mode determines flow | `content` (max 3500), `image` (attachment, optional) |
| `confession keywords add` | Add keyword filter (Manage Server) | `keyword` (max 50 chars) |
| `confession keywords remove` | Remove keyword filter (Manage Server) | `keyword` |
| `confession keywords list` | List all keyword filters (Manage Server) | None |
| `confession ban` | Ban a user from confessions (Manage Server) | `confession-number`, `duration` |
| `confession unban` | Unban a user from confessions (Manage Server) | `confession-number` |

**Business rules:**
- **MongoDB**: `GuildConfessionConfig` + `Confession` collections; confession numbers increment per guild via `lastConfessionNumber`.
- **Cooldown**: Redis key `confession:cd:{guildId}:{userId}`, TTL = configured minutes x 60 seconds.
- **Premium**: Star+ users skip cooldown cost free; Galaxy users get VIP status free.
- **Moderation buttons** (review mode): `confession_approve` / `confession_reject` with `customId` `prefix:<mongoId>`; `interactionCreateButton.ts` resolves handlers by **prefix** before the first `:`.
- **Permissions**: `setup` — **Manage Guild** (checked in handler); Approve/Reject — **Manage Messages**.

### Manga Commands (NSFW)

11 sources sharing the same handler (`src/util/manga/handler.ts`). All require NSFW channel. Free uses and max pages are premium-tier dependent (see [premium-system.md](premium-system.md)).

| Command | Source | Has `random` |
|---------|--------|-------------|
| `nhentai` | nhentai.net | Yes |
| `3hentai` | 3hentai.net | Yes |
| `asmhentai` | asmhentai.com | Yes |
| `hentaifox` | hentaifox.com | Yes |
| `nhentai-lite` | nhentai.to | Yes |
| `pururin` | pururin.to | Yes |
| `simply-hentai` | simply-hentai.org | No (`read` only) |
| `hentai2read` | hentai2read.com | No (`read` only) |

Each command has up to two subcommands:
- `read` — Read by ID (Integer, required)
- `random` — Get random manga (if source supports it)

**Business rules:**
- **NSFW guard**: Channel must be NSFW, else ephemeral error
- **External API**: Calls `SERVER_HD` backend (`/{source}/random` or `/{source}/get?book={id}`)
- **Redis cache**: Images cached 10 min (key: `manga_read_{id}`)
- **Star charge gate**: Free uses per day from premium tier config (3/10/unlimited), then 1 star per use
- **Page limit**: Tier-dependent (35/70/100 pages). Over limit -> "Read Online" only
- **Button auto-removal**: 20 seconds after display

### Dev-Only

| Command | Description | Access |
|---------|-------------|--------|
| `commandlog stats` | Command usage analytics for a time period | `DEV_USER_ID` + `GUILD_ID` |
| `commandlog user` | Command history for a specific user | `DEV_USER_ID` + `GUILD_ID` |
| `commandlog command` | Usage history for a specific command | `DEV_USER_ID` + `GUILD_ID` |

See [command-logging.md](command-logging.md) for full documentation.

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

### Dungeon System Buttons

All validate the user matches the dungeon run owner.

| Button ID | Action |
|-----------|--------|
| `dungeon_attack` | Attack monster (combat encounter) |
| `dungeon_defend` | Defend against monster (reduces incoming damage) |
| `dungeon_heal` | Heal during combat (costs coins) |
| `dungeon_run` | Start a new dungeon run |
| `dungeon_continue` | Continue to next encounter |
| `dungeon_leave` | Leave dungeon, bank rewards, set cooldown |
| `dungeon_buff` | Purchase buff from NPC merchant |
| `dungeon_exchange` | Exchange gems at NPC merchant |

### Confession Buttons

| Button ID | Action |
|-----------|--------|
| `confession_approve` | Approve pending confession; posts to public channel (`customId`: `confession_approve:<Confession _id>`) |
| `confession_reject` | Reject pending confession (`customId`: `confession_reject:<Confession _id>`) |
| `confession_upvote` | Upvote a confession (toggle) |
| `confession_downvote` | Downvote a confession (toggle) |
| `confession_reply` | Open reply modal for anonymous reply |

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

## Events

| Event | File | Purpose |
|-------|------|---------|
| `ClientReady` | `ready.ts` | Log guild/user count, set "Watching" presence with version + uptime |
| `InteractionCreate` | `interactionCreate.ts` | Route slash commands to handlers, log command usage |
| `InteractionCreate` | `interactionCreateButton.ts` | Route button clicks to handlers |
| `InteractionCreate` | `interactionCreateSelectMenu.ts` | Route user select menus to handlers |
| `InteractionCreate` | `interactionCreateModal.ts` | Handle modal submissions (voice rename + limit) |
| `VoiceStateUpdate` | `voiceStateUpdate.ts` | Auto-create temp channels, track voice XP, auto-delete on leave |
| `MessageCreate` | `messageCreate.ts` | Award message XP (anti-spam, cooldown, level-up detection) |
| `MessageReactionAdd` | `messageReactionAdd.ts` | Award reaction XP (30s cooldown per user per guild) |
| `GuildMemberAdd` | `guildMemberAdd.ts` | Send welcome notification, check member-count milestones |
| `GuildMemberRemove` | `guildMemberRemove.ts` | Send goodbye notification |
| `GuildMemberUpdate` | `guildMemberUpdate.ts` | Detect new server boosts, send boost notification |

### Voice State Update Details

- **Join trigger channel** (prefix `3AT `): Creates temp channel with `* ` prefix, inherits bitrate, 23 user limit, owner stored in Redis, sends control panel
- **Leave temp channel** (prefix `* `): Deletes channel if empty/bots-only, cleans up Redis keys
- **Voice XP sessions**: Tracked in Redis set `voice_xp_sessions`, checked every 60s, requires 2+ non-bot members (or 1+ with bot present) and not server-deafened

### Message Create Details

- Validates: guild context, non-bot author, no webhooks, config enabled, channel not blacklisted
- Anti-spam: message hash dedup (MD5), 60s cooldown, minimum 3 characters
- Awards 15-25 XP (base 20, variance +/-5), increments messageCount
- Syncs to period snapshots and guild stats
- Triggers level-up detection

### Message Reaction Add Details

- Validates: guild context, non-bot, config enabled, channel not blacklisted, not own message
- Cooldown: 30s per user per guild (Redis key `reaction_xp:guildId:userId`)
- Awards configurable XP (default 3), increments reactionCount
- Syncs to period snapshots and guild stats
- Triggers level-up detection

## i18n (Multi-Language)

All user-facing strings are translated via i18next. Supported languages: English (`en`, fallback), Vietnamese (`vi`), Indonesian (`id`), Spanish (`es`), Japanese (`ja`), Chinese (`zh`), Korean (`ko`), Portuguese Brazil (`pt-BR`), French (`fr`), German (`de`), Russian (`ru`), Turkish (`tr`), Italian (`it`), Polish (`pl`), Dutch (`nl`) — **15 total**.

**Locale resolution**: per-user > per-guild > Discord client locale > `"en"` fallback.

**Settings**: Users set language via `/settings language`, guild admins via `/settings server-language` (requires Manage Guild). Preferences cached in Redis (30-day TTL).

**Translation files**: `src/locales/{locale}.json` for all 15 locales. All commands, button labels, error messages, embed titles/fields, voice panel, weather descriptions, XP/economy messages, premium messages, and manga handler use `t(locale, "key")`.

**What is NOT translated**: Command names, option names, internal logs.
