---
title: Economy Management
command: economy
category: economy
description: Admin commands to set or adjust user coin and gem balances.
permissions: ["Administrator"]
---

## Subcommands

| Subcommand | Description | Example |
|------------|-------------|---------|
| `/economy set-coin <user> <amount>` | Set user's coin balance | `/economy set-coin @user 1000` |
| `/economy add-coin <user> <amount>` | Add (or subtract) coins | `/economy add-coin @user 500` |
| `/economy set-gem <user> <amount>` | Set user's gem balance | `/economy set-gem @user 10` |
| `/economy add-gem <user> <amount>` | Add (or subtract) gems | `/economy add-gem @user 5` |

Use negative amounts with `add-coin` / `add-gem` to subtract currency.

> **Warning:** Only members with **Administrator** permission can use these commands. All transactions are logged.
