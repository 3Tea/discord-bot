---
title: Global Wallet
command: wallet
category: economy
description: View your global star balance, claim daily rewards, and track transaction history across all servers.
---

## Usage

```
/wallet view
/wallet daily
/wallet history page:2
```

## Subcommands

| Subcommand | Description |
|------------|-------------|
| `view` | View your star balance, daily streak, and milestones claimed |
| `daily` | Claim your daily star reward (resets at UTC midnight) |
| `history` | View paginated global transaction history |

## Star Currency

**Star** is a global currency completely separate from per-server coins and gems:

- **Bot-controlled** — no admin can add or remove stars
- **Global** — your star balance is the same across all servers
- **No exchange** — stars cannot be converted to/from coins or gems
- **No transfer** — stars cannot be sent to other users

## Daily Claim

Claim 1–3 stars every day. Claiming on consecutive days builds a **streak** with milestone bonuses:

| Streak | Bonus Stars |
|--------|-------------|
| 3 days | +2 |
| 7 days | +5 |
| 14 days | +10 |
| 30 days | +20 |

> **Warning:** Missing a single day resets your streak to zero!

## Achievement Milestones

Earn one-time star rewards for reaching milestones across any server:

| Achievement | Stars |
|-------------|-------|
| Reach level 10 | 5 |
| Reach level 25 | 15 |
| Reach level 50 | 30 |
| Reach level 100 | 50 |
| 7-day pray streak | 3 |
| 14-day pray streak | 8 |
| 30-day pray streak | 20 |
| Top 3 XP leaderboard | 10 |
| Active in 3 servers | 5 |
| Active in 5 servers | 10 |
| Active in 10 servers | 20 |

## Transaction History

Use `/wallet history` to see all star earnings and spending. Each entry shows the timestamp, type, and amount. Paginated at 10 entries per page.
