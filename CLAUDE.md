# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Buddies ITBA - Website for a student organization that connects local ITBA students with incoming exchange students. Currently migrating from static HTML/Bootstrap to Next.js 15.

**Target Stack:** Next.js 15, React 19, Tailwind CSS 4, shadcn/ui, TypeScript, next-intl

## Commands

```bash
# Development (after migration)
npm run dev          # Start dev server with Turbopack
npm run build        # Production build
npm run lint         # ESLint
npm run typecheck    # TypeScript check

# Current state (static site)
# No build process - open HTML files directly
```

## Architecture

### Directory Structure (Post-Migration)

```
src/
├── app/[locale]/        # Internationalized routes (ES/EN)
├── components/
│   ├── ui/              # shadcn/ui components
│   └── sections/        # Page sections (Hero, Team, etc.)
├── lib/
│   ├── cms/             # CMS abstraction layer (Strategy Pattern)
│   │   ├── index.ts     # CMSClient interface
│   │   ├── notion.ts    # Notion implementation
│   │   └── types.ts     # Shared types (FAQ, Event, BlogPost)
│   └── i18n/            # Internationalization config
└── messages/            # Translation files (es.json, en.json)
```

### Key Patterns

**CMS Abstraction (Strategy Pattern):** All content fetching goes through `lib/cms/index.ts`. Components import `cms` and call methods like `cms.getFAQs(locale)`. Current implementation uses Notion, but interface allows swapping to Sanity.

**Internationalization:** Uses next-intl v4. See detailed patterns below.

**Server Components by Default:** Fetch data directly in async components. Use `'use client'` only when needed (interactivity, hooks).

### Localization Patterns

**NEVER use locale ternaries in components.** No `locale === 'es' ? 'Texto' : 'Text'`. This breaks when adding new languages.

**Static UI strings:** Add to `messages/es.json` and `messages/en.json`, fetch with `getTranslations()`:
```tsx
// In Server Components
const t = await getTranslations('events.timeline');
<EventsTimeline translations={{ empty: t('empty'), capacity: t('capacity') }} />
```

**Dynamic content from Notion:** Use `_ES`/`_EN` column suffixes. The CMS layer auto-selects based on locale:
- `Title_ES`, `Title_EN` → `cms.getLocalizedText(props, 'Title', locale)`
- Works for: rich_text, title, and select field types

**Date formatting:** Use `Intl.DateTimeFormat(locale, options)` directly with the locale string. Don't hardcode `'es-AR'` or `'en-US'`.

**Component props pattern:** Components receive translated strings as props, not locale:
```tsx
// ❌ Bad - component does translation internally
<EventCard locale={locale} />

// ✅ Good - parent passes translated strings
<EventCard translations={{ capacity: t('capacity'), register: t('register') }} />
```

**Server Actions for Forms:** No API routes for form submissions. Use `'use server'` functions.

### Design System

Colors extracted from original Bootstrap site:
- Primary: `#0c5781` (teal/blue)
- Background: `#e1ecf6` (light blue)
- Heading: `#37423b` (dark green)
- Text: `#444444`

Fonts: Open Sans (body), Raleway (headings), Poppins (nav)

## Important Context

- **Target audience:** ITBA students and incoming exchange students
- **Auth restriction:** Only `@itba.edu.ar` emails (Microsoft OAuth)
- **Hosting:** Vercel initially, may migrate to ITBA infrastructure
- **i18n:** Spanish primary, English secondary, extensible for more languages
- **No SEO focus:** Users arrive through direct channels, not search

## Design Document

Full migration plan and architecture decisions: `docs/plans/2026-01-23-nextjs-migration-design.md`
