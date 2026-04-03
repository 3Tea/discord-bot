# Music Player MVP

**Priority:** High
**Estimated effort:** 5-7 days
**Status:** Ready
**Affected Areas:** commands/slash/ (2 new), buttons/ (5 new), util/music/ (new), util/config/button.ts, client.ts

## Problem Statement

Guild members have no way to listen to music together in voice channels. The bot already has comprehensive voice channel management (temp channels, ownership, control panel), but lacks audio playback. Users must resort to separate music bots, breaking the unified experience.

## User Story

As a guild member in a voice channel, I want to play music from Spotify links or by searching song names, so that my friends and I can listen together with a clean control panel.

## Requirements

- [ ] User can play music via `/play <query>` where query is a Spotify URL, YouTube URL, or song name search
- [ ] Bot auto-joins the user's voice channel when `/play` is used
- [ ] A "Now Playing" embed displays: song title, artist, duration, requester, queue count, and thumbnail
- [ ] The Now Playing embed is a persistent panel (1 per guild) that edits in-place when songs change — same pattern as voice control panel
- [ ] 5 control buttons below the embed: Pause/Resume, Skip, Stop, Loop, Queue
- [ ] Pause/Resume toggles playback and updates button label accordingly
- [ ] Skip advances to the next song in queue or stops if queue is empty
- [ ] Stop clears the queue, stops playback, and disconnects the bot from voice
- [ ] Loop cycles through 3 modes: Off → Song repeat → Queue repeat → Off
- [ ] Queue button shows an ephemeral embed listing current song + up to 10 upcoming songs
- [ ] `/nowplaying` command re-sends the music panel (deletes old, sends new) when embed gets buried in chat
- [ ] Bot auto-disconnects from voice after 30 seconds if queue ends and channel has no non-bot members
- [ ] When queue finishes, panel updates to "No music playing" state with disabled buttons
- IF user is not in a voice channel THEN THE SYSTEM SHALL reply with ephemeral error "You need to be in a voice channel"
- IF no results found for search query THEN THE SYSTEM SHALL reply with ephemeral error "No results found for: {query}"
- IF audio stream fails THEN THE SYSTEM SHALL skip to next song and log the error
- WHEN bot is alone in voice channel for 30 seconds THE SYSTEM SHALL disconnect and update panel

## Out of Scope (deferred to Spec 2: Full-Featured Music)

- Volume control buttons (Vol+/Vol-)
- Shuffle button
- Previous track button
- Seek/jump to timestamp
- Audio filters (bassboost, nightcore, etc.)
- Deezer and SoundCloud support (only need plugin install + no code change)
- Lyrics display
- DJ role / permission system
- Saved playlists
- 24/7 mode

## Discord Bot Checklist

- [x] New button IDs added to `src/util/config/button.ts`? — Yes: MUSIC_PAUSE, MUSIC_SKIP, MUSIC_STOP, MUSIC_LOOP, MUSIC_QUEUE
- [x] New intents required in `src/client.ts`? — No, GuildVoiceStates already enabled
- [x] Redis keys with proper TTL defined? — Yes: `music_panel:{guildId}` with 12h TTL
- [x] 3-second interaction reply/deferReply rule followed? — Yes, `/play` uses deferReply, buttons use immediate reply/update
- [x] Type augmentation needed in `src/types/common/discord.d.ts`? — Yes, add `distube: DisTube` to Client
- [x] Embed field limits respected? — Yes, queue list limited to 10 songs
- [x] New npm dependencies? — Yes: `distube`, `@discordjs/voice`, `@discordjs/opus`, `@distube/spotify`, `ffmpeg-static`
- [x] Node.js version? — Requires Node.js 22.12.0+ (enforced by @discordjs/voice v0.17+). Update `engines` in package.json.
