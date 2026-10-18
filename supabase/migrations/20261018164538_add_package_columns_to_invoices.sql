/*
# Add pricing_mode and package_amount columns to invoices

1. Modified Tables
- `invoices`: added `pricing_mode` (text, nullable) and `package_amount` (numeric, default 0).
  These mirror the quotation fields so a converted package-pricing invoice retains its
  lump-sum amount instead of falling back to zero-rated line items.
2. Security
- No RLS or policy changes. Existing policies remain in effect.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'pricing_mode') THEN
    ALTER TABLE invoices ADD COLUMN pricing_mode text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'package_amount') THEN
    ALTER TABLE invoices ADD COLUMN package_amount numeric DEFAULT 0;
  END IF;
END $$;
