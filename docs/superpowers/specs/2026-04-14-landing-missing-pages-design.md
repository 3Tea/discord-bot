# Landing Site Missing Pages — Design Spec

## Goal

Add 3 missing command pages (premium, global-shop, global-inventory), 1 new guide (Global Shop), and register them in the landing site metadata files.

## Files to Create

### Command Pages (6 files — EN + VI)

**`landing/src/content/commands/{en,vi}/premium.md`**
- category: `economy`
- Subcommands: `status` (view your tier, expiry, benefits), `compare` (side-by-side Free vs Star vs Galaxy)
- Do NOT document admin subcommands (grant/revoke/lookup)

**`landing/src/content/commands/{en,vi}/global-shop.md`**
- category: `economy`
- Subcommands: `view` (browse catalog, optional page + type filter), `buy` (purchase by item-id, optional quantity 1-10)
- Mention: star currency, item types (cosmetic, utility), stock limits, 3s cooldown between purchases

**`landing/src/content/commands/{en,vi}/global-inventory.md`**
- category: `economy`
- Subcommands: `view` (paginated list of owned items, sorted by most recently obtained)

### Guide Page (2 files — EN + VI)

**`landing/src/content/guides/{en,vi}/global-shop.md`**
- icon: "🛒"
- order: 4 (after premium)
- relatedCommands: ["global-shop", "global-inventory", "wallet"]
- Sections: Overview, Item Types (cosmetic_identity + utility_token), How to Buy (step-by-step), Checking Your Inventory, link to Star Guide for earning stars

### Files to Edit

**`landing/src/data/commands.ts`** — add 3 entries:
```typescript
{ name: "premium", description: "View your premium status or compare tier benefits", category: "economy", subcommands: ["status", "compare"] }
{ name: "global-shop", description: "Browse and buy exclusive items with stars", category: "economy", subcommands: ["view", "buy"] }
{ name: "global-inventory", description: "View your purchased global items", category: "economy", subcommands: ["view"] }
```

**`landing/src/data/guides.ts`** — add 1 entry:
```typescript
"global-shop": { slug: "global-shop", label: "Global Shop", color: "#FFEB3B", bg: "rgba(255,235,59,0.15)" }
```
