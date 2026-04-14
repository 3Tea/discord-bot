---
title: Global Shop
description: Buy exclusive items with stars — cosmetics, utilities, and more from the cross-server shop.
icon: "🛒"
order: 4
relatedCommands: ["global-shop", "global-inventory", "wallet"]
---

## Overview

The **Global Shop** is 3AT's cross-server item store. Unlike per-server shops that use coins, the global shop uses **stars** ⭐ — your global currency that works across all servers.

Items you purchase are stored in your **global inventory** and are available everywhere.

## Item Types

| Type | Description | Examples |
|------|-------------|---------|
| Cosmetic Identity | Visual customization items | Badges, titles, profile decorations |
| Utility Token | Functional items with effects | Boosters, special access tokens |

Items may have **limited stock** — once sold out, they're gone until restocked. Check the shop regularly for new additions.

## How to Buy

### Step 1: Check your star balance

Use `/wallet view` to see how many stars you have. If you need more, earn them through:
- `/wallet daily` — 1-3 stars per day (+ streak bonuses)
- Activity drops from pray, curse, work, fish, mine, dungeon
- Achievement milestones

See the [Star Guide](/en/guide/star) for the full breakdown.

### Step 2: Browse the catalog

```
/global-shop view
```

Browse available items with their prices and stock. Filter by type with the `type` option, or navigate pages with `page`.

### Step 3: Purchase

```
/global-shop buy item-id:badge_gold
```

Specify the item ID and optionally a quantity (1-10). Stars are deducted immediately. If the purchase fails for any reason, your stars are automatically refunded.

### Protections

- **3-second cooldown** between purchases prevents accidental double-buys
- **Duplicate detection** ensures the same purchase can't process twice
- **Automatic refund** if anything goes wrong mid-purchase

## Checking Your Inventory

Use `/global-inventory view` to see everything you own. Items are sorted by most recently purchased, with 10 items per page.

## Commands Reference

| Command | Description |
|---------|-------------|
| `/global-shop view` | Browse the item catalog (filter by type, paginated) |
| `/global-shop buy item-id:<id>` | Purchase an item (optional quantity 1-10) |
| `/global-inventory view` | View your owned items (paginated) |
| `/wallet view` | Check your star balance |
