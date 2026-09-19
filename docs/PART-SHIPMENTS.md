# Sending replaced parts back (ارسال قطعه)

When a technician's repair report says a component was replaced, the **old**
component has to go back to the company. The company checks what arrived,
prices it (the invoice) and pays the technician.

```
Technician                          Company (admin / technical user)
──────────                          ────────────────────────────────
files a repair report
   └─ old parts show up as
      "waiting to be sent"
sends a shipment  ───────────────▶  Sent
                                     │  Receive   tick what is really in the parcel
                                     ▼
                                    Received
                                     │  Invoice   price each part that arrived
                                     ▼
                                    Invoiced      (total is computed by the server)
                                     │  Pay       reference + notes
                                     ▼
                                    Paid

Sent ─▶ Rejected   (nothing usable arrived; a reason is required)
Sent ─▶ Cancelled  (the technician withdrew it)
```

## Technician (`/technician/part-shipments`, nav: **ارسال قطعه**)

- The nav shows a badge with how many replaced parts still have to be sent, and
  a reminder appears right after a repair report is filed.
- **Send parts** opens the form: tick the parts in this parcel (grouped by the
  repair they came out of, each with an optional condition note), pick the
  shipping method, tracking code, send date and notes.
- A **tracking code is required for post and courier**; not for in-person or
  other.
- A part can only be in one live shipment. A parcel that is **Rejected**,
  **Cancelled**, or a part the company marked **did not arrive** releases the
  part so it can be sent again.
- Only parts from repairs that still stand (Pending / Approved) count. If a
  repair is rejected or cancelled the part no longer has to be sent.
- Cards show: waiting to be sent, sent-not-received, waiting for payment, paid.

## Company (`/part-shipments`, sidebar: **ارسال قطعه**)

| Action | From | What it does |
| --- | --- | --- |
| Receive | Sent | Tick every part that actually arrived. At least one must; otherwise reject. |
| Invoice | Received | Enter a price per arrived part. The server sums them; total must be > 0. |
| Pay | Invoiced | Records the payment (optional reference and notes). |
| Reject | Sent | Nothing usable arrived. Reason required. |
| Delete | any | Admin only (technical users can't delete). Frees the parts. |

The top cards show **payable** (invoiced, not yet paid) and **paid** totals.
Persian and Arabic digits are accepted when typing prices (`۱٬۲۵۰٬۰۰۰` = 1250000).

## Money

Amounts are whole numbers. The unit shown is one translation string,
`partShipments.currency` (**Toman** / **تومان**) in
`frontend/src/i18n/locales/extra.{en,fa}.json` - change it there if the company
invoices in Rial.

There is no price list: the price of each part is typed by the company when it
invoices, since the repair catalog has no price column.

## API

Technician (`Authorization: Bearer <technician token>`):

| | |
| --- | --- |
| `GET  /api/v1/technician/part-shipments/shippable` | parts waiting to be sent |
| `GET  /api/v1/technician/part-shipments/summary` | counts, payable, paid, awaiting |
| `GET  /api/v1/technician/part-shipments` | own shipments (`status`, `page`, `limit`) |
| `POST /api/v1/technician/part-shipments` | send a shipment |
| `GET  /api/v1/technician/part-shipments/:id` | one of their own |
| `POST /api/v1/technician/part-shipments/:id/cancel` | withdraw (only while Sent) |

Staff:

| | |
| --- | --- |
| `GET  /api/v1/part-shipments` | list (`status`, `technician_id`, `search`) |
| `GET  /api/v1/part-shipments/summary` | counts + payable/paid totals |
| `GET  /api/v1/part-shipments/:id` | detail |
| `POST /api/v1/part-shipments/:id/receive` | `{items:[{id,received}], notes}` - every line listed |
| `POST /api/v1/part-shipments/:id/invoice` | `{items:[{id,unit_price}]}` - arrived lines only |
| `POST /api/v1/part-shipments/:id/pay` | `{reference, notes}` |
| `POST /api/v1/part-shipments/:id/reject` | `{notes}` (required) |
| `DELETE /api/v1/part-shipments/:id` | admin only |

Every mutation is recorded in the activity log automatically.

Migration: `024_add_part_shipments` (tables `part_shipments`, `part_shipment_items`).
