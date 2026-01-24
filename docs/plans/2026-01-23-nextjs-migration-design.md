# Buddies ITBA - Migración a Next.js

## Resumen Ejecutivo

Migración del sitio estático actual (HTML/CSS/Bootstrap) a una aplicación moderna con Next.js 15, Tailwind CSS 4 y shadcn/ui, manteniendo la estética actual y preparando la arquitectura para features futuras.

## Objetivos

- **Modernización técnica**: Stack moderno para facilitar mantenimiento
- **Escalabilidad**: Preparar para funcionalidades dinámicas
- **No es objetivo**: SEO (el público llega por otros canales)

## Decisiones de Arquitectura

| Aspecto | Decisión | Justificación |
|---------|----------|---------------|
| **Stack** | Next.js 15 + React 19 + Tailwind 4 + shadcn/ui | Última tecnología, mejor DX |
| **CMS** | Notion con capa de abstracción (Strategy Pattern) | Familiar para el equipo, migrable a Sanity |
| **i18n** | next-intl v4 (ES + EN) | Extensible, type-safe, App Router nativo |
| **Auth futura** | Microsoft OAuth (@itba.edu.ar) | Cuentas institucionales existentes |
| **Hosting** | Vercel inicial → ITBA | Portable, sin vendor lock-in |

## Features por Prioridad

1. **Recursos/FAQ dinámico** - CMS editable desde Notion
2. **Formularios inteligentes** - Inscripciones, feedback, contacto
3. **Blog/Noticias** - Posts desde Notion
4. **Área de miembros** - Login OAuth, perfiles, matching
5. **Sistema de eventos** - Calendario, RSVP, recordatorios

---

## Parte 1: Estructura del Proyecto

```
buddies-itba/
├── src/
│   ├── app/                    # App Router de Next.js
│   │   ├── [locale]/           # Rutas internacionalizadas
│   │   │   ├── page.tsx        # Home
│   │   │   ├── about/
│   │   │   ├── contact/
│   │   │   ├── events/
│   │   │   └── faq/
│   │   └── api/                # API routes (webhooks, etc.)
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   └── sections/           # Secciones de página (Hero, Team, etc.)
│   ├── lib/
│   │   ├── cms/                # Capa de abstracción CMS
│   │   │   ├── index.ts        # Interface común
│   │   │   ├── notion.ts       # Implementación Notion
│   │   │   └── types.ts        # Tipos compartidos
│   │   └── i18n/               # Configuración internacionalización
│   └── messages/               # Traducciones (es.json, en.json)
├── public/                     # Assets estáticos
└── tailwind.config.ts
```

**Decisiones clave:**
- **App Router** (no Pages Router) - Estándar actual de Next.js
- **Carpeta `[locale]`** - URLs como `/es/about` y `/en/about`
- **Capa CMS abstracta** - Intercambiable entre Notion y Sanity

---

## Parte 2: Stack Tecnológico

| Tecnología | Versión | Uso |
|------------|---------|-----|
| **Next.js** | 15.x | Framework, App Router, Turbopack |
| **React** | 19.x | Server Components, Server Actions |
| **Tailwind CSS** | 4.x | Estilos, motor Oxide |
| **shadcn/ui** | Latest | Componentes UI accesibles |
| **next-intl** | 4.x | Internacionalización |
| **TypeScript** | 5.5+ | Type safety |
| **@notionhq/client** | 2.x | SDK oficial Notion |
| **Framer Motion** | Latest | Animaciones |

### Patrones Modernos

```typescript
// Server Components por defecto - fetch directo sin useEffect
// src/app/[locale]/faq/page.tsx
export default async function FAQPage({ params }: Props) {
  const { locale } = await params  // Next.js 15: params es async
  const faqs = await cms.getFAQs(locale)
  return <FAQSection items={faqs} />
}

// Server Actions para formularios
// src/app/actions/contact.ts
'use server'
export async function submitContact(formData: FormData) {
  // Validación, envío, etc.
}
```

---

## Parte 3: Arquitectura de Internacionalización

**Librería: `next-intl` v4**

### Configuración

```typescript
// src/i18n/config.ts
export const locales = ['es', 'en'] as const
export const defaultLocale = 'es' as const
export type Locale = (typeof locales)[number]

// Extensible: agregar 'pt' es solo agregarlo al array
```

