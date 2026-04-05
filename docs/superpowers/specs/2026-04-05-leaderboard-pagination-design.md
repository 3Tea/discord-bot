# Leaderboard Pagination Design

## Overview

Add button-based pagination to `/leaderboard` command. Currently shows a fixed top 10; this adds Previous/Next buttons to navigate up to top 100 users, 10 per page.

## Behavior

1. User runs `/leaderboard` (server or global mode)
2. Bot queries top 100 records in one DB call, caches in memory
3. Displays page 1 embed with navigation buttons: `Previous | Page 1/N | Next`
4. Previous disabled on page 1, Next disabled on last page, page indicator always disabled (display only)
5. Only the user who ran the command can interact with buttons
6. Buttons expire after 60 seconds — all buttons become disabled

## Data Flow

- **Server mode**: `MemberXPModel.find({ guildId }).sort({ xp: -1 }).limit(100)` — single query, slice in memory
- **Global mode**: `UserModel.find().sort({ totalPoint: -1 }).limit(100)` — single query, resolve display names for current page only (lazy), slice in memory
- **Page slice**: `results.slice((page - 1) * 10, page * 10)`
- **Total pages**: `Math.ceil(results.length / 10)`, max 10

## Global Mode: Display Name Resolution

For global leaderboard, display names are resolved per-page (not all 100 upfront) to minimize API calls. When user navigates to a new page, resolve names for that page's 10 users only. Cache resolved names in a local Map so revisiting a page doesn't re-fetch.

## Button Layout

```
[ ◀ Previous ] [ Page 1/10 ] [ Next ▶ ]
```

- CustomIds: `lb_prev`, `lb_next`, `lb_page` (local to collector, not registered as BUTTON_ID)
- Style: `Previous`/`Next` = Secondary, `Page X/Y` = Primary (disabled)

## Collector

- `message.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60_000 })`
- Filter: `i.user.id === interaction.user.id`
- On collect: update page, slice data, editReply with new embed + updated buttons
- On end: editReply with all buttons disabled

## Embed Changes

`buildLeaderboardEmbed()` and `buildGlobalLeaderboardEmbed()` receive `page` and `totalPages` params:
- Rank numbers offset by page: `#((page - 1) * 10 + i + 1)`
- Footer shows page info: "Page X/Y"

## Files Changed

| File | Change |
|------|--------|
| `src/commands/slash/leaderboard.ts` | Add collector, buttons, pagination logic |
| `src/util/xp/rankCard.ts` | Add `page`/`totalPages` params to embed builders |
| `src/locales/en.json` | Add `leaderboard.prev`, `leaderboard.next`, `leaderboard.page_footer` |
| `src/locales/vi.json` | Same keys, Vietnamese translations |

## Files NOT Changed

- No new button handler files
- No new BUTTON_ID constants
- No model/schema changes

## Constraints

- Max 100 users (10 pages)
- 10 users per page
- 60-second button timeout
- Only command invoker can use buttons
