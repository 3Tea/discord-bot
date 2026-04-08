---
title: Voice Channels
description: Create your own temporary voice channel and control who can join, see, and use it.
icon: "🎙️"
order: 3
relatedCommands: ["voice"]
---

## Overview

3AT lets you create **temporary voice channels** that you fully own and control. Join a trigger channel, get your own private room, and manage access with buttons or slash commands.

## Getting Started

### Step 1: Join the trigger channel

Look for a voice channel whose name starts with **"3AT "** (e.g., "3AT Join to Create"). When you join it, the bot instantly creates a personal voice channel for you.

### Step 2: You're the owner

Your new channel appears with a **"* "** prefix (e.g., "* Gaming Room"). You'll also see a **control panel** message with buttons for managing your room.

### Step 3: Customize and play

Rename your room, set a user limit, lock it down, or invite friends. When everyone leaves, the channel is automatically deleted.

## Control Panel

When your channel is created, a control panel with buttons appears. Here's what each button does:

| Button | Action | Cooldown |
|--------|--------|----------|
| 🔒 Lock | Prevent everyone from joining | 5s |
| 🔓 Unlock | Allow everyone to join again | 5s |
| 👁️ Hide | Make channel invisible to others | 5s |
| 👤 Permit | Allow a specific user to join (even when locked/hidden) | 5s |
| 🚫 Block | Block a user and disconnect them | 5s |
| 👢 Kick | Kick a user with option to also block | 5s |
| 🔄 Transfer | Transfer ownership to someone else | 5s |
| ✏️ Rename | Change your channel name (max 50 chars) | 120s |
| 🔢 Limit | Set maximum users (0–99, 0 = unlimited) | 120s |

> **Tip:** Permit overrides both Lock and Hide — permitted users can always join and see your channel.

## Slash Commands

You can also use `/voice` subcommands instead of the panel buttons:

| Subcommand | Description | Example |
|------------|-------------|---------|
| `/voice lock` | Lock your channel | `/voice lock` |
| `/voice unlock` | Unlock your channel | `/voice unlock` |
| `/voice hide` | Hide your channel | `/voice hide` |
| `/voice permit` | Allow a user | `/voice permit user:@friend` |
| `/voice block` | Block a user | `/voice block user:@troll` |
| `/voice kick` | Kick a user | `/voice kick user:@someone` |
| `/voice transfer` | Transfer ownership | `/voice transfer user:@friend` |
| `/voice name` | Rename channel | `/voice name text:Gaming Room` |
| `/voice limit` | Set user limit | `/voice limit number:5` |

## Things to Know

- **Ownership expires** after 12 hours of inactivity
- **Channels auto-delete** when empty (or only bots remain)
- You **cannot** target yourself for permit, block, kick, or transfer
- **Kick** shows a confirmation — you can choose "Kick only" or "Kick & Block"
- **Transfer** clears your permit and block lists — the new owner starts fresh
- Voice chat in your channel earns **Voice XP** (5 XP/min when 2+ humans are present)

## For Admins & Mods

> This section is for server administrators.

### Setting Up Trigger Channels

To enable temporary voice channels in your server:

1. Create a voice channel with a name starting with **"3AT "** (e.g., "3AT Join to Create")
2. That's it — when any member joins this channel, the bot will create a temporary room for them

You can create multiple trigger channels (e.g., one per category) if you'd like.

> **Tip:** Place the trigger channel at the top of a voice category so members find it easily.
