---
title: Gift
command: gift
category: economy
description: Gift coins to another user — direct transfer with a configurable max amount.
---

## Usage

```
/gift user:@username amount:100
```

## Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `user` | User | Yes | The user to gift coins to |
| `amount` | Integer | Yes | Amount of coins to gift |

## How It Works

Send coins directly to another user. The transfer is instant and shows both users' before/after balances.

- Cannot gift to bots or yourself
- Maximum gift amount is **1,000 coins** per transaction (configurable by admins)
- No cooldown — gift as often as you like

> **Note:** Gift amounts are capped to prevent abuse. Admins can adjust the max via `/economy social-config-*`.
