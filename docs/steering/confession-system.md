# Confession System

> Steering doc for AI assistants and contributors. Covers anonymous confessions — submission flow, moderation review, economy integration, community voting, anonymous replies, and keyword filtering.

## Overview

Each server can enable an anonymous confession system. Members submit confessions via `/confession submit`, which are posted to a configured public channel with no author attribution. Servers choose between **instant** mode (posts immediately) or **review** mode (moderators approve/reject before publishing). Published confessions support community upvote/downvote and anonymous threaded replies. Economy integration allows VIP golden embeds (gems) and cooldown skipping (coins). Moderators can ban users from confessing and maintain a keyword blacklist.

## Commands (`/confession`)

All subcommands are guild-only. Setup and filter commands require `ManageGuild`. Ban/unban require `ManageGuild` or `ManageMessages`.

| Subcommand | Permission | Description |
|------------|-----------|-------------|
| `setup` | ManageGuild | Configure enabled state, mode (instant/review), public channel, review channel, cooldown |
| `submit` | None | Submit an anonymous confession with optional image, VIP flag, skip-cooldown flag, and tag |
| `ban` | ManageGuild / ManageMessages | Ban a user from confessions (temp or permanent) |
| `unban` | ManageGuild / ManageMessages | Remove a confession ban |
| `filter-add` | ManageGuild | Add a keyword to the confession blacklist (max 50 keywords, max 50 chars each) |
| `filter-remove` | ManageGuild | Remove a keyword from the blacklist |
| `filter-list` | ManageGuild | View all blocked keywords |

### `setup` Options

| Option | Type | Required | Constraints |
|--------|------|----------|-------------|
| `enabled` | Boolean | Yes | Toggle confessions on/off |
| `mode` | String choice | Yes | `instant` or `review` |
| `public_channel` | Text/Announcement channel | Yes | Where published confessions appear |
| `review_channel` | Text/Announcement channel | No | Required when mode is `review` |
| `cooldown_minutes` | Integer | No | 1-120, default 10 |

### `submit` Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `content` | String | Yes | Confession text (max 3500 chars) |
| `image` | Attachment | No | Single image; validated by content-type prefix `image/` |
| `vip` | Boolean | No | Golden embed, costs 5 gems |
| `skip_cooldown` | Boolean | No | Skip active cooldown, costs 50 coins |
| `tag` | String choice | No | Category tag (see Tags section) |

## Submit Flow

Submission always defers the reply (ephemeral). Validation runs in this order:

1. Guild-only check
2. Config exists and `enabled = true`
3. Review mode has a `reviewChannelId` configured
4. Ban check (`ConfessionBan` with `active: true`, auto-expires if `expiresAt` is past)
5. Keyword filter (case-insensitive substring match against `blockedKeywords`)
6. Cooldown check (Redis TTL); if on cooldown and `skip_cooldown` not set, reject with remaining seconds
7. Economy deductions (skip-cooldown coins first, then VIP gems)
8. Reserve next confession number (atomic `$inc` on `lastConfessionNumber`)

If any economy deduction fails partway through, all prior deductions are refunded. If the send or DB save fails after deductions, a full refund is issued.

### Instant Mode

1. Fetch public channel from config
2. Create `Confession` record with `status: "published"`, `publicMessageId: "pending"`
3. Send embed + interaction buttons (upvote/downvote/reply) to public channel
4. Update record with real `publicMessageId`
5. Set cooldown in Redis
6. Reply ephemeral success to submitter

### Review Mode

1. Create `Confession` record with `status: "pending"`
2. Build review embed (shows author ID to moderators, content preview, VIP badge if applicable)
3. Send review embed + approve/reject buttons to review channel
4. Store `reviewMessageId` on the confession record
5. Set cooldown in Redis
6. Reply ephemeral success to submitter

On approval, the confession is published to the public channel with interaction buttons. On rejection, status is set to `"rejected"`. In both cases the review message is edited to show the resolved state and buttons are removed.

## Economy Integration

All economy operations use `CurrencyService` from the economy system. See [economy-system.md](economy-system.md) for currency details.

