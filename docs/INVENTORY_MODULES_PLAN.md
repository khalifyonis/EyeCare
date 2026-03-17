# Inventory Modules — Plan (Senior Developer View)

## Your concept (what you want)

- **Both modules** (Pharmacy + Optical) must cover:
  - **Items** (in stock)
  - **Purchases**
  - **Transactions**
  - **Sells**
  - **Suppliers**
- Manage and track these in a clear, consistent, responsive way.

This is the right set of concepts. Below is how developers usually structure them and what we should do in your system.

---

## How developers and clinics usually organize this

In real clinic/hospital systems, the same ideas exist but are organized like this:

| Concept        | What it is in practice                          | Where it lives in the app                    |
|----------------|--------------------------------------------------|----------------------------------------------|
| **Items**      | Catalog of products (name, stock, reorder, price)| One “Inventory” area → Items (Pharmacy / Optical) |
| **Purchases**  | “We bought from supplier” → stock IN             | Same area → Purchases (list + Add receive)   |
| **Transactions** | Full log of every IN / OUT / ADJUST           | Same area → Transaction history (read-only) |
| **Sells**      | “We sold to patient” → stock OUT                | Usually **Billing** (invoice = sale). Optional: “Dispensing / Sales history” under Inventory |
| **Suppliers**  | Who we buy from (one list for all)              | Same area → Suppliers (shared)              |

Important points:

1. **One “Inventory” area, not two separate menus**  
   Pharmacy and Optical are two **types** of inventory, not two separate apps. So: one sidebar section “Inventory” with sub-pages, and a **type selector** (Pharmacy | Optical) or **two clear entry points** (Pharmacy Items / Optical Items, etc.) so the same structure is not repeated twice in the menu.

2. **Purchases = list + Add**  
   “Purchases” is a **list of purchase/receive events** (who, when, what, how much), with an **Add** button that opens a form/dialog to “Receive stock”. So it looks like your other CRUD pages (e.g. Suppliers): table on the main page, Add at top, not only a form and a small “recent” table.

3. **Transactions = audit trail**  
   Transaction history is **read-only**: see all IN/OUT/ADJUST with filters. No need for full CRUD on each row; it’s for tracking and reporting.

4. **Sells = Billing in your system**  
   In your app, when a patient is billed for pharmacy/optical items, that already creates OUT transactions and reduces stock. So “Sells” **is** the Billing flow. We don’t need a separate “Sells” page that repeats the same thing. We can add a **“Dispensing / Sales history”** view (invoices that included pharmacy/optical items) if you want to “track sells” inside the inventory area.

5. **Suppliers = one shared list**  
   One Suppliers page, used by both Pharmacy and Optical. Items can link to a supplier; when recording a purchase we can optionally pick supplier. No need for “Pharmacy Suppliers” and “Optical Suppliers” unless you have a strong business reason.

6. **Role-based access**  
   - **Pharmacist**: sees only Pharmacy (Items, Purchases, Transactions, Suppliers).  
   - **Optician**: sees only Optical (same four).  
   - **Admin/Superadmin**: sees both (e.g. type selector or two entry points).  
   Same menu structure for everyone; the app shows only what the role can access.

---

## What is wrong in the current system (and what is right)

### Wrong or weak

| Issue | Why it’s a problem |
|-------|--------------------|
| Two separate sidebar blocks (PHARMACY and OPTICAL) with the same 3 links each | Feels duplicated and long. In “developer way”, there is one Inventory area with a way to choose type. |
| Purchases page is only “select item + quantity + price” form and a small “Recent purchases” table | Doesn’t match the rest of the app (no main table, no Add button, no search/filters). Hard to scan and track. |
| No clear “list of purchases” as the main view | Real systems show “all receive events” in a table; “Add” opens a dialog. |
| “Sells” not visible as a concept in Inventory | You want to “track” sells. Today sells = Billing; we can add a “Dispensing/Sales history” view under Inventory so it’s clear and trackable. |
| Inconsistent icons and layout | Items/Purchases/Transactions don’t follow the same visual language as e.g. Suppliers or Pharmacy Items. |

### Right

| What’s good | Why keep it |
|-------------|-------------|
| Separate backend for pharmacy vs optical (items, transactions, APIs) | Correct: two catalogs, two stocks, two audit trails. |
| Billing creates OUT and reduces stock | Correct: that **is** “sells”. |
| One Suppliers list, linkable to items | Correct: one list, shared. |
| Transaction history (IN/OUT/ADJUST) exists | Correct: needed for tracking. |
| Role-based backend (Pharmacist vs Optician) | Correct: we only need to expose the right UI per role. |

---

## Proposed structure (how to organize both modules)

### 1. Sidebar (one section, role-aware)

- **One section: “INVENTORY”**
  - **Items** → Opens “Inventory – Items” (type: Pharmacy or Optical by role or selector).
  - **Purchases** → Opens “Inventory – Purchases” (same idea).
  - **Transaction history** → Opens “Inventory – Transactions”.
  - **Suppliers** → Opens existing Suppliers page (shared).
  - *(Optional later)* **Dispensing / Sales** → List of billing records that had pharmacy/optical items (to “track sells” in one place).

