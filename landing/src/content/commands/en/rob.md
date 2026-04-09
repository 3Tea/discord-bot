---
title: Rob
command: rob
category: economy
description: Attempt to rob coins from another user — risky PvP with protections.
cooldown: "6h (configurable)"
---

## Usage

```
/rob user:@username
```

## Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `user` | User | Yes | The user to attempt robbing |

## How It Works

Attempt to steal coins from another user. It's risky — you might get caught!

### Success (40% chance)
Steal **10–30%** of the target's coin balance. The stolen coins are transferred to you.

### Failure (60% chance)
You get caught and fined **10–20%** of your own balance. The fine is destroyed (not given to anyone).

### Protections
- **Minimum balance:** Cannot rob users with less than 100 coins
- **Immunity:** Users who were just robbed get 2 hours of immunity
- **Cooldown:** 6-hour cooldown between rob attempts

> **Warning:** On average, robbing loses you coins over time (it's a coin sink). Use it for the thrill, not as an income strategy!

### Server Config
Admins can configure cooldown, min balance, immunity duration via `/economy social-config-*` commands.
