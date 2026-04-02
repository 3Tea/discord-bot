# Voice Channel Advanced Management — Design Spec

## Overview

Extend the existing "Join to Create" voice channel system with a full control panel (embed + buttons) sent directly into the voice channel's built-in text chat. Provides lock/unlock/hide, permit/block users, kick (with optional block), transfer ownership, rename, and limit — all accessible via buttons and backed by slash commands.

## 1. Control Panel

### When & Where

When `voiceStateUpdate` creates a temporary voice channel, bot sends a **control panel embed** into the voice channel's text chat via `voiceChannel.send()`. Discord.js v14 `VoiceChannel` implements `TextBasedChannel` — `send()` works identically to text channels.

### Embed Content

- Title: `Voice Control Panel`
- Description: `Owner: @username` + current status (Unlocked/Locked/Hidden)
- Updated in-place after every action via `message.edit()`

### Button Layout

```
Row 1: [Lock] [Unlock] [Hide] [Rename] [Limit]
Row 2: [Permit] [Block] [Kick] [Transfer]
```

### Permissions

- Only the channel owner (checked via Redis) can interact with buttons
- Non-owners receive an ephemeral error message
- Bot needs `SendMessages` permission in the voice channel

### Redis

- Store `panel:{channelId}` → `messageId` (TTL 12h) to reference the control panel for edits

## 2. Actions

### Lock / Unlock / Hide

| Action | Permission Change | Behavior |
|--------|------------------|----------|
| **Lock** | Deny `Connect` for @everyone | No new joins. Existing members stay. Permitted users can still join. |
| **Unlock** | Allow `Connect` for @everyone | Return to default open state. |
| **Hide** | Deny `ViewChannel` for @everyone | Channel disappears from list. Permitted users still see and join. |

After each action, edit control panel embed to reflect current status.

### Permit

- Button opens a **UserSelectMenu**
- Owner selects user → bot adds permission override: Allow `Connect` + `ViewChannel` for that user
- Works even when channel is Locked or Hidden
- Slash command backup: `/voice permit @user`
- Control panel embed updated with permitted users list

### Block

- Button opens a **UserSelectMenu**
- Owner selects user → bot adds permission override: Deny `Connect` + `ViewChannel`
- If the blocked user is currently in the channel → **disconnect them immediately**
- Slash command backup: `/voice block @user`
- Control panel embed updated with blocked users list

### Kick

- Button opens a **UserSelectMenu** (filtered to members currently in the channel)
- Owner selects user → bot replies with **ephemeral follow-up** containing 2 buttons:
  - `Kick` — disconnect user only, they can rejoin
  - `Kick & Block` — disconnect + add Deny `Connect` + `ViewChannel` permission override
- Slash command backup: `/voice kick @user`

### Transfer Ownership

- Button opens a **UserSelectMenu**
- Owner selects new owner → bot updates:
  - Redis: `{channelId}` → new user ID
  - Redis: clear `permitted` and `blocked` lists (clean slate for new owner)
  - Control panel embed: show new owner
- Old owner becomes a regular member with no special permissions
- Slash command backup: `/voice transfer @user`

### Rename

- Button triggers a **Modal** (text input popup)
- Owner types new name (max 50 chars) → bot calls `voiceChannel.setName("* newName")`
- Keeps the `"* "` prefix convention

### Limit

- Button triggers a **Modal** (number input)
- Owner types number (0-99) → bot calls `voiceChannel.setUserLimit(n)`

## 3. Cooldowns

| Action | Cooldown | Redis Key | Reason |
|--------|----------|-----------|--------|
| Lock / Unlock / Hide | 5s | `cd:lock:{channelId}` | Anti-spam |
| Permit / Block | 5s | `cd:permit:{channelId}` / `cd:block:{channelId}` | Anti-spam |
| Transfer | 5s | `cd:transfer:{channelId}` | Anti-spam |
| Kick | 10s | `cd:kick:{channelId}` | Prevent spam disconnect |
| Rename | 120s | `setVoiceName:{channelId}` | Discord API rate limit |
| Limit | 120s | `setUserLimit:{channelId}` | Discord API rate limit |

