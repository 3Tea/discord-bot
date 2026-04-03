# CLAUDE.md — 3AT Discord Bot

## Project Overview

Discord bot "3AT - Endless Paradox" (v5.0.0) built with TypeScript, Discord.js v14, Mongoose, ioredis.
Runs on Node.js >= 18 via Gateway (WebSocket). Uses slash commands exclusively.

## Quick Reference

```bash
npm run start:dev    # Dev with hot reload (ts-node + nodemon)
npm run build        # Compile TypeScript to dist/
npm run build:start  # Clean build + run
npm start            # Run compiled dist/bin/www.js
```

```bash
docker build -t 3at-discord-bot .
docker run -d --env-file .env 3at-discord-bot
```

## Architecture

```
src/
  bin/www.ts              # Entry point: loads .env → imports bot + mongo
  bot.ts                  # client.login()
  client.ts               # Creates Client, runs loaders, deploys commands
  loaders/                # Auto-discovery loaders
    commands.ts           # Scans commands/slash/ → client.commands Collection
    events.ts             # Scans events/ → client.on/once
    buttons.ts            # Scans buttons/ → client.buttons Collection
    deploy.ts             # PUT commands to Discord API (guild or global)
  commands/slash/         # One file per slash command (auto-loaded)
  events/                 # One file per event (auto-loaded)
  buttons/                # One file per button handler (auto-loaded)
  models/                 # Mongoose schemas (Guild, User)
  connector/
    mongo/index.ts        # MongoDB connection
    redis/index.ts        # RedisService singleton class
  util/
    config/index.ts       # All env vars as typed constants
    config/button.ts      # Button ID constants (BUTTON_ID)
    decorator/reply.ts    # Reply utility (auto-adds footer to embeds)
    log/logger.mixed.ts   # Winston (file) + Tracer (console) logging
    date/day.ts           # getNumberOfDays() helper
  types/common/discord.d.ts  # Client type augmentation (commands, buttons)
```

## Adding New Features

### New Slash Command

Create `src/commands/slash/{name}.ts` — auto-discovered by loader, no registration needed:

```typescript
import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import Reply from "../../util/decorator/reply";

export default {
    data: new SlashCommandBuilder()
        .setName("command-name")
        .setDescription("What it does"),
    async execute(interaction: ChatInputCommandInteraction) {
        const embed = new EmbedBuilder().setColor("Random").setTimestamp();
        // logic
        return Reply.embed(interaction, embed);
    },
};
```

### New Button Handler

Create `src/buttons/{name}.button.ts`:

```typescript
import { ButtonInteraction, TextChannel, ThreadAutoArchiveDuration } from "discord.js";
import { BUTTON_ID } from "../util/config/button";

export default {
    id: BUTTON_ID.myButton,
    async execute(interaction: ButtonInteraction) {
        // logic
    },
};
```

Add the button ID to `src/util/config/button.ts`.

### New Event

Create `src/events/{name}.ts`:

```typescript
import { Events } from "discord.js";

export default {
    name: Events.EventName,
    once: false,
    execute(...args: unknown[]) {
        // logic
    },
};
```

## Discord.js v14 Rules

### Interactions — MUST follow

- **3-second rule**: Call `reply()` or `deferReply()` within 3 seconds, or Discord shows error to user
- **After `deferReply()`**: Use `editReply()` only — never `reply()` again
- **Always `await`** all interaction methods: `reply()`, `deferReply()`, `editReply()`, `followUp()`
- **Error responses**: Check `interaction.replied || interaction.deferred` before choosing `reply()` vs `editReply()`
- **Ephemeral**: Set on first response — cannot change after. Use `{ ephemeral: true }` for error messages

### Types — MUST use

- `ChatInputCommandInteraction` for slash commands (not generic `CommandInteraction`)
- `ButtonInteraction` for buttons
- `ActionRowBuilder<ButtonBuilder>` for button rows (always specify generic)
- `TextChannel` cast for `.nsfw` access: `(interaction.channel as TextChannel)?.nsfw`
- `GuildMember` cast for `.voice` access: `(interaction.member as GuildMember).voice`
- `Events` enum for event names (not string literals)

### Embeds — Limits

| Field | Max chars |
|-------|-----------|
| Title | 256 |
| Description | 4096 |
| Field name | 256 |
| Field value | 1024 |
| Footer | 2048 |
| Fields per embed | 25 |
| Total chars | 6000 |

### Intents

Current: `Guilds`, `GuildMessages`, `GuildVoiceStates`. Add intents in `src/client.ts` if needed. Privileged intents (`MessageContent`, `GuildMembers`, `GuildPresences`) require Developer Portal approval.

## TypeScript v5 Rules

### Strict Mode (enabled)

- No implicit `any` — every variable, parameter, return type must be known
- Strict null checks — handle `null`/`undefined` explicitly, no assumptions
- Strict function types — parameter types must match exactly

### Types & Assertions

- **Never** use `| any` union — cast specifically: `as GuildMember`, `as TextChannel`
- **Prefer** `unknown` over `any` for untyped data, then narrow with type guards
- **Non-null assertion** (`!`) only when value is guaranteed (e.g., required command options)
- **Type narrowing** over casting — use `if`, `in`, `instanceof` before accessing properties
- **`satisfies`** for validating object literals match a type without widening:
  ```typescript
  const config = { port: 4263, host: "localhost" } satisfies ServerConfig;
  ```

### Imports & Modules

