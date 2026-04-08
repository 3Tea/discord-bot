# Confession Community Interaction — Sub-project 2

**Date:** 2026-04-08
**Status:** Approved
**Scope:** Reaction Voting (buttons) + Anonymous Reply Thread (Discord threads, first reply free, 5 coin per additional reply)

## Summary

Add community interaction to published confessions via persistent buttons on every confession message. Users can upvote/downvote confessions and submit anonymous replies into auto-created Discord threads. Voting is free; first reply per user per confession is free, subsequent replies cost 5 coin.

## Voting System

### Buttons on Published Confession

Every published confession message includes an action row:

```
[ 👍 0 ] [ 👎 0 ] [ 💬 Reply ]
```

Buttons are added when the confession is published (instant mode) or approved (review mode).

### Voting Rules

- Each user can cast **one vote** per confession: upvote OR downvote
- Clicking the same vote again → **toggle off** (remove vote)
- Clicking the opposite vote → **switch** (remove old, add new)
- Cannot vote on your own confession (bot compares `userId` with `authorId`)
- Vote count updates on button labels after each interaction via message edit

### Data Model — ConfessionVote (new)

```typescript
interface IConfessionVote extends Document {
    confessionId: Types.ObjectId;
    guildId: string;
    userId: string;
    vote: "up" | "down";
}
```

**Indexes:**
- Unique compound: `{ confessionId, userId }` — one vote per user per confession
- Compound: `{ confessionId, vote }` — for counting (if needed)

### Confession Model Changes — Vote Counts

Add to existing Confession model:

```typescript
upvotes: { type: Number, default: 0 }
downvotes: { type: Number, default: 0 }
```

Counts are updated atomically (`$inc`) when votes are cast/toggled/switched. Avoids needing to `countDocuments()` on every button render.

### Vote Flow

```
User clicks 👍 (upvote)
│
├─ Check: is this user the confession author?
│  └─ Yes → ephemeral "You cannot vote on your own confession"
│
├─ Find existing vote for (confessionId, userId)
│
├─ No existing vote → create "up" vote, $inc upvotes +1
│
├─ Existing "up" vote → delete vote, $inc upvotes -1 (toggle off)
│
├─ Existing "down" vote → update to "up", $inc upvotes +1 downvotes -1 (switch)
│
└─ Edit message: update button labels with new counts
```

Downvote flow mirrors this.

## Anonymous Reply Thread

### Flow

1. User clicks **💬 Reply** button on confession message
2. Discord **Modal** opens with a TextInput (max 1500 chars)
3. User submits modal
4. Bot checks reply cost:
   - First reply by this user on this confession → **free**
   - Subsequent replies → **deduct 5 coin**. If insufficient → reject with error
5. If confession has no thread yet → bot creates Discord Thread on the confession message
6. Bot posts anonymous reply in thread: `Anonymous Reply #N: [content]`
7. Reply record saved to DB

### Modal

- Custom ID: `confession_reply_modal:{confessionMongoId}`
- TextInput:
  - Label: "Your anonymous reply"
  - Style: Paragraph (multi-line)
  - Max length: 1500
  - Required: true

### Thread Management

- Thread name: `Confession #N — Replies`
- Created on first reply (lazy), thread ID stored on Confession document
- Auto-archive: 1440 minutes (24h) — Discord default for non-boosted servers
- If thread already exists, fetch and reuse it

### Anonymous Reply Embed

```
Color: #9B59B6 (purple, matches confession)
Description: [reply content]
Footer: Anonymous Reply #N
```

No title. Minimal design to keep thread readable.

### Data Model — ConfessionReply (new)

```typescript
interface IConfessionReply extends Document {
    confessionId: Types.ObjectId;
    guildId: string;
    authorId: string;       // hidden — used for free-reply check and moderation
    replyNumber: number;    // auto-increment per confession
    content: string;
    messageId: string;      // Discord message ID in thread
}
```

**Indexes:**
- Compound: `{ confessionId, replyNumber }` unique
- Compound: `{ confessionId, authorId }` — for checking first reply

### Confession Model Changes — Thread & Reply

Add to existing Confession model:

```typescript
threadId: { type: String, default: null }    // Discord thread ID
replyCount: { type: Number, default: 0 }     // total replies
```

`replyCount` is atomically incremented to generate `replyNumber` (same pattern as `lastConfessionNumber` in config).

### Reply Pricing

| Scenario | Cost |
|----------|------|
| First reply by user on a confession | Free |
| Each subsequent reply by same user on same confession | 5 coin |

**Constant:** `CONFESSION_REPLY_COST_COIN = 5`

**Detection:** Count existing ConfessionReply documents with matching `{ confessionId, authorId }`. If count === 0 → free. Otherwise → deduct.

### Reply Flow (detailed)

