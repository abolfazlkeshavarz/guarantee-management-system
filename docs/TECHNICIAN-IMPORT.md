# Bulk-importing technicians from a spreadsheet

Admins can create many technicians at once from an Excel (`.xlsx`) or CSV file.

**Technicians → Import** in the app. The dialog has a **Download template**
button that gives you a ready-to-fill `.xlsx` with the headers, one example
row, and a "How to fill in" sheet.

## Columns

Put a header row in row 1, then one technician per row. Column order does not
matter, and unknown columns are ignored.

| Column | Required | Rules |
| --- | --- | --- |
| `full_name` | yes | 2–100 characters |
| `username` | yes | 3–50 characters, unique, used to sign in |
| `password` | yes | at least 6 characters (the technician can change it later) |
| `phone` | no | 10–20 characters if given, e.g. `09121234567` |
| `national_id` | no | 6–20 characters if given |
| `address` | no | free text |
| `is_active` | no | `yes`/`no` (also `1`/`0`, `true`/`false`, `فعال`/`غیرفعال`). Blank = `yes` |

Persian headers are also accepted, so a file exported from an existing sheet
usually works without renaming anything:

`نام` · `نام کاربری` · `رمز عبور` · `موبایل` (or `تلفن`) · `کد ملی` · `آدرس` · `وضعیت`

## Example

```csv
full_name,username,password,phone,national_id,is_active
Ali Rezaei,alirezaei,changeMe123,09121234567,0012345678,yes
Sara Ahmadi,sahmadi,changeMe123,,,yes
Reza Karimi,rkarimi,changeMe123,09350000000,,no
```

## What happens on import

- Each row is handled on its own — a bad row never stops the good ones.
- A row whose **username already exists is skipped**, never overwritten.
- A row that fails validation (or appears twice in the file) is **reported by
  its row number** and left out; everything valid is still created.
- The dialog shows a summary: `X created, Y skipped (already exist), Z failed`,
  with the list of failing rows.

## Limits

- `.xlsx` or `.csv` (UTF-8). A UTF-8 BOM is tolerated.
- Up to 2000 data rows and 5 MB per upload. Split a larger list into batches.
- Only the first sheet of an `.xlsx` is read.
