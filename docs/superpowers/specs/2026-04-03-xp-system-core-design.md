# XP System Core — Design Spec (Sub-project 1)

**Date**: 2026-04-03
**Status**: Approved
**Scope**: XP tracking, anti-spam, commands, enhanced embed rank card
**Out of scope**: Canvas image rank card (Sub-project 2)

## Overview

Competitive leveling/XP system for a multi-purpose Discord server. Members earn XP from chat messages, voice participation, and reactions. Exponential level curve rewards dedication. Rank card and leaderboard for visibility.

## Sub-project Breakdown

- **Sub-project 1 (this spec)**: Data models, XP tracking (chat/voice/reactions), anti-spam, commands (`/rank`, `/leaderboard`, `/xp admin`), enhanced embed rank card
- **Sub-project 2 (separate spec)**: Canvas image rank card using `@napi-rs/canvas`, replacing the enhanced embed

## Data Models

### MemberXP

Per-guild, per-user XP record. Replaces old `User` model for XP purposes (old model kept, not deleted).

```typescript
interface IMemberXP extends Document {
    guildId: string;
    userId: string;
    xp: number;
    level: number;              // cached, derived from xp
    messageCount: number;
    voiceMinutes: number;
    reactionCount: number;
    lastMessageAt: Date;        // anti-spam: last XP-granting message time
    lastMessageHash: string;    // anti-spam: hash of last message content
}

// Indexes:
// Compound unique: { guildId, userId }
// Compound sort:   { guildId, xp: -1 }  (for leaderboard)
```

Collection: `MemberXPs`

### GuildXPConfig

Per-guild configuration. Created with defaults on first XP event if not exists.

```typescript
interface IGuildXPConfig extends Document {
    guildId: string;            // unique
    blacklistedChannels: string[];
    xpPerMessage: number;       // default: 20 (granted as random 15-25)
    xpPerVoiceMinute: number;   // default: 5
    xpPerReaction: number;      // default: 3
    messageCooldown: number;    // default: 60 (seconds)
    minMessageLength: number;   // default: 3
    enabled: boolean;           // default: true
}
```

Collection: `GuildXPConfigs`

## Level Formula

Exponential: XP needed for level N = `N^2 * 50`

| Level | Total XP Needed | XP for This Level |
|-------|----------------|-------------------|
| 1 | 50 | 50 |
| 2 | 200 | 150 |
| 5 | 1,250 | 450 |
| 10 | 5,000 | 950 |
| 15 | 11,250 | 1,450 |
| 20 | 20,000 | 1,950 |
| 50 | 125,000 | 4,950 |

Helper functions:
- `xpForLevel(level: number): number` — returns `level^2 * 50`
- `levelFromXP(xp: number): number` — returns `floor(sqrt(xp / 50))`
- `progressToNextLevel(xp: number): { current: number; required: number; percentage: number }`

## XP Tracking

### Chat XP — `messageCreate` event (new)

Pipeline:
1. Skip: bot, DM, webhook messages
2. Load `GuildXPConfig` — skip if `enabled === false` or channel is in `blacklistedChannels`
3. Anti-spam checks (in order):
   a. `message.content.length < minMessageLength` → skip
   b. Hash `message.content` → compare with `lastMessageHash` → duplicate → skip
   c. `lastMessageAt + messageCooldown > Date.now()` → skip (cooldown)
4. Grant XP: `random(15, 25)` (range around `xpPerMessage`)
5. Update `MemberXP`: increment `xp`, `messageCount`, set `lastMessageAt`, `lastMessageHash`
6. Recalculate `level` — if level increased → send level-up notification in same channel

**Message hash**: Simple hash of `message.content.toLowerCase().trim()` for duplicate detection. No need for fuzzy matching.

### Voice XP — `voiceStateUpdate` event (extend existing)

Uses Redis to track active voice sessions:

**On voice state change:**
- User joins voice channel with >= 2 non-bot members, not server-deafened:
  - `Redis SET voice_xp:{guildId}:{userId} {timestamp}` (no TTL — cleaned on leave)
- User leaves, gets server-deafened, or channel drops to < 2 non-bot members:
  - `Redis DEL voice_xp:{guildId}:{userId}`
  - Also clean up other users in that channel if it drops below 2

**Global interval (60 seconds):**
- Scan Redis keys `voice_xp:*`
- For each active session: verify channel still has >= 2 non-bot members and user not server-deafened
- Grant `xpPerVoiceMinute` XP, increment `voiceMinutes`
- Check level up → if leveled up, send notification to the voice channel's text channel (or guild's system channel)

**Integration with existing `voiceStateUpdate.ts`:** The existing event handles temp voice channel creation/deletion. Voice XP logic is added alongside, not replacing. Keep both concerns clearly separated in the event handler.

### Reaction XP — `messageReactionAdd` event (new)

