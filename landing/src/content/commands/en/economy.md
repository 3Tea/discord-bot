---
title: Economy Management
command: economy
category: economy
description: Admin tools for managing your server's economy — currency, config, dashboard, audit, reset, bulk operations.
permissions: ["Administrator"]
---

## Subcommand Groups

### Balance — Manage user currency

| Subcommand | Description | Example |
|------------|-------------|---------|
| `/economy balance set-coin <user> <amount>` | Set user's coin balance | `/economy balance set-coin @user 1000` |
| `/economy balance add-coin <user> <amount>` | Add (or subtract) coins | `/economy balance add-coin @user 500` |
| `/economy balance set-gem <user> <amount>` | Set user's gem balance | `/economy balance set-gem @user 10` |
| `/economy balance add-gem <user> <amount>` | Add (or subtract) gems | `/economy balance add-gem @user 5` |

### Config — Configure economy subsystems

| Subcommand | Description |
|------------|-------------|
| `/economy config reward-view` | View passive reward settings |
| `/economy config reward-toggle` | Enable/disable passive rewards |
| `/economy config reward-set <setting> <value>` | Adjust reward values |
| `/economy config reward-milestone <level> <gems>` | Set/remove gem milestones |
| `/economy config gambling-view/toggle/set` | Manage gambling settings |
| `/economy config work-view/toggle/set` | Manage work/fish settings |
| `/economy config social-view/toggle/set` | Manage gift/rob settings |

### Admin — Dashboard, audit, and management tools

| Subcommand | Description | Example |
|------------|-------------|---------|
| `/economy admin dashboard` | View economy overview, health metrics, anomaly alerts | `/economy admin dashboard` |
| `/economy admin history <user>` | View user's transaction history (paginated) | `/economy admin history @user type:gambling` |
| `/economy admin reverse <id>` | Undo a specific transaction | `/economy admin reverse abc123` |
| `/economy admin freeze <user>` | Lock user's economy access | `/economy admin freeze @user reason:suspected exploit` |
| `/economy admin unfreeze <user>` | Unlock user's economy access | `/economy admin unfreeze @user` |
| `/economy admin reset <scope>` | Reset economy with auto-snapshot | `/economy admin reset scope:coin` |
| `/economy admin rollback <id>` | Restore from a snapshot | `/economy admin rollback a1b2c3d4` |
| `/economy admin log-setup <channel>` | Set economy log channel | `/economy admin log-setup #economy-logs` |
| `/economy admin log-config <setting> <value>` | Configure log thresholds | `/economy admin log-config coin-threshold 1000` |

### Bulk — Mass currency operations

| Subcommand | Description | Example |
|------------|-------------|---------|
| `/economy bulk distribute <amount> <currency>` | Distribute currency to members | `/economy bulk distribute 100 coin role:@Active` |
| `/economy bulk tax <amount> <currency>` | Collect currency from members | `/economy bulk tax 50 coin` |

> **Warning:** Reset and bulk operations have confirmation gates. Reset auto-creates a snapshot for rollback. Bulk operations have a 60-second cooldown.