| Feature | Currency | Cost | Transaction Type | Metadata |
|---------|----------|------|-----------------|----------|
| VIP confession (golden embed) | Gem | 5 | `confession_vip` | `{ action: "vip_confession" }` |
| Skip cooldown | Coin | 50 | `confession_skip_cd` | `{ action: "skip_cooldown" }` |
| Anonymous reply (2nd+ per confession) | Coin | 5 | `confession_reply` | `{ confessionNumber }` |

**Refund logic**: If VIP gem deduction fails after a successful cooldown-skip coin deduction, the coins are refunded with transaction type `confession_refund`. The same applies if the confession number reservation or channel send fails after any deduction.

## Voting System

Published confessions display upvote and downvote buttons. Votes are tracked per user per confession in `ConfessionVote`.

| Action | Behavior |
|--------|----------|
| Click same vote type as existing vote | **Toggle off** — removes the vote, decrements count |
| Click opposite vote type | **Switch** — changes vote direction, adjusts both counters |
| No existing vote | **New vote** — creates record, increments count |
| Vote on own confession | **Blocked** — ephemeral error, `authorId === userId` check |

After each vote action, the message buttons are re-rendered with updated counts via `interaction.message.edit()`. Vote buttons use `deferUpdate()` (no visible response to the user).

## Reply System

Published confessions include a Reply button that opens a modal for anonymous replies.

### Flow

1. User clicks Reply button on a published confession
2. Modal appears with a text input (max 1500 chars, 5-minute timeout via `awaitModalSubmit`)
3. On submit, check if the user has existing replies on this confession
4. **First reply per user per confession**: free. **Second and subsequent**: costs 5 coins (atomic deduct via `CurrencyService`)
5. Increment `replyCount` on the confession record
6. If no thread exists on the public message, create one (`autoArchiveDuration: 1440` = 24 hours)
7. Store `threadId` on the confession record for reuse
8. Send an anonymous embed to the thread with footer `Anonymous Reply #N`
9. Create `ConfessionReply` record

Threads are created on-demand from the public message. If a previously created thread is no longer fetchable, a new one is created.

## Moderation

### Review Workflow

In review mode, moderators see confession content and author identity in the review channel. Two buttons are attached:

- **Approve** (`ManageMessages` required): Publishes to public channel, updates status to `"published"`, replaces review message with green resolved embed
- **Reject** (`ManageMessages` required): Updates status to `"rejected"`, replaces review message with red resolved embed

Both buttons extract the confession MongoDB `_id` from `customId` (format: `confession_approve:<mongoId>`). Attempting to resolve an already-resolved confession returns `not_pending`.

### Confession Bans

Moderators can ban users from submitting confessions. Bans are per-guild.

| Duration option | Value |
|----------------|-------|
| 1 hour | `1h` |
| 6 hours | `6h` |
| 1 day | `1d` |
| 7 days | `7d` |
| 30 days | `30d` |
| Permanent | No duration selected |

**Ban check on submit**: Queries `ConfessionBan` for `active: true`. If `expiresAt` is in the past, the ban is auto-deactivated (`active = false`) and the user proceeds. Creating a new ban deactivates all prior active bans for that user in the guild first.

### Keyword Filter

Server admins maintain a blacklist of keywords (stored in `GuildConfessionConfig.blockedKeywords`). On submission, the confession content is lowercased and checked for substring matches against all blocked keywords.

| Constraint | Value |
|-----------|-------|
| Max keywords per guild | 50 |
| Max keyword length | 50 characters |
| Normalization | `toLowerCase().trim()` |
| Match type | Case-insensitive substring (`content.toLowerCase().includes(keyword)`) |

## Tags

Confessions can be categorized with one of 5 tags. Tags are optional and appear as a label line above the confession content in the embed.

| Tag | Display |
|-----|---------|
| `heartfelt` | Heartfelt |
| `funny` | Funny |
| `question` | Question |
| `sharing` | Sharing |
| `other` | Other |

Tags are stored on the `Confession` record and rendered in both public and review embeds.

## Button Handlers

All buttons extract the confession MongoDB `_id` from `customId` after the colon separator.

