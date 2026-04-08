# Command Logger Design

## Overview

Log all slash command executions to MongoDB for analytics and audit purposes. Uses an in-memory buffer with periodic flush to minimize performance impact.

## Goals

- **Analytics**: Track command usage frequency, active users, trends over time
- **Audit**: Record who used what command, when, with what parameters, and whether it succeeded
- **Performance**: Zero impact on command response latency via fire-and-forget + batch writes

## Data Model

### `CommandLog` (Collection: `CommandLogs`)

| Field | Type | Description |
|-------|------|-------------|
| `commandName` | `string` | Slash command name (e.g. `"pray"`, `"rank"`) |
| `userId` | `string` | Discord user ID |
| `username` | `string` | Username at time of execution (denormalized) |
| `guildId` | `string` | Discord guild ID |
| `channelId` | `string` | Channel where command was used |
| `options` | `Record<string, unknown>` | All options/parameters passed by user |
| `success` | `boolean` | `true` if command executed without error |
| `errorMessage` | `string?` | Error message if command failed |
| `latencyMs` | `number` | Execution time in milliseconds |
| `createdAt` | `Date` | Timestamp (auto via Mongoose timestamps) |

### Indexes

- `{ commandName: 1, createdAt: -1 }` — query by command
- `{ userId: 1, createdAt: -1 }` — query by user
- `{ guildId: 1, createdAt: -1 }` — query by guild

### Data Retention

Permanent — no TTL. Data grows over time for long-term analytics.

## Buffer Service

### `CommandLogService` (`src/services/commandLog.service.ts`)

In-memory buffer with periodic flush to MongoDB.

**Constants:**
- `FLUSH_INTERVAL_MS = 10_000` (10 seconds)
- `BUFFER_THRESHOLD = 50` (flush early if buffer reaches this size)

**API:**
- `pushLog(entry: Omit<ICommandLog, "createdAt">): void` — add entry to buffer (sync, non-blocking)
- `startFlusher(): void` — initialize the flush interval (called at bot startup)
- `flush(): Promise<void>` — manual flush, used for graceful shutdown

**Flush behavior:**
- `insertMany()` with `{ ordered: false }` — partial failures don't block the rest
- Clears buffer after successful write
- Logs errors via `logger.error()`, does not throw
- Also flushes when buffer reaches `BUFFER_THRESHOLD` (checked on each `pushLog`)

**Lifecycle:**
- `startFlusher()` called in `src/bin/www.ts` after MongoDB connection
- `process.on("SIGINT" / "SIGTERM")` calls `flush()` before exit

**Reference pattern:** `src/util/xp/guildStatsAggregator.ts` — same `setTimeout` + `setInterval` model.

## Integration: `interactionCreate`

Changes to `src/events/interactionCreate.ts`:

```
1. Record startTime = Date.now()
2. Execute command in try/catch
3. Calculate latencyMs = Date.now() - startTime
4. Serialize interaction.options.data → Record<string, unknown>
   - Handle subcommand/subcommandGroup (nested options)
5. Call pushLog({ commandName, userId, username, guildId, channelId,
                  options, success, errorMessage, latencyMs })
6. pushLog is synchronous (array push) → does not block response
```

### Options Serialization

`interaction.options.data` is an array of `CommandInteractionOption`. Serialize recursively:
- Top-level options: `{ name: value }`
- Subcommands: `{ _subcommand: name, ...nestedOptions }`
- SubcommandGroups: `{ _group: name, _subcommand: name, ...nestedOptions }`

## Query Command: `/commandlog`

### Access Control

- **Guild restriction**: Only works when `guildId === GUILD_ID` (dev server)
- **User restriction**: Only works when `userId === DEV_USER_ID` (new env var)
- Guard check at the start of `execute()` — returns ephemeral "No permission" otherwise

### `DEV_USER_ID`

New env var added to `src/util/config/index.ts`:
```typescript
export const DEV_USER_ID = process.env.DEV_USER_ID || "";
```

### Subcommands

#### `/commandlog stats [period]`

- **period** choices: `today`, `7d`, `30d`, `all` (default: `7d`)
- Shows embed with:
  - Top 10 most used commands (name + count)
  - Total commands executed
  - Total errors
  - Average latency (ms)

#### `/commandlog user <user> [limit]`

- **user**: User mention/ID (required)
- **limit**: 1–25 (default: 10)
- Shows embed with recent command history:
  - Command name, guild name, timestamp, success/error

#### `/commandlog command <name> [limit]`

- **name**: Command name string (required)
- **limit**: 1–25 (default: 10)
- Shows embed with recent usage of that command:
  - User, guild, latency, timestamp

### Response Format

All responses use `EmbedBuilder` via `Reply.embed()`. Content in English only (dev-only command).

## i18n

- **Command/subcommand descriptions**: Add `cmd.commandlog.desc` and subcommand desc keys to all 15 locale files (required by project convention)
- **Embed content**: English only — no translation needed since this is dev-only

## Files to Create/Modify

### New Files
- `src/models/commandLog.model.ts` — Mongoose model
- `src/services/commandLog.service.ts` — Buffer + flush service
- `src/commands/slash/commandlog.ts` — Query command

### Modified Files
- `src/events/interactionCreate.ts` — Add latency tracking + pushLog call
- `src/bin/www.ts` — Start flusher + graceful shutdown hook
- `src/util/config/index.ts` — Add `DEV_USER_ID`
- `src/locales/*.json` (15 files) — Add `cmd.commandlog.desc` keys
- `.env.example` — Document `DEV_USER_ID`

## Non-Goals

- No UI dashboard — query via slash command only
- No real-time streaming — batch write is sufficient
- No per-guild configuration — this is a global dev tool
- No data retention/cleanup — keep all logs permanently
