-- Step 1: Remove duplicate rows from employee_categories, keeping only the oldest row per name
DELETE FROM employee_categories
WHERE id NOT IN (
  SELECT id FROM (
    SELECT DISTINCT ON (name) id, name
    FROM employee_categories
    ORDER BY name, created_at ASC
  ) AS keep_ids
);

-- Step 2: Remove duplicate rows from subscription_categories, keeping only the oldest row per name
DELETE FROM subscription_categories
WHERE id NOT IN (
  SELECT id FROM (
    SELECT DISTINCT ON (name) id, name
    FROM subscription_categories
    ORDER BY name, created_at ASC
  ) AS keep_ids
);

-- Step 3: Add unique constraints to prevent future duplicates
ALTER TABLE employee_categories ADD CONSTRAINT employee_categories_name_unique UNIQUE (name);
ALTER TABLE subscription_categories ADD CONSTRAINT subscription_categories_name_unique UNIQUE (name);
