# Later FACE — Delivery role (deferred)

**Status:** Not implemented. Waiting on confirmation.

Today’s live path ends at FACE L3:

1. Admin/Accountant **buys** into کۆگا  
2. Collector **sells** + prints invoice (paper — goods not left yet)  
3. Accountant **sends** / deducts from کۆگا  

A separate **Delivery** login was sketched early, then parked so Collectors could sell immediately and Accountants could send goods without an extra role.

---

## Decision needed (reply with one)

| Reply | Meaning |
| --- | --- |
| `delivery: separate` | New role **Delivery** — own login; sees invoices marked “ready to deliver”; marks **delivered** at the store |
| `delivery: accountant_can_too` | No new role — Accountant (and optionally Admin) can mark **delivered** after send |
| `delivery: skip` | Keep current model forever — **send** = goods left the کۆگا; no delivery step |

Until one of those is chosen, do **not** add `Role::Delivery` or delivery screens.

---

## Proposed shape (if confirmed)

**After** accountant send:

- Invoice status gains something like `sent` → `out_for_delivery` → `delivered` (exact names TBD).
- Delivery user (or Accountant) sees a short list: store, products, address, print slip.
- Optional GPS / photo proof — only if you ask for it later.

**Out of scope until confirmed:** van routes, multi-driver assignment, customer signature capture.

---

## How to start

Say **`confirm delivery: separate`** (or `accountant_can_too`) then **`implement delivery`**.
