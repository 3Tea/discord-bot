# Refactor Manga Commands — Shared Handler

**Priority:** Medium
**Estimated effort:** 1-2 days
**Status:** Ready
**Affected Areas:** commands/slash/ (6 files), buttons/ (6 files → 1), util/manga/ (new), util/config/button.ts

## Problem Statement

6 manga reader commands (nhentai, nhentaiTo, 3hentai, asmhentai, hentaifox, pururin) share ~85% identical code across 12 files (~1000 LOC). Each command file copies the same NSFW check, API call, embed construction, button row, Redis caching, and 20s auto-remove pattern. The 6 button handlers are 100% identical except for the button ID.

This duplication causes:
- Bug fixes must be applied 6-12 times (e.g., adding error handling)
- Inconsistencies slip in (nhentai has 8 embed fields, pururin missing upload_date field)
- `console.log(result)` left in production in 4 of 6 command files
- `process.env.URL_REPORT_BUG` used directly instead of config in all 6 error handlers
- Adding a new manga source requires copying ~200 lines and changing 5 values

## User Story

As a bot maintainer, I want manga command logic centralized in a shared handler, so that bug fixes apply once, new sources are trivial to add, and the codebase is easier to maintain.

## Requirements

- [ ] All 6 manga commands retain their current names and subcommands (read/random) — zero breaking change for users
- [ ] nhentai keeps its 8 embed fields (title variants, language, artist, pages, group, parodies, characters, upload_date)
- [ ] Other 5 sources keep their current embed fields (title, pages, tags, upload_date — pururin: title, pages, tags)
- [ ] Shared handler extracts common logic: NSFW check, deferReply, API call, embed build, button row, Redis cache, auto-remove after 20s, error handling
- [ ] Single button handler replaces 6 identical button files using one unified button ID
- [ ] Thread creation and image delivery logic is shared across all sources
- [ ] Production `console.log(result)` statements removed, replaced with `logger` where needed
- [ ] `process.env.URL_REPORT_BUG` replaced with config constant
- [ ] Each command wrapper file is ≤ 20 lines (import source config + call shared handler)
- [ ] Adding a new manga source requires only: 1 source config entry + 1 thin command wrapper

## Out of Scope

- Changing command names or user-facing behavior
- Adding new manga sources (that's a future task this refactor enables)
- Modifying the external API (SERVER_HD) contract
- Changing thread creation behavior or disclaimer text
- Adding pagination, search, or other new features

## Discord Bot Checklist

- [x] New button IDs added to `src/util/config/button.ts`? — Yes: `mangaRead` (replacing 6 old IDs)
- [x] New intents required in `src/client.ts`? — No
- [x] Redis keys with proper TTL defined? — Yes: `mangaRead_{bookId}` with 10min TTL (same as current)
- [x] 3-second interaction reply/deferReply rule followed? — Yes, deferReply preserved
- [x] Type augmentation needed in `src/types/common/discord.d.ts`? — No
- [x] Embed field limits respected? — Yes, unchanged from current
