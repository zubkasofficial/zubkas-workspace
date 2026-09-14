-- Add missing UPDATE policy for subscription_categories table
-- The useSubscriptionCategories hook calls .update() to rename categories,
-- but no UPDATE policy existed, so renames silently failed.

ALTER TABLE subscription_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_update_sub_categories" ON subscription_categories;
CREATE POLICY "anon_update_sub_categories" ON subscription_categories
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
