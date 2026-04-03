# Landing Page Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a modern Discord-native landing page + commands page with Astro, migrating from the outdated static HTML in `docs/`.

**Architecture:** Astro static site in `landing/` directory. Component-based — each landing page section is a standalone `.astro` component composed into `index.astro`. Shared layout (navbar + footer) via `BaseLayout.astro`. CSS-only design system with Discord color tokens. Deployed via GitHub Actions to GitHub Pages.

**Tech Stack:** Astro 5, vanilla CSS (shadcn-inspired tokens), TypeScript data files, IntersectionObserver for scroll animations.

---

## File Map

```
landing/                          # NEW directory (Astro project root)
  package.json                    # Create: Astro + dependencies
  astro.config.mjs                # Create: Astro config (static output)
  tsconfig.json                   # Create: extends Astro strict preset
  public/
    maid.gif                      # Move: from docs/maid.gif
    maid2.gif                     # Move: from docs/maid2.gif
    CNAME                         # Move: from docs/CNAME
  src/
    styles/
      global.css                  # Create: design tokens, reset, base styles
      animations.css              # Create: keyframes, scroll animation classes
    data/
      features.ts                 # Create: feature card data array
      commands.ts                 # Create: full command data for /commands page
      faq.ts                      # Create: FAQ Q&A pairs
    layouts/
      BaseLayout.astro            # Create: html head + navbar + footer + slot
    components/
      Navbar.astro                # Create: fixed navbar + mobile hamburger
      Hero.astro                  # Create: hero section
      Features.astro              # Create: 2x3 feature card grid
      CommandsShowcase.astro      # Create: 3 featured command previews
      VoiceDemo.astro             # Create: steps + Discord sidebar mockup
      Stats.astro                 # Create: 4 stat counters
      Testimonials.astro          # Create: 3 review cards
      FAQ.astro                   # Create: accordion with details/summary
      Footer.astro                # Create: 3-col footer + bottom bar
      BackToTop.astro             # Create: floating back-to-top button
      CommandsSidebar.astro       # Create: category filter + search
      CommandCard.astro           # Create: single command card
    pages/
      index.astro                 # Create: landing page (compose all sections)
      commands.astro              # Create: commands page (sidebar + grid)
    scripts/
      scroll-animations.ts        # Create: IntersectionObserver fade-in
      counter.ts                  # Create: stats count-up animation
.github/
  workflows/
    deploy-landing.yml            # Create: GitHub Actions deploy workflow
```

---

### Task 1: Scaffold Astro Project

**Files:**
- Create: `landing/package.json`
- Create: `landing/astro.config.mjs`
- Create: `landing/tsconfig.json`
- Move: `docs/maid.gif` → `landing/public/maid.gif`
- Move: `docs/maid2.gif` → `landing/public/maid2.gif`
- Move: `docs/CNAME` → `landing/public/CNAME`

- [ ] **Step 1: Initialize Astro project**

```bash
cd /Users/nguyenhuuhung/Documents/GitHub/discord-bot
mkdir -p landing
cd landing
npm create astro@latest -- --template minimal --no-install --no-git --typescript strict
```

- [ ] **Step 2: Verify package.json and install dependencies**

Check `landing/package.json` exists with `astro` dependency. Then install:

```bash
cd /Users/nguyenhuuhung/Documents/GitHub/discord-bot/landing
npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 3: Configure Astro for static output**

Write `landing/astro.config.mjs`:

```javascript
import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static",
  build: {
    assets: "_assets",
  },
  vite: {
    css: {
      transformer: "lightningcss",
    },
  },
});
```

- [ ] **Step 4: Copy static assets**

```bash
cp /Users/nguyenhuuhung/Documents/GitHub/discord-bot/docs/maid.gif /Users/nguyenhuuhung/Documents/GitHub/discord-bot/landing/public/maid.gif
cp /Users/nguyenhuuhung/Documents/GitHub/discord-bot/docs/maid2.gif /Users/nguyenhuuhung/Documents/GitHub/discord-bot/landing/public/maid2.gif
cp /Users/nguyenhuuhung/Documents/GitHub/discord-bot/docs/CNAME /Users/nguyenhuuhung/Documents/GitHub/discord-bot/landing/public/CNAME
```

- [ ] **Step 5: Verify Astro builds**

```bash
cd /Users/nguyenhuuhung/Documents/GitHub/discord-bot/landing
npm run build
```

Expected: Build succeeds, `dist/` directory created.

- [ ] **Step 6: Verify dev server starts**

```bash
cd /Users/nguyenhuuhung/Documents/GitHub/discord-bot/landing
npm run dev
```

Expected: Dev server starts on `localhost:4321`, shows default Astro page.

- [ ] **Step 7: Commit**

```bash
git add landing/
git commit -m "feat(landing): scaffold Astro project with static assets"
```

---

### Task 2: Design System — Global CSS + Animations

**Files:**
- Create: `landing/src/styles/global.css`
- Create: `landing/src/styles/animations.css`

- [ ] **Step 1: Create global.css with design tokens and reset**

Create `landing/src/styles/global.css`:

```css
/* Design tokens — Discord palette */
:root {
  --bg-primary: #313338;
  --bg-secondary: #2B2D31;
  --bg-tertiary: #1E1F22;
  --bg-card: #313338;
  --border: #3F4147;
  --accent: #5865F2;
  --accent-hover: #4752C4;
  --text-primary: #F2F3F5;
  --text-secondary: #B5BAC1;
  --text-muted: #80848E;
  --success: #3BA55C;
  --danger: #ED4245;
  --warning: #FAA61A;
  --btn-secondary: #4E5058;

  --font-family: "Inter", system-ui, -apple-system, sans-serif;
  --radius-sm: 4px;
  --radius-md: 8px;

  --section-padding: 80px 0;
  --container-width: 1100px;
  --container-padding: 0 24px;
}

/* Reset */
*,
*::before,
*::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  font-family: var(--font-family);
  background-color: var(--bg-primary);
  color: var(--text-secondary);
  font-size: 15px;
  line-height: 1.6;
}

a {
  color: inherit;
  text-decoration: none;
}

img {
  display: block;
  max-width: 100%;
}

/* Utilities */
.container {
  max-width: var(--container-width);
  margin: 0 auto;
  padding: var(--container-padding);
}

.section-label {
  color: var(--accent);
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  margin-bottom: 8px;
}

.section-title {
  color: var(--text-primary);
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 8px;
}

.section-subtitle {
  color: var(--text-secondary);
  font-size: 15px;
}

.section-header {
  text-align: center;
  margin-bottom: 40px;
}

/* Scrollbar */
::-webkit-scrollbar {
  width: 8px;
}
::-webkit-scrollbar-track {
  background: var(--bg-tertiary);
}
::-webkit-scrollbar-thumb {
  background: var(--accent);
  border-radius: 100px;
}
::-webkit-scrollbar-thumb:hover {
  background: var(--accent-hover);
}

/* Responsive */
@media (max-width: 768px) {
  :root {
    --section-padding: 48px 0;
  }

  .section-title {
    font-size: 24px;
  }
}
```

- [ ] **Step 2: Create animations.css with keyframes and scroll classes**

Create `landing/src/styles/animations.css`:

```css
/* Hero glow pulse */
@keyframes glow-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

/* Scroll indicator bounce */
@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(8px); }
}

/* Fade in + slide up for scroll reveal */
@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Scroll reveal base — hidden until observed */
.reveal {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.5s ease, transform 0.5s ease;
}

.reveal.visible {
  opacity: 1;
  transform: translateY(0);
}

/* Staggered children — set via inline style --delay or nth-child */
.reveal-stagger > .reveal {
  transition-delay: calc(var(--i, 0) * 100ms);
}

/* FAQ accordion transition */
details .faq-content {
  overflow: hidden;
  max-height: 0;
  transition: max-height 0.3s ease, padding 0.3s ease;
  padding: 0 20px;
}

details[open] .faq-content {
  max-height: 200px;
  padding: 0 20px 16px;
}

/* Back to top */
.back-to-top {
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
}

