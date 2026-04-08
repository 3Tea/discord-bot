---
title: Leaderboard
command: leaderboard
category: xp
description: Paginated XP leaderboard with period filtering and multiple display modes.
---

## Usage

```
/leaderboard
/leaderboard mode:global
/leaderboard mode:servers
```

## Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `mode` | Choice | No | `server` (default), `global`, or `servers` |

## Modes

| Mode | Shows |
|------|-------|
| **Server** | Top members in the current server by XP |
| **Global** | Top users across all servers using 3AT |
| **Servers** | Top servers ranked by total XP |

## How to Use

### Step 1: Run the command

Use `/leaderboard` for the default server leaderboard, or choose a mode.

### Step 2: Filter by period

After the leaderboard appears, use the **period buttons** to filter:
- **All Time** — Total accumulated XP
- **Daily** — XP earned today
- **Weekly** — XP earned this week (ISO week)
- **Monthly** — XP earned this month
- **Yearly** — XP earned this year

### Step 3: Navigate pages

Use **Prev** and **Next** buttons to browse. Each page shows 10 entries, up to 100 total.

> **Tip:** Buttons expire after **60 seconds** of inactivity. Run the command again to get fresh buttons.
