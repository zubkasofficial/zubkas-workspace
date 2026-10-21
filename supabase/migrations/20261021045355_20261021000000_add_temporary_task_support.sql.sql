/*
# Add temporary task support to project_tasks

1. Changes
- Adds `is_temporary` boolean column to `project_tasks` table (defaults to false).
  When true, the task is an ad-hoc/temporary task not linked to any official project.
- Alters `project_id` column to be nullable (DROP NOT NULL) so temporary tasks can store NULL.
  Existing data is preserved — only the constraint changes.
- Alters `project_name` and `client_name` columns to default to empty string if they don't already
  (they already default to '' from the original migration, so no change needed there).
- Backfills: no data changes needed — existing tasks keep their project_id values and is_temporary defaults to false.

2. Security
- No changes to existing RLS policies. All four CRUD policies (anon select/insert/update/delete)
  remain intact and unchanged. The table is single-tenant with TO anon, authenticated USING (true).

3. Important Notes
- Temporary tasks have project_id = NULL and is_temporary = true.
- Regular tasks (including direct-create projects) have project_id set to a valid project id and is_temporary = false.
- The `completed` boolean and `status` text columns continue to work as before.
*/

-- Add is_temporary column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_tasks' AND column_name = 'is_temporary'
  ) THEN
    ALTER TABLE project_tasks ADD COLUMN is_temporary boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Make project_id nullable so temporary tasks can have NULL project_id
ALTER TABLE project_tasks ALTER COLUMN project_id DROP NOT NULL;
