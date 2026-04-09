# Landing Site i18n Design

## Context

The Astro landing site (`landing/`) has partial i18n: content collections (`commands/`, `guides/`) already use `{lang}/` folder structure with EN + VI, but all UI shell (Navbar, Hero, Features, FAQ, Footer) and root pages are English-only hardcoded. There is no Astro i18n configuration. The `LanguageSwitcher` only works on content detail pages.

**Goal:** Add proper i18n following Astro's official guide + recipe pattern, making all user-facing text translatable while keeping the architecture extensible for future languages.

**References:**
- https://docs.astro.build/en/guides/internationalization/
- https://docs.astro.build/en/recipes/i18n/

## Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| URL structure | EN = `/` (no prefix), VI = `/vi/` | Astro default, clean URLs, SEO-friendly |
| UI translations | JSON-in-TS (`ui.ts` with `as const`) | Type-safe, Astro Recipe standard, no deps |
| Long content | Markdown content collections | Already in use for commands/guides |
| Privacy/Terms | EN only, refactored to Markdown | Legal pages stay English, but consistent format |
| Languages shipped | EN + VI | Design supports adding more (JA, KO, ID...) |
| Astro i18n config | Built-in `i18n` in `astro.config.mjs` | Routing middleware, `astro:i18n` utilities |

## 1. Astro i18n Configuration

Add to `astro.config.mjs`:

```js
export default defineConfig({
  i18n: {
    defaultLocale: "en",
    locales: ["en", "vi"],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  // ... existing output, build, vite config unchanged
});
```

- `prefixDefaultLocale: false` — `/` serves EN, `/vi/` serves VI
- Adding a new language later: add to `locales` array + create translations + page directory

## 2. Translation Layer (`src/i18n/`)

Two new files following the Astro Recipe pattern:

### `src/i18n/ui.ts`

