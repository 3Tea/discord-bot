# Voice Channel System

> Steering doc for AI assistants and contributors. Covers temporary voice channels — join-to-create flow, ownership-based control panel, channel states, permission management, kick/block/transfer, and Redis state.

## Overview

Members create temporary voice channels by joining a trigger channel. The creator becomes the channel owner with full control via a pinned button panel and `/voice` slash commands. Channels auto-delete when empty. All ownership and state is stored in Redis with 12-hour TTL — there are no MongoDB models for voice channels.

## How It Works

### Join-to-Create Flow

1. Admin creates a permanent voice channel whose name starts with `"3AT "` (the trigger prefix)
2. Member joins the trigger channel
3. Bot creates a new `GuildVoice` channel named `"* {username}"` in the same category, with the trigger channel's bitrate, a default user limit of 23, and `ViewChannel: allow` for `@everyone`
4. Bot moves the member into the new channel
5. Bot stores `redis.setJson(channelId, memberId, 43200)` — owner mapping with 12h TTL
6. Bot sends the control panel embed to the channel's text chat, pins it, and deletes the "pinned a message" system message

### Channel Lifecycle

| Event | Behaviour |
|-------|-----------|
| Member joins trigger channel (`"3AT "` prefix) | Create temp channel, move member, send panel |
| Last human leaves temp channel (`"* "` prefix) | Delete channel, clean up all Redis keys |
| Only bots remain (1 bot, 0 humans) | Same as empty — delete channel |
| Redis TTL expires (12h) | Owner key lost; channel persists but becomes uncontrollable until re-joined or deleted |

### Auto-Deletion Logic

On every `voiceStateUpdate` where the old channel name starts with `"* "`:

1. Check `members.size === 0` or `members.size === 1 && all bots`
2. Fetch the channel (may already be deleted)
3. Delete the channel via Discord API
4. Call `cleanupRedisKeys(channelId)` — deletes owner, panel, state, blocked, permitted keys

## Slash Command (`/voice`)

All subcommands require the user to be in their own temporary voice channel and be the registered owner.

| Subcommand | Parameters | Cooldown Key | Cooldown | Action |
|------------|-----------|-------------|----------|--------|
| `limit` | `number` (int 0-99, required) | `setUserLimit:{channelId}` | 120s | Set channel user limit |
| `name` | `string` (max 50 chars, required) | `setVoiceName:{channelId}` | 120s | Rename channel to `"* {name}"` |
| `lock` | none | `cd:lock:{channelId}` | 5s | Set `@everyone` Connect=false, ViewChannel=true |
| `unlock` | none | `cd:lock:{channelId}` | 5s | Set `@everyone` Connect=null, ViewChannel=true |
| `hide` | none | `cd:lock:{channelId}` | 5s | Set `@everyone` Connect=false, ViewChannel=false |
| `permit` | `user` (required) | `cd:permit:{channelId}` | 5s | Grant user Connect=true, ViewChannel=true; add to permitted list; remove from blocked list |
| `block` | `user` (required) | `cd:block:{channelId}` | 5s | Set user Connect=false, ViewChannel=false; add to blocked list; remove from permitted list; disconnect if present |
| `kick` | `user` (required) | `cd:kick:{channelId}` | 10s | Show kick/kick+block confirmation buttons (30s TTL) |
| `transfer` | `user` (required) | `cd:transfer:{channelId}` | 5s | Transfer owner key to target; clear permitted and blocked lists |

All responses are ephemeral. Self-targeting is rejected for permit, block, kick, and transfer.

## Control Panel

### Panel Embed

Sent to the voice channel's built-in text chat on creation. Pinned automatically. Contains:

- **Title**: Localized panel title
- **Description**: Owner mention and current status (unlocked/locked/hidden)
- **Permitted field**: List of permitted user mentions (shown only if non-empty)
- **Blocked field**: List of blocked user mentions (shown only if non-empty)
- **Footer**: Bot branding from `FOOTER` config