### Estructura de Traducciones

```
src/messages/
├── es.json    # Español (UI estática)
├── en.json    # Inglés
```

```json
// src/messages/es.json
{
  "nav": {
    "home": "Inicio",
    "about": "Nosotros",
    "events": "Eventos",
    "faq": "Preguntas Frecuentes",
    "contact": "Contacto"
  },
  "hero": {
    "title": "Bienvenido a Buddies ITBA",
    "subtitle": "Tu conexión con estudiantes de intercambio"
  },
  "common": {
    "readMore": "Leer más",
    "submit": "Enviar"
  }
}
```

### Uso en Componentes

```typescript
// Server Component
import { getTranslations } from 'next-intl/server'

export default async function Hero() {
  const t = await getTranslations('hero')
  return <h1>{t('title')}</h1>
}

// Client Component
'use client'
import { useTranslations } from 'next-intl'

export function NavMenu() {
  const t = useTranslations('nav')
  return <nav>{t('home')}</nav>
}
```

### Contenido Dinámico (Notion) con i18n

En Notion: base de datos con columnas `Title_ES`, `Title_EN`, `Content_ES`, `Content_EN`

```typescript
const faq = await cms.getFAQs('es')  // Retorna contenido en español
```

### Selector de Idioma

- Cookie `NEXT_LOCALE` para persistir preferencia
- Detección automática por `Accept-Language` header
- Fallback a Google Translate widget para idiomas no soportados

---

## Parte 4: Capa de Abstracción CMS (Strategy Pattern)

### Tipos Agnósticos

```typescript
// src/lib/cms/types.ts
export interface FAQ {
  id: string
  question: string
  answer: string
  category: string
  order: number
}

export interface BlogPost {
  id: string
  slug: string
  title: string
  excerpt: string
  content: string
  coverImage: string
  publishedAt: Date
  author: Author
}

export interface Event {
  id: string
  title: string
  description: string
  date: Date
  location: string
  capacity: number
  registeredCount: number
}
```

### Interface Común (Strategy)

```typescript
// src/lib/cms/index.ts
export interface CMSClient {
  // FAQ
  getFAQs(locale: Locale): Promise<FAQ[]>
  getFAQsByCategory(category: string, locale: Locale): Promise<FAQ[]>

  // Blog
  getPosts(locale: Locale, limit?: number): Promise<BlogPost[]>
  getPostBySlug(slug: string, locale: Locale): Promise<BlogPost | null>

  // Events
  getUpcomingEvents(locale: Locale): Promise<Event[]>
  getEventById(id: string, locale: Locale): Promise<Event | null>
}

// Exportar implementación activa
import { NotionCMS } from './notion'
export const cms: CMSClient = new NotionCMS()

// Migrar a Sanity = cambiar esta línea:
// import { SanityCMS } from './sanity'
// export const cms: CMSClient = new SanityCMS()
```

### Implementación Notion (Concrete Strategy)

```typescript
// src/lib/cms/notion.ts
import { Client } from '@notionhq/client'

export class NotionCMS implements CMSClient {
  private client: Client

  constructor() {
    this.client = new Client({ auth: process.env.NOTION_TOKEN })
  }

  async getFAQs(locale: Locale): Promise<FAQ[]> {
    const response = await this.client.databases.query({
      database_id: process.env.NOTION_FAQ_DB!,
      sorts: [{ property: 'Order', direction: 'ascending' }]
    })

    return response.results.map(page => ({
      id: page.id,
      question: this.getLocalizedText(page, 'Question', locale),
      answer: this.getLocalizedText(page, 'Answer', locale),
      category: this.getText(page, 'Category'),
      order: this.getNumber(page, 'Order')
    }))
  }

  private getLocalizedText(page: any, field: string, locale: Locale): string {
    return this.getText(page, `${field}_${locale.toUpperCase()}`)
  }
}
```

---

## Parte 5: Migración de Estética

### Colores (Bootstrap → Tailwind 4)

