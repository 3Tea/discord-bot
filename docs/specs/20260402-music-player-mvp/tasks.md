# Music Player MVP — Tasks

## Phase 1: Foundation (parallel-ready)

- [ ] [P] **Task 1: Install dependencies and update config** (1h)
  - Update Node.js `engines` in `package.json` to `>=22.12.0` (required by @discordjs/voice v0.17+)
  - Update Dockerfile base image to `node:22-alpine` (build + production stages)
  - `npm install distube @discordjs/voice @discordjs/opus @distube/spotify ffmpeg-static`
  - Add 5 button IDs to `src/util/config/button.ts`: MUSIC_PAUSE, MUSIC_SKIP, MUSIC_STOP, MUSIC_LOOP, MUSIC_QUEUE
  - Files: `package.json`, `Dockerfile`, `src/util/config/button.ts`
  - Accept: `npm run build` passes, new IDs accessible

- [ ] [P] **Task 2: Create embed + button row builders** (2h)
  - `buildNowPlayingEmbed(song, queue)` — title, artist, duration, requester, queue count, thumbnail, loop indicator
  - `buildIdleEmbed()` — "No music playing" placeholder
  - `buildQueueEmbed(queue)` — current song + up to 10 next, with numbering and durations
  - `buildButtonRow(isPaused, repeatMode)` — 5 buttons with dynamic labels (Pause↔Resume, loop mode icon)
  - File: `src/util/music/embed.ts`
  - Accept: functions compile, embeds respect Discord limits (title 256, desc 4096)

- [ ] [P] **Task 3: Create panel manager** (1.5h)
  - `sendPanel(textChannel, embed, row)` — send message, store `{channelId, messageId}` in Redis `music_panel:{guildId}` (12h TTL)
  - `updatePanel(client, guildId, embed, row)` — fetch from Redis, edit message; if message deleted, clear Redis key
  - `deletePanel(client, guildId)` — delete message + Redis key
  - `resendPanel(textChannel, client, guildId, embed, row)` — delete old + send new
  - File: `src/util/music/panel.ts`
  - Accept: functions compile, follow voice panel pattern from `src/util/voice/helpers.ts`

## Phase 2: DisTube Core (depends on Phase 1)

- [ ] **Task 4: Create DisTube instance and event handlers** (3h)
  - Initialize DisTube with SpotifyPlugin
  - Augment Client type in `src/types/common/discord.d.ts` to include `distube: DisTube`
  - Initialize DisTube in `src/client.ts` after client creation
  - Register event listeners:
    - `playSong` → build embed + update panel
    - `addSong` → update panel (show new queue count)
    - `addList` → update panel (playlist added)
    - `finish` → update panel to idle state
    - `disconnect` → delete panel, cleanup Redis
    - `error` → log error, attempt skip
    - `empty` → start 30s disconnect timer, cancel if someone joins
  - File: `src/util/music/player.ts`, `src/types/common/discord.d.ts`, `src/client.ts`
  - Accept: DisTube initializes without errors, events fire correctly

## Phase 3: Commands (depends on Phase 2)

- [ ] **Task 5: Create /play command** (2h)
  - Validate: user must be in voice channel (ephemeral error if not)
  - `deferReply()` → search/play via `distube.play(voiceChannel, query, options)`
  - On success: `deleteReply()` (panel handles display)
  - On no results: `editReply()` with ephemeral error
  - Handle: Spotify URLs, YouTube URLs, plain text search
  - File: `src/commands/slash/play.ts`
  - Accept: `/play <song name>` joins voice, plays, shows panel; `/play <spotify url>` resolves and plays

- [ ] **Task 6: Create /nowplaying command** (1h)
  - Get current DisTube queue for guild
  - If no queue: reply ephemeral "Nothing is playing"
  - If queue exists: `resendPanel()` to delete old panel and send fresh one
  - File: `src/commands/slash/nowplaying.ts`
  - Accept: `/nowplaying` re-sends panel at bottom of chat

## Phase 4: Button Handlers (depends on Phase 2)

- [ ] [P] **Task 7: Create music button handlers** (3h)
  - All handlers validate: must have active queue (ephemeral error if not)
  - `musicPause.button.ts` — Toggle `queue.pause()` / `queue.resume()`, update panel with new button labels
  - `musicSkip.button.ts` — `queue.skip()`, DisTube fires `playSong` → auto updates panel
  - `musicStop.button.ts` — `queue.stop()`, DisTube fires `disconnect` → auto cleans panel
  - `musicLoop.button.ts` — Cycle `queue.setRepeatMode()` (0→1→2→0), update panel with loop indicator
  - `musicQueue.button.ts` — Reply ephemeral with `buildQueueEmbed(queue)`
  - Files: `src/buttons/musicPause.button.ts`, `src/buttons/musicSkip.button.ts`, `src/buttons/musicStop.button.ts`, `src/buttons/musicLoop.button.ts`, `src/buttons/musicQueue.button.ts`
  - Accept: all 5 buttons respond correctly, panel updates reflect state changes

## Phase 5: Polish & Integration

- [ ] **Task 8: Auto-disconnect + edge cases** (2h)
  - Handle `empty` event: start 30s timer, disconnect if no one joins
  - Handle bot kicked from voice: cleanup panel
  - Handle voice channel deleted: cleanup panel
  - Update `src/events/voiceStateUpdate.ts`: ensure music cleanup when bot leaves voice
  - Edge case: `/play` when bot is already in a different voice channel in same guild
  - Files: `src/util/music/player.ts`, `src/events/voiceStateUpdate.ts`
  - Accept: bot auto-disconnects when alone, panel cleaned up on all exit paths

- [ ] **Task 9: Final verification** (1.5h)
  - `npm run build` succeeds with zero errors
  - `/play <song name>` → bot joins voice, music plays, panel shows
  - `/play <spotify url>` → resolves to YouTube, plays correctly
  - Pause/Resume button toggles playback
  - Skip button advances queue
  - Stop button disconnects and clears panel
  - Loop button cycles Off → Song → Queue → Off with visual indicator
  - Queue button shows ephemeral list
  - `/nowplaying` re-sends panel
  - Auto-disconnect after 30s when alone
  - Multiple `/play` commands enqueue correctly
  - Error recovery: invalid URL shows error, doesn't crash bot
  - Accept: all interactions work end-to-end

## Verification Checklist

- [ ] `npm run build` succeeds
- [ ] `/play <song name>` joins voice and plays music
- [ ] `/play <spotify url>` resolves and plays
- [ ] Now Playing embed shows correct metadata
- [ ] Panel edits in-place when song changes
- [ ] Pause/Resume button works and label toggles
- [ ] Skip button advances to next song
- [ ] Stop button disconnects and clears panel
- [ ] Loop button cycles 3 modes with visual indicator
- [ ] Queue button shows ephemeral embed with song list
- [ ] `/nowplaying` re-sends panel
- [ ] Bot auto-disconnects after 30s when alone
- [ ] Error cases show ephemeral messages (not in voice, no results)
- [ ] No `console.log` in production code — use `logger`
- [ ] All config via `src/util/config/` — no `process.env` direct access

## Progress Log

| Date | Task | Status | Notes |
|------|------|--------|-------|
| | | | |