The panel message ID is stored in Redis (`panel:{channelId}`) and updated after every state-changing action via `updatePanel()`.

### Button Grid Layout

Two rows of buttons, 5 + 4:

**Row 1** (channel state + settings):

| Button | customId | Emoji | Style |
|--------|----------|-------|-------|
| Lock | `voice_lock` | lock | Secondary |
| Unlock | `voice_unlock` | unlock | Secondary |
| Hide | `voice_hide` | eye | Secondary |
| Rename | `voice_rename` | pencil | Primary |
| Limit | `voice_limit` | people | Primary |

**Row 2** (user management):

| Button | customId | Emoji | Style |
|--------|----------|-------|-------|
| Permit | `voice_permit` | checkmark | Success |
| Block | `voice_block` | no-entry | Danger |
| Kick | `voice_kick` | boot | Danger |
| Transfer | `voice_transfer` | arrows | Primary |

## Button Handlers

### Panel Buttons

| File | customId | Interaction Flow | Cooldown |
|------|----------|-----------------|----------|
| `voiceLock.button.ts` | `voice_lock` | deferReply -> validateOwner -> checkCooldown -> edit @everyone overwrites -> set state -> editReply | `cd:lock:{channelId}` 5s |
| `voiceUnlock.button.ts` | `voice_unlock` | deferReply -> validateOwner -> checkCooldown -> edit @everyone overwrites -> set state -> editReply | `cd:lock:{channelId}` 5s |
| `voiceHide.button.ts` | `voice_hide` | deferReply -> validateOwner -> checkCooldown -> edit @everyone overwrites -> set state -> editReply | `cd:lock:{channelId}` 5s |
| `voiceRename.button.ts` | `voice_rename` | validateOwner -> checkCooldown -> showModal (`voice_modal_rename`) | `setVoiceName:{channelId}` 120s |
| `voiceLimit.button.ts` | `voice_limit` | validateOwner -> checkCooldown -> showModal (`voice_modal_limit`) | `setUserLimit:{channelId}` 120s |
| `voicePermit.button.ts` | `voice_permit` | validateOwner -> reply with UserSelectMenu (`voice_select_permit`) | none (cooldown on select) |
| `voiceBlock.button.ts` | `voice_block` | validateOwner -> reply with UserSelectMenu (`voice_select_block`) | none (cooldown on select) |
| `voiceKick.button.ts` | `voice_kick` | validateOwner -> reply with UserSelectMenu (`voice_select_kick`) | none (cooldown on select) |
| `voiceTransfer.button.ts` | `voice_transfer` | validateOwner -> reply with UserSelectMenu (`voice_select_transfer`) | none (cooldown on select) |

### Select Menu Handlers

| File | customId | Action | Cooldown |
|------|----------|--------|----------|
| `voiceSelectPermit.button.ts` | `voice_select_permit` | deferReply -> validate owner -> grant Connect+ViewChannel -> update permitted/blocked lists -> updatePanel | `cd:permit:{channelId}` 5s |
| `voiceSelectBlock.button.ts` | `voice_select_block` | deferReply -> validate owner -> deny Connect+ViewChannel -> update blocked/permitted lists -> disconnect target if present -> updatePanel | `cd:block:{channelId}` 5s |
| `voiceSelectKick.button.ts` | `voice_select_kick` | deferReply -> validate owner -> check target in channel -> store `kick_target` (30s TTL) -> show kick confirmation buttons | `cd:kick:{channelId}` 10s |
| `voiceSelectTransfer.button.ts` | `voice_select_transfer` | deferReply -> validate owner -> set new owner -> clear permitted+blocked lists -> updatePanel | `cd:transfer:{channelId}` 5s |

### Kick Confirmation Buttons

| File | customId | Action |
|------|----------|--------|
| `voiceKickConfirm.button.ts` | `voice_kick_only` | deferUpdate -> read `kick_target` -> disconnect target -> set cooldown -> updatePanel |
| `voiceKickBlock.button.ts` | `voice_kick_block` | deferUpdate -> read `kick_target` -> disconnect target -> set Connect=false, ViewChannel=false -> add to blocked list -> set cooldown -> updatePanel |

