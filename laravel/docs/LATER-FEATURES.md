# Later FACES — barcodes, discounts, expiry, expenses

**Status:** Roadmap only for gaps. Some pieces already ship in L1–L6 — do not rebuild them.

---

## Already in Laravel (do not redo)

| Area | What exists |
| --- | --- |
| **Barcodes** | Product + per-unit (piece/packet/carton) barcodes, generate EAN-13, preview SVG, invoice search by barcode |
| **Discounts** | Invoice `%` discount + gift qty; collector `max_discount_percent` / `max_gift_percent`; reports track usage vs limits |
| **Expenses** | Collector field expenses (category, amount, note, date, optional receipt) + report net cash |
| **Purchases** | FACE LS — suppliers + stock-in to کۆگا (was Phase 7 “buy” on the old Next.js plan) |

---

## Still deferred

### 1. Barcodes (polish)

- Printable shelf / carton **labels** (PDF/thermal batch)
- Dedicated handheld scan UX polish beyond invoice search
- Optional GS1 / supplier barcode import

### 2. Discounts (full engine)

- Money-off rules, timed promotions, product/category specials
- Wholesale vs retail rule packs beyond channel price lists
- Admin “campaign” UI

Current invoice `%` + gift limits stay the production model until this face is requested.

### 3. Expiry / lots

- Lot / batch on purchase receive  
- FEFO pick hints when sending from کۆگا  
- Expired write-off + report  

**Not started** — no `expires_at` / lot tables yet.

### 4. Company expenses

- Office / HQ expenses (rent, fuel pool, salaries) separate from **collector** field expenses  
- Admin/Accountant company expense ledger + reports  

Collector expenses remain as implemented.

---

## Suggested order when you want them

1. Expiry / lots (stock truth)  
2. Discount engine (if %/gift is not enough)  
3. Company expenses  
4. Barcode label printing  

Say e.g. **`implement expiry`** or **`implement company expenses`** to start one face.
