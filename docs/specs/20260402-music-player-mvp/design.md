# Music Player MVP — Design

## Technical Approach

Use DisTube v5 as the music engine with @distube/spotify plugin for Spotify URL resolution. DisTube handles queue management, audio streaming, and voice connections internally. The bot wraps DisTube with a panel system (embed + buttons) that follows the same persistent-panel pattern as voice channel management.

DisTube's event system (`playSong`, `addSong`, `finishSong`, `disconnect`, `error`) drives panel updates. Redis tracks the panel message ID per guild so it can be edited in-place across events.

## Component Design

### DisTube Instance: `src/util/music/player.ts`
- Singleton DisTube instance attached to the Discord client
- Initialized once during bot startup (called from client.ts after login)
- Configured with SpotifyPlugin
- Registers all DisTube event listeners that trigger panel updates
- Events: `playSong` → update panel, `addSong` → update panel, `finish` → show idle state, `disconnect` → cleanup, `error` → log + skip

### Embed Builder: `src/util/music/embed.ts`
- `buildNowPlayingEmbed(queue)` — Song title, artist, duration (formatted), requester mention, queue count, thumbnail, loop mode indicator
- `buildIdleEmbed()` — "No music playing" state
- `buildQueueEmbed(queue)` — Ephemeral queue list (current + up to 10 next songs)
- `buildButtonRow(queue)` — 1 ActionRow with 5 buttons; label changes based on state (Pause↔Resume, loop mode indicator)

### Panel Manager: `src/util/music/panel.ts`
- `sendPanel(textChannel, queue)` — Send new embed+buttons, store message ID in Redis `music_panel:{guildId}` (12h TTL)
- `updatePanel(guildId, queue)` — Fetch stored message ID from Redis, edit embed+buttons
- `deletePanel(guildId)` — Delete message, remove Redis key
- `resendPanel(textChannel, queue)` — Delete old panel + send new (for `/nowplaying`)

### Commands
- `/play <query>` — Join voice, play/enqueue song, send or update panel
- `/nowplaying` — Re-send panel (delete old, send new)

### Button Handlers
- `musicPause.button.ts` — Toggle pause/resume via `queue.pause()` / `queue.resume()`, update panel
- `musicSkip.button.ts` — `queue.skip()`, DisTube auto-triggers `playSong` event which updates panel
- `musicStop.button.ts` — `queue.stop()`, disconnect, cleanup panel
- `musicLoop.button.ts` — Cycle `queue.setRepeatMode()`: 0 → 1 → 2 → 0, update panel
- `musicQueue.button.ts` — Reply ephemeral with queue embed

### Redis Keys
- `music_panel:{guildId}` — Stores `{ channelId, messageId }` with 12h TTL

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Music engine | DisTube v5 | Built-in queue, events, plugin system; least code for MVP |
| Spotify strategy | @distube/spotify → YouTube search | Direct Spotify streaming not possible; YouTube fallback is industry standard |
| Panel pattern | Edit-in-place (like voice panel) | Consistent UX, clean channel, proven pattern in codebase |
| Button permissions | Anyone in voice can control | MVP simplicity; DJ role deferred to spec 2 |
| Stop permission | Anyone (MVP) | Simpler; restrict to requester/admin in spec 2 |
| Auto-disconnect | 30s after queue end + empty channel | Prevents ghost connections, saves resources |

## Trade-offs

**Optimizing for:** Fast ship, consistent UX with existing voice panel, minimal code

**Accepting:**
- Spotify → YouTube search may occasionally find wrong song (inherent limitation)
- No volume control in MVP (Discord client volume works as workaround)
- No permission system — anyone can stop/skip (acceptable for small servers)
- Panel may get buried in active channels (mitigated by `/nowplaying`)

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| YouTube blocks streaming | DisTube community maintains workarounds; yt-dlp plugin as fallback |
| ffmpeg not available in Docker | Use `ffmpeg-static` npm package (bundles binary) |
| DisTube event race conditions | Panel updates are per-guild, serialize with Redis key check |
| Bot joins wrong channel | Always use `interaction.member.voice.channel` — validated before join |
| Memory leak from audio streams | DisTube handles cleanup; auto-disconnect prevents zombie connections |
| Node.js version bump to 22.12.0+ | @discordjs/voice v0.17+ requires it; update `engines` in package.json and Dockerfile base image |
