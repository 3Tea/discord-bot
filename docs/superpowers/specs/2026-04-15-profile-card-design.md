# Profile Card — Design Spec

> `/profile [@user]` command showing a comprehensive user summary. Free users get an embed, Star tier gets a canvas image, Galaxy tier gets a premium canvas with effects.

## Context

Users currently need to run multiple commands to see their stats (`/balance`, `/rank`, `/quest view`, `/wallet view`). A single `/profile` command consolidates everything into one view, creating a "business card" users want to show off.

## Command

`/profile` with optional `user` parameter. If omitted, shows the invoker's profile. Read-only — no freeze check needed.

```
/profile              → own profile
/profile user:@someone → someone else's profile
```

No subcommands. No customization options (kept simple for v1).

## Output by Premium Tier

| Tier | Format | Details |
|---|---|---|
| **Free** | Discord embed | Multi-field embed with all stats |
| **Star** | Canvas image (basic) | 934×282 image, anime theme, clean layout (same dimensions/style as rank card) |
| **Galaxy** | Canvas image (premium) | Same layout + gold glow effects, gradient background, Galaxy badge |

Canvas rendering uses `@napi-rs/canvas` with embed fallback if canvas fails (same pattern as rank card).

## Stats Displayed

All stats are per-server unless noted.

| Category | Field | Source | Notes |
|---|---|---|---|
| XP & Level | Level | `MemberXP.level` | |
| | XP progress | `MemberXP.xp` + `xpForLevel()` | Progress bar to next level |
| | Server rank | `MemberXP` sorted by XP desc | Position in server |
| Economy | Coin | `UserEconomy.coin` | |
| | Gem | `UserEconomy.gem` | |
| Global | Star | `UserWallet.star` | Cross-server |
| Streaks | Pray streak | `UserEconomy.prayStreak` | |
| | Quest streak | `UserQuest.questStreak` | From most recent quest doc |
| Activity | Messages | `MemberXP.messageCount` | |
| | Voice time | `MemberXP.voiceMinutes` | Formatted as `Xh Ym` |
| | Reactions | `MemberXP.reactionCount` | |
| Meta | Member since | `GuildMember.joinedAt` | Discord join date |
| | Premium tier | `PremiumService.getConfig()` | Badge: none / Star / Galaxy |

## Embed Layout (Free Tier)

```
┌──────────────────────────────────────────┐
│ 👤 Profile — username        [avatar]    │
│ ──────────────────────────────────────── │
│                                          │
│ ⚔️ Level & Rank          💰 Economy     │
│ Level 24                  12,500 coin    │
│ ████████░░ 67%           8 gem          │
│ Rank #5                   45 ⭐          │
│                                          │
│ 🔥 Streaks               📊 Activity    │
│ Pray: 14 days             2,340 msgs    │
│ Quest: 7 days             48h 30m voice │
│                           156 reactions  │
│                                          │
│ 📅 Member since: Jan 15, 2024           │
└──────────────────────────────────────────┘
```

Uses 4 inline fields (2 columns), footer for member-since. Author line shows username + avatar.

## Canvas Layout (Star / Galaxy)

Reuse the established canvas pattern from `canvasRankCard.ts`:

**Dimensions:** 934×282 px (same as rank card for consistency)

**Layout:**
- **Left**: Circular avatar (80px radius), username below
- **Center**: Stats grid in 2 rows
  - Row 1: Level + XP bar, Server Rank
  - Row 2: Coin, Gem, Star (3 stat cards)
- **Right**: Streaks + Activity column
  - Pray streak, Quest streak
  - Messages, Voice time
- **Bottom-right**: Premium badge (reuse `drawPremiumBadge`)
- **Bottom-left**: Member since date

**Star theme:**
- Anime background (reuse `drawAnimeBackground`)
- Default accent colors from canvasHelpers
- Standard stat cards (reuse `drawStatCard`)

**Galaxy theme:**
- Gold/purple gradient accents (reuse `GALAXY` color scheme from canvasRankCard)
- Border glow effect
- Premium Galaxy badge
- Same layout, elevated visual treatment

**Reusable helpers from `canvasHelpers.ts`:**
- `drawAnimeBackground`, `drawCircularImage`, `drawNameBlock`
- `drawStatCard`, `drawXPBar`, `drawDivider`
- `drawPremiumBadge`, `drawLevelBox`, `drawRankBadge`
- `formatVoice`, `roundRect`, `shadow`, `clearShadow`

## Data Flow

1. Guild-only check → `deferReply()`
2. Resolve locale, resolve target user (self or mentioned)
3. Parallel fetch all data:
   ```
   Promise.all([
     MemberXPModel.findOne({ guildId, userId }),
     UserEconomyModel.findOne({ guildId, userId }),
     UserWalletModel.findOne({ userId }),
     UserQuestModel.findOne({ userId }).sort({ date: -1 }),
     PremiumService.getConfig(userId),
     // Server rank: count users with more XP
     MemberXPModel.countDocuments({ guildId, xp: { $gt: userXP } }),
   ])
   ```
4. Check premium tier
5. **Free**: build embed via `profileEmbed.ts` → `Reply.embedEdit()`
6. **Star/Galaxy**: render canvas via `canvasProfile.ts` → `interaction.editReply({ files: [attachment] })`
7. Canvas fallback: if render throws, fall back to embed

## Files to Create

| File | Purpose |
|---|---|
| `src/commands/slash/profile.ts` | Slash command — data fetch, tier routing, reply |
| `src/util/profile/profileEmbed.ts` | Embed builder for free tier |
| `src/util/profile/canvasProfile.ts` | Canvas renderer for Star/Galaxy tiers |

## Files to Modify

| File | Change |
|---|---|
| `src/util/help/commandCategories.ts` | Add `profile: "general"` |
| `src/locales/*.json` (15 files) | Add `cmd.profile.desc`, `profile.*` keys |

## i18n Keys

```
cmd.profile.desc              — "View your profile card"
cmd.profile.user.desc         — "User to view"
profile.title                 — "Profile — {{username}}"
profile.level_rank            — "Level & Rank"
profile.economy               — "Economy"
profile.streaks               — "Streaks"
profile.activity              — "Activity"
profile.level                 — "Level {{level}}"
profile.rank                  — "Rank #{{rank}}"
profile.xp_progress           — "{{current}}/{{next}} XP"
profile.coin                  — "{{amount}} coin"
profile.gem                   — "{{amount}} gem"
profile.star                  — "{{amount}} ⭐"
profile.pray_streak           — "Pray: {{days}} days"
profile.quest_streak          — "Quest: {{days}} days"
profile.messages              — "{{count}} msgs"
profile.voice                 — "{{time}} voice"
profile.reactions             — "{{count}} reactions"
profile.member_since          — "Member since {{date}}"
profile.no_data               — "No data yet. Start using commands to build your profile!"
```

## Edge Cases

- **User has no data** (never used bot): Show "No data yet" message instead of empty fields
- **Canvas fails**: Fall back to embed silently (log warning)
- **Viewing someone else**: Works the same, but uses target's data. Premium tier check is on the **invoker** (person running the command), not the target — you see your own tier's rendering quality
- **DM**: Guild-only command, reply with `common.guild_only`

## Not in Scope (v1)

- Customization (bio, colors, background selection)
- Privacy toggles (hide/show stats)
- Achievement badges (separate feature later)
- Profile command in DMs (global-only view)
