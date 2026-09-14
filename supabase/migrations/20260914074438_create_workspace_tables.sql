/*
# Create Zubkas Workspace database tables

1. New Tables
- `clients` — client/company records linked to invoices and quotations
- `quotations` — quotation documents with items stored as JSONB
- `invoices` — invoice documents with items stored as JSONB
- `payments` — payment records linked to invoices
- `accounting_entries` — income/expense ledger entries
- `projects` — project records linked to clients/invoices
- `subscriptions` — recurring subscription records
- `employees` — employee records with permissions stored as JSONB
- `project_tasks` — tasks linked to projects
- `employee_categories` — category name strings for employee grouping
- `subscription_categories` — category name strings for subscription grouping
- `app_settings` — single-row table for company profile, payment accounts, tax, and terms (all JSONB)

2. Security
- RLS enabled on every table.
- All tables use `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)` because this is a single-tenant app with no sign-in screen — the anon-key frontend must read and write its own data.

3. Important Notes
- This is a single-tenant app: one workspace, no per-user isolation.
- Complex nested objects (invoice items, quotation items, employee permissions, payment accounts, company profile, tax, terms) are stored as JSONB columns.
- All tables have `created_at` and `updated_at` timestamps.
- The `app_settings` table is designed to hold exactly one row (singleton pattern).
*/

