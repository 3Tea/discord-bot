---
title: Confessions
description: Post anonymous confessions, vote, reply, and use VIP features.
icon: "🎭"
order: 4
relatedCommands: ["confession"]
---

## Overview

The confession system lets server members post **anonymous messages** — nobody can see who wrote them (not even admins, unless review mode is on). Confessions are numbered, can be voted on, and replied to.

## Submitting a Confession

Use `/confession submit` to write your confession:

| Option | Required | Description |
|--------|----------|-------------|
| `text` | Yes | Your confession text (max 3,500 characters) |
| `image` | No | Attach an image to your confession |
| `tag` | No | Categorize your confession |
| `vip` | No | Make it a golden VIP confession (costs gems) |
| `skip_cooldown` | No | Skip the cooldown timer (costs coins) |

### Tags

Choose a tag to categorize your confession:

| Tag | Best for |
|-----|----------|
| Heartfelt | Serious, emotional content |
| Funny | Humor and jokes |
| Question | Asking the community something |
| Sharing | General stories and experiences |
| Other | Everything else |

## Instant vs. Review Mode

Your server admin chooses how confessions work:

| Mode | How It Works |
|------|-------------|
| **Instant** | Your confession is posted immediately to the public channel |
| **Review** | Your confession goes to a mod review channel first. Mods approve or reject it before it goes public |

In review mode, mods can see who submitted the confession — but the public post is always anonymous.

## VIP Confessions

Spend gems to make your confession stand out with a **golden embed**. VIP confessions are visually distinct and catch more attention.

## Skip Cooldown

There's a cooldown between confessions (set by your server admin, 1–120 minutes). If you don't want to wait, you can spend coins to skip it.

## Voting & Replies

Every published confession has **upvote** and **downvote** buttons. You can also **reply** to confessions — replies are also anonymous.

## Commands Reference

| Command | Description |
|---------|-------------|
| `/confession submit` | Submit a new confession |

## For Admins & Mods

> This section is for server administrators and moderators.

### Setting Up Confessions

Use `/confession setup` to configure the system:

| Setting | Description |
|---------|-------------|
| Mode | `instant` (posts immediately) or `review` (requires mod approval) |
| Public channel | Where approved confessions are posted |
| Review channel | Where pending confessions go for review (review mode only) |
| Cooldown | Time between submissions per user (1–120 minutes) |

### Moderation Tools

| Command | Permission | Description |
|---------|-----------|-------------|
| `/confession ban` | Manage Messages | Ban a user from confessions (permanent or timed: 1h, 6h, 1d, 7d, 30d) |
| `/confession unban` | Manage Messages | Remove a confession ban |
| `/confession filter-add` | Manage Guild | Add a keyword to the blacklist (confessions containing it are blocked) |
| `/confession filter-remove` | Manage Guild | Remove a keyword from the blacklist |
| `/confession filter-list` | Manage Guild | View all blocked keywords |

### Review Mode Workflow

1. User submits confession → it appears in the **review channel** (author visible to mods)
2. Mod clicks **Approve** → confession is posted anonymously to the public channel
3. Mod clicks **Reject** → confession is deleted (currency refunded if applicable)

> **Tip:** Use keyword filters to automatically block confessions containing inappropriate terms. Filters are case-insensitive and match substrings.
