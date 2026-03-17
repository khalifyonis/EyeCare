# Inventory Modules — Plan (Senior Developer View)

## 1. Your concept vs how developers organize it

**Your concept:** Both modules (Pharmacy + Optical) must have: **Items** (in stock), **Purchases**, **Transactions**, **Sells**, **Suppliers** — manageable, trackable, well designed and responsive.

**How clinics and developers usually do it:**

| Concept | In practice | Where in the app |
|--------|-------------|-------------------|
| **Items** | Product catalog (stock, reorder, price) | One Inventory area → Items (Pharmacy or Optical) |
| **Purchases** | "We bought from supplier" → stock IN | Same area → Purchases: **list of receive events** + **Add** (dialog) |
| **Transactions** | Log of every IN / OUT / ADJUST | Same area → Transaction history (read-only) |
| **Sells** | "We sold to patient" → stock OUT | Usually **Billing** (invoice = sale). Optional: "Dispensing history" under Inventory |
| **Suppliers** | Who we buy from | One shared list under Inventory |

**Main idea:** One **Inventory** section in the menu, with a way to choose **Pharmacy** or **Optical** (or redirect by role). Not two separate blocks that repeat the same links.

---

## 2. What is wrong in the current system

- **Sidebar:** Two blocks (PHARMACY + OPTICAL) with same 3 links each → repetitive. Better: one INVENTORY section (Items, Purchases, Transactions, Suppliers).
- **Purchases page:** Only a form + small "Recent purchases" table. Other pages (Suppliers, Items) have a **main table** + **Add** button + dialog. Purchases should match: **table of all receive events** + **Add** opens dialog.
- **Sells:** Not visible as a menu item. In your system **sells = Billing** (already creates OUT). We can add a "Dispensing / Sales history" view under Inventory if you want to track sells there.
- **Icons and layout:** Inconsistent with the rest of the app.

**What is right:** Separate pharmacy/optical data and APIs; Billing reduces stock (that is sells); one Suppliers list; transaction history exists; roles are enforced. We keep these.

---

## 3. Proposed structure (both modules, one menu)

**Sidebar:** One section **INVENTORY** with:
- **Items** (Pharmacy or Optical by role/selector)
- **Purchases** (same)
- **Transaction history** (same)
- **Suppliers** (shared)

**Role:** Pharmacist sees only Pharmacy; Optician only Optical; Admin/Superadmin sees both (type selector or two entry cards).

**Pages (same pattern for Pharmacy and Optical):**

| Page | Main content | Actions |
|------|--------------|--------|
| **Items** | Table of items (existing) | Add, Edit, Delete, Receive, Adjust, History |
| **Purchases** | **Table of receive events** (date, item, qty, unit price, by) | **Add** = "Receive stock" dialog (item, qty, unit price) |
| **Transaction history** | Table IN/OUT/ADJUST with filters | Read-only, filters |
| **Suppliers** | Current table | Add, Edit, Delete |

**Sells:** Stay as Billing. Optional later: "Dispensing history" page listing invoices with pharmacy/optical items.

---

## 4. Tracking

- **Stock in** → Purchases → Add → dialog → IN transaction + stock up.
- **Stock out** → Billing (current). Optional: Dispensing view to "track sells".
- **Audit** → Transaction history (all movements).

---

## 5. What we should do (steps)

1. **Sidebar:** One INVENTORY section; Items, Purchases, Transactions, Suppliers. Role-based: redirect or type selector for Admin.
2. **Hub pages:** Items/Purchases/Transactions → for Admin show Pharmacy vs Optical choice; for Pharmacist/Optician redirect to their type.
3. **Purchases page redesign:** Main content = **DataTable of purchases**; top-right **Add** opens dialog (current receive form). Same style as Suppliers.
4. **Permissions:** Allow new routes for inventory hubs for the right roles.
5. **Optional:** Dispensing/Sales view to track sells under Inventory.

---

## 6. Next step

If you agree with this plan, we implement in that order and keep everything consistent and responsive. You decide what to change before we code.
