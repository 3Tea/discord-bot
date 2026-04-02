# Refactor Manga Commands — Tasks

## Phase 1: Shared Infrastructure (parallel-ready)

- [ ] [P] **Task 1: Create source registry** (1h)
  - Define `MangaSource` interface and `MANGA_SOURCES` config map
  - Each source entry: name, description, apiPath, urlBase, fields builder function
  - nhentai: 8 fields (title variants, language, artist, pages, group, parodies, characters, upload_date)
  - 3hentai/asmhentai/hentaifox: 4 fields (title, pages, tags, upload_date)
  - nhentaiTo: 4 fields (title, pages, tags, upload_date)
  - pururin: 3 fields (title, pages, tags)
  - File: `src/util/manga/sources.ts`
  - Accept: all 6 sources defined, `npm run build` passes

- [ ] [P] **Task 2: Create shared command handler** (2h)
  - `mangaCommand(source: MangaSource)` factory that returns `{ data, execute }` command object
  - Logic: NSFW check → deferReply → API call (SERVER_HD + apiPath) → build embed from source.fields() → button row with `BUTTON_ID.mangaRead` + Link button → Redis cache `mangaRead_${result.id}` (10min TTL) → editReply → wait 20s → remove components
  - Error handler: use `logger` instead of `console.log`, use config constant for report bug URL
  - File: `src/util/manga/handler.ts`
  - Accept: handler compiles, all edge cases covered (no data, API error, >50 pages)

- [ ] [P] **Task 3: Create shared thread reader** (1h)
  - Extract button execute logic: create thread → join → add user → send disclaimer → loop images → send enjoy message
  - Reads Redis key from `interaction.customId + '_' + embedDescription`
  - File: `src/util/manga/reader.ts`
  - Accept: function compiles, handles missing images gracefully

## Phase 2: Migration (depends on Phase 1)

- [ ] **Task 4: Update config constants** (0.5h)
  - Add `mangaRead: "mangaRead"` to BUTTON_ID in `src/util/config/button.ts`
  - Add `URL_REPORT_BUG` to `src/util/config/index.ts` (currently accessed via raw `process.env`)
  - Keep old button IDs temporarily (removed in Task 7)
  - Files: `src/util/config/button.ts`, `src/util/config/index.ts`
  - Accept: `npm run build` passes

- [ ] **Task 5: Replace 6 command files with thin wrappers** (1.5h)
  - Each file: import source from sources.ts, export `mangaCommand(source)`
  - Each file should be ≤ 20 lines
  - Files:
    - `src/commands/slash/nhentai.ts`
    - `src/commands/slash/3hentai.ts`
    - `src/commands/slash/asmhentai.ts`
    - `src/commands/slash/hentaifox.ts`
    - `src/commands/slash/nhentaiTo.ts`
    - `src/commands/slash/pururin.ts`
  - Accept: `npm run build` passes, all 6 commands registered correctly

- [ ] **Task 6: Replace 6 button files with 1 unified handler** (1h)
  - Create `src/buttons/mangaRead.button.ts` using shared reader from Task 3
  - Delete old button files:
    - `src/buttons/nhentai.button.ts`
    - `src/buttons/3hentai.button.ts`
    - `src/buttons/asmhentai.button.ts`
    - `src/buttons/hentaifox.button.ts`
    - `src/buttons/nhentaiTo.button.ts`
    - `src/buttons/pururin.button.ts`
  - File: `src/buttons/mangaRead.button.ts`
  - Accept: `npm run build` passes, single button handler loads

## Phase 3: Cleanup

- [ ] **Task 7: Remove old button IDs from config** (0.5h)
  - Remove from BUTTON_ID: nhtaiRead, nhentaiToRead, threeHentaiRead, asmHentaiRead, hentaiFoxRead, pururinRead
  - Verify no references remain (grep codebase)
  - File: `src/util/config/button.ts`
  - Accept: `npm run build` passes, grep finds zero references to old IDs

- [ ] **Task 8: Final verification** (1h)
  - `npm run build` succeeds with zero errors
  - Verify all 6 commands appear in Discord (check deploy loader output)
  - Verify embed fields match current behavior per source
  - Verify button creates thread and sends images correctly
  - Verify error handling shows report button (not console.log)
  - Accept: bot starts, all 6 commands functional, button works

## Verification Checklist

- [ ] `npm run build` succeeds
- [ ] All 6 slash commands register and respond (nhentai, 3hentai, asmhentai, hentaifox, nhentaiTo, pururin)
- [ ] nhentai shows 8 embed fields, others show 3-4 fields
- [ ] Read button creates thread and delivers images
- [ ] >50 pages shows disabled button with "read online" message
- [ ] NSFW check blocks non-NSFW channels
- [ ] No `console.log(result)` in production code
- [ ] Error handler uses logger + config URL (not process.env)
- [ ] Old button files deleted (6 files)
- [ ] Old button IDs removed from config
- [ ] Each command wrapper ≤ 20 lines

## Progress Log

| Date | Task | Status | Notes |
|------|------|--------|-------|
| | | | |
