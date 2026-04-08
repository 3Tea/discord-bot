---
title: Voice Channel Management
command: voice
category: voice
description: Create and manage temporary voice channels with full control over permissions, naming, and user access.
cooldown: "5s–120s"
---

## Subcommands

| Subcommand | Description | Example |
|------------|-------------|---------|
| `/voice limit <number>` | Set user limit (0–99, 0 = unlimited) | `/voice limit 5` |
| `/voice name <text>` | Rename your channel (max 50 chars) | `/voice name Gaming Room` |
| `/voice lock` | Lock channel — deny everyone from joining | `/voice lock` |
| `/voice unlock` | Unlock channel — allow everyone to join | `/voice unlock` |
| `/voice hide` | Hide channel from everyone in the server | `/voice hide` |
| `/voice permit <user>` | Allow a specific user to join | `/voice permit @friend` |
| `/voice block <user>` | Block a user and disconnect them | `/voice block @troll` |
| `/voice kick <user>` | Kick a user with a confirmation prompt | `/voice kick @user` |
| `/voice transfer <user>` | Transfer room ownership to another user | `/voice transfer @friend` |

## How to Use

### Step 1: Join the trigger channel

Join the designated voice channel in any server using 3AT. A personal voice room is automatically created for you — you are the **owner**.

### Step 2: Customize your room

Use `/voice name` to rename your room and `/voice limit` to set the maximum number of users.

> **Tip:** Set limit to `0` to remove the user cap entirely.

### Step 3: Control access

- `/voice lock` — Prevents everyone from joining.
- `/voice hide` — Makes the channel invisible to non-members.
- `/voice permit @user` — Whitelist a specific user (works even when locked/hidden).
- `/voice block @user` — Ban a user from your room and disconnect them immediately.

### Step 4: Kick or transfer

- `/voice kick @user` — Shows a confirmation button. You can optionally block them at the same time.
- `/voice transfer @user` — Hands ownership to another user. Your permit and block lists are cleared.

### Step 5: Leave

When everyone leaves the room, it is automatically deleted. Your ownership data expires after 12 hours of inactivity.

> **Warning:** Name and limit changes have a **120-second** cooldown. All other commands have a **5-second** cooldown. You must be the room owner to use these commands.
