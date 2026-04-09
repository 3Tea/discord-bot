---
title: Info & Help
description: Get help with commands, view bot and server stats, and grab user avatars.
icon: "ℹ️"
order: 8
relatedCommands: ["help", "info", "avatar"]
---

## Overview

Need help finding a command? Want to see bot stats or grab someone's avatar? These information commands have you covered.

## Help

Use `/help` to browse all available commands. The response shows a categorized list of every command with a brief description.

> **Tip:** Click on a command name in the help list to learn more about it!

## Info

Use `/info bot` to see bot statistics:

| Stat | Description |
|------|-------------|
| Version | Current bot version |
| Uptime | How long the bot has been running |
| Servers | Total number of servers the bot is in |
| Members | Total member count across all servers |
| Tech Stack | Node.js, Discord.js, Mongoose, ioredis |

## Avatar

Use `/avatar` to get a user's avatar in full resolution.

```
/avatar
/avatar target:@someone
```

The response shows the avatar image with a direct download link. If no user is specified, it shows your own avatar.

## Commands Reference

| Command | Description | Example |
|---------|-------------|---------|
| `/help` | Browse all commands | `/help` |
| `/info bot` | View bot statistics | `/info bot` |
| `/avatar` | Get your avatar | `/avatar` |
| `/avatar target:@user` | Get another user's avatar | `/avatar target:@friend` |
