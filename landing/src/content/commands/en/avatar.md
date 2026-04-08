---
title: Avatar
command: avatar
category: info
description: Get the avatar URL of any user, or your own avatar.
---

## Usage

```
/avatar
/avatar target:@username
```

## Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `target` | User | No | The user whose avatar to display. Defaults to yourself. |

Returns the selected user's avatar as a high-resolution PNG image (2048px). If no user is specified, shows your own avatar.
