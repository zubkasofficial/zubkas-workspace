/*
# Create dedicated tasks table

1. New Tables
- `tasks` — standalone task records that can be linked to projects or be temporary/ad-hoc.
  Columns:
    - `id` (text, primary key)
    - `title` (text, not null)
    - `description` (text, nullable)
    - `project_id` (text, nullable — null for temporary tasks)
    - `assigned_to` (text, nullable — employee ID)
    - `priority` (text, nullable — 'low' | 'medium' | 'high')
    - `status` (text, not null default 'pending' — 'pending' | 'in_progress' | 'completed')
    - `due_date` (text, not null default '')
    - `is_temporary` (boolean, not null default false)
    - `created_at` (timestamptz, default now())
    - `updated_at` (timestamptz, default now())

2. Security
- RLS enabled on `tasks`.
- All four CRUD policies use `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)`
  because this is a single-tenant app with no sign-in screen — the anon-key frontend must
  read and write its own data. Same pattern as all other workspace tables.

3. Important Notes
- This table coexists with the older `project_tasks` table. The frontend will migrate to
  reading/writing from `tasks` instead of `project_tasks`. No data migration is performed —
  the old table is left intact for safety.
- `project_id` is nullable to support temporary/ad-hoc tasks that have no linked project.
- `is_temporary` flag distinguishes intentional ad-hoc tasks from regular project tasks.
- `assigned_to` stores the employee ID (maps to `assignedToId` in the frontend type).
- `status` replaces the old `completed` boolean — 'completed' means the same thing.
- `updated_at` is managed by the frontend on each write.
*/

CREATE TABLE IF NOT EXISTS tasks (
  id text PRIMARY KEY,
  title text NOT NULL DEFAULT '',
  description text,
  project_id text,
  assigned_to text,
  priority text,
  status text NOT NULL DEFAULT 'pending',
  due_date text NOT NULL DEFAULT '',
  is_temporary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_tasks" ON tasks;
CREATE POLICY "anon_select_tasks" ON tasks FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_tasks" ON tasks;
CREATE POLICY "anon_insert_tasks" ON tasks FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_tasks" ON tasks;
CREATE POLICY "anon_update_tasks" ON tasks FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_tasks" ON tasks;
CREATE POLICY "anon_delete_tasks" ON tasks FOR DELETE
TO anon, authenticated USING (true);