```ts
export const languages = {
  en: "English",
  vi: "Tiếng Việt",
} as const;

export const defaultLang = "en" as const;
export const showDefaultLang = false;

export const ui = {
  en: {
    // Navigation
    "nav.features": "Features",
    "nav.commands": "Commands",
    "nav.guide": "Guide",
    "nav.faq": "FAQ",
    "nav.support": "Support",
    "nav.add": "Add to Server",

    // Hero
    "hero.subtitle": "A Discord bot packed with XP leveling, economy, voice management, manga reader, and 15-language support. Slash commands only, always up.",
    "hero.add": "Add to Server",
    "hero.commands": "View Commands",
    "hero.trust": "Free to use · Slash commands · Online since 2019",

    // Features (6 items)
    "features.voice.title": "Voice Management",
    "features.voice.desc": "Create temporary voice channels with full control — lock, hide, permit, kick, transfer.",
    "features.xp.title": "XP & Leveling",
    "features.xp.desc": "Earn XP from messages, voice, and reactions. Track ranks, view canvas cards, and compete on leaderboards.",
    "features.economy.title": "Economy System",
    "features.economy.desc": "Coins, gems, daily prayers, streak rewards, and a server shop with purchasable roles and items.",
    "features.manga.title": "Manga Reader",
    "features.manga.desc": "Read from 6+ sources directly in Discord — nhentai, 3hentai, asmhentai, hentaifox & more.",
    "features.i18n.title": "Multi-Language",
    "features.i18n.desc": "Supports 15 languages — English, Vietnamese, Indonesian, Spanish, Japanese, Chinese, Korean, Portuguese (Brazil), French, German, Russian, Turkish, Italian, Polish, and Dutch.",
    "features.utility.title": "Utility Tools",
    "features.utility.desc": "Weather, translation, avatar viewer, bot info — plus 100% slash commands with auto-complete.",

    // FAQ (7 items)
    "faq.xp.q": "How does the XP and leveling system work?",
    "faq.xp.a": "Members earn XP from messages, voice activity, and reactions. XP is tracked per server with configurable rates. Use /rank to view your level card, /leaderboard for rankings (with daily, weekly, monthly filters), and /server-rank to see your server's stats. Admins can configure XP rates and blacklist channels via /xp commands.",
    "faq.voice.q": "How do I set up temporary voice channels?",
    "faq.voice.a": "Create a voice channel with \"3AT \" prefix (e.g., \"3AT Create Room\"). When users join it, the bot automatically creates a personal channel for them. No additional configuration needed.",
    "faq.economy.q": "What is the economy system?",
    "faq.economy.a": "Each server has its own economy with coins and gems. Use /pray daily to earn coins (with streak bonuses at 3, 7, 14, and 30 days). Check your balance with /balance, and browse the server shop with /shop. Admins can manage currency with /economy commands.",
    "faq.lang.q": "What languages are supported?",
    "faq.lang.a": "The bot supports 15 languages: English, Vietnamese, Indonesian, Spanish, Japanese, Chinese, Korean, Portuguese (Brazil), French, German, Russian, Turkish, Italian, Polish, and Dutch. Set your personal language with /settings language, or set a server default with /settings server-language. The bot auto-detects your Discord client language as a fallback.",
    "faq.nsfw.q": "Is the manga reader NSFW only?",
    "faq.nsfw.a": "Yes. All manga commands require an NSFW-enabled channel. The bot checks the channel setting before responding and will show an error if the channel is not marked as NSFW.",
    "faq.perms.q": "What permissions does the bot need?",
    "faq.perms.a": "Administrator permission is recommended for full functionality. At minimum, the bot needs: Manage Channels (voice management), Send Messages, Embed Links, Attach Files (rank cards), and Connect + Move Members (voice features).",
    "faq.bug.q": "How do I report a bug or request a feature?",
    "faq.bug.a": "Open an issue on our GitHub repository or start a discussion in GitHub Discussions. You can also reach us through the Support server link in the navbar.",

    // Footer
    "footer.desc": "Discord bot for voice management, manga reading & more. Running since 2019.",
    "footer.links": "Links",
    "footer.resources": "Resources",
    "footer.legal": "Legal",
    "footer.add": "Add to Server",
    "footer.commands": "Commands",
    "footer.support": "Support Server",
    "footer.github": "GitHub",
    "footer.docs": "Documentation",
    "footer.bug": "Report Bug",
    "footer.discussions": "Discussions",
    "footer.privacy": "Privacy Policy",
    "footer.terms": "Terms of Service",

    // Commands page
    "commands.title": "All Commands",
    "commands.available": "commands available",
    "commands.search": "Search commands...",
    "commands.back": "← Back to Commands",

    // Guide page
    "guide.section": "User Guide",
    "guide.title": "Everything you need to know about 3AT",
    "guide.subtitle": "Guides for every system — whether you're a member looking to earn coins or an admin setting up your server.",
    "guide.back": "← Back to Guide",
    "guide.related": "Related Commands",

    // Shared
    "meta.description": "Discord bot for voice channel management, manga reading, translation, and more.",
    "translation.notice": "Translation is being updated. Content is currently displayed in English.",
  },
  vi: {
    // Navigation
    "nav.features": "Tính năng",
    "nav.commands": "Lệnh",
    "nav.guide": "Hướng dẫn",
    "nav.faq": "Câu hỏi",
    "nav.support": "Hỗ trợ",
    "nav.add": "Thêm vào Server",

    // Hero
    "hero.subtitle": "Bot Discord với hệ thống XP, kinh tế, quản lý voice, đọc manga, hỗ trợ 15 ngôn ngữ. Chỉ dùng slash commands, luôn hoạt động.",
    "hero.add": "Thêm vào Server",
    "hero.commands": "Xem lệnh",
    "hero.trust": "Miễn phí · Slash commands · Hoạt động từ 2019",

    // Features
    "features.voice.title": "Quản lý Voice",
    "features.voice.desc": "Tạo kênh voice tạm thời với đầy đủ quyền — khóa, ẩn, cấp phép, kick, chuyển quyền.",
    "features.xp.title": "XP & Cấp độ",
    "features.xp.desc": "Nhận XP từ tin nhắn, voice và reaction. Xem rank card, bảng xếp hạng theo ngày/tuần/tháng.",
    "features.economy.title": "Hệ thống Kinh tế",
    "features.economy.desc": "Coin, gem, cầu nguyện hàng ngày, phần thưởng streak, và cửa hàng server với role và vật phẩm.",
    "features.manga.title": "Đọc Manga",
    "features.manga.desc": "Đọc từ 6+ nguồn trực tiếp trên Discord — nhentai, 3hentai, asmhentai, hentaifox & nhiều hơn.",
    "features.i18n.title": "Đa ngôn ngữ",
    "features.i18n.desc": "Hỗ trợ 15 ngôn ngữ — Tiếng Anh, Tiếng Việt, Indonesia, Tây Ban Nha, Nhật, Trung, Hàn, Bồ Đào Nha (Brazil), Pháp, Đức, Nga, Thổ Nhĩ Kỳ, Ý, Ba Lan và Hà Lan.",
    "features.utility.title": "Tiện ích",
    "features.utility.desc": "Thời tiết, dịch thuật, xem avatar, thông tin bot — cùng 100% slash commands với auto-complete.",

    // FAQ
    "faq.xp.q": "Hệ thống XP và cấp độ hoạt động như thế nào?",
    "faq.xp.a": "Thành viên nhận XP từ tin nhắn, hoạt động voice và reaction. XP được tính theo từng server với tỉ lệ có thể tùy chỉnh. Dùng /rank để xem rank card, /leaderboard để xem bảng xếp hạng (theo ngày, tuần, tháng), và /server-rank để xem thống kê server. Admin có thể cấu hình tỉ lệ XP qua lệnh /xp.",
    "faq.voice.q": "Làm sao để thiết lập kênh voice tạm thời?",
    "faq.voice.a": "Tạo kênh voice có tiền tố \"3AT \" (ví dụ: \"3AT Create Room\"). Khi người dùng tham gia, bot tự động tạo kênh riêng cho họ. Không cần cấu hình thêm.",
    "faq.economy.q": "Hệ thống kinh tế là gì?",
    "faq.economy.a": "Mỗi server có kinh tế riêng với coin và gem. Dùng /pray mỗi ngày để nhận coin (có thưởng streak ở ngày 3, 7, 14, 30). Kiểm tra số dư với /balance, và xem cửa hàng với /shop. Admin quản lý tiền tệ qua lệnh /economy.",
    "faq.lang.q": "Hỗ trợ những ngôn ngữ nào?",
    "faq.lang.a": "Bot hỗ trợ 15 ngôn ngữ: Tiếng Anh, Tiếng Việt, Indonesia, Tây Ban Nha, Nhật, Trung, Hàn, Bồ Đào Nha (Brazil), Pháp, Đức, Nga, Thổ Nhĩ Kỳ, Ý, Ba Lan và Hà Lan. Đặt ngôn ngữ cá nhân với /settings language, hoặc mặc định server với /settings server-language.",
    "faq.nsfw.q": "Manga reader chỉ dùng cho NSFW?",
    "faq.nsfw.a": "Đúng. Tất cả lệnh manga yêu cầu kênh NSFW. Bot kiểm tra cài đặt kênh trước khi phản hồi và báo lỗi nếu kênh chưa được đánh dấu NSFW.",
    "faq.perms.q": "Bot cần những quyền gì?",
    "faq.perms.a": "Quyền Administrator được khuyến nghị. Tối thiểu cần: Manage Channels (quản lý voice), Send Messages, Embed Links, Attach Files (rank card), và Connect + Move Members (tính năng voice).",
    "faq.bug.q": "Làm sao báo lỗi hoặc yêu cầu tính năng?",
    "faq.bug.a": "Mở issue trên GitHub hoặc tạo thảo luận trong GitHub Discussions. Bạn cũng có thể liên hệ qua link Support trên thanh điều hướng.",

    // Footer
    "footer.desc": "Bot Discord quản lý voice, đọc manga & nhiều tính năng khác. Hoạt động từ 2019.",
    "footer.links": "Liên kết",
    "footer.resources": "Tài nguyên",
    "footer.legal": "Pháp lý",
    "footer.add": "Thêm vào Server",
    "footer.commands": "Lệnh",
    "footer.support": "Server Hỗ trợ",
    "footer.github": "GitHub",
    "footer.docs": "Tài liệu",
    "footer.bug": "Báo lỗi",
    "footer.discussions": "Thảo luận",
    "footer.privacy": "Chính sách Bảo mật",
    "footer.terms": "Điều khoản Dịch vụ",

    // Commands page
    "commands.title": "Tất cả Lệnh",
    "commands.available": "lệnh khả dụng",
    "commands.search": "Tìm lệnh...",
    "commands.back": "← Quay lại Lệnh",

    // Guide page
    "guide.section": "Hướng dẫn",
    "guide.title": "Mọi thứ bạn cần biết về 3AT",
    "guide.subtitle": "Hướng dẫn cho mọi hệ thống — dù bạn là thành viên muốn kiếm coin hay admin thiết lập server.",
    "guide.back": "← Quay lại Hướng dẫn",
    "guide.related": "Lệnh liên quan",

    // Shared
    "meta.description": "Bot Discord quản lý kênh voice, đọc manga, dịch thuật và nhiều tính năng khác.",
    "translation.notice": "Bản dịch đang được cập nhật. Nội dung hiện tại hiển thị bằng tiếng Anh.",
  },
} as const;
```

