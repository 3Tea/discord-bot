---
title: XP Management
command: xp
category: xp
description: Admin commands to manage user XP and configure channel blacklists.
permissions: ["Manage Guild"]
---

## Subcommands

| Subcommand | Description | Example |
|------------|-------------|---------|
| `/xp set <user> <amount>` | Set a user's XP to an exact amount | `/xp set @user 5000` |
| `/xp add <user> <amount>` | Add XP to a user | `/xp add @user 500` |
| `/xp remove <user> <amount>` | Remove XP from a user | `/xp remove @user 200` |
| `/xp channel-blacklist add <channel>` | Blacklist a channel from XP gains | `/xp channel-blacklist add #spam` |
| `/xp channel-blacklist remove <channel>` | Remove a channel from the blacklist | `/xp channel-blacklist remove #spam` |

## How to Use

### Managing User XP

Use `set` to override, `add` to reward, or `remove` to penalize. Changes are reflected immediately in the user's rank card and leaderboard position.

### Channel Blacklists

Messages sent in blacklisted channels do not earn XP. This is useful for spam channels, bot command channels, or off-topic areas.

> **Warning:** Only members with the **Manage Guild** permission can use these commands.