.back-to-top.visible {
  opacity: 1;
  pointer-events: auto;
}
```

- [ ] **Step 3: Verify files exist and have no syntax errors**

```bash
ls -la /Users/nguyenhuuhung/Documents/GitHub/discord-bot/landing/src/styles/
```

Expected: `global.css` and `animations.css` listed.

- [ ] **Step 4: Commit**

```bash
git add landing/src/styles/
git commit -m "feat(landing): add design system tokens and animation CSS"
```

---

### Task 3: Data Files — Features, Commands, FAQ

**Files:**
- Create: `landing/src/data/features.ts`
- Create: `landing/src/data/commands.ts`
- Create: `landing/src/data/faq.ts`

- [ ] **Step 1: Create features.ts**

Create `landing/src/data/features.ts`:

```typescript
export interface Feature {
  icon: string;
  title: string;
  description: string;
}

export const features: Feature[] = [
  {
    icon: "🎙️",
    title: "Voice Management",
    description:
      "Create temporary voice channels with full control — lock, hide, permit, kick, transfer.",
  },
  {
    icon: "📖",
    title: "Manga Reader",
    description:
      "Read from 6 sources directly in Discord — nhentai, 3hentai, asmhentai, hentaifox & more.",
  },
  {
    icon: "🌐",
    title: "Translation",
    description:
      "Translate any language to Vietnamese instantly via Google Translate API.",
  },
  {
    icon: "🌤️",
    title: "Weather",
    description:
      "Real-time weather info for any location. Celsius, Vietnamese language support.",
  },
  {
    icon: "👤",
    title: "User Tools",
    description:
      "Avatar viewer, server info, bot info, ping — quick utility commands.",
  },
  {
    icon: "⚡",
    title: "Slash Commands",
    description:
      "100% slash commands — no prefix needed. Auto-complete, instant response.",
  },
];
```

- [ ] **Step 2: Create commands.ts**

Create `landing/src/data/commands.ts`:

```typescript
export type Category = "voice" | "manga" | "utility" | "info";

export interface Command {
  name: string;
  description: string;
  category: Category;
  subcommands?: string[];
  options?: string[];
}

export const categoryMeta: Record<
  Category,
  { label: string; color: string; bg: string }
> = {
  voice: { label: "Voice", color: "#5865F2", bg: "rgba(88,101,242,0.15)" },
  manga: { label: "NSFW", color: "#ED4245", bg: "rgba(237,66,69,0.15)" },
  utility: { label: "Utility", color: "#3BA55C", bg: "rgba(59,165,92,0.15)" },
  info: { label: "Info", color: "#FAA61A", bg: "rgba(250,166,26,0.15)" },
};

export const commands: Command[] = [
  {
    name: "voice",
    description:
      "Voice channel management — lock, unlock, hide, permit, block, kick, transfer, rename, limit",
    category: "voice",
    subcommands: [
      "limit",
      "name",
      "lock",
      "unlock",
      "hide",
      "permit",
      "block",
      "kick",
      "transfer",
    ],
  },
  {
    name: "nhentai",
    description: "H manga and D reader from nhentai.net",
    category: "manga",
    subcommands: ["read", "random"],
  },
  {
    name: "3hentai",
    description: "H manga and D from 3hentai",
    category: "manga",
    subcommands: ["read", "random"],
  },
  {
    name: "asmhentai",
    description: "Gets random doujinshi on asmhentai",
    category: "manga",
    subcommands: ["read", "random"],
  },
  {
    name: "hentaifox",
    description: "Gets random doujinshi on hentaifox",
    category: "manga",
    subcommands: ["read", "random"],
  },
  {
    name: "nhentai-lite",
    description: "H manga and D reader nhentai lite",
    category: "manga",
    subcommands: ["read", "random"],
  },
  {
    name: "pururin",
    description: "Gets random doujinshi on pururin",
    category: "manga",
    subcommands: ["read", "random"],
  },
  {
    name: "trans",
    description: "Translate all languages to Vietnamese",
    category: "utility",
    options: ["word (required)"],
  },
  {
    name: "weather",
    description: "Get weather information for any location",
    category: "utility",
    options: ["location (required)"],
  },
  {
    name: "ping",
    description: "Replies with Pong! Shows bot latency",
    category: "utility",
  },
  {
    name: "help",
    description: "Get the help commands list",
    category: "info",
  },
  {
    name: "info",
    description: "Information about bot — version, stats, tech stack",
    category: "info",
    subcommands: ["bot"],
  },
  {
    name: "avatar",
    description: "Get the avatar URL of the selected user, or your own avatar",
    category: "info",
    options: ["target (optional)"],
  },
];
```

- [ ] **Step 3: Create faq.ts**

Create `landing/src/data/faq.ts`:

```typescript
export interface FAQItem {
  question: string;
  answer: string;
}

export const faqItems: FAQItem[] = [
  {
    question: "How do I set up temporary voice channels?",
    answer:
      'Create a voice channel with "TEST" prefix (e.g., "TEST Create Room"). When users join it, the bot automatically creates a personal channel for them. No additional configuration needed.',
  },
  {
    question: "Is the manga reader NSFW only?",
    answer:
      "Yes. All manga commands require an NSFW-enabled channel. The bot checks the channel setting before responding and will show an error if the channel is not marked as NSFW.",
  },
  {
    question: "What permissions does the bot need?",
    answer:
      "Administrator permission is recommended for full functionality. At minimum, the bot needs: Manage Channels (voice management), Send Messages, Embed Links, and Connect + Move Members (voice features).",
  },
  {
    question: "Can I self-host this bot?",
    answer:
      "Yes. The bot is open-source on GitHub. You need Node.js 18+, MongoDB, and optionally Redis. Check the README for Docker setup or manual installation instructions.",
  },
  {
    question: "How do I report a bug or request a feature?",
    answer:
      "Open an issue on our GitHub repository or start a discussion in GitHub Discussions. You can also reach us through the Support server link in the navbar.",
  },
];
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /Users/nguyenhuuhung/Documents/GitHub/discord-bot/landing
npx astro check
```

Expected: No errors in data files.

- [ ] **Step 5: Commit**

```bash
git add landing/src/data/
git commit -m "feat(landing): add data files for features, commands, and FAQ"
```

---

### Task 4: Base Layout + Navbar + Footer

**Files:**
- Create: `landing/src/layouts/BaseLayout.astro`
- Create: `landing/src/components/Navbar.astro`
- Create: `landing/src/components/Footer.astro`
- Create: `landing/src/components/BackToTop.astro`

- [ ] **Step 1: Create Navbar.astro**

Create `landing/src/components/Navbar.astro`:

```astro
---
const navLinks = [
  { href: "/#features", label: "Features" },
  { href: "/#commands", label: "Commands" },
  { href: "/#faq", label: "FAQ" },
  {
    href: "https://github.com/3Tea/discord-bot/discussions",
    label: "Support",
    external: true,
  },
];

const inviteUrl =
  "https://discord.com/api/oauth2/authorize?client_id=615052741911379983&permissions=8&scope=applications.commands%20bot";
---

