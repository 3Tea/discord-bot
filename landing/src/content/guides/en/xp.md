---
title: XP & Leveling
description: Understand how XP works, level up, and compete on leaderboards.
icon: "📊"
order: 2
relatedCommands: ["rank", "leaderboard", "server-rank", "xp"]
---

## Overview

Every message you send, every minute in voice chat, and every reaction you add earns you **XP**. As your XP grows, you **level up** — and your progress is tracked on both server and global leaderboards.

## How You Earn XP

| Source | XP Earned | Cooldown | Conditions |
|--------|-----------|----------|------------|
| Messages | 15–25 XP | 60 seconds | Min 3 characters, no duplicate messages |
| Voice chat | 5 XP per minute | Continuous | Must be in a channel with 2+ non-bot members, not server-deafened |
| Reactions | 3 XP | 30 seconds | Cannot earn from reacting to your own messages |

> **Note:** Reaction XP is earned once per reaction per channel every 30 seconds. You cannot earn reaction XP from reacting to bot messages or your own messages.

> **Tip:** Voice XP adds up fast — a 1-hour call with friends earns you 300 XP!

### Anti-Spam

The bot has built-in protections to keep XP earning fair:
- **Cooldown:** You can only earn message XP once every 60 seconds
- **Duplicate detection:** Sending the same message repeatedly won't earn XP
- **Minimum length:** Messages must be at least 3 characters long

## How Levels Work

The XP needed to reach each level follows a simple formula: **Level² × 50**.

| Level | Total XP Required |
|-------|------------------|
| 1 | 50 |
| 5 | 1,250 |
| 10 | 5,000 |
| 20 | 20,000 |
| 30 | 45,000 |
| 50 | 125,000 |

When you level up, the bot sends a congratulations message in the channel where you earned the XP that triggered the level-up. If the economy system is enabled, you may also receive coin and gem rewards for leveling up (configured by your server admin).

## Your Rank Card

Use `/rank` to see your personalized rank card — a visual image showing:
- Your current **level** and **XP progress** bar
- **Server rank** (among all members in this server)
- **Global rank** (among all 3AT users across every server)
- Activity breakdown (messages, voice minutes, reactions)

You can also view someone else's card with `/rank user:@someone`.

## Leaderboards

Use `/leaderboard` to see who's on top. Three modes are available:

| Mode | Shows |
|------|-------|
| Server | Top members in this server by XP |
| Global | Top users across all servers by total accumulated XP |
| Servers | Top servers ranked by aggregate XP, messages, and activity |

### Period Filters

Toggle the time period using the buttons below the leaderboard:

| Period | Shows XP earned during |
|--------|----------------------|
| All Time | Total accumulated XP |
| Daily | Today (UTC) |
| Weekly | This ISO week |
| Monthly | This month |
| Yearly | This year |

The leaderboard is paginated (10 per page) and auto-disables after 60 seconds of inactivity.

## Server Rank

Use `/server-rank` to see how this server stacks up globally — total XP, member count, activity breakdown, and ranking among all servers using 3AT.

## Commands Reference

| Command | Description | Example |
|---------|-------------|---------|
| `/rank` | View your rank card | `/rank` |
| `/rank user:@someone` | View another user's rank card | `/rank user:@friend` |
| `/leaderboard` | Open the leaderboard | `/leaderboard` |
| `/server-rank` | View this server's global ranking | `/server-rank` |

## For Admins & Mods

> This section is for server administrators.

### Channel Blacklist

Prevent XP from being earned in specific channels (e.g., bot-spam channels):

| Subcommand | Description |
|------------|-------------|
| `/xp channel-blacklist add` | Disable XP earning in a channel |
| `/xp channel-blacklist remove` | Re-enable XP earning in a channel |

### XP Configuration

Server XP settings can be customized per guild. Default values:

| Setting | Default |
|---------|---------|
| XP per message | 20 |
| XP per voice minute | 5 |
| XP per reaction | 3 |
| Message cooldown | 60 seconds |
| Min message length | 3 characters |
| XP system enabled | Yes |