For **Pharmacist**: Items / Purchases / Transactions only show **Pharmacy** (no selector).  
For **Optician**: same but **Optical** only.  
For **Admin/Superadmin**: either a **type selector** (Pharmacy | Optical) on each page or two clear entry cards (e.g. “Pharmacy Items” / “Optical Items”) so one menu works for both.

### 2. Pages (same pattern for Pharmacy and Optical)

| Page | Purpose | Main content | Actions |
|------|---------|--------------|--------|
| **Items** | Catalog and stock | Table: item, category/brand, supplier, stock, reorder, price, expiry, actions | Add item, Edit, Delete, Receive, Adjust, Transaction history (existing behavior). |
| **Purchases** | Record and list “stock in” | **Table of purchase/receive events** (date, item, qty, unit price, total, by, optional supplier). | **Add** opens dialog: select item, qty, unit price (and optionally supplier). Same layout as Suppliers. |
| **Transaction history** | Audit trail | Table: date, item, type (IN/OUT/ADJUST), qty, unit price, by, billing ref (if OUT). | Filters (type, date range). Read-only. |
| **Suppliers** | Who we buy from | Existing table. | Add, Edit, Delete (current). |
| **Sells** (optional) | Track what was sold | List of invoices that had pharmacy/optical items (from Billing). | Read-only or link to billing detail. |

### 3. Flow and tracking

- **Stock in** → User goes to **Purchases** → Add → dialog (item, qty, unit price) → creates IN transaction and updates item stock.
- **Stock out** → Happens when creating **Billing** (current behavior). No separate “Sells” page required unless we add “Dispensing history” for visibility.
- **Tracking** → **Transaction history** shows all movements. **Purchases** shows all “receive” events. Billing (and optional Dispensing view) shows “sells”.

### 4. Design and responsiveness

- **Same pattern everywhere**: Page title + breadcrumb; primary action (Add) top-right; search/filters; main content = DataTable; dialogs for Add/Edit.
- **Purchases**: Redesigned so the **main content is the table of purchases**; “Receive stock” is an **Add** button that opens a dialog (current form inside).
- **Icons**: One consistent set (e.g. Layers/Box for Items, ArrowDownToLine for Purchases, History for Transactions, Package for Suppliers).
- **Responsive**: Tables scroll horizontally on small screens; filters stack; dialogs are usable on mobile (same as rest of app).

---

## Summary: your idea vs developer way

| Your idea | Developer way | Conclusion |
|-----------|---------------|------------|
| Items, Purchases, Transactions, Sells, Suppliers in both modules | Same concepts; one Inventory area with type (Pharmacy/Optical); Sells = Billing (+ optional Dispensing view) | **Align**: one Inventory section, type by role or selector; add “Dispensing/Sales” only if you want it. |
| Manage and track everything | Purchases = list + Add; Transactions = read-only log; Sells = Billing (and optional list) | **Align**: implement Purchases as list + dialog; keep Transactions as is; clarify Sells = Billing. |
| Well organized and responsive | One menu structure; same table + Add + dialog pattern; responsive tables and dialogs | **Align**: apply this pattern to Purchases and keep the rest consistent. |

---

## What we should do (concrete steps)

1. **Sidebar**  
   - One **INVENTORY** section: Items, Purchases, Transaction history, Suppliers (and optionally Dispensing/Sales later).  
   - Role: Pharmacist/Optician see only their type; Admin sees both (hub with Pharmacy/Optical choice or type selector).

2. **Hub/entry**  
   - **Items** / **Purchases** / **Transactions** either:  
     - redirect by role (Pharmacist → pharmacy URLs, Optician → optical URLs), or  
     - show a small “Pharmacy | Optical” choice for Admin (or two cards).  
   - So we don’t duplicate menu items; we reuse the same four links.

3. **Purchases page (both modules)**  
   - **Main content**: DataTable of all “receive” (IN) events for that type (pharmacy or optical).  
   - **Top right**: “Receive stock” / “Add” → opens dialog with current form (item, qty, unit price).  
   - Same layout and responsiveness as Suppliers and Pharmacy/Optical Items.

4. **Transactions**  
   - Keep as read-only table with filters (type, date). No CRUD on rows.

5. **Suppliers**  
   - Keep as is (one list, shared). Already in Inventory section.

6. **Sells**  
   - Keep using **Billing** for creating sells (OUT).  
   - Optional: add “Dispensing history” or “Sales (Pharmacy/Optical)” page that lists invoices with pharmacy/optical lines, for tracking only.

7. **Permissions and routes**  
   - Ensure routes for `/dashboard/inventory/items`, `/dashboard/inventory/purchases`, `/dashboard/inventory/transactions` (and hub if used) are allowed for the same roles that have inventory access.

---

## Next step

This is the plan that matches “your concept” with “how developers organize these systems” and what’s wrong vs right in the current setup.  

If you agree with this, next step is to implement in this order:

1. Sidebar (one INVENTORY section + hubs/redirects by role).  
2. Purchases page redesign (table + Add dialog) for Pharmacy and Optical.  
3. Optional: Dispensing/Sales view for “track sells” under Inventory.  
4. Icons and small UI tweaks for consistency.

You decide what to approve or change; then we can do the implementation step by step and I’ll only change what we agreed.