### Modal Submit Handlers

Handled in `src/events/interactionCreateModal.ts`:

| Modal customId | Input field | Action | Cooldown |
|---------------|-------------|--------|----------|
| `voice_modal_rename` | `voice_name_input` (Short, max 50) | Rename channel to `"* {input}"` -> updatePanel -> auto-delete reply after 5s | `setVoiceName:{channelId}` 120s |
| `voice_modal_limit` | `voice_limit_input` (Short, max 2 chars) | Parse int, validate 0-99 -> setUserLimit -> updatePanel -> auto-delete reply after 5s | `setUserLimit:{channelId}` 120s |

## Channel States

Three mutually exclusive states, tracked in `state:{channelId}`. Lock, unlock, and hide share the same cooldown key (`cd:lock:{channelId}`).

| State | `@everyone` Connect | `@everyone` ViewChannel | Effect |
|-------|---------------------|------------------------|--------|
| **Unlocked** (default) | `null` (inherit) | `true` | Anyone can join and see the channel |
| **Locked** | `false` | `true` | Channel visible but nobody new can join (existing members stay) |
| **Hidden** | `false` | `false` | Channel invisible and inaccessible to non-permitted users |

## Permission Management

### Block

Sets per-user permission overwrites on the target:

```
Connect: false
ViewChannel: false
```

Also: removes target from permitted list, adds to blocked list, disconnects target if currently in the channel.

### Permit

Sets per-user permission overwrites on the target:

```
Connect: true
ViewChannel: true
```

Also: removes target from blocked list, adds to permitted list. This overrides channel-level lock/hide for the specific user.

### Mutual Exclusion

Block and permit are mutually exclusive per user. Permitting a blocked user removes them from the blocked list and vice versa. Both lists are stored as JSON string arrays in Redis.

## Kick Flow

### Via Slash Command (`/voice kick`)

1. Owner runs `/voice kick @user`
2. Validates target is in the channel and is not self
3. Stores `kick_target:{ownerId}:{channelId}` in Redis with 30s TTL
4. Replies with two ephemeral buttons: "Kick" (`voice_kick_only`) and "Kick & Block" (`voice_kick_block`)

### Via Panel Button

1. Owner clicks Kick button on panel
2. `voiceKick.button.ts` shows a `UserSelectMenu` (`voice_select_kick`)
3. Owner selects a user
4. `voiceSelectKick.button.ts` validates target is in channel, stores `kick_target` (30s TTL), shows confirmation buttons

### Confirmation

- **Kick Only** (`voice_kick_only`): Disconnects target from voice. No permission overwrites applied — user can rejoin.
- **Kick & Block** (`voice_kick_block`): Disconnects target and applies block overwrites (Connect=false, ViewChannel=false). Adds to blocked list.
- If 30s expire before confirmation, `kick_target` key is gone and the handler replies with an expiration message.

Kick cooldown: 10s on `cd:kick:{channelId}`.

## Transfer Flow

1. Owner runs `/voice transfer @user` or uses the panel Transfer button -> select menu
2. Validates target is not self
3. Sets `redis.setJson(channelId, targetId, 43200)` — overwrites owner key
4. Deletes `permitted:{channelId}` and `blocked:{channelId}` — clean slate for new owner
5. Updates the panel embed with new owner
6. Cooldown: 5s on `cd:transfer:{channelId}`

The new owner inherits the channel in its current state (locked/hidden/unlocked) but with empty permitted/blocked lists.

## Redis State Management

All voice state is stored in Redis. No MongoDB models are used for voice channels.