| Button ID | File | Permission | Behavior |
|-----------|------|-----------|----------|
| `confession_approve` | `confessionApprove.button.ts` | ManageMessages | Approve pending confession, publish to public channel |
| `confession_reject` | `confessionReject.button.ts` | ManageMessages | Reject pending confession |
| `confession_upvote` | `confessionUpvote.button.ts` | None | Toggle/switch upvote on published confession |
| `confession_downvote` | `confessionDownvote.button.ts` | None | Toggle/switch downvote on published confession |
| `confession_reply` | `confessionReply.button.ts` | None | Open reply modal, handle submission with thread creation |

Additionally, `confession_reply_modal` is registered as a modal ID for the reply text input.

## Data Models

### Confession

Collection: `Confessions`

| Field | Type | Default |
|-------|------|---------|
| `guildId` | String | required |
| `number` | Number | required |
| `authorId` | String | required |
| `content` | String | required |
| `image` | `{ url, name, contentType }` / null | null |
| `isVip` | Boolean | false |
| `upvotes` | Number | 0 |
| `downvotes` | Number | 0 |
| `threadId` | String / null | null |
| `replyCount` | Number | 0 |
| `tag` | String / null | null |
| `status` | Enum: `pending`, `published`, `rejected` | required |
| `reviewMessageId` | String / null | null |
| `publicMessageId` | String / null | null |
| `resolvedAt` | Date / null | null |

**Indexes**: Unique `(guildId, number)`, `(guildId, status)`, `guildId`, `status`.

### GuildConfessionConfig

Collection: `GuildConfessionConfigs`

| Field | Type | Default |
|-------|------|---------|
| `guildId` | String | required, unique |
| `enabled` | Boolean | false |
| `mode` | Enum: `instant`, `review` | `instant` |
| `publicChannelId` | String | required |
| `reviewChannelId` | String / null | null |
| `cooldownMinutes` | Number | 10 (min 1, max 120) |
| `lastConfessionNumber` | Number | 0 |
| `blockedKeywords` | String[] | [] |

**Indexes**: Unique `guildId`.

### ConfessionVote

Collection: `ConfessionVotes`

| Field | Type | Default |
|-------|------|---------|
| `confessionId` | ObjectId (ref Confession) | required |
| `guildId` | String | required |
| `userId` | String | required |
| `vote` | Enum: `up`, `down` | required |

**Indexes**: Unique `(confessionId, userId)`.

### ConfessionReply

Collection: `ConfessionReplies`

| Field | Type | Default |
|-------|------|---------|
| `confessionId` | ObjectId (ref Confession) | required |
| `guildId` | String | required |
| `authorId` | String | required |
| `replyNumber` | Number | required |
| `content` | String | required |
| `messageId` | String | required |

**Indexes**: Unique `(confessionId, replyNumber)`, `(confessionId, authorId)`.

### ConfessionBan

Collection: `ConfessionBans`

| Field | Type | Default |
|-------|------|---------|
| `guildId` | String | required |
| `userId` | String | required |
| `moderatorId` | String | required |
| `reason` | String / null | null |
| `expiresAt` | Date / null | null (permanent) |
| `active` | Boolean | true |

**Indexes**: `(guildId, userId, active)`.

## Constants

Defined in `src/services/confession/constants.ts`:

| Constant | Value | Description |
|----------|-------|-------------|
| `CONFESSION_CONTENT_MAX` | 3500 | Max confession text length |
| `CONFESSION_COOLDOWN_MIN` | 1 | Minimum cooldown in minutes |
| `CONFESSION_COOLDOWN_MAX` | 120 | Maximum cooldown in minutes |
| `CONFESSION_COOLDOWN_DEFAULT` | 10 | Default cooldown in minutes |
| `CONFESSION_VIP_COST_GEM` | 5 | Gem cost for VIP confession |
| `CONFESSION_SKIP_CD_COST_COIN` | 50 | Coin cost to skip cooldown |
| `CONFESSION_REPLY_COST_COIN` | 5 | Coin cost for 2nd+ reply |
| `CONFESSION_REPLY_MAX_LENGTH` | 1500 | Max reply text length |
| `CONFESSION_KEYWORD_MAX_LENGTH` | 50 | Max chars per blocked keyword |
| `CONFESSION_KEYWORDS_MAX_COUNT` | 50 | Max blocked keywords per guild |

