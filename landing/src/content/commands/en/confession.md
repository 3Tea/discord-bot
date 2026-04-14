---
title: Confession
command: confession
category: confession
description: Full-featured anonymous confession system with VIP embeds, community voting, reply threads, keyword filter, user bans, and category tags.
---

## Subcommands

| Subcommand | Description | Permission |
|------------|-------------|------------|
| `/confession setup` | Configure confession channels and mode | Manage Guild |
| `/confession submit` | Submit an anonymous confession | Everyone |
| `/confession ban <user> [duration] [reason]` | Ban a user from confessing | Manage Guild / Manage Messages |
| `/confession unban <user>` | Remove a confession ban | Manage Guild / Manage Messages |
| `/confession filter-add <keyword>` | Add keyword to blacklist | Manage Guild |
| `/confession filter-remove <keyword>` | Remove keyword from blacklist | Manage Guild |
| `/confession filter-list` | View all blocked keywords | Manage Guild |

## Submit Options

| Option | Required | Description |
|--------|----------|-------------|
| `text` | Yes | Confession content (max 3,500 chars) |
| `image` | No | Optional image attachment |
| `vip` | No | VIP confession with gold embed — costs **5 gems** |
| `skip_cooldown` | No | Skip active cooldown — costs **50 coins** |
| `audio` | No | Optional voice note (premium only, MP3/OGG/WAV/M4A/WebM) |
| `tag` | No | Category: Heartfelt, Funny, Question, Sharing, Other |

## How to Use

### Setting Up (Admin)

Use `/confession setup` to configure:
- **Enabled:** Turn the confession system on/off
- **Mode:** `instant` (posts immediately) or `review` (requires moderator approval)
- **Public channel:** Where approved confessions appear
- **Review channel:** Where pending confessions are reviewed (required in review mode)
- **Cooldown:** 1–120 minutes between submissions per user

### Submitting a Confession

```
/confession submit text:Your confession here
/confession submit text:Secret thoughts vip:true tag:heartfelt
/confession submit text:Quick post skip_cooldown:true
```

- Text up to **3,500 characters**, optionally attach one image
- Your identity is **completely hidden** from other members
- Each confession gets a unique number (e.g., Confession #42)
- Tags display as a badge on the embed: `[🏷️ Heartfelt]`

### VIP Confession

Pay **5 gems** for a special gold embed with sparkle title `✨ Confession (#N)` and "VIP Confession" footer. Stands out in the channel.

### Skip Cooldown

Pay **50 coins** to bypass your active cooldown. Only charges when you're actually on cooldown — free if cooldown has already expired.

> **Tip:** Both VIP and skip cooldown can be combined in one submission.

### Community Interaction

Every published confession has interactive buttons:

```
[ 👍 0 ] [ 👎 0 ] [ 💬 Reply ]
```

- **Vote:** Click 👍 or 👎 to upvote/downvote. Click again to undo. You cannot vote on your own confession.
- **Reply:** Click 💬 to open a reply form. Your anonymous reply is posted in a Discord thread under the confession.
  - First reply per confession: **free**
  - Each additional reply: **5 coins**

### Review Mode

In review mode, confessions go to the review channel where moderators see the confession with **Approve** and **Reject** buttons. Approved confessions get the voting + reply buttons. Moderators can see the author's identity.

## Moderation Tools

### Confession Ban

```
/confession ban user:@troll duration:7d reason:Spam
/confession ban user:@troll
/confession unban user:@troll
```

Ban a user from submitting confessions. Duration options: `1h`, `6h`, `1d`, `7d`, `30d`, or permanent (no duration). Banned users see an error when trying to submit.

### Keyword Filter

```
/confession filter-add keyword:badword
/confession filter-remove keyword:badword
/confession filter-list
```

Auto-reject confessions containing blacklisted keywords. Up to **50 keywords** per server. Case-insensitive substring matching. The rejection message does not reveal which keyword was matched.

> **Warning:** The confession system must be set up by an admin before members can submit confessions.
