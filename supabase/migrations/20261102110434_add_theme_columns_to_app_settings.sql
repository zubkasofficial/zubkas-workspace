/*
# Persist theme color and appearance mode in workspace settings

1. Modified Tables
- `app_settings` (single workspace row, id = 1)
  - `theme_color` (text, nullable): the saved accent color as a hex value such as "#9f0f0f". Null means the default brand color is used.
  - `dark_mode` (boolean, nullable): the saved appearance mode. True means dark, false means light, null means not yet saved.

2. Security
- No policy or grant changes. Existing table-level privileges and row level security on `app_settings` already cover the new columns.

3. Notes
- Both columns are nullable, so existing workspace data is unchanged and no default color is written.
- The migration is idempotent and safe to re-run.
*/

ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS theme_color text;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS dark_mode boolean;