Pipeline:
1. Skip: bot, self-react (user reacting to their own message)
2. Load `GuildXPConfig` — skip if `enabled === false` or channel is in `blacklistedChannels`
3. Cooldown: check Redis key `reaction_xp:{guildId}:{userId}` — if exists → skip
4. Set Redis key `reaction_xp:{guildId}:{userId}` with TTL 30s
5. Grant `xpPerReaction` XP, increment `reactionCount`
6. Check level up

### Level-Up Notification

When a user levels up, send an embed in the channel where the XP was earned:

```
🎉 {user} đã đạt Level {N}!
```

Simple, single-line embed. Color matches the weather command style (use a gold/celebratory color like `0xf0b132`).

## Commands

### `/rank [@user]`

- Optional `user` parameter — defaults to interaction author
- `deferReply()` (DB query may be slow on first call)
- Query `MemberXP` by guildId + userId
- Calculate rank position: count documents with higher XP in same guild + 1
- Display enhanced embed:

```
📊 ds112 — Level 15
Rank #3 trên server

▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░ 75%
8,450 / 11,250 XP

💬 2,341  ·  🎤 48h 32m  ·  ❤️ 156
```

Progress bar: 20 characters total, using `▓` (filled) and `░` (empty).

If user has no XP record: show Level 0, 0 XP, unranked.

### `/leaderboard`

- `deferReply()`
- Query top 10 `MemberXP` in guild, sorted by XP descending
- Display embed:

```
🏆 Bảng xếp hạng

#1  🥇 user1 — Level 20 (25,000 XP)
#2  🥈 user2 — Level 18 (19,200 XP)
#3  🥉 user3 — Level 15 (8,450 XP)
#4  user4 — Level 12 (5,100 XP)
#5  user5 — Level 10 (5,000 XP)
...
```

Top 3 get medal emoji. Mention users with `<@userId>` for clickable names.

### `/xp set @user <amount>` (admin)

- Permission: `ManageGuild`
- Set user's XP to exact amount, recalculate level
- Reply: confirmation embed with old → new XP/level

### `/xp add @user <amount>` (admin)

- Permission: `ManageGuild`
- Add XP, check for level up
- Reply: confirmation embed

### `/xp remove @user <amount>` (admin)

- Permission: `ManageGuild`
- Remove XP (min 0), recalculate level (may go down)
- Reply: confirmation embed

### `/xp channel-blacklist add #channel` (admin)
### `/xp channel-blacklist remove #channel` (admin)

- Permission: `ManageGuild`
- Add/remove channel from `GuildXPConfig.blacklistedChannels`
- Reply: updated list of blacklisted channels

## File Structure

```
src/
  models/
    memberXP.model.ts          # MemberXP schema + interface
    guildXPConfig.model.ts     # GuildXPConfig schema + interface
  commands/slash/
    rank.ts                    # /rank [@user]
    leaderboard.ts             # /leaderboard
    xp.ts                      # /xp set|add|remove|channel-blacklist
  events/
    messageCreate.ts           # Chat XP tracking (new)
    messageReactionAdd.ts      # Reaction XP tracking (new)
    voiceStateUpdate.ts        # Extend — add voice XP session tracking
  util/
    xp/
      calculator.ts            # Level formula, XP thresholds, progress %
      antiSpam.ts              # Cooldown, duplicate detection, length check
      rankCard.ts              # Build rank enhanced embed
```

**Unchanged files:**
- `user.model.ts`, `guild.model.ts` — kept as-is, not deleted
- `src/client.ts` — add intents: `GatewayIntentBits.MessageContent`, `GatewayIntentBits.GuildMessageReactions`

## Performance

- `MemberXP` index `{ guildId, xp: -1 }` — leaderboard queries
- `MemberXP` unique index `{ guildId, userId }` — fast lookup
- Voice XP: Redis-based session tracking, no MongoDB query per minute (only on XP grant)
- Anti-spam: `lastMessageAt` and `lastMessageHash` stored in `MemberXP` document — single DB read per message
- Reaction cooldown: Redis TTL key — no DB overhead

## Error Handling

- XP tracking events: catch all errors silently + log — never crash the bot for XP
- Commands: try/catch → `editReply` with user-friendly error message
- MongoDB disconnect: XP tracking pauses, commands return error
- Voice interval: skip iteration on error, retry next minute

## Edge Cases

- User leaves server → data kept (may return)
- Guild has no config → create default `GuildXPConfig` on first XP event
- User has no record → create default `MemberXP` on first XP grant
- Admin sets XP to 0 → level resets to 0
- Channel deleted while blacklisted → stale ID in array, harmless (no XP events from deleted channel)

## Required Privileged Intents

Must be enabled in Discord Developer Portal before deployment:
- `MessageContent` — needed to read message content for anti-spam (length, duplicate detection)
- `GuildMessageReactions` — needed for reaction XP tracking
