# Landing Page Redesign — Design Spec

> Migrate landing page from `docs/` to `landing/`, redesign with Astro + Discord-native theme.

## Summary

- **What:** Full redesign of the 3AT Discord bot landing page + commands page
- **From:** Static HTML in `docs/` (outdated content, prefix commands, Python references)
- **To:** Astro site in `landing/` with modern Discord-native design, deployed via GitHub Actions
- **Domain:** `www.discords.sbs` (CNAME preserved)

## Tech Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Framework | Astro | Static-first, component islands, zero JS by default |
| Styling | Vanilla CSS | shadcn-inspired design tokens, no UI library dependency |
| Design | Discord-native | Dark theme, blurple accent, matches bot's platform |
| Deploy | GitHub Actions | Build Astro → deploy to GitHub Pages |
| Icons | Lucide (or emoji fallback) | Clean, consistent, optional |

## Design System

### Colors (Discord palette)

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-primary` | `#313338` | Main background (lighter sections) |
| `--bg-secondary` | `#2B2D31` | Darker sections (alternating) |
| `--bg-tertiary` | `#1E1F22` | Navbar, footer (darkest) |
| `--bg-card` | `#313338` | Card background on darker sections |
| `--border` | `#3F4147` | Card borders, dividers |
| `--accent` | `#5865F2` | Blurple — CTAs, highlights, links |
| `--text-primary` | `#F2F3F5` | Headings, primary text |
| `--text-secondary` | `#B5BAC1` | Body text, descriptions |
| `--text-muted` | `#80848E` | Labels, meta text |
| `--success` | `#3BA55C` | Utility category, positive states |
| `--danger` | `#ED4245` | NSFW/manga category |
| `--warning` | `#FAA61A` | Info category |

### Typography

- **Font family:** Inter (primary), system-ui fallback
- **Hero title:** 36-48px, 700 weight
- **Section title:** 28px, 700 weight
- **Section label:** 13px, 600 weight, uppercase, letter-spacing 1.5px, blurple
- **Body:** 14-15px, 400 weight
- **Small/meta:** 12-13px

### Spacing & Radius

- **Section padding:** 80px vertical (desktop), 48px (mobile)
- **Card radius:** 8px
- **Button radius:** 4px (shadcn-style, slightly rounded)
- **Card border:** 1px solid `--border`
- **Grid gap:** 16px (cards), 12px (command cards)

## Pages

### 1. Landing Page (`/`)

8 sections, single-page scroll with fixed navbar:

#### 1.1 Navigation (fixed top)
- Background: `--bg-tertiary` + `backdrop-filter: blur(12px)`
- Left: Logo (maid.gif, 32px circle) + "3AT - Endless Paradox"
- Right: Features / Commands / FAQ / Support links + "Add to Server" CTA (blurple)
- Mobile: Hamburger menu, full-screen overlay
- Smooth scroll to section anchors

#### 1.2 Hero (full viewport)
- Background: `--bg-primary`
- Centered layout: Logo (maid.gif, 96px, blurple border + glow) → Title → Subtitle → 2 CTAs → Trust line
- Subtitle: "Discord bot for voice channel management, manga reading, translation, and more."
- CTA Primary: "Add to Server" (blurple, Discord icon)
- CTA Secondary: "View Commands" (gray `#4E5058`)
- Trust: "Trusted by 500+ servers"
- Radial blurple glow behind logo (`rgba(88,101,242,0.15)`)
- Scroll indicator: Chevron-down, bounce animation

#### 1.3 Features (background: `--bg-secondary`)
- Section header: "FEATURES" label + "Everything you need" + subtitle
- 2x3 card grid (responsive: 3→2→1 columns)
- Cards: icon (emoji/lucide in blurple-tinted bg square) + title + description
- 6 features:
  1. Voice Management — temp channels, lock/hide/permit/kick/transfer
  2. Manga Reader — 6 sources, in-Discord reading
  3. Translation — Google Translate, any language → Vietnamese
  4. Weather — MSN Weather, Celsius, Vietnamese
  5. User Tools — avatar, server info, bot info, ping
  6. Slash Commands — 100% slash, autocomplete
