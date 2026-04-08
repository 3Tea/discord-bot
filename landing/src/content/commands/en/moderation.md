---
title: Moderation
command: moderation
category: moderation
description: Staff moderation suite — timeout, ban, kick, and unban with permission hierarchy enforcement.
permissions: ["Moderate Members", "Ban Members", "Kick Members"]
---

## Subcommands

| Subcommand | Description | Required Permission |
|------------|-------------|---------------------|
| `/moderation timeout <user> <duration> <unit>` | Mute a member (text + voice) | Moderate Members |
| `/moderation untimeout <user>` | Remove an active timeout | Moderate Members |
| `/moderation ban <user> [reason] [delete_messages]` | Ban a member from the server | Ban Members |
| `/moderation kick <user> [reason]` | Kick a member from the server | Kick Members |
| `/moderation unban <user_id>` | Unban by user ID | Ban Members |

## How to Use

### Timeout

```
/moderation timeout user:@troll duration:30 unit:minutes reason:Spamming
```

Mutes the user in both text and voice for the specified duration. Maximum duration is **28 days**. The `unit` option accepts: `minutes`, `hours`, or `days`.

### Ban

```
/moderation ban user:@user reason:Rule violation delete_messages:86400
```

The `delete_messages` option removes the user's messages from the past N seconds (max 604800 = 7 days). Set to `0` to keep messages.

### Unban

```
/moderation unban user_id:123456789012345678
```

Requires the user's **numeric ID** (snowflake), not a mention.

> **Warning:** The bot enforces **role hierarchy** — you cannot moderate members with a role equal to or higher than yours. The guild owner bypasses all hierarchy checks.