### `src/i18n/utils.ts`

```ts
import { ui, defaultLang, showDefaultLang } from "./ui";

export type Lang = keyof typeof ui;
export type TranslationKey = keyof (typeof ui)[typeof defaultLang];

export function getLangFromUrl(url: URL): Lang {
  const [, lang] = url.pathname.split("/");
  if (lang in ui) return lang as Lang;
  return defaultLang;
}

export function useTranslations(lang: Lang) {
  return function t(key: TranslationKey): string {
    return ui[lang][key] || ui[defaultLang][key];
  };
}

export function useTranslatedPath(lang: Lang) {
  return function translatePath(path: string): string {
    return !showDefaultLang && lang === defaultLang
      ? path
      : `/${lang}${path}`;
  };
}
```

## 3. Page Structure

### Current → New

```
src/pages/
├── index.astro              # EN: <HomePage lang="en" />
├── commands.astro           # EN: <CommandsPage lang="en" />
├── guide.astro              # EN: <GuidePage lang="en" />
├── privacy.astro            # EN: renders content/pages/en/privacy.md
├── terms.astro              # EN: renders content/pages/en/terms.md
├── vi/
│   ├── index.astro          # VI: <HomePage lang="vi" />
│   ├── commands.astro       # VI: <CommandsPage lang="vi" />
│   └── guide.astro          # VI: <GuidePage lang="vi" />
├── [lang]/
│   ├── commands/[...slug].astro   # Unchanged routing, add t() calls
│   └── guide/[...slug].astro      # Unchanged routing, add t() calls
```