- Animation: Staggered fade-in + slide-up on scroll (100ms delay between cards)

#### 1.4 Commands Showcase (background: `--bg-primary`)
- Section header: "COMMANDS" label + "Powerful & easy to use" + subtitle
- 3 command preview cards (horizontal, responsive: stack on mobile)
- Each card: Discord embed style
  - Header: Slash badge + command name + args
  - Body: Simulated bot response with left border color
- Featured commands: `/voice lock`, `/nhentai random`, `/trans`
- CTA: "View all commands →" link to `/commands`

#### 1.5 Voice System Demo (background: `--bg-secondary`)
- Section header: "VOICE CHANNELS" label + "Your channel, your rules" + subtitle
- Split layout 50/50 (stack on mobile — mockup on top):
  - Left: 4 numbered steps (blurple circles)
    1. Join trigger channel (prefix "TEST")
    2. Auto-created personal channel (prefix "* ")
    3. Full control panel (8 actions)
    4. Auto-cleanup when empty
  - Right: CSS-only Discord sidebar mockup
    - Server name header
    - Channel category with trigger channel
    - 2 temp channels (1 locked indicator)
    - Users in channels (colored avatars)
    - Control panel buttons (Lock, Hide, Rename, Limit, Permit, Block, Kick, Transfer)
- Mockup hover effects: CSS-only button highlights

#### 1.6 Stats (background: `--bg-primary`)
- 4 counters, horizontal (responsive: 2x2 on mobile)
- Animated count-up on scroll (IntersectionObserver + small JS)
- Stats:
  - Servers: 500+
  - Users: 50K+
  - Uptime: 99.9%
  - Since: 2019
- Phase 1: Hardcoded values. Future: dynamic from Discord API

#### 1.7 Testimonials (background: `--bg-secondary`)
- Section header: "REVIEWS" label + "What users say"
- 3 review cards, Discord chat-bubble style
- Each card: Avatar circle (colored) + username + role + quote text
- Content: Placeholder — replace with real reviews
- Mobile: Horizontal scroll or stack

#### 1.8 FAQ (background: `--bg-primary`)
- Section header: "FAQ" label + "Frequently asked questions"
- Accordion, shadcn-style (dark card, border, expand/collapse chevron)
- Implementation: `<details>/<summary>` HTML (zero JS) or Astro component
- 5 questions:
  1. How do I set up temporary voice channels?
  2. Is the manga reader NSFW only?
  3. What permissions does the bot need?
  4. Can I self-host this bot?
  5. How do I report a bug or request a feature?

#### 1.9 Footer (background: `--bg-tertiary`)
- 3 columns: Brand (logo + description) / Links / Resources
- Links: Add to Server, Commands, Support Server, GitHub
- Resources: Documentation, Report Bug, Discussions, Privacy Policy
- Bottom bar: Copyright "© 2019 - 2026" + social icons (GitHub, Discord)
- Floating "Back to top" button (appears after scrolling past hero)

### 2. Commands Page (`/commands`)

Separate Astro page, shared layout (navbar + footer).

#### Layout
- Sidebar (fixed 220px, collapsible on mobile → dropdown) + main content
- Sidebar: Category filter + search input
- Main: Page title + command count + card grid (2 columns, 1 on mobile)

#### Categories
| Category | Color | Commands |
|----------|-------|----------|
| All | `--accent` | All 13 |
| Voice | `#5865F2` | voice |
| Manga | `#ED4245` | nhentai, 3hentai, asmhentai, hentaifox, nhentai-lite, pururin |
| Utility | `#3BA55C` | trans, weather, ping |
| Info | `#FAA61A` | help, info, avatar |

#### Command Cards
- Slash badge + command name + category tag (color-coded pill)
- Description text
- Subcommands/options as pills (dark background)
- Commands with many subcommands: "+N more" overflow pill

