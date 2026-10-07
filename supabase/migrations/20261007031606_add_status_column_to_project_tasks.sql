/*
# Add status column to project_tasks table

1. Changes
- Adds a `status` text column to the `project_tasks` table to support granular task statuses beyond the existing boolean `completed` flag.
- Valid values: 'pending', 'in_progress', 'completed'. Defaults to 'pending'.
- Backfills existing rows: if `completed` is true, status is set to 'completed'; otherwise 'pending'.
2. Security
- No changes to existing RLS policies. All four CRUD policies (anon select/insert/update/delete) remain intact and unchanged.
3. Notes
- The `completed` boolean column is preserved for backward compatibility. The new `status` column provides finer-grained tracking ('in_progress').
- Frontend code will keep `completed` in sync with `status`: status='completed' implies completed=true, any other status implies completed=false.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_tasks' AND column_name = 'status'
  ) THEN
    ALTER TABLE project_tasks ADD COLUMN status text NOT NULL DEFAULT 'pending';
  END IF;
END $$;

-- Backfill: set status based on existing completed flag
UPDATE project_tasks SET status = 'completed' WHERE completed = true AND status = 'pending';
UPDATE project_tasks SET status = 'pending' WHERE completed = false AND status = 'completed';
