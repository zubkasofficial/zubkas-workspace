/*
# Add terms column to quotations table

1. Schema Changes
- Add `terms` JSONB column to the `quotations` table, defaulting to NULL.
  This stores per-quotation customized Terms & Conditions as a JSON array of strings.
  When NULL, the quotation view falls back to the app_settings default terms.
  When present (even if empty array), the saved terms are used as-is.

2. Security
- No policy changes needed — the existing anon/authenticated CRUD policies on
  quotations already cover the new column.

3. Important Notes
- This is an additive-only migration: no columns are dropped or renamed.
- Existing quotation rows will have NULL for `terms`, which correctly triggers
  the fallback to default settings terms on view/print.
*/

ALTER TABLE quotations ADD COLUMN IF NOT EXISTS terms jsonb;
