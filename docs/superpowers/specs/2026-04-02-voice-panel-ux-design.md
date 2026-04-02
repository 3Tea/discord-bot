# Voice Control Panel UX Improvements — Design Spec

## Overview

Improve the voice control panel UX so the owner knows where to find it, and action confirmations don't spam the voice text chat.

## 1. Send Panel — Mention + Pin

When `sendPanel()` sends the control panel to the voice text chat:

- Include `content: "<@ownerId> — Your voice control panel"` alongside the embed + buttons. Discord pings the owner so they know where to interact.
- After sending, **pin the message** via `message.pin()`.
- Discord generates a system message ("Bot pinned a message") when pinning. Delete it inline in `sendPanel()`: after `await message.pin()`, fetch the last message in the channel and delete it if its type is `MessageType.ChannelPinnedMessage`.

## 2. Action Confirmations — Non-Ephemeral + Auto-Delete

Button handlers for **lock, unlock, hide, rename (modal response), limit (modal response)**:

- Change reply from ephemeral to **non-ephemeral**.
- After `interaction.reply()`, schedule `interaction.deleteReply()` after **5 seconds** using `setTimeout`.
- This prevents confirmation messages from pushing the pinned panel out of view, while still giving the owner brief visual feedback.

## 3. Select Menu Flow — Keep Ephemeral

No changes to:

- Button → opens UserSelectMenu (ephemeral reply)
- Select menu response handlers: permit, block, kick, transfer (ephemeral reply)
- Kick confirmation buttons (ephemeral reply)

Ephemeral messages cannot be deleted by the bot (Discord API limitation). This is acceptable because they are only visible to the owner and don't affect other users' view of the channel.

## 4. Files to Modify

| File | Change |
|------|--------|
| `src/util/voice/helpers.ts` | `sendPanel()`: add content with mention, pin message, delete pin system message |
| `src/buttons/voiceLock.button.ts` | Reply non-ephemeral + auto-delete after 5s |
| `src/buttons/voiceUnlock.button.ts` | Reply non-ephemeral + auto-delete after 5s |
| `src/buttons/voiceHide.button.ts` | Reply non-ephemeral + auto-delete after 5s |
| `src/events/interactionCreateModal.ts` | Rename/Limit reply non-ephemeral + auto-delete after 5s |

No new files needed.