### Shared Page Components

New directory `src/components/pages/` to avoid duplicating page logic:

**`HomePage.astro`** — receives `lang` prop, renders Hero, Features, CommandsShowcase, VoiceDemo, Stats, Testimonials, FAQ with locale-aware text.

**`CommandsPage.astro`** — receives `lang` prop, renders commands grid with translated labels, locale-aware links (`/en/commands/{name}` vs `/vi/commands/{name}`).

**`GuidePage.astro`** — receives `lang` prop, filters guides by language from collection, renders guide index with translated text.

Each page file is a thin wrapper:

```astro
---
// src/pages/vi/index.astro
import HomePage from "../../components/pages/HomePage.astro";
---
<HomePage lang="vi" />
```

```astro
---
// src/pages/index.astro (root = EN)
import HomePage from "../components/pages/HomePage.astro";
---
<HomePage lang="en" />
```

## 4. Component Refactoring

All 13 components gain a `lang` prop and use `t()` for text:

### Components with text changes

| Component | Changes |
|-----------|---------|
| `BaseLayout.astro` | `<html lang={lang}>`, dynamic meta description via `t()`, pass `lang` to Navbar/Footer |
| `Navbar.astro` | Nav link labels via `t()`, hrefs via `useTranslatedPath()`, add LanguageSwitcher |
| `Hero.astro` | Subtitle, button text, trust line via `t()` |
| `Features.astro` | 6 feature cards — titles and descriptions via `t()` |
| `FAQ.astro` | 7 Q&A pairs via `t()` |
| `Footer.astro` | All link labels, headings, description via `t()`, hrefs via `useTranslatedPath()` |
| `CommandsShowcase.astro` | Section title/subtitle via `t()` |
| `VoiceDemo.astro` | Demo text via `t()` |
| `Stats.astro` | Stat labels via `t()` |
| `Testimonials.astro` | Text labels via `t()` |
| `CommandsSidebar.astro` | Category labels, search placeholder via `t()` |
| `Breadcrumb.astro` | "Commands", "Guide" labels via `t()` |
| `LanguageSwitcher.astro` | Refactored to work on all pages, placed in Navbar |

### Pattern for each component

