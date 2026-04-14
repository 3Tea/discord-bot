---
title: Global Shop
command: global-shop
category: economy
description: Browse and buy exclusive items with stars — your cross-server currency.
---

## Subcommands

| Subcommand | Description | Example |
|------------|-------------|---------|
| `/global-shop view` | Browse the item catalog | `/global-shop view` |
| `/global-shop buy <item-id>` | Purchase an item | `/global-shop buy item-id:badge_gold quantity:1` |

## How to Use

### Step 1: Browse the catalog

Use `/global-shop view` to see available items. Each item shows its name, ID, star price, and stock status. You can filter by type:

- `cosmetic_identity` — Cosmetic and identity customization items
- `utility_token` — Functional utility tokens

Use the `page` option to navigate through the catalog (8 items per page).

### Step 2: Buy an item

Use `/global-shop buy item-id:<id>` to purchase. You can buy up to 10 at once with the `quantity` option.

The purchase deducts stars from your global wallet. If the item has limited stock, it's first-come-first-served.

### Protections

- **3-second cooldown** between purchases to prevent accidental double-buys
- **Duplicate detection** — the same purchase request can't be processed twice
- **Automatic refund** — if anything goes wrong during purchase, your stars are returned

> **Tip:** Check your star balance with `/wallet view` before shopping. Earn stars through `/wallet daily`, activity drops, and achievement milestones — see the [Star Guide](/en/guide/star) for details.
