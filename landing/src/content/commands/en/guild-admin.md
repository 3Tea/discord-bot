---
title: Guild Admin
command: guild-admin
category: rpg
description: Manage branch guild settings for your server — setup, configure, and disband.
permissions: ["Administrator"]
---

## Overview

The `/guild-admin` command lets server administrators create and manage a branch guild for their Discord server. Branch guilds enable weekly co-op quests and monthly competitive events for server members.

## Subcommands

| Subcommand | Description | Permission |
|------------|-------------|------------|
| `/guild-admin setup` | Set up a branch guild for this server | Administrator |
| `/guild-admin config` | Configure branch guild settings | Administrator |
| `/guild-admin disband` | Disband this server's branch guild | Administrator |

## Setting Up

Use `/guild-admin setup` to create a branch guild for your server. You can optionally provide a custom name.

```
/guild-admin setup
/guild-admin setup name:Dragon Slayers
```

Once set up, all server members who have joined the Adventurer Guild (via `/guild register`) can participate in branch activities.

## Configuration

Use `/guild-admin config` to adjust branch guild settings. Available options depend on your branch guild's current state and features.

## Disbanding

Use `/guild-admin disband` to permanently remove the branch guild from your server. This action requires confirmation and cannot be undone.

> **Warning:** Disbanding removes all branch guild data including quest progress and event history for this server.

## What Branch Guilds Enable

- **Weekly co-op quests** — collaborative goals that all branch members work toward together
- **Monthly competitive events** — your server competes against other servers for rankings and rewards
- Members view branch info via `/guild branch` and events via `/guild event`

> **Tip:** Set up a branch guild early to let your members participate in weekly quests and monthly events. The competitive events are a great way to build server community.