<nav class="navbar">
  <div class="navbar-inner container">
    <a href="/" class="navbar-brand">
      <img src="/maid.gif" alt="3AT" class="navbar-logo" width="32" height="32" />
      <span class="navbar-name">3AT - Endless Paradox</span>
    </a>

    <button class="navbar-toggle" aria-label="Toggle menu" aria-expanded="false">
      <span class="hamburger"></span>
    </button>

    <div class="navbar-menu">
      <ul class="navbar-links">
        {navLinks.map((link) => (
          <li>
            <a
              href={link.href}
              class="navbar-link"
              {...(link.external ? { target: "_blank", rel: "noopener" } : {})}
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
      <a href={inviteUrl} target="_blank" rel="noopener" class="btn btn-primary btn-sm">
        Add to Server
      </a>
    </div>
  </div>
</nav>

<style>
  .navbar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 100;
    background: rgba(30, 31, 34, 0.85);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--border);
    height: 56px;
  }

  .navbar-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 100%;
    max-width: var(--container-width);
  }

  .navbar-brand {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .navbar-logo {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 2px solid var(--accent);
  }

  .navbar-name {
    color: var(--text-primary);
    font-size: 15px;
    font-weight: 600;
  }

  .navbar-menu {
    display: flex;
    align-items: center;
    gap: 24px;
  }

  .navbar-links {
    display: flex;
    list-style: none;
    gap: 4px;
  }

  .navbar-link {
    color: var(--text-secondary);
    font-size: 14px;
    padding: 6px 12px;
    border-radius: var(--radius-sm);
    transition: color 0.2s, background 0.2s;
  }

  .navbar-link:hover {
    color: var(--text-primary);
    background: rgba(255, 255, 255, 0.06);
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-weight: 500;
    border: none;
    cursor: pointer;
    transition: background 0.2s;
    font-family: inherit;
    text-decoration: none;
  }

  .btn-primary {
    background: var(--accent);
    color: white;
    border-radius: var(--radius-sm);
  }

  .btn-primary:hover {
    background: var(--accent-hover);
  }

  .btn-sm {
    font-size: 14px;
    padding: 6px 16px;
  }

  .navbar-toggle {
    display: none;
    background: none;
    border: none;
    cursor: pointer;
    padding: 8px;
  }

  .hamburger,
  .hamburger::before,
  .hamburger::after {
    display: block;
    width: 20px;
    height: 2px;
    background: var(--text-primary);
    border-radius: 2px;
    transition: transform 0.3s;
  }

  .hamburger {
    position: relative;
  }

  .hamburger::before,
  .hamburger::after {
    content: "";
    position: absolute;
    left: 0;
  }

  .hamburger::before {
    top: -6px;
  }

  .hamburger::after {
    top: 6px;
  }

  @media (max-width: 768px) {
    .navbar-toggle {
      display: block;
    }

    .navbar-menu {
      display: none;
      position: fixed;
      top: 56px;
      left: 0;
      right: 0;
      bottom: 0;
      background: var(--bg-tertiary);
      flex-direction: column;
      padding: 24px;
      gap: 16px;
    }

    .navbar-menu.open {
      display: flex;
    }

    .navbar-links {
      flex-direction: column;
      gap: 8px;
    }

    .navbar-link {
      font-size: 18px;
      padding: 12px 16px;
    }
  }
</style>

<script>
  const toggle = document.querySelector(".navbar-toggle");
  const menu = document.querySelector(".navbar-menu");
  toggle?.addEventListener("click", () => {
    const open = menu?.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
</script>
```

- [ ] **Step 2: Create Footer.astro**

Create `landing/src/components/Footer.astro`:

```astro
---
const inviteUrl =
  "https://discord.com/api/oauth2/authorize?client_id=615052741911379983&permissions=8&scope=applications.commands%20bot";

const links = [
  { label: "Add to Server", href: inviteUrl, external: true },
  { label: "Commands", href: "/commands" },
  {
    label: "Support Server",
    href: "https://github.com/3Tea/discord-bot/discussions",
    external: true,
  },
  {
    label: "GitHub",
    href: "https://github.com/3Tea/discord-bot",
    external: true,
  },
];

const resources = [
  {
    label: "Documentation",
    href: "https://github.com/3Tea/discord-bot#readme",
    external: true,
  },
  {
    label: "Report Bug",
    href: "https://github.com/3Tea/discord-bot/issues",
    external: true,
  },
  {
    label: "Discussions",
    href: "https://github.com/3Tea/discord-bot/discussions",
    external: true,
  },
];

const year = new Date().getFullYear();
---

<footer class="footer">
  <div class="footer-inner container">
    <div class="footer-grid">
      <div class="footer-brand">
        <div class="footer-brand-row">
          <img src="/maid.gif" alt="3AT" width="28" height="28" class="footer-logo" />
          <span class="footer-name">3AT - Endless Paradox</span>
        </div>
        <p class="footer-desc">
          Discord bot for voice management, manga reading & more. Running since 2019.
        </p>
      </div>

      <div class="footer-col">
        <h4 class="footer-heading">Links</h4>
        <ul class="footer-list">
          {links.map((l) => (
            <li>
              <a
                href={l.href}
                class="footer-link"
                {...(l.external ? { target: "_blank", rel: "noopener" } : {})}
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      </div>

      <div class="footer-col">
        <h4 class="footer-heading">Resources</h4>
        <ul class="footer-list">
          {resources.map((r) => (
            <li>
              <a href={r.href} class="footer-link" target="_blank" rel="noopener">
                {r.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>

    <div class="footer-bottom">
      <span class="footer-copyright">&copy; 2019 - {year} 3AT - Endless Paradox</span>
      <div class="footer-socials">
        <a href="https://github.com/3Tea/discord-bot" target="_blank" rel="noopener" aria-label="GitHub">
          GitHub
        </a>
        <a href={inviteUrl} target="_blank" rel="noopener" aria-label="Discord">
          Discord
        </a>
      </div>
    </div>
  </div>
</footer>

<style>
  .footer {
    background: var(--bg-tertiary);
    padding: 40px 0 0;
  }

  .footer-grid {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr;
    gap: 40px;
    padding-bottom: 24px;
  }

  .footer-brand-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }

  .footer-logo {
    border-radius: 50%;
  }

  .footer-name {
    color: var(--text-primary);
    font-weight: 600;
    font-size: 14px;
  }

  .footer-desc {
    color: var(--text-muted);
    font-size: 13px;
    max-width: 250px;
    line-height: 1.5;
  }

  .footer-heading {
    color: var(--text-primary);
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 12px;
  }

  .footer-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .footer-link {
    color: var(--text-secondary);
    font-size: 13px;
    transition: color 0.2s;
  }

  .footer-link:hover {
    color: var(--text-primary);
  }

  .footer-bottom {
    border-top: 1px solid var(--border);
    padding: 16px 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .footer-copyright {
    color: var(--text-muted);
    font-size: 12px;
  }

  .footer-socials {
    display: flex;
    gap: 16px;
  }

  .footer-socials a {
    color: var(--text-muted);
    font-size: 13px;
    transition: color 0.2s;
  }

  .footer-socials a:hover {
    color: var(--text-primary);
  }

  @media (max-width: 768px) {
    .footer-grid {
      grid-template-columns: 1fr;
      gap: 24px;
    }

    .footer-bottom {
      flex-direction: column;
      gap: 12px;
      text-align: center;
    }
  }
</style>
```

- [ ] **Step 3: Create BackToTop.astro**

Create `landing/src/components/BackToTop.astro`:

```astro
<button class="back-to-top" aria-label="Back to top" id="back-to-top">
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M18 15l-6-6-6 6"/>
  </svg>
</button>

<style>
  .back-to-top {
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 90;
    width: 40px;
    height: 40px;
    border-radius: var(--radius-md);
    background: var(--bg-tertiary);
    border: 1px solid var(--border);
    color: var(--text-secondary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s ease, background 0.2s;
  }

  .back-to-top.visible {
    opacity: 1;
    pointer-events: auto;
  }

  .back-to-top:hover {
    background: var(--border);
    color: var(--text-primary);
  }
</style>

<script>
  const btn = document.getElementById("back-to-top");
  window.addEventListener("scroll", () => {
    btn?.classList.toggle("visible", window.scrollY > window.innerHeight);
  });
  btn?.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
</script>
```

- [ ] **Step 4: Create BaseLayout.astro**

Create `landing/src/layouts/BaseLayout.astro`:

```astro
---
import Navbar from "../components/Navbar.astro";
import Footer from "../components/Footer.astro";
import BackToTop from "../components/BackToTop.astro";
import "../styles/global.css";
import "../styles/animations.css";

interface Props {
  title: string;
  description?: string;
}

const {
  title,
  description = "Discord bot for voice channel management, manga reading, translation, and more.",
} = Astro.props;
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content={description} />
    <link rel="icon" type="image/gif" href="/maid.gif" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />
    <title>{title}</title>
  </head>
  <body>
    <Navbar />
    <main style="padding-top: 56px;">
      <slot />
    </main>
    <Footer />
    <BackToTop />
  </body>
</html>
```

- [ ] **Step 5: Create a minimal index.astro to verify layout**

Create `landing/src/pages/index.astro`:

```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
---

<BaseLayout title="3AT - Endless Paradox | Discord Bot">
  <section style="min-height: 100vh; display: flex; align-items: center; justify-content: center;">
    <h1 style="color: var(--text-primary);">Landing Page — Layout Test</h1>
  </section>
</BaseLayout>
```

- [ ] **Step 6: Verify dev server renders layout**

```bash
cd /Users/nguyenhuuhung/Documents/GitHub/discord-bot/landing
npm run dev
```

Expected: Page loads at `localhost:4321` with navbar, footer, back-to-top button. Logo loads from `/maid.gif`.

- [ ] **Step 7: Commit**

```bash
git add landing/src/layouts/ landing/src/components/Navbar.astro landing/src/components/Footer.astro landing/src/components/BackToTop.astro landing/src/pages/index.astro
git commit -m "feat(landing): add base layout, navbar, footer, back-to-top"
```

---

### Task 5: Hero Section

**Files:**
- Create: `landing/src/components/Hero.astro`
- Modify: `landing/src/pages/index.astro`

- [ ] **Step 1: Create Hero.astro**

Create `landing/src/components/Hero.astro`:

```astro
---
const inviteUrl =
  "https://discord.com/api/oauth2/authorize?client_id=615052741911379983&permissions=8&scope=applications.commands%20bot";
---

<section class="hero" id="hero">
  <div class="hero-glow"></div>
  <div class="hero-content">
    <img src="/maid2.gif" alt="3AT Bot" class="hero-logo" width="96" height="96" />
    <h1 class="hero-title">3AT - Endless Paradox</h1>
    <p class="hero-subtitle">
      Discord bot for voice channel management, manga reading, translation, and more.
    </p>
    <div class="hero-actions">
      <a href={inviteUrl} target="_blank" rel="noopener" class="btn btn-primary">
        <svg width="16" height="12" viewBox="0 0 71 55" fill="white"><path d="M60.1 4.9A58.5 58.5 0 0045.7.2a.2.2 0 00-.2.1 40.8 40.8 0 00-1.8 3.7 54 54 0 00-16.2 0A37.4 37.4 0 0025.6.3a.2.2 0 00-.2-.1A58.4 58.4 0 0011 4.9a.2.2 0 00-.1.1C1.6 18.4-.9 31.5.3 44.5v.1a58.7 58.7 0 0017.9 9.1.2.2 0 00.3-.1 42 42 0 003.6-5.9.2.2 0 00-.1-.3 38.6 38.6 0 01-5.5-2.6.2.2 0 01 0-.4l1.1-.9a.2.2 0 01.2 0 41.9 41.9 0 0035.6 0 .2.2 0 01.2 0l1.1.9a.2.2 0 010 .4c-1.8 1-3.6 1.8-5.5 2.6a.2.2 0 00-.1.3 47.2 47.2 0 003.6 5.9.2.2 0 00.3.1A58.5 58.5 0 0070.8 44.6v-.1c1.4-15-2.3-28-9.8-39.5a.2.2 0 00-.1-.1zM23.7 36.5c-3.4 0-6.2-3.1-6.2-7s2.7-7 6.2-7 6.3 3.2 6.2 7-2.8 7-6.2 7zm23 0c-3.4 0-6.2-3.1-6.2-7s2.7-7 6.2-7 6.3 3.2 6.2 7-2.7 7-6.2 7z"/></svg>
        Add to Server
      </a>
      <a href="/commands" class="btn btn-secondary">View Commands</a>
    </div>
    <p class="hero-trust">
      Trusted by <strong>500+</strong> servers
    </p>
  </div>
  <div class="hero-scroll">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 9l6 6 6-6"/>
    </svg>
  </div>
</section>

<style>
  .hero {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    position: relative;
    overflow: hidden;
    padding: 0 24px;
  }

  .hero-glow {
    position: absolute;
    width: 500px;
    height: 500px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(88, 101, 242, 0.15) 0%, transparent 70%);
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    animation: glow-pulse 4s ease-in-out infinite;
    pointer-events: none;
  }

  .hero-content {
    position: relative;
    z-index: 1;
  }

  .hero-logo {
    width: 96px;
    height: 96px;
    border-radius: 50%;
    border: 3px solid var(--accent);
    margin: 0 auto 24px;
    box-shadow: 0 0 24px rgba(88, 101, 242, 0.4);
  }

  .hero-title {
    color: var(--text-primary);
    font-size: 42px;
    font-weight: 700;
    margin-bottom: 12px;
  }

  .hero-subtitle {
    color: var(--text-secondary);
    font-size: 16px;
    max-width: 500px;
    margin: 0 auto 32px;
  }

  .hero-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
    flex-wrap: wrap;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-weight: 500;
    font-size: 15px;
    padding: 10px 24px;
    border-radius: var(--radius-sm);
    border: none;
    cursor: pointer;
    transition: background 0.2s, box-shadow 0.2s;
    font-family: inherit;
    text-decoration: none;
  }

  .btn-primary {
    background: var(--accent);
    color: white;
  }

  .btn-primary:hover {
    background: var(--accent-hover);
    box-shadow: 0 0 16px rgba(88, 101, 242, 0.4);
  }

  .btn-secondary {
    background: var(--btn-secondary);
    color: var(--text-primary);
  }

  .btn-secondary:hover {
    background: rgba(88, 101, 242, 0.5);
  }

  .hero-trust {
    color: var(--text-muted);
    font-size: 13px;
    margin-top: 20px;
  }

  .hero-trust strong {
    color: var(--text-primary);
  }

  .hero-scroll {
    position: absolute;
    bottom: 32px;
    color: var(--text-muted);
    animation: bounce 2s ease-in-out infinite;
  }

  @media (max-width: 768px) {
    .hero-title {
      font-size: 30px;
    }

    .hero-subtitle {
      font-size: 14px;
    }

    .btn {
      font-size: 14px;
      padding: 8px 18px;
    }
  }
</style>
```

- [ ] **Step 2: Update index.astro to use Hero**

Replace `landing/src/pages/index.astro` content with:

```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
import Hero from "../components/Hero.astro";
---

<BaseLayout title="3AT - Endless Paradox | Discord Bot">
  <Hero />
</BaseLayout>
```

- [ ] **Step 3: Verify in dev server**

```bash
cd /Users/nguyenhuuhung/Documents/GitHub/discord-bot/landing
npm run dev
```

Expected: Hero section renders — logo with glow, title, subtitle, 2 buttons, trust line, scroll chevron bouncing.

- [ ] **Step 4: Commit**

```bash
git add landing/src/components/Hero.astro landing/src/pages/index.astro
git commit -m "feat(landing): add hero section with logo glow and CTAs"
```

---

### Task 6: Features Section

**Files:**
- Create: `landing/src/components/Features.astro`
- Modify: `landing/src/pages/index.astro`

- [ ] **Step 1: Create Features.astro**

Create `landing/src/components/Features.astro`:

```astro
---
import { features } from "../data/features";
---

<section class="features" id="features">
  <div class="container">
    <div class="section-header">
      <p class="section-label">Features</p>
      <h2 class="section-title">Everything you need</h2>
      <p class="section-subtitle">Packed with tools to enhance your Discord server</p>
    </div>

    <div class="features-grid reveal-stagger">
      {features.map((f, i) => (
        <div class="feature-card reveal" style={`--i: ${i}`}>
          <div class="feature-icon">
            <span>{f.icon}</span>
          </div>
          <h3 class="feature-title">{f.title}</h3>
          <p class="feature-desc">{f.description}</p>
        </div>
      ))}
    </div>
  </div>
</section>

<style>
  .features {
    background: var(--bg-secondary);
    padding: var(--section-padding);
  }

  .features-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }

  .feature-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 24px;
  }

  .feature-icon {
    width: 40px;
    height: 40px;
    border-radius: var(--radius-md);
    background: rgba(88, 101, 242, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 14px;
    font-size: 20px;
  }

  .feature-title {
    color: var(--text-primary);
    font-size: 15px;
    font-weight: 600;
    margin-bottom: 6px;
  }

  .feature-desc {
    color: var(--text-secondary);
    font-size: 13px;
    line-height: 1.6;
  }

  @media (max-width: 1024px) {
    .features-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 768px) {
    .features-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
```

- [ ] **Step 2: Add Features to index.astro**

Add import and component after Hero in `landing/src/pages/index.astro`:

```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
import Hero from "../components/Hero.astro";
import Features from "../components/Features.astro";
---

<BaseLayout title="3AT - Endless Paradox | Discord Bot">
  <Hero />
  <Features />
</BaseLayout>
```

- [ ] **Step 3: Verify in dev server**

Expected: Features section renders below hero with 6 cards in 3-col grid, alternating darker background.

- [ ] **Step 4: Commit**

```bash
git add landing/src/components/Features.astro landing/src/pages/index.astro
git commit -m "feat(landing): add features section with card grid"
```

---

### Task 7: Commands Showcase Section

**Files:**
- Create: `landing/src/components/CommandsShowcase.astro`
- Modify: `landing/src/pages/index.astro`

- [ ] **Step 1: Create CommandsShowcase.astro**

Create `landing/src/components/CommandsShowcase.astro`:

```astro
<section class="commands-showcase" id="commands">
  <div class="container">
    <div class="section-header">
      <p class="section-label">Commands</p>
      <h2 class="section-title">Powerful & easy to use</h2>
      <p class="section-subtitle">Just type / and let autocomplete guide you</p>
    </div>

    <div class="showcase-grid">
      <!-- /voice lock -->
      <div class="cmd-preview reveal" style="--i: 0">
        <div class="cmd-header">
          <span class="slash-badge">/</span>
          <span class="cmd-name">voice</span>
          <span class="cmd-args">lock</span>
        </div>
        <div class="cmd-body">
          <div class="embed-bar" style="--bar-color: #5865F2;"></div>
          <div class="embed-content">
            <p class="embed-success">&#10003; Channel locked</p>
            <p class="embed-text">Your voice channel is now locked. Only permitted users can join.</p>
          </div>
        </div>
      </div>

      <!-- /nhentai random -->
      <div class="cmd-preview reveal" style="--i: 1">
        <div class="cmd-header">
          <span class="slash-badge">/</span>
          <span class="cmd-name">nhentai</span>
          <span class="cmd-args">random</span>
        </div>
        <div class="cmd-body">
          <div class="embed-bar" style="--bar-color: #ED4245;"></div>
          <div class="embed-content">
            <div class="embed-image-placeholder">[ Manga Cover ]</div>
            <p class="embed-text">📖 Read &middot; 🔗 Read Online</p>
          </div>
        </div>
      </div>

      <!-- /trans -->
      <div class="cmd-preview reveal" style="--i: 2">
        <div class="cmd-header">
          <span class="slash-badge">/</span>
          <span class="cmd-name">trans</span>
          <span class="cmd-args">word: hello world</span>
        </div>
        <div class="cmd-body">
          <div class="embed-bar" style="--bar-color: #5865F2;"></div>
          <div class="embed-content">
            <p class="embed-result">xin ch&agrave;o thế giới</p>
            <p class="embed-meta">English → Vietnamese</p>
          </div>
        </div>
      </div>
    </div>

    <div class="showcase-cta">
      <a href="/commands" class="btn btn-outline">View all commands &rarr;</a>
    </div>
  </div>
</section>

<style>
  .commands-showcase {
    background: var(--bg-primary);
    padding: var(--section-padding);
  }

  .showcase-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
  }

  .cmd-preview {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    overflow: hidden;
  }

  .cmd-header {
    padding: 12px 16px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .slash-badge {
    background: var(--accent);
    color: white;
    font-size: 11px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 3px;
  }

  .cmd-name {
    color: var(--text-primary);
    font-size: 14px;
    font-weight: 600;
  }

  .cmd-args {
    color: var(--text-muted);
    font-size: 13px;
  }

  .cmd-body {
    padding: 16px;
    display: flex;
    gap: 12px;
  }

  .embed-bar {
    width: 3px;
    border-radius: 2px;
    background: var(--bar-color, var(--accent));
    flex-shrink: 0;
  }

  .embed-content {
    flex: 1;
  }

  .embed-success {
    color: var(--success);
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 4px;
  }

  .embed-text {
    color: var(--text-secondary);
    font-size: 12px;
  }

  .embed-result {
    color: var(--text-primary);
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 4px;
  }

  .embed-meta {
    color: var(--text-muted);
    font-size: 12px;
  }

  .embed-image-placeholder {
    background: var(--border);
    border-radius: var(--radius-sm);
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    font-size: 12px;
    margin-bottom: 8px;
  }

  .showcase-cta {
    text-align: center;
    margin-top: 28px;
  }

  .btn-outline {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: var(--btn-secondary);
    color: var(--text-primary);
    padding: 8px 20px;
    border-radius: var(--radius-sm);
    font-size: 14px;
    font-weight: 500;
    font-family: inherit;
    text-decoration: none;
    transition: background 0.2s;
  }

  .btn-outline:hover {
    background: rgba(88, 101, 242, 0.5);
  }

  @media (max-width: 768px) {
    .showcase-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
```

- [ ] **Step 2: Add CommandsShowcase to index.astro**

Update imports and add component after Features:

```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
import Hero from "../components/Hero.astro";
import Features from "../components/Features.astro";
import CommandsShowcase from "../components/CommandsShowcase.astro";
---

<BaseLayout title="3AT - Endless Paradox | Discord Bot">
  <Hero />
  <Features />
  <CommandsShowcase />
</BaseLayout>
```

- [ ] **Step 3: Verify in dev server**

Expected: 3 Discord embed-style command previews render in a row below features section.

- [ ] **Step 4: Commit**

```bash
git add landing/src/components/CommandsShowcase.astro landing/src/pages/index.astro
git commit -m "feat(landing): add commands showcase with Discord embed previews"
```

---

### Task 8: Voice System Demo Section

**Files:**
- Create: `landing/src/components/VoiceDemo.astro`
- Modify: `landing/src/pages/index.astro`

- [ ] **Step 1: Create VoiceDemo.astro**

Create `landing/src/components/VoiceDemo.astro`:

```astro
---
const steps = [
  {
    title: "Join trigger channel",
    desc: 'Join any channel prefixed with "TEST"',
  },
  {
    title: "Auto-created channel",
    desc: 'Bot creates "* YourName" channel instantly',
  },
  {
    title: "Full control panel",
    desc: "Lock, hide, rename, permit, block, kick, transfer",
  },
  {
    title: "Auto-cleanup",
    desc: "Channel deletes when everyone leaves",
  },
];

const controls = [
  { label: "🔒 Lock", active: true },
  { label: "👁 Hide", active: false },
  { label: "✏️ Rename", active: false },
  { label: "👥 Limit", active: false },
  { label: "✅ Permit", active: false },
  { label: "🚫 Block", active: false },
  { label: "👢 Kick", active: false },
  { label: "🔄 Transfer", active: false },
];
---

<section class="voice-demo" id="voice">
  <div class="container">
    <div class="section-header">
      <p class="section-label">Voice Channels</p>
      <h2 class="section-title">Your channel, your rules</h2>
      <p class="section-subtitle">Join a trigger channel → get your own private voice channel with full control</p>
    </div>

    <div class="voice-split">
      <div class="voice-steps">
        {steps.map((s, i) => (
          <div class="step reveal" style={`--i: ${i}`}>
            <div class="step-number">{i + 1}</div>
            <div>
              <p class="step-title">{s.title}</p>
              <p class="step-desc">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div class="discord-mockup reveal">
        <div class="mock-server-header">🎮 My Server</div>

        <div class="mock-channels">
          <div class="mock-category">▾ Voice Channels</div>

          <div class="mock-channel">
            <span class="mock-channel-icon">🔊</span>
            <span class="mock-channel-name muted">TEST Create Room</span>
          </div>

          <div class="mock-channel active">
            <span class="mock-channel-icon">🔊</span>
            <span class="mock-channel-name">* Hung's Room</span>
            <span class="mock-lock">🔒</span>
          </div>
          <div class="mock-user">
            <div class="mock-avatar" style="background: #5865F2;"></div>
            <span>Hung</span>
            <span class="mock-mic">🎤</span>
          </div>

          <div class="mock-channel">
            <span class="mock-channel-icon">🔊</span>
            <span class="mock-channel-name muted">* Tea's Room</span>
          </div>
          <div class="mock-user">
            <div class="mock-avatar" style="background: #ED4245;"></div>
            <span>Tea</span>
          </div>
          <div class="mock-user">
            <div class="mock-avatar" style="background: #FAA61A;"></div>
            <span>Alex</span>
          </div>
        </div>

        <div class="mock-controls">
          <p class="mock-controls-label">Channel Controls</p>
          <div class="mock-controls-grid">
            {controls.map((c) => (
              <span class:list={["mock-btn", { active: c.active }]}>{c.label}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<style>
  .voice-demo {
    background: var(--bg-secondary);
    padding: var(--section-padding);
  }

  .voice-split {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 40px;
    align-items: center;
  }

  .voice-steps {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .step {
    display: flex;
    gap: 14px;
    align-items: flex-start;
  }

  .step-number {
    min-width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--accent);
    color: white;
    font-size: 14px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .step-title {
    color: var(--text-primary);
    font-size: 15px;
    font-weight: 600;
    margin-bottom: 2px;
  }

  .step-desc {
    color: var(--text-secondary);
    font-size: 13px;
  }

  /* Discord mockup */
  .discord-mockup {
    background: var(--bg-tertiary);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    overflow: hidden;
  }

  .mock-server-header {
    padding: 12px 16px;
    border-bottom: 1px solid var(--border);
    color: var(--text-primary);
    font-size: 14px;
    font-weight: 600;
  }

  .mock-channels {
    padding: 8px 0;
  }

  .mock-category {
    padding: 4px 16px;
    color: var(--text-muted);
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .mock-channel {
    padding: 6px 16px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .mock-channel.active {
    background: rgba(88, 101, 242, 0.1);
    border-left: 2px solid var(--accent);
    margin: 0 8px;
    border-radius: 0 4px 4px 0;
  }

  .mock-channel-icon {
    font-size: 14px;
  }

  .mock-channel-name {
    color: var(--text-primary);
    font-size: 14px;
    font-weight: 500;
  }

  .mock-channel-name.muted {
    color: var(--text-muted);
    font-weight: 400;
  }

  .mock-lock {
    color: var(--accent);
    font-size: 11px;
    margin-left: auto;
  }

  .mock-user {
    padding: 3px 16px 3px 48px;
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--text-secondary);
    font-size: 13px;
  }

  .mock-avatar {
    width: 20px;
    height: 20px;
    border-radius: 50%;
  }

  .mock-mic {
    font-size: 10px;
    margin-left: auto;
    color: var(--success);
  }

  .mock-controls {
    border-top: 1px solid var(--border);
    padding: 12px 16px;
  }

  .mock-controls-label {
    color: var(--text-muted);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
  }

  .mock-controls-grid {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .mock-btn {
    font-size: 11px;
    padding: 4px 10px;
    border-radius: 3px;
    background: var(--btn-secondary);
    color: var(--text-primary);
    transition: background 0.2s;
    cursor: default;
  }

  .mock-btn.active {
    background: var(--accent);
    color: white;
  }

  .mock-btn:hover {
    background: rgba(88, 101, 242, 0.5);
  }

  @media (max-width: 768px) {
    .voice-split {
      grid-template-columns: 1fr;
    }

    .discord-mockup {
      order: -1;
    }
  }
</style>
```

- [ ] **Step 2: Add VoiceDemo to index.astro**

Add import and component after CommandsShowcase:

```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
import Hero from "../components/Hero.astro";
import Features from "../components/Features.astro";
import CommandsShowcase from "../components/CommandsShowcase.astro";
import VoiceDemo from "../components/VoiceDemo.astro";
---

<BaseLayout title="3AT - Endless Paradox | Discord Bot">
  <Hero />
  <Features />
  <CommandsShowcase />
  <VoiceDemo />
</BaseLayout>
```

- [ ] **Step 3: Verify in dev server**

Expected: Split layout — steps on left, Discord sidebar mockup on right. Control panel buttons with hover effects.

- [ ] **Step 4: Commit**

```bash
git add landing/src/components/VoiceDemo.astro landing/src/pages/index.astro
git commit -m "feat(landing): add voice system demo with Discord mockup"
```

---

### Task 9: Stats + Testimonials + FAQ Sections

**Files:**
- Create: `landing/src/components/Stats.astro`
- Create: `landing/src/components/Testimonials.astro`
- Create: `landing/src/components/FAQ.astro`
- Modify: `landing/src/pages/index.astro`

- [ ] **Step 1: Create Stats.astro**

Create `landing/src/components/Stats.astro`:

```astro
---
const stats = [
  { value: "500+", label: "Servers" },
  { value: "50K+", label: "Users" },
  { value: "99.9%", label: "Uptime" },
  { value: "2019", label: "Since" },
];
---

<section class="stats">
  <div class="container">
    <div class="stats-grid">
      {stats.map((s) => (
        <div class="stat-item reveal">
          <p class="stat-value" data-target={s.value}>{s.value}</p>
          <p class="stat-label">{s.label}</p>
        </div>
      ))}
    </div>
  </div>
</section>

<style>
  .stats {
    background: var(--bg-primary);
    padding: var(--section-padding);
  }

  .stats-grid {
    display: flex;
    justify-content: center;
    gap: 64px;
  }

  .stat-item {
    text-align: center;
  }

  .stat-value {
    color: var(--accent);
    font-size: 36px;
    font-weight: 700;
  }

  .stat-label {
    color: var(--text-secondary);
    font-size: 14px;
    margin-top: 4px;
  }

  @media (max-width: 768px) {
    .stats-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
    }
  }
</style>
```

- [ ] **Step 2: Create Testimonials.astro**

Create `landing/src/components/Testimonials.astro`:

```astro
---
const reviews = [
  {
    name: "Admin_01",
    role: "Server Owner",
    color: "#5865F2",
    text: "Voice channel system is amazing. My members love having their own private rooms. Setup was instant — just add the bot and it works.",
  },
  {
    name: "MangaFan",
    role: "Community Member",
    color: "#ED4245",
    text: "6 manga sources in one bot? No more switching between sites. The in-Discord reader with pagination is super convenient.",
  },
  {
    name: "TeaMod",
    role: "Moderator",
    color: "#3BA55C",
    text: "Running since 2019 and still getting updates. Slash commands work perfectly, the translate feature saves us daily in our Vietnamese community.",
  },
];
---

<section class="testimonials">
  <div class="container">
    <div class="section-header">
      <p class="section-label">Reviews</p>
      <h2 class="section-title">What users say</h2>
      <p class="section-subtitle">Real feedback from server admins</p>
    </div>

    <div class="testimonials-grid">
      {reviews.map((r, i) => (
        <div class="review-card reveal" style={`--i: ${i}`}>
          <div class="review-header">
            <div class="review-avatar" style={`background: ${r.color};`}>
              {r.name[0]}
            </div>
            <div>
              <p class="review-name">{r.name}</p>
              <p class="review-role">{r.role}</p>
            </div>
          </div>
          <p class="review-text">"{r.text}"</p>
        </div>
      ))}
    </div>
  </div>
</section>

<style>
  .testimonials {
    background: var(--bg-secondary);
    padding: var(--section-padding);
  }

  .testimonials-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }

  .review-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 24px;
  }

  .review-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 14px;
  }

  .review-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 14px;
    font-weight: 600;
    flex-shrink: 0;
  }

  .review-name {
    color: var(--text-primary);
    font-size: 14px;
    font-weight: 600;
  }

  .review-role {
    color: var(--text-muted);
    font-size: 11px;
  }

  .review-text {
    color: #DBDEE1;
    font-size: 13px;
    line-height: 1.6;
  }

  @media (max-width: 768px) {
    .testimonials-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
```

- [ ] **Step 3: Create FAQ.astro**

Create `landing/src/components/FAQ.astro`:

```astro
---
import { faqItems } from "../data/faq";
---

<section class="faq" id="faq">
  <div class="container">
    <div class="section-header">
      <p class="section-label">FAQ</p>
      <h2 class="section-title">Frequently asked questions</h2>
    </div>

    <div class="faq-list">
      {faqItems.map((item, i) => (
        <details class="faq-item" {...(i === 0 ? { open: true } : {})}>
          <summary class="faq-question">
            <span>{item.question}</span>
            <svg class="faq-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </summary>
          <div class="faq-content">
            <p>{item.answer}</p>
          </div>
        </details>
      ))}
    </div>
  </div>
</section>

<style>
  .faq {
    background: var(--bg-primary);
    padding: var(--section-padding);
  }

  .faq-list {
    max-width: 640px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .faq-item {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    overflow: hidden;
  }

  .faq-question {
    padding: 16px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    list-style: none;
    color: var(--text-primary);
    font-size: 14px;
    font-weight: 500;
  }

  .faq-question::-webkit-details-marker {
    display: none;
  }

  .faq-chevron {
    color: var(--text-secondary);
    transition: transform 0.3s ease;
    flex-shrink: 0;
  }

  details[open] .faq-chevron {
    transform: rotate(180deg);
  }

  .faq-content {
    padding: 0 20px 16px;
    border-top: 1px solid var(--border);
  }

  .faq-content p {
    color: var(--text-secondary);
    font-size: 13px;
    line-height: 1.6;
    margin-top: 12px;
  }
</style>
```

- [ ] **Step 4: Update index.astro with all remaining sections**

Update `landing/src/pages/index.astro`:

```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
import Hero from "../components/Hero.astro";
import Features from "../components/Features.astro";
import CommandsShowcase from "../components/CommandsShowcase.astro";
import VoiceDemo from "../components/VoiceDemo.astro";
import Stats from "../components/Stats.astro";
import Testimonials from "../components/Testimonials.astro";
import FAQ from "../components/FAQ.astro";
---

<BaseLayout title="3AT - Endless Paradox | Discord Bot">
  <Hero />
  <Features />
  <CommandsShowcase />
  <VoiceDemo />
  <Stats />
  <Testimonials />
  <FAQ />
</BaseLayout>
```

- [ ] **Step 5: Verify all sections render**

```bash
cd /Users/nguyenhuuhung/Documents/GitHub/discord-bot/landing
npm run dev
```

Expected: Full landing page with all 8 sections rendering correctly, alternating backgrounds.

- [ ] **Step 6: Commit**

```bash
git add landing/src/components/Stats.astro landing/src/components/Testimonials.astro landing/src/components/FAQ.astro landing/src/pages/index.astro
git commit -m "feat(landing): add stats, testimonials, and FAQ sections"
```

---

### Task 10: Scroll Animations

**Files:**
- Create: `landing/src/scripts/scroll-animations.ts`
- Create: `landing/src/scripts/counter.ts`
- Modify: `landing/src/layouts/BaseLayout.astro`

- [ ] **Step 1: Create scroll-animations.ts**

Create `landing/src/scripts/scroll-animations.ts`:

```typescript
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.1 },
);

document.querySelectorAll(".reveal").forEach((el) => {
  observer.observe(el);
});
```

- [ ] **Step 2: Create counter.ts**

Create `landing/src/scripts/counter.ts`:

```typescript
function animateCounter(el: Element): void {
  const text = el.getAttribute("data-target") || el.textContent || "";
  const suffix = text.replace(/[\d.]/g, "");
  const target = parseFloat(text.replace(/[^\d.]/g, ""));

  if (isNaN(target)) return;

  const duration = 1500;
  const start = performance.now();

  function step(now: number): void {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = target * eased;

    if (target % 1 === 0) {
      el.textContent = Math.floor(current) + suffix;
    } else {
      el.textContent = current.toFixed(1) + suffix;
    }

    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }

  requestAnimationFrame(step);
}

const counterObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        counterObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.5 },
);

document.querySelectorAll(".stat-value").forEach((el) => {
  counterObserver.observe(el);
});
```

- [ ] **Step 3: Add scripts to BaseLayout.astro**

Add before the closing `</body>` tag in `landing/src/layouts/BaseLayout.astro`:

```astro
    <Footer />
    <BackToTop />
    <script src="../scripts/scroll-animations.ts"></script>
    <script src="../scripts/counter.ts"></script>
  </body>
</html>
```

- [ ] **Step 4: Verify animations work**

Expected: Cards fade in when scrolling into view. Stats count up from 0 when visible.

- [ ] **Step 5: Commit**

```bash
git add landing/src/scripts/ landing/src/layouts/BaseLayout.astro
git commit -m "feat(landing): add scroll reveal and counter animations"
```

---

### Task 11: Commands Page

**Files:**
- Create: `landing/src/components/CommandsSidebar.astro`
- Create: `landing/src/components/CommandCard.astro`
- Create: `landing/src/pages/commands.astro`

- [ ] **Step 1: Create CommandCard.astro**

Create `landing/src/components/CommandCard.astro`:

```astro
---
import type { Command } from "../data/commands";
import { categoryMeta } from "../data/commands";

interface Props {
  command: Command;
}

const { command } = Astro.props;
const meta = categoryMeta[command.category];
const items = command.subcommands || command.options || [];
const maxShow = 4;
const overflow = items.length - maxShow;
---

<div class="command-card">
  <div class="command-header">
    <span class="slash-badge">/</span>
    <span class="command-name">{command.name}</span>
    <span
      class="category-tag"
      style={`color: ${meta.color}; background: ${meta.bg};`}
    >
      {meta.label}
    </span>
  </div>
  <p class="command-desc">{command.description}</p>
  {items.length > 0 && (
    <div class="command-pills">
      {items.slice(0, maxShow).map((item) => (
        <span class="pill">{item}</span>
      ))}
      {overflow > 0 && <span class="pill pill-more">+{overflow} more</span>}
    </div>
  )}
</div>

<style>
  .command-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 16px;
  }

  .command-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  .slash-badge {
    background: var(--accent);
    color: white;
    font-size: 10px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 3px;
  }

  .command-name {
    color: var(--text-primary);
    font-size: 14px;
    font-weight: 600;
  }

  .category-tag {
    font-size: 10px;
    font-weight: 500;
    padding: 2px 8px;
    border-radius: 10px;
    margin-left: auto;
  }

  .command-desc {
    color: var(--text-secondary);
    font-size: 12px;
    line-height: 1.5;
    margin-bottom: 10px;
  }

  .command-pills {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }

  .pill {
    color: var(--text-muted);
    font-size: 11px;
    background: var(--bg-tertiary);
    padding: 2px 8px;
    border-radius: 3px;
  }

  .pill-more {
    color: var(--text-secondary);
  }
</style>
```

- [ ] **Step 2: Create CommandsSidebar.astro**

Create `landing/src/components/CommandsSidebar.astro`:

```astro
---
import { categoryMeta } from "../data/commands";

const categories = [
  { key: "all", label: "All Commands", icon: "" },
  { key: "voice", label: "🎙️ Voice", icon: "" },
  { key: "manga", label: "📖 Manga", icon: "" },
  { key: "utility", label: "🛠️ Utility", icon: "" },
  { key: "info", label: "ℹ️ Info", icon: "" },
];
---

<aside class="sidebar" id="commands-sidebar">
  <div class="sidebar-section">
    <p class="sidebar-label">Categories</p>
    <div class="sidebar-categories">
      {categories.map((c) => (
        <button
          class:list={["sidebar-btn", { active: c.key === "all" }]}
          data-category={c.key}
        >
          {c.label}
        </button>
      ))}
    </div>
  </div>

  <div class="sidebar-section">
    <p class="sidebar-label">Search</p>
    <input
      type="text"
      class="sidebar-search"
      placeholder="🔍 Search commands..."
      id="command-search"
    />
  </div>
</aside>

<style>
  .sidebar {
    width: 220px;
    padding: 20px 16px;
    flex-shrink: 0;
    position: sticky;
    top: 76px;
    height: fit-content;
  }

  .sidebar-section {
    margin-bottom: 20px;
  }

  .sidebar-label {
    color: var(--text-muted);
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 8px;
  }

  .sidebar-categories {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .sidebar-btn {
    display: block;
    width: 100%;
    text-align: left;
    color: var(--text-secondary);
    font-size: 13px;
    padding: 8px 12px;
    border-radius: var(--radius-sm);
    background: none;
    border: none;
    cursor: pointer;
    font-family: inherit;
    transition: background 0.2s, color 0.2s;
  }

  .sidebar-btn:hover {
    background: rgba(255, 255, 255, 0.06);
    color: var(--text-primary);
  }

  .sidebar-btn.active {
    background: var(--accent);
    color: white;
  }

  .sidebar-search {
    width: 100%;
    background: var(--bg-tertiary);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 8px 12px;
    color: var(--text-primary);
    font-size: 13px;
    font-family: inherit;
    outline: none;
  }

  .sidebar-search::placeholder {
    color: var(--text-muted);
  }

  .sidebar-search:focus {
    border-color: var(--accent);
  }

  @media (max-width: 768px) {
    .sidebar {
      width: 100%;
      position: static;
      padding: 16px;
      display: flex;
      gap: 16px;
      overflow-x: auto;
      flex-wrap: wrap;
    }

    .sidebar-section {
      margin-bottom: 0;
    }

    .sidebar-categories {
      flex-direction: row;
      gap: 4px;
    }

    .sidebar-btn {
      white-space: nowrap;
    }
  }
</style>
```

- [ ] **Step 3: Create commands.astro page**

Create `landing/src/pages/commands.astro`:

```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
import CommandsSidebar from "../components/CommandsSidebar.astro";
import CommandCard from "../components/CommandCard.astro";
import { commands } from "../data/commands";
---

<BaseLayout title="Commands | 3AT - Endless Paradox">
  <div class="commands-page">
    <CommandsSidebar />

    <div class="commands-main">
      <div class="commands-header">
        <h1 class="commands-title">All Commands</h1>
        <p class="commands-count">
          <span id="commands-count">{commands.length}</span> commands available
        </p>
      </div>

      <div class="commands-grid" id="commands-grid">
        {commands.map((cmd) => (
          <div data-category={cmd.category} data-name={cmd.name} data-desc={cmd.description}>
            <CommandCard command={cmd} />
          </div>
        ))}
      </div>
    </div>
  </div>
</BaseLayout>

<style>
  .commands-page {
    display: flex;
    min-height: calc(100vh - 56px);
  }

  .commands-main {
    flex: 1;
    padding: 24px;
  }

  .commands-header {
    margin-bottom: 24px;
  }

  .commands-title {
    color: var(--text-primary);
    font-size: 22px;
    font-weight: 700;
    margin-bottom: 4px;
  }

  .commands-count {
    color: var(--text-muted);
    font-size: 13px;
  }

  .commands-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  @media (max-width: 768px) {
    .commands-page {
      flex-direction: column;
    }

    .commands-grid {
      grid-template-columns: 1fr;
    }
  }
</style>

<script>
  const sidebar = document.getElementById("commands-sidebar");
  const grid = document.getElementById("commands-grid");
  const searchInput = document.getElementById("command-search") as HTMLInputElement | null;
  const countEl = document.getElementById("commands-count");
  const titleEl = document.querySelector(".commands-title");
  const cards = grid ? Array.from(grid.children) as HTMLElement[] : [];

  let activeCategory = "all";

  function filterCards(): void {
    const query = searchInput?.value.toLowerCase() || "";
    let visible = 0;

    cards.forEach((card) => {
      const cat = card.dataset.category || "";
      const name = card.dataset.name || "";
      const desc = card.dataset.desc || "";

      const matchCategory = activeCategory === "all" || cat === activeCategory;
      const matchSearch =
        !query || name.includes(query) || desc.toLowerCase().includes(query);

      const show = matchCategory && matchSearch;
      card.style.display = show ? "" : "none";
      if (show) visible++;
    });

    if (countEl) countEl.textContent = String(visible);
  }

  sidebar?.querySelectorAll("[data-category]").forEach((btn) => {
    btn.addEventListener("click", () => {
      sidebar.querySelectorAll("[data-category]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      activeCategory = (btn as HTMLElement).dataset.category || "all";

      const label =
        activeCategory === "all"
          ? "All Commands"
          : btn.textContent?.trim() || "Commands";
      if (titleEl) titleEl.textContent = label;

      filterCards();
    });
  });

  let debounceTimer: ReturnType<typeof setTimeout>;
  searchInput?.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(filterCards, 200);
  });
</script>
```

- [ ] **Step 4: Verify commands page**

```bash
cd /Users/nguyenhuuhung/Documents/GitHub/discord-bot/landing
npm run dev
```

Navigate to `localhost:4321/commands`. Expected: Sidebar with category filters + search, 13 command cards in 2-col grid. Click category to filter. Type in search to filter by name/description.

- [ ] **Step 5: Commit**

```bash
git add landing/src/components/CommandCard.astro landing/src/components/CommandsSidebar.astro landing/src/pages/commands.astro
git commit -m "feat(landing): add commands page with sidebar filter and search"
```

---

### Task 12: GitHub Actions Workflow

**Files:**
- Create: `.github/workflows/deploy-landing.yml`

- [ ] **Step 1: Create deploy workflow**

Create `.github/workflows/deploy-landing.yml`:

```yaml
name: Deploy Landing Page

on:
  push:
    branches: [main, develop]
    paths: ["landing/**"]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: landing/package-lock.json

      - name: Install dependencies
        run: cd landing && npm ci

      - name: Build Astro
        run: cd landing && npm run build

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: landing/dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Verify workflow file is valid YAML**

```bash
cat /Users/nguyenhuuhung/Documents/GitHub/discord-bot/.github/workflows/deploy-landing.yml | python3 -c "import yaml, sys; yaml.safe_load(sys.stdin); print('Valid YAML')"
```

Expected: `Valid YAML`

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/deploy-landing.yml
git commit -m "ci: add GitHub Actions workflow for landing page deployment"
```

---

### Task 13: Build Verification + Final Cleanup

**Files:**
- Modify: `.gitignore` (add `landing/node_modules/`, `landing/dist/`, `.superpowers/`)

- [ ] **Step 1: Update .gitignore**

Add to the project root `.gitignore`:

```
# Landing page
landing/node_modules/
landing/dist/
landing/.astro/

# Superpowers brainstorm
.superpowers/
```

- [ ] **Step 2: Full build verification**

```bash
cd /Users/nguyenhuuhung/Documents/GitHub/discord-bot/landing
npm run build
```

Expected: Build succeeds. Check `landing/dist/` contains `index.html`, `commands/index.html`, `maid.gif`, `maid2.gif`, `CNAME`.

- [ ] **Step 3: Verify dist output**

```bash
ls landing/dist/
ls landing/dist/commands/
cat landing/dist/CNAME
```

Expected: All files present. CNAME contains `www.discords.sbs`.

- [ ] **Step 4: Commit**

```bash
git add .gitignore
git commit -m "chore: update gitignore for landing page build artifacts"
```

---

### Task 14: Remove Old Landing Page Files

**Files:**
- Delete: `docs/index.html`
- Delete: `docs/index.css`
- Delete: `docs/index.js`
- Delete: `docs/pages/` (entire directory)

- [ ] **Step 1: Remove old landing page files**

```bash
cd /Users/nguyenhuuhung/Documents/GitHub/discord-bot
git rm docs/index.html docs/index.css docs/index.js
git rm -r docs/pages/
```

- [ ] **Step 2: Verify docs/ only contains non-landing files**

```bash
ls docs/
```

Expected: Only `steering/`, `specs/`, `superpowers/`, `maid.gif`, `maid2.gif`, `CNAME` remain. (GIF and CNAME kept as backup until landing is deployed.)

- [ ] **Step 3: Commit**

```bash
git commit -m "chore: remove old landing page files from docs/"
```

---

Plan complete and saved to `docs/specs/2026-04-03-landing-page-implementation-plan.md`.

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"content": "Explore current landing page files in docs/", "status": "completed", "activeForm": "Exploring current landing page files"}, {"content": "Ask clarifying questions about landing page redesign", "status": "completed", "activeForm": "Asking clarifying questions"}, {"content": "Propose 2-3 approaches with trade-offs", "status": "completed", "activeForm": "Proposing approaches"}, {"content": "Present design \u2014 Hero + Nav section", "status": "completed", "activeForm": "Presenting Hero + Nav design"}, {"content": "Present design \u2014 Features + Commands section", "status": "completed", "activeForm": "Presenting Features + Commands design"}, {"content": "Present design \u2014 Voice demo + Stats section", "status": "completed", "activeForm": "Presenting Voice demo + Stats design"}, {"content": "Present design \u2014 Testimonials + FAQ + Footer", "status": "completed", "activeForm": "Presenting Testimonials + FAQ + Footer design"}, {"content": "Present design \u2014 Commands page", "status": "completed", "activeForm": "Presenting Commands page design"}, {"content": "Write design doc", "status": "completed", "activeForm": "Writing design doc"}, {"content": "User reviews written spec", "status": "completed", "activeForm": "Waiting for user to review spec"}, {"content": "Write implementation plan", "status": "completed", "activeForm": "Writing implementation plan"}]