## 4. Redis State

### Keys

| Key | Value | TTL | Description |
|-----|-------|-----|-------------|
| `{channelId}` | `userId` | 12h | Channel owner (existing) |
| `panel:{channelId}` | `messageId` | 12h | Control panel message ID |
| `state:{channelId}` | `"unlocked"` / `"locked"` / `"hidden"` | 12h | Channel lock state |
| `blocked:{channelId}` | `["userId1","userId2"]` | 12h | Blocked user IDs |
| `permitted:{channelId}` | `["userId1","userId2"]` | 12h | Permitted user IDs |
| `cd:{action}:{channelId}` | `1` | 5s/10s/120s | Cooldown per action |

### Why Not MongoDB?

Voice channels are temporary (max 12h). Redis TTL is a natural fit. No need for persistence across restarts — if bot restarts, channels still exist but ownership state resets. Keeps complexity low with no new Mongoose models.

### Cleanup

When a voice channel is auto-deleted (0 members or only bots), delete all related Redis keys:
- `{channelId}`, `panel:{channelId}`, `state:{channelId}`, `blocked:{channelId}`, `permitted:{channelId}`
- Cooldown keys have short TTL and expire naturally.

## 5. File Structure

### New Files

```
src/buttons/
  voiceLock.button.ts          # Lock channel
  voiceUnlock.button.ts        # Unlock channel
  voiceHide.button.ts          # Hide channel
  voiceRename.button.ts        # Open rename modal
  voiceLimit.button.ts         # Open limit modal
  voicePermit.button.ts        # Open user select → permit
  voiceBlock.button.ts         # Open user select → block
  voiceKick.button.ts          # Open user select → kick
  voiceTransfer.button.ts      # Open user select → transfer
  voiceKickConfirm.button.ts   # Handle "Kick" vs "Kick & Block" follow-up
  voiceUserSelect.button.ts    # Handle UserSelectMenu responses (customId encodes action: voice_select_permit, voice_select_block, voice_select_kick, voice_select_transfer)

src/events/
  interactionCreateSelectMenu.ts  # Route select menu interactions
```

### Modified Files

```
src/events/voiceStateUpdate.ts    # Send control panel on channel create, cleanup Redis on delete
src/util/config/button.ts         # Add VOICE_* button ID constants
src/commands/slash/voice.ts       # Add subcommands: lock, unlock, hide, permit, block, kick, transfer
src/types/common/discord.d.ts     # Augment Client type with selectMenus Collection
src/loaders/                      # Add select menu loader (or extend buttons loader)
```

### Button ID Constants

```typescript
VOICE_LOCK: "voice_lock"
VOICE_UNLOCK: "voice_unlock"
VOICE_HIDE: "voice_hide"
VOICE_RENAME: "voice_rename"
VOICE_LIMIT: "voice_limit"
VOICE_PERMIT: "voice_permit"
VOICE_BLOCK: "voice_block"
VOICE_KICK: "voice_kick"
VOICE_TRANSFER: "voice_transfer"
VOICE_KICK_ONLY: "voice_kick_only"
VOICE_KICK_BLOCK: "voice_kick_block"
```

## 6. Slash Command Extensions

Add to existing `/voice` command:

| Subcommand | Options | Description |
|------------|---------|-------------|
| `/voice lock` | — | Lock the channel |
| `/voice unlock` | — | Unlock the channel |
| `/voice hide` | — | Hide the channel |
| `/voice permit` | `@user` | Permit a user |
| `/voice block` | `@user` | Block a user |
| `/voice kick` | `@user` | Kick a user (prompts Kick vs Kick & Block) |
| `/voice transfer` | `@user` | Transfer ownership |

Existing subcommands `/voice limit` and `/voice name` remain unchanged.