| Key Pattern | Value | TTL | Purpose |
|-------------|-------|-----|---------|
| `{channelId}` | `"{userId}"` (owner ID) | 12h | Channel ownership mapping |
| `panel:{channelId}` | `"{messageId}"` | 12h | Control panel message ID for updates |
| `state:{channelId}` | `"unlocked"` / `"locked"` / `"hidden"` | 12h | Current channel state |
| `permitted:{channelId}` | `["userId1", "userId2"]` | 12h | Permitted user ID list |
| `blocked:{channelId}` | `["userId1", "userId2"]` | 12h | Blocked user ID list |
| `kick_target:{ownerId}:{channelId}` | `"{targetId}"` | 30s | Pending kick confirmation target |
| `cd:lock:{channelId}` | `1` | 5s | Cooldown for lock/unlock/hide |
| `cd:permit:{channelId}` | `1` | 5s | Cooldown for permit action |
| `cd:block:{channelId}` | `1` | 5s | Cooldown for block action |
| `cd:kick:{channelId}` | `1` | 10s | Cooldown for kick action |
| `cd:transfer:{channelId}` | `1` | 5s | Cooldown for transfer action |
| `setVoiceName:{channelId}` | `1` | 120s | Cooldown for rename (slash + modal) |
| `setUserLimit:{channelId}` | `1` | 120s | Cooldown for user limit (slash + modal) |

### Cleanup

`cleanupRedisKeys(channelId)` runs on channel deletion and removes: `{channelId}`, `panel:{channelId}`, `state:{channelId}`, `blocked:{channelId}`, `permitted:{channelId}`. Cooldown keys are left to expire naturally.

## Validation & Cooldowns

### validateOwner

Shared helper (`src/util/voice/helpers.ts`) used by all button handlers:

1. Check `interaction.member.voice.channel` exists — reply "not in channel" if null
2. Check `redis.getJson(channelId) === interaction.user.id` — reply "not owner" if mismatch
3. Return the `VoiceChannel` or `null`

### checkCooldown

1. Check `redis.ttlKey(redisKey)` — if TTL > 0, reply with remaining seconds and return `false`
2. Otherwise return `true` (action allowed)

After the action completes, `setCooldown(key, seconds)` stores the cooldown.

### Cooldown Summary

| Action | Cooldown | Shared? |
|--------|----------|---------|
| Lock / Unlock / Hide | 5s | Yes — all three share `cd:lock:{channelId}` |
| Permit | 5s | `cd:permit:{channelId}` |
| Block | 5s | `cd:block:{channelId}` |
| Kick | 10s | `cd:kick:{channelId}` |
| Transfer | 5s | `cd:transfer:{channelId}` |
| Rename | 120s | `setVoiceName:{channelId}` |
| User Limit | 120s | `setUserLimit:{channelId}` |

Rename and limit have longer cooldowns because Discord rate-limits channel name/limit changes (2 per 10 minutes per channel).

## Source Files

| File | Purpose |
|------|---------|
| `src/commands/slash/voice.ts` | `/voice` slash command with all subcommands |
| `src/events/voiceStateUpdate.ts` | Join-to-create, auto-delete, voice XP session tracking |
| `src/events/interactionCreateModal.ts` | Modal submit handler for rename and limit modals |
| `src/util/voice/helpers.ts` | validateOwner, checkCooldown, setCooldown, buildPanelEmbed, buildPanelRows, updatePanel, sendPanel, cleanupRedisKeys |
| `src/util/voice/kick.ts` | handleKick — shared kick+optional-block logic |
| `src/util/config/button.ts` | All `BUTTON_ID` constants for voice buttons, select menus, and modals |
| `src/buttons/voice*.button.ts` | 15 button/select-menu handler files (see Button Handlers section) |

## Cross-References

- **Voice XP tracking**: The `voiceStateUpdate` event also manages voice XP sessions. See [xp-system.md](xp-system.md) for XP earning rates, eligibility rules (2+ humans or 1 human + bot), server-deafen exclusion, and the 60-second XP tick interval.
- **Voice coin rewards**: Active voice sessions award coins periodically. See [economy-system.md](economy-system.md) for `voiceCoinInterval`, `voiceCoinReward`, and the `voice_coin:{guildId}:{userId}` Redis counter.
- **Level-up notifications**: Voice XP can trigger level-ups, which fire notification embeds. See the notification system for channel configuration.