-- Clients
CREATE TABLE IF NOT EXISTS clients (
  id text PRIMARY KEY,
  name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  gstin text NOT NULL DEFAULT '',
  tax_number text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_clients" ON clients;
CREATE POLICY "anon_select_clients" ON clients FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_clients" ON clients;
CREATE POLICY "anon_insert_clients" ON clients FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_clients" ON clients;
CREATE POLICY "anon_update_clients" ON clients FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_clients" ON clients;
CREATE POLICY "anon_delete_clients" ON clients FOR DELETE TO anon, authenticated USING (true);

-- Quotations
CREATE TABLE IF NOT EXISTS quotations (
  id text PRIMARY KEY,
  quote_number text NOT NULL DEFAULT '',
  client_id text NOT NULL DEFAULT '',
  date text NOT NULL DEFAULT '',
  valid_until text NOT NULL DEFAULT '',
  items jsonb NOT NULL DEFAULT '[]',
  notes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Draft',
  created_at text NOT NULL DEFAULT '',
  quotation_type text,
  subscription_category text,
  subscription_start_date text,
  subscription_end_date text,
  tax_enabled boolean,
  tax_type text,
  tax_rate numeric,
  tax_label text,
  discount_value numeric,
  discount_unit text,
  show_bank_details boolean,
  show_upi_details boolean,
  created_at_ts timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_quotations" ON quotations;
CREATE POLICY "anon_select_quotations" ON quotations FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_quotations" ON quotations;
CREATE POLICY "anon_insert_quotations" ON quotations FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_quotations" ON quotations;
CREATE POLICY "anon_update_quotations" ON quotations FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_quotations" ON quotations;
CREATE POLICY "anon_delete_quotations" ON quotations FOR DELETE TO anon, authenticated USING (true);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id text PRIMARY KEY,
  invoice_number text NOT NULL DEFAULT '',
  client_id text NOT NULL DEFAULT '',
  date text NOT NULL DEFAULT '',
  due_date text NOT NULL DEFAULT '',
  items jsonb NOT NULL DEFAULT '[]',
  notes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Unpaid',
  paid_amount numeric NOT NULL DEFAULT 0,
  balance_due numeric NOT NULL DEFAULT 0,
  created_at text NOT NULL DEFAULT '',
  invoice_type text,
  subscription_category text,
  subscription_start_date text,
  subscription_end_date text,
  subscription_id text,
  reference_id text,
  tax_enabled boolean,
  tax_type text,
  tax_rate numeric,
  tax_label text,
  discount_value numeric,
  discount_unit text,
  created_at_ts timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_invoices" ON invoices;
CREATE POLICY "anon_select_invoices" ON invoices FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_invoices" ON invoices;
CREATE POLICY "anon_insert_invoices" ON invoices FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_invoices" ON invoices;
CREATE POLICY "anon_update_invoices" ON invoices FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_invoices" ON invoices;
CREATE POLICY "anon_delete_invoices" ON invoices FOR DELETE TO anon, authenticated USING (true);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id text PRIMARY KEY,
  payment_number text NOT NULL DEFAULT '',
  invoice_id text NOT NULL DEFAULT '',
  client_id text NOT NULL DEFAULT '',
  amount numeric NOT NULL DEFAULT 0,
  method text NOT NULL DEFAULT 'Bank Transfer',
  date text NOT NULL DEFAULT '',
  reference text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at_ts timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_payments" ON payments;
CREATE POLICY "anon_select_payments" ON payments FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_payments" ON payments;
CREATE POLICY "anon_insert_payments" ON payments FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_payments" ON payments;
CREATE POLICY "anon_update_payments" ON payments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_payments" ON payments;
CREATE POLICY "anon_delete_payments" ON payments FOR DELETE TO anon, authenticated USING (true);

-- Accounting entries
CREATE TABLE IF NOT EXISTS accounting_entries (
  id text PRIMARY KEY,
  type text NOT NULL DEFAULT 'income',
  category text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  amount numeric NOT NULL DEFAULT 0,
  date text NOT NULL DEFAULT '',
  reference text NOT NULL DEFAULT '',
  created_at_ts timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE accounting_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_accounting" ON accounting_entries;
CREATE POLICY "anon_select_accounting" ON accounting_entries FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_accounting" ON accounting_entries;
CREATE POLICY "anon_insert_accounting" ON accounting_entries FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_accounting" ON accounting_entries;
CREATE POLICY "anon_update_accounting" ON accounting_entries FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_accounting" ON accounting_entries;
CREATE POLICY "anon_delete_accounting" ON accounting_entries FOR DELETE TO anon, authenticated USING (true);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id text PRIMARY KEY,
  name text NOT NULL DEFAULT '',
  client_id text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Not Started',
  start_date text NOT NULL DEFAULT '',
  due_date text NOT NULL DEFAULT '',
  budget numeric NOT NULL DEFAULT 0,
  invoice_id text,
  assigned_member_ids jsonb NOT NULL DEFAULT '[]',
  created_at_ts timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_projects" ON projects;
CREATE POLICY "anon_select_projects" ON projects FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_projects" ON projects;
CREATE POLICY "anon_insert_projects" ON projects FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_projects" ON projects;
CREATE POLICY "anon_update_projects" ON projects FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_projects" ON projects;
CREATE POLICY "anon_delete_projects" ON projects FOR DELETE TO anon, authenticated USING (true);

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id text PRIMARY KEY,
  name text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '',
  amount numeric NOT NULL DEFAULT 0,
  billing_cycle text NOT NULL DEFAULT 'monthly',
  next_billing_date text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active',
  client_id text,
  reference_id text,
  start_date text,
  end_date text,
  payment_method text,
  invoice_id text,
  origin text,
  created_at_ts timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_subscriptions" ON subscriptions;
CREATE POLICY "anon_select_subscriptions" ON subscriptions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_subscriptions" ON subscriptions;
CREATE POLICY "anon_insert_subscriptions" ON subscriptions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_subscriptions" ON subscriptions;
CREATE POLICY "anon_update_subscriptions" ON subscriptions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_subscriptions" ON subscriptions;
CREATE POLICY "anon_delete_subscriptions" ON subscriptions FOR DELETE TO anon, authenticated USING (true);

-- Employees
CREATE TABLE IF NOT EXISTS employees (
  id text PRIMARY KEY,
  name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  password text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Active',
  permissions jsonb NOT NULL DEFAULT '{}',
  created_at text NOT NULL DEFAULT ''
);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_employees" ON employees;
CREATE POLICY "anon_select_employees" ON employees FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_employees" ON employees;
CREATE POLICY "anon_insert_employees" ON employees FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_employees" ON employees;
CREATE POLICY "anon_update_employees" ON employees FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_employees" ON employees;
CREATE POLICY "anon_delete_employees" ON employees FOR DELETE TO anon, authenticated USING (true);

-- Project tasks
CREATE TABLE IF NOT EXISTS project_tasks (
  id text PRIMARY KEY,
  project_id text NOT NULL DEFAULT '',
  project_name text NOT NULL DEFAULT '',
  client_name text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  due_date text NOT NULL DEFAULT '',
  completed boolean NOT NULL DEFAULT false,
  created_at text NOT NULL DEFAULT '',
  priority text,
  description text,
  assigned_to_id text,
  assigned_to_name text
);

ALTER TABLE project_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_project_tasks" ON project_tasks;
CREATE POLICY "anon_select_project_tasks" ON project_tasks FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_project_tasks" ON project_tasks;
CREATE POLICY "anon_insert_project_tasks" ON project_tasks FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_project_tasks" ON project_tasks;
CREATE POLICY "anon_update_project_tasks" ON project_tasks FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_project_tasks" ON project_tasks;
CREATE POLICY "anon_delete_project_tasks" ON project_tasks FOR DELETE TO anon, authenticated USING (true);

-- Employee categories (simple string list)
CREATE TABLE IF NOT EXISTS employee_categories (
  id text PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE employee_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_emp_categories" ON employee_categories;
CREATE POLICY "anon_select_emp_categories" ON employee_categories FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_emp_categories" ON employee_categories;
CREATE POLICY "anon_insert_emp_categories" ON employee_categories FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_emp_categories" ON employee_categories;
CREATE POLICY "anon_delete_emp_categories" ON employee_categories FOR DELETE TO anon, authenticated USING (true);

-- Subscription categories (simple string list)
CREATE TABLE IF NOT EXISTS subscription_categories (
  id text PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE subscription_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_sub_categories" ON subscription_categories;
CREATE POLICY "anon_select_sub_categories" ON subscription_categories FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_sub_categories" ON subscription_categories;
CREATE POLICY "anon_insert_sub_categories" ON subscription_categories FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_sub_categories" ON subscription_categories;
CREATE POLICY "anon_delete_sub_categories" ON subscription_categories FOR DELETE TO anon, authenticated USING (true);

-- App settings (singleton row)
CREATE TABLE IF NOT EXISTS app_settings (
  id int PRIMARY KEY DEFAULT 1,
  profile jsonb NOT NULL DEFAULT '{}',
  payment_accounts jsonb NOT NULL DEFAULT '[]',
  tax jsonb NOT NULL DEFAULT '{}',
  terms jsonb NOT NULL DEFAULT '[]',
  admin_email text NOT NULL DEFAULT 'admin@zubkas.com',
  admin_password text NOT NULL DEFAULT 'admin123',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT singleton CHECK (id = 1)
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_settings" ON app_settings;
CREATE POLICY "anon_select_settings" ON app_settings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_settings" ON app_settings;
CREATE POLICY "anon_insert_settings" ON app_settings FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_settings" ON app_settings;
CREATE POLICY "anon_update_settings" ON app_settings FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- Seed default settings row
INSERT INTO app_settings (id, profile, payment_accounts, tax, terms)
VALUES (
  1,
  '{"logo":"","name":"ZUBKAS TECHNOLOGY PRIVATE LIMITED","email":"accounts@zubkas.com","phone":"+91 44 1234 5678","website":"www.zubkas.com","address":"Tidel Park, Taramani, Chennai, Tamil Nadu 600113","gstin":"33AABCC1234D1Z5","taxNumber":"","taxLabel":""}',
  '[{"id":"pa1","accountName":"Zubkas Technology","bankName":"HDFC Bank","branchName":"Taramani","accountNumber":"50200012345678","ifsc":"HDFC0001234","swift":"HDFCINBB","upiId":"zubkas@hdfcbank","isDefault":true,"qrCode":""}]',
  '{"name":"GST","rate":18,"enabled":true}',
  '["Advance: 50% with order, balance before delivery.","All prices are in Indian Rupees (INR) unless stated otherwise.","Lead time: 10-15 working days from receipt of advance.","GST as applicable will be charged extra on the above prices.","This offer is valid for 15 days from the date of quotation."]'
) ON CONFLICT (id) DO NOTHING;

-- Seed default employee categories
INSERT INTO employee_categories (name) VALUES
  ('Management'),
  ('Sales & Billing'),
  ('Operations'),
  ('Development'),
  ('Accounts')
ON CONFLICT DO NOTHING;

-- Seed default subscription categories
INSERT INTO subscription_categories (name) VALUES
  ('Web Hosting & Maintenance'),
  ('Software / SaaS License'),
  ('Digital Marketing & SEO Retainer'),
  ('Cloud Infrastructure / VPS'),
  ('Annual Maintenance Contract (AMC)')
ON CONFLICT DO NOTHING;