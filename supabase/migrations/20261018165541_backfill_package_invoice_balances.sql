/*
# Backfill package pricing fields and balances on converted invoices

1. Purpose
- Invoices created by converting a "package" pricing quotation may have zero
  balance_due and missing pricing_mode/package_amount because older conversion
  logic summed line-item amounts (which are 0 for package quotations).
- This migration backfills pricing_mode, package_amount, and recalculates
  balance_due for any invoice referencing a package quotation.

2. Modified Data
- invoices.pricing_mode: set from parent quotation when missing.
- invoices.package_amount: set from parent quotation when missing/zero.
- invoices.balance_due: recalculated as
  package_amount * (1 + tax_rate/100) - paid_amount, when zero and referencing
  a package quotation.

3. Security
- No schema or RLS changes.
*/

UPDATE invoices i
SET
  pricing_mode = COALESCE(i.pricing_mode, q.pricing_mode),
  package_amount = COALESCE(NULLIF(i.package_amount, 0), q.package_amount, 0)
FROM quotations q
WHERE i.reference_id = q.id
  AND q.pricing_mode = 'package';

UPDATE invoices i
SET balance_due = GREATEST(
  (
    SELECT COALESCE(q.package_amount, 0)
    FROM quotations q
    WHERE q.id = i.reference_id
  ) * (1 + COALESCE(i.tax_rate, 18) / 100.0) - i.paid_amount,
  0
)
WHERE i.reference_id IS NOT NULL
  AND i.balance_due = 0
  AND EXISTS (
    SELECT 1 FROM quotations q
    WHERE q.id = i.reference_id AND q.pricing_mode = 'package'
  );
