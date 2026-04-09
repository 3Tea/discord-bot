---
name: new-landing-page
description: Scaffold a new landing site page following i18n patterns (shared component + EN/VI wrappers + translation keys)
---

# New Landing Page Scaffolder

Create a new page for the Astro landing site at `landing/` with proper i18n support.

## Usage

The user will provide:
- **name**: The page name/slug (e.g., "changelog", "features")
- **title**: Page title for `<title>` tag
- **description**: What the page is about
- **translatable**: Whether it needs EN + VI versions (default: yes)

## What Gets Created

### For translatable pages (default)

1. **Shared page component**: `landing/src/components/pages/{Name}Page.astro`
2. **EN page wrapper**: `landing/src/pages/{name}.astro`
3. **VI page wrapper**: `landing/src/pages/vi/{name}.astro`
4. **Translation keys**: Added to both EN and VI sections in `landing/src/i18n/ui.ts`

### For EN-only pages (translatable: false)

1. **Page file**: `landing/src/pages/{name}.astro`
2. No translation keys needed — content can be hardcoded or from content collection

## Shared Page Component Pattern

```astro
---
import BaseLayout from "../../layouts/BaseLayout.astro";
import { useTranslations, useTranslatedPath } from "../../i18n/utils";
import type { Lang } from "../../i18n/utils";

interface Props {
  lang: Lang;
}

const { lang } = Astro.props;
const t = useTranslations(lang);
const tp = useTranslatedPath(lang);

const hreflang = [
  { lang: "en", href: "/{name}" },
  { lang: "vi", href: "/vi/{name}" },
];
---

<BaseLayout title={`${t("{name}.title")} | 3AT - Endless Paradox`} lang={lang} hreflang={hreflang}>
  <div class="container">
    <!-- Page content using t() for all text -->
  </div>
</BaseLayout>

<style>
  /* Scoped styles only — use CSS variables from global.css */
</style>
```

## Thin Wrapper Pattern

```astro
---
// landing/src/pages/{name}.astro (EN)
import {Name}Page from "../components/pages/{Name}Page.astro";
---

<{Name}Page lang="en" />
```

```astro
---
// landing/src/pages/vi/{name}.astro (VI)
import {Name}Page from "../../components/pages/{Name}Page.astro";
---

<{Name}Page lang="vi" />
```

## Translation Keys Pattern

Add to `landing/src/i18n/ui.ts` in BOTH `en` and `vi` sections:

```ts
// In en section:
"{name}.title": "Page Title",
"{name}.subtitle": "Page subtitle text",

// In vi section:
"{name}.title": "Tiêu đề trang",
"{name}.subtitle": "Mô tả phụ đề trang",
```

## Rules

1. **Always use `t()` for user-facing text** — never hardcode strings
2. **Always add keys to BOTH EN and VI** in `ui.ts`
3. **Use scoped `<style>`** — never add to global.css
4. **Use CSS variables** from global.css: `var(--accent)`, `var(--bg-primary)`, `var(--text-secondary)`, etc.
5. **Include hreflang tags** in the shared component for SEO
6. **Pass `lang` to all child components** that accept it
7. **Use `useTranslatedPath()`** for all internal links
8. If the page needs nav/footer links, update `Navbar.astro` and `Footer.astro` with translated entries

## Checklist

After scaffolding, verify:
- [ ] Shared component exists in `components/pages/`
- [ ] EN wrapper exists in `pages/`
- [ ] VI wrapper exists in `pages/vi/`
- [ ] All translation keys added to both EN and VI in `ui.ts`
- [ ] `npm run build` passes in `landing/` directory
- [ ] New routes appear in build output
