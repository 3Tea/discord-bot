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
| `weather` | Weather info via MSN Weather API (vi-VN, Celsius) | `location` (String, required, max 200) |

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
- **Redis cache**: Images cached 10 min (key: `mangaRead_{id}`)
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

### Manga

| Button ID | Action |
|-----------|--------|
| `mangaRead` | Paginated manga reader (images from Redis cache) |

## Events

| Event | File | Purpose |
|-------|------|---------|
| `ClientReady` | `ready.ts` | Log guild/user count, set "Watching" presence with version + uptime |
| `InteractionCreate` | `interactionCreate.ts` | Route slash commands to handlers |
| `InteractionCreate` | `interactionCreateButton.ts` | Route button clicks to handlers |
| `InteractionCreate` | `interactionCreateSelectMenu.ts` | Route user select menus to handlers |
| `InteractionCreate` | `interactionCreateModal.ts` | Handle modal submissions (voice rename + limit) |
| `VoiceStateUpdate` | `voiceStateUpdate.ts` | Auto-create temp channels on join trigger, auto-delete on leave |

### Voice State Update Details

- **Join trigger channel** (prefix `TEST `): Creates temp channel with `* ` prefix, inherits bitrate, 23 user limit, owner stored in Redis, sends control panel
- **Leave temp channel** (prefix `* `): Deletes channel if empty/bots-only, cleans up Redis keys
