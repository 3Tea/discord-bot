---
title: Moderation
description: Timeout, ban, kick, and unban members with proper permission checks.
icon: "🛡️"
order: 5
relatedCommands: ["moderation"]
---

## Overview

3AT provides moderation commands to help keep your server safe. All commands enforce **role hierarchy** — you can only moderate members whose highest role is below yours.

## Commands

| Subcommand | Description | Permission Required |
|------------|-------------|-------------------|
| `/moderation timeout` | Mute a member in text and voice | Moderate Members |
| `/moderation untimeout` | Remove a timeout | Moderate Members |
| `/moderation ban` | Ban a member from the server | Ban Members |
| `/moderation kick` | Kick a member from the server | Kick Members |
| `/moderation unban` | Unban a user by their ID | Ban Members |

## Timeout

Temporarily mute a member in both text and voice channels.

```
/moderation timeout user:@member duration:1h reason:Spam
```

| Duration Options |
|-----------------|
| 1 minute to 28 days |

The member is automatically unmuted when the timeout expires. Use `/moderation untimeout` to remove it early.

## Ban

Permanently remove a member from the server. Optionally delete their recent messages.

```
/moderation ban user:@member reason:Repeated violations
```

> **Tip:** Discord allows deleting up to 7 days of messages from a banned user.

## Kick

Remove a member from the server — they can rejoin with a new invite.

```
/moderation kick user:@member reason:Warning
```

## Unban

Lift a ban using the user's ID (snowflake). You need the numeric ID since banned users aren't in the server.

```
/moderation unban user_id:123456789012345678 reason:Appeal accepted
```

> **Tip:** Find user IDs by enabling Developer Mode in Discord settings, then right-clicking a user → Copy User ID.

## Safety Checks

Every moderation action goes through these checks:

| Check | Rule |
|-------|------|
| Self-target | You cannot moderate yourself |
| Bot target | You cannot moderate bots |
| Owner protection | The server owner cannot be moderated (except by themselves) |
| Role hierarchy | Your highest role must be above the target's highest role |
| Bot hierarchy | The bot's role must be above the target's role |
| Reason length | Truncated to 512 characters (Discord API limit) |

All actions are recorded in Discord's **audit log** with the reason you provide.

## Best Practices

- **Always provide a reason** — it shows in the audit log and helps your mod team understand decisions
- **Escalate gradually:** timeout → kick → ban. Give members a chance to correct behavior
- **Use timeout first** for minor offenses — it's temporary and less disruptive than a kick or ban
- **Document your rules** in a server rules channel so members know what to expect
