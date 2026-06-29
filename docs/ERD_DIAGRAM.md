# EyeCare ERD — Thesis Layout

## File
`docs/erd-diagram.puml`

## Layout (5 horizontal bands)

```
[ Branch ] [ Users ] [ Doctors ] [ Custom Roles ] [ Role Permissions ]     ← Administration

[ Patients ] → [ Appointments ] → [ Preliminary Exam ] → [ Clinical Exam ] → [ Surgery ]   ← Clinical

        [ Medicine Rx ]    [ Optical Rx ]                  ← Prescriptions

[ Pharmacy Items ]    [ Optical Items ]                  ← Inventory

              [ Billing ]                                 ← Operations
```

- **Top → Bottom** clinical workflow
- **Compact tables** — only PK, FK, and key fields
- **Short relationship labels** — fewer crossing lines

## Colors
| Color | Module |
|-------|--------|
| Purple | Branch, Permissions, Roles |
| Blue | Users, Patients |
| Green | Clinical + Prescriptions |
| Yellow | Pharmacy & Optical inventory |
| Red | Billing |

## Export (thesis figure)

### Option A — PlantUML (color tables)
1. https://www.plantuml.com/plantuml/uml/
2. Paste `erd-diagram.puml` contents
3. Download PNG or SVG

### Option B — Mermaid (often cleaner layout)
1. https://mermaid.live
2. Paste `erd-diagram.mmd` contents
3. Export PNG/SVG — good if PlantUML renders too tall

If PlantUML is still too vertical, **use Option B** for your thesis book.

## Tables (15)

| # | Table | UI module |
|---|-------|-----------|
| 1 | clinic_branch | Branches |
| 2 | custom_roles | User Roles |
| 3 | role_permissions | Permissions |
| 4 | users | Users |
| 5 | doctors | Doctors |
| 6 | patients | Patients |
| 7 | appointments | Appointments |
| 8 | eye_examinations | Preliminary Exam |
| 9 | clinical_examinations | Clinical Exam |
| 10 | surgeries | Eye Surgery |
| 11 | prescriptions | Medicine Prescriptions |
| 12 | optical_prescriptions | Optical Prescriptions |
| 13 | pharmacy_items | Pharmacy › Medicines |
| 14 | optical_items | Optical Shop › Frames/Lenses |
| 15 | billing | Billing |

## Not included
`suppliers`, `er_examinations`, `billing_line_items` — helper/secondary tables.
