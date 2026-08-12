-- Run this once in the Supabase SQL editor (Project -> SQL Editor -> New query).
-- Single-user schema: no row-level auth is needed since the dashboard itself
-- is gated by Google OAuth, and only the server (service role key) talks to
-- this database directly.

create table if not exists plaid_items (
  item_id text primary key,
  access_token text not null,
  institution_name text not null,
  product text not null default 'transactions', -- 'transactions' | 'investments'
  accounts_cursor text, -- transactions/sync cursor, null = never synced
  created_at timestamptz not null default now()
);

create table if not exists accounts (
  account_id text primary key,
  item_id text not null references plaid_items (item_id) on delete cascade,
  name text not null,
  official_name text,
  type text not null, -- e.g. "credit", "investment"
  subtype text, -- e.g. "credit card", "brokerage"
  mask text,
  current_balance numeric,
  available_balance numeric,
  iso_currency_code text,
  updated_at timestamptz not null default now()
);

create table if not exists transactions (
  transaction_id text primary key,
  account_id text not null references accounts (account_id) on delete cascade,
  amount numeric not null, -- Plaid convention: positive = money out (spend)
  iso_currency_code text,
  category_primary text, -- Plaid personal_finance_category.primary
  category_detailed text, -- Plaid personal_finance_category.detailed
  merchant_name text,
  name text not null,
  pending boolean not null default false,
  date date not null,
  authorized_date date,
  updated_at timestamptz not null default now()
);
create index if not exists transactions_date_idx on transactions (date);
create index if not exists transactions_category_idx on transactions (category_primary);

create table if not exists investment_holdings (
  id bigint generated always as identity primary key,
  account_id text not null references accounts (account_id) on delete cascade,
  security_id text not null,
  security_name text,
  ticker_symbol text,
  quantity numeric not null,
  institution_value numeric not null,
  iso_currency_code text,
  as_of_date date not null default current_date,
  unique (account_id, security_id, as_of_date)
);

-- Manual-entry balances for institutions Plaid doesn't support (my529, HSA).
create table if not exists manual_balances (
  id bigint generated always as identity primary key,
  account_name text not null, -- "my529" | "HSA (Elevate)"
  balance numeric not null,
  as_of_date date not null,
  note text,
  created_at timestamptz not null default now(),
  unique (account_name, as_of_date)
);

-- One row per sync run, for debugging/observability.
create table if not exists sync_runs (
  id bigint generated always as identity primary key,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running', -- running | success | error
  detail text
);