```
User submits modal
│
├─ Validate content (not empty, ≤ 1500 chars)
│
├─ Fetch Confession document by mongoId
│  └─ Not found or not published → ephemeral error
│
├─ Check existing replies by this user
│  ├─ count === 0 → free (first reply)
│  └─ count > 0 → deduct 5 coin
│     └─ Insufficient → ephemeral "insufficient_coin" error
│
├─ Increment replyCount atomically → get replyNumber
│
├─ Get or create thread
│  ├─ Confession has threadId → fetch thread
│  │  └─ Thread deleted? → create new, update threadId
│  └─ No threadId → create thread on confession message, store threadId
│
├─ Post anonymous reply embed in thread
│
├─ Save ConfessionReply record
│
└─ Ephemeral confirmation to user
```

## Button Configuration

### Custom ID Format

| Button | Custom ID Pattern |
|--------|------------------|
| Upvote | `confession_upvote:{confessionMongoId}` |
| Downvote | `confession_downvote:{confessionMongoId}` |
| Reply | `confession_reply:{confessionMongoId}` |

### Button ID Constants

Add to `src/util/config/button.ts`:

```typescript
CONFESSION_UPVOTE: "confession_upvote"
CONFESSION_DOWNVOTE: "confession_downvote"
CONFESSION_REPLY: "confession_reply"
```

### Button Handlers (3 new files)

| File | Responsibility |
|------|---------------|
| `src/buttons/confessionUpvote.button.ts` | Handle upvote toggle/switch |
| `src/buttons/confessionDownvote.button.ts` | Handle downvote toggle/switch |
| `src/buttons/confessionReply.button.ts` | Show modal, handle modal submit, create thread + reply |

## Publishing Changes

### `sendAnonymousConfessionToChannel` Update

Currently sends embed only. Must now also include the voting + reply action row:

```typescript
// Action row for published confessions
[ 👍 0 | 👎 0 | 💬 Reply ]
```

Both instant mode and approve flow must include this action row.

The function needs the `confessionMongoId` to build button custom IDs. This means:
- **Instant mode:** Create DB record first (to get mongoId), then send message with buttons, then update `publicMessageId`
- **Approve flow:** Already has mongoId from the pending record

### Flow Change for Instant Mode

Current: send message → create DB record
New: create DB record (without publicMessageId) → send message with buttons → update publicMessageId

This is a small but important change to the publish flow order.

## i18n Keys (New)

| Key | EN | VI |
|-----|----|----|
| `confession.vote_own` | You cannot vote on your own confession. | Bạn không thể vote confession của chính mình. |
| `confession.vote_updated` | Vote updated. | Đã cập nhật vote. |
| `confession.reply_modal_title` | Anonymous Reply | Reply ẩn danh |
| `confession.reply_modal_label` | Your reply | Nội dung reply |
| `confession.reply_success` | Your anonymous reply was posted. | Reply ẩn danh đã được đăng. |
| `confession.reply_insufficient_coin` | You need **{{cost}}** coins for additional replies. Balance: **{{balance}}** coins. | Bạn cần **{{cost}}** coin cho reply tiếp theo. Số dư: **{{balance}}** coin. |
| `confession.reply_not_found` | This confession no longer exists. | Confession này không còn tồn tại. |
| `confession.reply_empty` | Reply cannot be empty. | Reply không được để trống. |

## Transaction Logging

| Action | Transaction Type | coinDelta | Metadata |
|--------|-----------------|-----------|----------|
| Reply (paid) | `confession_reply` | -5 | `{ confessionNumber, replyNumber }` |

Add `"confession_reply"` to `TransactionType` union and schema enum.

## Files Changed

### New Files

| File | Responsibility |
|------|---------------|
| `src/models/confessionVote.model.ts` | ConfessionVote schema + interface |
| `src/models/confessionReply.model.ts` | ConfessionReply schema + interface |
| `src/buttons/confessionUpvote.button.ts` | Upvote button handler |
| `src/buttons/confessionDownvote.button.ts` | Downvote button handler |
| `src/buttons/confessionReply.button.ts` | Reply button + modal handler |

### Modified Files

| File | Change |
|------|--------|
| `src/models/confession.model.ts` | Add `upvotes`, `downvotes`, `threadId`, `replyCount` fields |
| `src/models/transaction.model.ts` | Add `"confession_reply"` to TransactionType |
| `src/services/confession/constants.ts` | Add `CONFESSION_REPLY_COST_COIN = 5` |
| `src/services/confession/confession.service.ts` | Add vote/reply service functions, update publish flow to include buttons, build interaction components |
| `src/commands/slash/confession.ts` | Update instant mode publish order (create record → send with buttons → update messageId) |
| `src/buttons/confessionApprove.button.ts` | Include voting+reply buttons when approving |
| `src/util/config/button.ts` | Add 3 new button ID constants |
| `src/locales/*.json` (15 files) | Add 8 new i18n keys |