```css
/* src/app/globals.css */
@theme {
  --color-primary: #0c5781;
  --color-background: #e1ecf6;
  --color-heading: #37423b;
  --color-text: #444444;
  --color-surface: #ffffff;

  --font-sans: 'Open Sans', system-ui, sans-serif;
  --font-heading: 'Raleway', system-ui, sans-serif;
  --font-nav: 'Poppins', system-ui, sans-serif;
}
```

### Mapeo de Componentes

| Bootstrap | shadcn/ui |
|-----------|-----------|
| `.btn` | `<Button>` |
| `.card` | `<Card>` |
| `.nav` | `<NavigationMenu>` |
| `.accordion` | `<Accordion>` |
| `.carousel` | `<Carousel>` |
| `.modal` | `<Dialog>` |
| `.form-control` | `<Input>`, `<Textarea>` |

### Animaciones (AOS → Framer Motion)

```typescript
'use client'
import { motion } from 'framer-motion'

export function FadeInSection({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
    >
      {children}
    </motion.div>
  )
}
```

---

## Parte 6: Plan de Implementación

### Fase 0: Setup inicial
- Crear proyecto Next.js 15 con `create-next-app`
- Configurar Tailwind 4, shadcn/ui, TypeScript
- Configurar next-intl con ES/EN
- Setup de Notion (crear bases de datos, obtener tokens)
- Estructura de carpetas base

### Fase 1: Layout y navegación
- Header con navegación responsive
- Footer
- Selector de idioma
- Layout compartido `[locale]/layout.tsx`

### Fase 2: Páginas estáticas
- Home (Hero, Stats, Preview de eventos)
- About (Descripción, Team, Testimonials)
- Contact (Form con Server Action, mapa)
- Events (listado básico)
- FAQ (acordeón por categorías)

### Fase 3: Integración Notion
- Capa CMS abstracta
- Conectar FAQ dinámico
- Conectar Team members
- Conectar Testimonials

### Fase 4: Formularios
- Contacto (mejorado con Server Actions)
- Inscripción a eventos
- Solicitud para ser Buddy

### Fase 5: Pulido
- Animaciones (Framer Motion)
- Loading states, error boundaries
- Optimización de imágenes (next/image)
- Testing básico
- Deploy a Vercel

---

## Parte 7: Roadmap Features Post-Migración

### Q1 2026 - MIGRACIÓN BASE
- [ ] Setup proyecto Next.js 15
- [ ] Páginas estáticas migradas
- [ ] i18n funcionando (ES/EN)
- [ ] Notion conectado (FAQ, Team)
- [ ] Deploy en Vercel

### Q2 2026 - CONTENIDO DINÁMICO
- [ ] Blog desde Notion
- [ ] Eventos dinámicos desde Notion
- [ ] Formulario de inscripción a eventos
- [ ] Newsletter signup
- [ ] Analytics (Plausible)

### Q3 2026 - EXPERIENCIA DIFERENCIADA + MIEMBROS
- [ ] Secciones separadas `/itba` y `/exchange`
  - `/itba`: Ser buddy, recursos para mentores
  - `/exchange`: Guía de llegada, encontrar buddy
- [ ] Auth con Microsoft OAuth (@itba.edu.ar)
- [ ] Perfil de usuario básico
- [ ] Sistema de matching Buddy ↔ Exchange

### Q4 2026 - EVENTOS AVANZADOS
- [ ] RSVP con confirmación
- [ ] Lista de espera automática
- [ ] Recordatorios por email
- [ ] Calendario integrado (Google Calendar)
- [ ] Check-in con QR

### FUTURO
- [ ] App móvil (PWA)
- [ ] Chat entre Buddies y Exchange students
- [ ] Gamification (puntos, badges)
- [ ] Migración a hosting ITBA
- [ ] Migración Notion → Sanity (si escala)

---

## Variables de Entorno Requeridas

```env
# Notion
NOTION_TOKEN=secret_xxx
NOTION_FAQ_DB=xxx
NOTION_BLOG_DB=xxx
NOTION_EVENTS_DB=xxx
NOTION_TEAM_DB=xxx

# Auth (futuro)
AZURE_AD_CLIENT_ID=xxx
AZURE_AD_CLIENT_SECRET=xxx
AZURE_AD_TENANT_ID=xxx

# Analytics (futuro)
PLAUSIBLE_DOMAIN=buddies.itba.edu.ar
```