- Use `node:` prefix for Node.js built-ins: `import fs from "node:fs"`
- Use `import type { X }` for type-only imports (not included in runtime bundle):
  ```typescript
  import type { Document } from "mongoose";
  import { model, Schema } from "mongoose";
  ```
- No `require()` — use ES `import` syntax only
- Barrel exports (`index.ts`) only for `util/config/` — avoid elsewhere

### Functions & Parameters

- Use explicit return types on exported functions
- Use `const` assertions for literal types: `as const`
- Prefer **optional parameters** (`param?: Type`) over `param: Type | undefined`
- Use **default parameters** over manual defaults: `function f(x = 10)` not `x ?? 10`
- Use **rest parameters** with tuple types for variadic functions:
  ```typescript
  function log(...args: [message: string, level?: TLog]): void
  ```

### Error Handling

- Catch blocks: type as `unknown`, then narrow:
  ```typescript
  catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
  }
  ```
- Never `catch (error: any)` — use `catch (error)` (defaults to `unknown` in strict)

### Enums & Constants

- Prefer `as const` objects over `enum` for new code:
  ```typescript
  const Direction = { Up: "UP", Down: "DOWN" } as const;
  type Direction = typeof Direction[keyof typeof Direction];
  ```
- Existing enums (Discord.js `Events`, `GatewayIntentBits`, etc.) — use as-is

### Utility Types — Use When Appropriate

| Type | Use case |
|------|----------|
| `Partial<T>` | Optional update objects |
| `Required<T>` | Ensure all fields present |
| `Pick<T, K>` | Select specific fields |
| `Omit<T, K>` | Exclude specific fields |
| `Record<K, V>` | Typed key-value maps |
| `Awaited<T>` | Unwrap Promise types |
| `ReturnType<T>` | Extract function return type |

### Patterns to Follow

```typescript
// Good: satisfies + const for config objects
const FOOTER = {
    icon: process.env.FOOTER_ICON || "",
    text: process.env.FOOTER_TEXT || "",
} satisfies Record<string, string>;

// Good: type narrowing
function handleChannel(channel: TextBasedChannel) {
    if ("nsfw" in channel) {
        // TypeScript knows this is a guild text channel
    }
}

// Good: discriminated unions for command responses
type CommandResult =
    | { success: true; data: unknown }
    | { success: false; error: string };
```

### Patterns to Avoid

```typescript
// Bad: any
const data: any = await response.json();

// Good: unknown + validation
const data: unknown = await response.json();
if (isValidResponse(data)) { /* use data */ }

// Bad: type assertion without check
const member = interaction.member as GuildMember;
member.voice.channel.setName("x"); // crashes if null

// Good: assertion + null check
const member = interaction.member as GuildMember;
member.voice.channel?.setName("x");
```

## Project Conventions

### Naming

| Type | Convention | Example |
|------|-----------|---------|
| Command files | kebab-case | `voice.ts`, `3hentai.ts` |
| Button files | camelCase + `.button.ts` | `nhentai.button.ts` |
| Model files | camelCase + `.model.ts` | `guild.model.ts` |
| Constants | SCREAMING_SNAKE_CASE | `BUTTON_ID`, `APPLICATION_ID` |
| Interfaces | PascalCase, `I` prefix for models | `IGuild`, `IUser` |

### Patterns

- **One export per file**: Commands, buttons, events each export one `default`
- **Reply utility**: Use `Reply.embed()` / `Reply.embedButtons()` — auto-adds footer
- **Config**: All env vars in `src/util/config/index.ts` — never read `process.env` directly in commands
- **Redis caching**: Use `redis.setJson(key, value, ttlSeconds)` / `redis.getJson(key)` — default TTL 120s
- **Rate limiting**: Use `redis.ttlKey(key)` to check cooldown before action
- **Logging**: Use `logger` from `src/util/log/logger.mixed.ts` for structured logging

### Do NOT

- Access `.env` files directly (use `.env.example` for documentation)
- Add `require()` calls — use ES `import` syntax
- Use `CommandInteraction` — always use `ChatInputCommandInteraction`
- Register commands manually — loader handles auto-discovery
- Deploy commands on every startup unnecessarily — it's rate-limited

## Command Deployment

- **Development** (`NODE_ENV=development`): Deploys to `GUILD_ID` — instant update
- **Production**: Deploys globally — takes up to 1 hour for Discord cache

## Database

### MongoDB (Mongoose v8)

- Connection: `src/connector/mongo/index.ts`
- Models define TypeScript interfaces (`IGuild`, `IUser`) with `Document`
- Error handler checks `MongoServerError` (not `MongoError`)
- Timestamps auto-managed (`createdAt`, `updatedAt`)

### Redis (ioredis)

- Singleton: `import redis from "../connector/redis"`
- Methods: `setJson`, `getJson`, `deleteKey`, `ttlKey`, `flushdb`
- Used for: image cache (10min TTL), voice channel ownership (12hr TTL), rate limiting (120s default)

## Environment

All variables documented in `.env.example`. Critical ones:

| Variable | Required | Purpose |
|----------|----------|---------|
| `DISCORD_TOKEN` | Yes | Bot authentication |
| `APPLICATION_ID` | Yes | Slash command registration |
| `GUILD_ID` | Dev only | Guild-scoped command deployment |
| `NODE_ENV` | Yes | `development` or `production` |
| `DB_URL` | Yes | MongoDB connection string |
| `REDIS_URL` | No | Redis connection string (fallback: in-memory cache) |

## Docker

Multi-stage Dockerfile: build stage compiles TS, production stage runs compiled JS as non-root `node` user. Needs `--env-file .env` and external MongoDB/Redis access.
