# Run Judi ERP (Next.js — REFERENCE ONLY)

> **Archived.** Production is **Laravel** in [`laravel/`](laravel/).  
> See [REFERENCE-NEXTJS.md](REFERENCE-NEXTJS.md) and [laravel/DEPLOY.md](laravel/DEPLOY.md).  
> Prefer `laravel/RUN.bat` or `cd laravel && php artisan serve`.

---

Open the **legacy** Next.js app on **port 3005** (avoids clashes with anything on 3000).

## 1. One-time setup

```bash
copy .env.example .env
```

Set `AUTH_SECRET` to a long random string.

Start Postgres (pick one):

```bash
npm run db:up
```

Or without Docker:

```bash
npx prisma dev --detach --name judi
```

Copy the printed `DATABASE_URL` into `.env` (prefer `127.0.0.1` on Windows).

```bash
npx prisma migrate deploy
npx prisma db seed
```

## 2. Start the app

```bash
npm run dev
```

Open **[http://localhost:3005](http://localhost:3005)**

Password for every seeded user: `JudiAdmin!26`

| Email | Role | Opens |
| --- | --- | --- |
| admin@judi.local | Admin | Executive dashboard |
| warehouse@judi.local | Warehouse accountant | Stock / transfers |
| collector@judi.local | Collector accountant | Collections + BI |
| delegate@judi.local | Field delegate | Field tiles |

## 3. Click these to review the product

### English (LTR)

| Screen | What you should see | Link |
| --- | --- | --- |
| Login | Brand + Phase 5 note | [http://localhost:3005/en/login](http://localhost:3005/en/login) |
| BI dashboard | KPI cards + charts (IQD) | [http://localhost:3005/en/dashboard](http://localhost:3005/en/dashboard) |
| Collections | Record receipt against debt | [http://localhost:3005/en/dashboard/collections](http://localhost:3005/en/dashboard/collections) |
| Reports hub | Statements + van list | [http://localhost:3005/en/dashboard/reports](http://localhost:3005/en/dashboard/reports) |
| Customer statement | Ledger + aging | [http://localhost:3005/en/dashboard/stores/33333333-3333-3333-3333-333333333333/statement](http://localhost:3005/en/dashboard/stores/33333333-3333-3333-3333-333333333333/statement) |
| Van reconciliation | Opening / loaded / sold / expected | [http://localhost:3005/en/dashboard/reports/van/22222222-2222-2222-2222-222222222222](http://localhost:3005/en/dashboard/reports/van/22222222-2222-2222-2222-222222222222) |
| Field home | 4 large tiles | [http://localhost:3005/en/field](http://localhost:3005/en/field) |
| Field alerts | Push enable + alert list | [http://localhost:3005/en/field/alerts](http://localhost:3005/en/field/alerts) |
| Field collection | Touch store picker + receipt | [http://localhost:3005/en/field/collection](http://localhost:3005/en/field/collection) |
| Field invoice | Barcode POS | [http://localhost:3005/en/field/invoice](http://localhost:3005/en/field/invoice) |
| Van stock | On-hand + today’s recon strip | [http://localhost:3005/en/field/stock](http://localhost:3005/en/field/stock) |

### Arabic RTL

| Screen | Link |
| --- | --- |
| Dashboard | [http://localhost:3005/ar/dashboard](http://localhost:3005/ar/dashboard) |
| Field | [http://localhost:3005/ar/field](http://localhost:3005/ar/field) |
| Collection | [http://localhost:3005/ar/field/collection](http://localhost:3005/ar/field/collection) |

### Kurdish Sorani RTL (glyphs: پ چ ک گ ڤ ۆ ێ ڵ ڕ)

| Screen | Link |
| --- | --- |
| Dashboard | [http://localhost:3005/ckb/dashboard](http://localhost:3005/ckb/dashboard) |
| Field | [http://localhost:3005/ckb/field](http://localhost:3005/ckb/field) |
| Products | [http://localhost:3005/ckb/dashboard/products](http://localhost:3005/ckb/dashboard/products) |

Use the header language switcher on any page to flip `en` ↔ `ar` ↔ `ckb` without losing the path.

## 4. Tests

```bash
npm test
npm run test:e2e
```

Unit tests (Vitest) cover money, stock, invoices, reports, i18n key parity, and ESC/POS raster. Playwright smoke hits login, RTL locales, and field routes on port **3005**.

## 5. Display checklist (phone / tablet / desktop)

Chrome device toolbar (or responsive mode). App is on **port 3005**. Confirm at each width:

| Width | Device | What to check |
| --- | --- | --- |
| **390** | Phone | Single-column content; field bottom tabs clear the home indicator; list rows ≥ 48px; thumbs `sm` (48px) with placeholder icons; no horizontal page scroll |
| **768** | Tablet | Office sidebar **icon rail** (labels from `lg`); 2-col grids / field tiles; filters may sit side-by-side |
| **1280** | Laptop / desktop | Office sidebar **expanded** with labels; content capped (~1280px, not edge-to-edge); denser tables OK if rows stay ≥ ~48px tall |

Shared building blocks (reuse on every page redesign — do not invent new sizes):

- Touch: `min-h-touch` / `min-w-touch` (48px)
- Thumbs: `<Thumb />` / `<EntityAvatar />` — sizes `xs` · `sm` · `md` · `lg` (see `src/components/thumb.tsx`)
- Layout helpers in `globals.css`: `.page-frame` / `.page-content` / `.page-frame-field`, `.chip-scroll`, `.sticky-cta` / `.sticky-form-actions`, `.directory-cards` / `.directory-table`, `.kpi-grid`, `.field-tile-grid`, `.surface-panel`, `.money-cards-mobile` / `.money-table-desktop`
- Theme: `bg-canvas`, `bg-surface`, `text-fg`, `border-line` (light **and** dark)
- Safe areas: `viewport-fit=cover`; field header / bottom nav / sticky CTAs respect `env(safe-area-inset-*)`
- Camera / gallery: `<CameraCapture />` + `<MediaGallery kind entityType entityId />` — kinds `STORE` · `PRODUCT` · `EMPLOYEE` · `STOCK`; CRUD via `/api/media` (see `src/components/media-gallery.tsx`)

Also still verify on ~390px:

- Field home tiles are full-width columns (2×N) and ≥ 48px tall
- Collection amount / submit / notes are easy to tap
- Invoice barcode row does not overflow
- Header language pills remain usable
- No accidental horizontal scroll on field forms (office tables may still scroll)