#### Search
- Client-side filtering by command name and description
- Debounced input, instant results

#### Data Source
- Hardcoded in Astro data file (`.ts` or `.json`)
- Content synced manually from `docs/steering/commands.md`

## Animations

| Element | Animation | Trigger |
|---------|-----------|---------|
| Feature cards | Fade-in + slide-up, 100ms stagger | Scroll into viewport |
| Command previews | Fade-in + slide-up | Scroll into viewport |
| Stats counters | Count-up from 0 | Scroll into viewport |
| Hero glow | Subtle pulse (CSS keyframes) | Always |
| Scroll indicator | Bounce (CSS keyframes) | Always (hero only) |
| Navbar | Backdrop-blur on scroll | Scroll > 0 |
| Back to top | Fade-in | Scroll past hero |
| FAQ accordion | Height transition | Click |
| Discord mockup buttons | Background highlight | Hover (CSS) |

Implementation: CSS animations + `IntersectionObserver` for scroll triggers. No animation library.

## Responsive Breakpoints

| Breakpoint | Layout changes |
|------------|----------------|
| Desktop (>1024px) | Full layout — 3-col features, split voice demo, sidebar commands |
| Tablet (768-1024px) | 2-col features, stacked voice demo, 2-col commands |
| Mobile (<768px) | 1-col everything, hamburger nav, dropdown filter, stacked cards |

## Migration Plan

### Files to move
- `docs/maid.gif` → `landing/public/maid.gif`
- `docs/maid2.gif` → `landing/public/maid2.gif`
- `docs/CNAME` → `landing/public/CNAME` (preserved for GitHub Pages)

### Files to keep in `docs/`
- `docs/steering/` — steering docs (not served by Pages)
- `docs/specs/` — spec documents
- `docs/superpowers/` — superpowers files

### Files to remove (after migration)
- `docs/index.html`, `docs/index.css`, `docs/index.js` — replaced by Astro
- `docs/pages/` — commands.html, about.html, etc. — replaced by Astro

### GitHub Pages config
- Source: GitHub Actions (not `docs/` folder)
- Workflow: On push to main → build Astro in `landing/` → deploy to Pages
- CNAME: `www.discords.sbs` preserved in `landing/public/CNAME`

## Project Structure

```
landing/
  astro.config.mjs
  package.json
  tsconfig.json
  public/
    maid.gif
    maid2.gif
    CNAME
    favicon.ico
  src/
    layouts/
      BaseLayout.astro      # Shared: head, navbar, footer, back-to-top
    components/
      Navbar.astro
      Hero.astro
      Features.astro
      CommandsShowcase.astro
      VoiceDemo.astro
      Stats.astro
      Testimonials.astro
      FAQ.astro
      Footer.astro
      BackToTop.astro
      # Commands page components
      CommandsSidebar.astro
      CommandCard.astro
    pages/
      index.astro            # Landing page (all sections)
      commands.astro          # Commands page
    data/
      commands.ts             # Command data for commands page
      features.ts             # Feature card data
      faq.ts                  # FAQ questions & answers
    styles/
      global.css              # Design tokens, resets, base styles
      animations.css          # Scroll animations, keyframes
    scripts/
      scroll-animations.ts    # IntersectionObserver for fade-in
      counter.ts              # Stats count-up animation
```

## GitHub Actions Workflow

```yaml
# .github/workflows/deploy-landing.yml
name: Deploy Landing Page
on:
  push:
    branches: [main, develop]
    paths: ['landing/**']
jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: cd landing && npm ci && npm run build
      - uses: actions/upload-pages-artifact@v3
        with: { path: landing/dist }
      - uses: actions/deploy-pages@v4
```

## Out of Scope (Phase 1)

- Dynamic stats from Discord API
- Real testimonial content (placeholder for now)
- i18n / multi-language support
- Blog or changelog page
- Analytics integration
- Dark/light theme toggle (always dark)