```astro
---
import { getLangFromUrl, useTranslations, useTranslatedPath } from "../i18n/utils";
import type { Lang } from "../i18n/utils";

interface Props { lang?: Lang; }
const lang = Astro.props.lang ?? getLangFromUrl(Astro.url);
const t = useTranslations(lang);
const tp = useTranslatedPath(lang);
---

<!-- Use t("key") for text, tp("/path") for links -->
```

### Data files refactoring

`features.ts` — keep `icon` field only, remove `title` and `description` (text moves to `ui.ts`). The `Features.astro` component constructs feature cards using `t()` for text + the icon from the data file.

`faq.ts` — delete entirely. All content is text, which moves to `ui.ts` translation keys. `FAQ.astro` constructs Q&A pairs directly from `t()` calls.

`commands.ts` and `guides.ts` — unchanged (non-translatable metadata: names, categories, colors).

## 5. Content Collections Update

### New `pages` collection

```
src/content/pages/
└── en/
    ├── privacy.md     # Extracted from current src/pages/privacy.astro
    └── terms.md       # Extracted from current src/pages/terms.astro
```

Add to `content.config.ts`:

```ts
const pages = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/pages" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
  }),
});

export const collections = { commands, guides, pages };
```

Privacy and terms pages render from this collection, EN only (no `vi/` directory needed).

## 6. LanguageSwitcher — Global

Refactored to work on every page, not just content detail pages:

```astro
---
import { languages, defaultLang } from "../i18n/ui";
import { getLangFromUrl } from "../i18n/utils";

const currentLang = getLangFromUrl(Astro.url);
const pathname = Astro.url.pathname;
---
```

**Logic:**
- Strips current locale prefix from pathname
- Builds link for each language using the clean path
- For default lang (EN): no prefix
- For other langs: add `/{lang}` prefix
- Placed inside Navbar for site-wide access
- On content detail pages: also checks if alternate language version exists in collection

## 7. SEO

### `<html lang>`

BaseLayout receives `lang` prop, sets `<html lang={lang}>` dynamically instead of hardcoded `"en"`.

### Hreflang tags

Auto-generated for all bilingual pages:
- `/` ↔ `/vi/`
- `/commands` ↔ `/vi/commands`
- `/guide` ↔ `/vi/guide`
- `/en/commands/{slug}` ↔ `/vi/commands/{slug}`
- `/en/guide/{slug}` ↔ `/vi/guide/{slug}`

Not generated for EN-only pages (`/privacy`, `/terms`).

### Meta description

Uses `t("meta.description")` for locale-appropriate description instead of hardcoded English string.

## Files Changed Summary

| Action | Files |
|--------|-------|
| **New** | `src/i18n/ui.ts`, `src/i18n/utils.ts` |
| **New** | `src/pages/vi/index.astro`, `src/pages/vi/commands.astro`, `src/pages/vi/guide.astro` |
| **New** | `src/components/pages/HomePage.astro`, `CommandsPage.astro`, `GuidePage.astro` |
| **New** | `src/content/pages/en/privacy.md`, `src/content/pages/en/terms.md` |
| **Modified** | `astro.config.mjs` — add i18n config |
| **Modified** | `src/content.config.ts` — add pages collection |
| **Modified** | `src/layouts/BaseLayout.astro` — dynamic lang, pass lang prop |
| **Modified** | All 13 components — add lang prop, use t() |
| **Modified** | `src/pages/[lang]/commands/[...slug].astro` — replace hardcoded strings with t() |
| **Modified** | `src/pages/[lang]/guide/[...slug].astro` — replace hardcoded strings with t() |
| **Simplified** | `src/pages/index.astro`, `commands.astro`, `guide.astro` — thin wrappers |
| **Simplified** | `src/pages/privacy.astro`, `terms.astro` — render from content collection |
| **Modified** | `src/data/features.ts` — keep icon only, remove text |
| **Deleted** | `src/data/faq.ts` — all text moves to `ui.ts` |
| **Unchanged** | `src/data/commands.ts`, `src/data/guides.ts` — non-translatable metadata |

## Out of Scope

- Adding languages beyond EN + VI (design supports it, but not shipped now)
- Translating privacy/terms to Vietnamese
- Translating content collection slugs (URLs stay English: `/vi/commands/ping` not `/vi/lenh/ping`)
- Route translation (e.g., `/vi/lenh/` instead of `/vi/commands/`)
- Browser language auto-detection/redirect (static site, no server middleware)
