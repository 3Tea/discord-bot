---
title: Shop
command: shop
category: economy
description: Browse and purchase server shop items, or manage the shop as an admin.
---

## Subcommands

| Subcommand | Description | Permission |
|------------|-------------|------------|
| `/shop view` | Browse available items (paginated) | Everyone |
| `/shop buy <item_id>` | Purchase an item by ID | Everyone |
| `/shop add` | Add a new item to the shop | Administrator |
| `/shop remove <item_id>` | Remove an item from the shop | Administrator |

## How to Use

### Browsing the Shop

Use `/shop view` to see available items. Items are displayed 5 per page with pagination buttons. Each item shows its name, description, price, currency type, and remaining stock.

### Buying Items

Use `/shop buy` with the item's ID (shown in the shop listing). The item's cost is deducted from your coin or gem balance.

### Managing the Shop (Admin)

#### Adding Items

`/shop add` prompts you for:
- **Name** and **description**
- **Type:** `role` (assigns a Discord role), `cosmetic`, or `currency_exchange`
- **Price** and **currency** (coin or gem)
- **Role** (required if type is `role`)
- **Stock** (optional — unlimited if not set)

#### Removing Items

`/shop remove` deletes an item by its ID. Existing purchases are not affected.

> **Warning:** Only members with **Administrator** permission can add or remove shop items.