## Redis Caching

| Key Pattern | Value | TTL | Purpose |
|-------------|-------|-----|---------|
| `confession:cd:{guildId}:{userId}` | `"1"` | `cooldownMinutes * 60` seconds | Per-user submission cooldown |

Cooldown is checked via both `redis.getKey()` and `redis.ttlKey()`. Remaining seconds are returned to the user when blocked. Cooldown is set after a successful submission (both instant and review modes), even if the confession has not yet been approved.

## Embed Colors

| Context | Color |
|---------|-------|
| Standard public confession | `0x9b59b6` (purple) |
| VIP public confession | `0xf1c40f` (gold) |
| Review embed (standard) | `0xe67e22` (orange) |
| Review embed (VIP) | `0xf1c40f` (gold) |
| Approved resolved | `0x2ecc71` (green) |
| Rejected resolved | `0xe74c3c` (red) |
| Filter list | `0x9b59b6` (purple) |
| Anonymous reply | `0x9b59b6` (purple) |

## Service Layer

Primary service: `src/services/confession/confession.service.ts`

| Function | Description |
|----------|-------------|
| `getGuildConfessionConfig(guildId)` | Fetch config from MongoDB |
| `upsertGuildConfessionConfig(input)` | Create or update config; clamps cooldown to min/max |
| `reserveNextConfessionNumber(guildId)` | Atomic `$inc` on `lastConfessionNumber`, returns new number |
| `isConfessionOnCooldown(guildId, userId)` | Check Redis key existence + TTL |
| `setConfessionCooldown(guildId, userId, minutes)` | Set Redis key with TTL |
| `validateConfessionAttachment(att)` | Validates content-type starts with `image/` |
| `sendAnonymousConfessionToChannel(channel, ...)` | Build embed + buttons, send to channel, return messageId |
| `createPublishedConfessionRecord(input)` | Create Confession doc with `status: "published"` |
| `createPendingConfessionRecord(input)` | Create Confession doc with `status: "pending"` |
| `approveConfession(interaction)` | Publish pending confession, update review message |
| `rejectConfession(interaction)` | Reject pending confession, update review message |
| `handleConfessionVote(mongoId, guildId, userId, voteType)` | Toggle/switch/create vote, return updated counts |
| `handleConfessionReply(params)` | Cost check, thread creation, post anonymous reply |
| `banConfessionUser(input)` | Deactivate prior bans, create new ban |
| `checkConfessionBan(guildId, userId)` | Check active ban, auto-expire if past `expiresAt` |
| `unbanConfessionUser(guildId, userId)` | Deactivate all active bans, return whether any were modified |
| `addBlockedKeyword(guildId, keyword)` | Add to `blockedKeywords`, enforce max count |
| `removeBlockedKeyword(guildId, keyword)` | Remove from `blockedKeywords` |
| `getBlockedKeywords(guildId)` | Return keyword list |
| `checkKeywordFilter(content, keywords)` | Case-insensitive substring check |

## File Map

| File | Purpose |
|------|---------|
| `src/commands/slash/confession.ts` | Slash command with 7 subcommands |
| `src/services/confession/confession.service.ts` | Core service layer |
| `src/services/confession/constants.ts` | All numeric constants and Redis key builder |
| `src/models/confession.model.ts` | Confession document schema |
| `src/models/guildConfessionConfig.model.ts` | Per-guild configuration schema |
| `src/models/confessionVote.model.ts` | Vote tracking schema |
| `src/models/confessionReply.model.ts` | Reply tracking schema |
| `src/models/confessionBan.model.ts` | Ban tracking schema |
| `src/buttons/confessionApprove.button.ts` | Approve button handler |
| `src/buttons/confessionReject.button.ts` | Reject button handler |
| `src/buttons/confessionUpvote.button.ts` | Upvote button handler |
| `src/buttons/confessionDownvote.button.ts` | Downvote button handler |
| `src/buttons/confessionReply.button.ts` | Reply button + modal handler |
| `src/util/config/button.ts` | Button ID constants |
