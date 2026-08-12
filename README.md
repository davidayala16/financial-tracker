# Personal Finance Auto-Sync Dashboard

Pulls daily transaction/balance data from credit cards and a brokerage
account via [Plaid](https://plaid.com), tracks monthly spend against a
budget, and shows total net worth (auto-synced investments + manually
entered my529/HSA balances) in one dashboard. Designed to run at **$0
recurring cost**.

## How it fits together

- **Next.js app** (this repo, deployed on Vercel's free Hobby tier) — the
  dashboard UI, the Plaid Link connect flow, and the manual-entry form.
  Gated behind Google OAuth restricted to a single email (`ALLOWED_EMAIL`).
- **Supabase** (free tier) — source of truth for accounts, transactions,
  investment holdings, and manual balances.
- **GitHub Actions cron** (free for a public/private repo at this volume) —
  runs `npm run sync` once a day, which calls Plaid's
  `/transactions/sync` and `/investments/holdings/get`, writes results to
  Supabase, and mirrors the data into a Google Sheet as a free, readable
  backup.

## One-time setup

### 1. Plaid

1. Sign up at [dashboard.plaid.com/signup](https://dashboard.plaid.com/signup)
   (personal-use path is fine).
2. Grab your `client_id` and `Sandbox` secret from **Team Settings > Keys**.
   Build and test against Sandbox first — it's free and unlimited.
3. When ready to connect your real accounts, request Production access from
   the same Keys page and swap in the Production secret. As of writing,
   new Plaid teams get a free **Trial plan** covering real production data
   for up to 10 Items (we only need 4) — confirm current terms on
   [Plaid's pricing page](https://plaid.com/pricing/) since they do change
   these over time.

### 2. Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. Open the SQL Editor and run [`sql/schema.sql`](./sql/schema.sql) once.
3. From **Project Settings > API**, copy the Project URL
   (`SUPABASE_URL`) and the `service_role` key
   (`SUPABASE_SERVICE_ROLE_KEY`) — the service role key bypasses RLS, so
   treat it like a password and never expose it to the browser.

### 3. Google Cloud (OAuth login + Sheets API)

1. Create a project at [console.cloud.google.com](https://console.cloud.google.com).
2. **OAuth consent screen**: set it to "External" + "Testing" mode (no
   Google review needed for a single test user) and add your own email as
   a test user.
3. **Credentials > Create OAuth client ID** (type: Web application). Add
   `http://localhost:3000/api/auth/callback/google` and your production
   URL's equivalent as authorized redirect URIs. Copy the client ID/secret
   into `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`.
4. **Enable the Google Sheets API** for the project.
5. **Credentials > Create service account**, then create a JSON key for
   it. From the JSON, copy `client_email` into
   `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `private_key` into
   `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`.
6. Create a Google Sheet with four tabs named exactly `Accounts`,
   `Transactions`, `Holdings`, `ManualBalances`. Share it with the service
   account's email (Editor access). Copy the sheet ID (the long string in
   its URL) into `GOOGLE_SHEET_ID`.

### 4. Local env

```bash
cp .env.example .env.local
# fill in the values from steps 1-3, plus:
#   AUTH_SECRET   -> `openssl rand -base64 32`
#   ALLOWED_EMAIL -> your own Google account email
npm install
npm run dev
```

### 5. Deploy (Vercel free tier)

1. Import this repo at [vercel.com/new](https://vercel.com/new).
2. Add every variable from `.env.example` under Project Settings >
   Environment Variables (use your Production Plaid secret, not Sandbox,
   once you're connecting real accounts).
3. Deploy, then add the deployed URL's OAuth callback
   (`https://<your-app>.vercel.app/api/auth/callback/google`) to the
   Google OAuth client's authorized redirect URIs.

### 6. GitHub Actions (daily sync)

Add the same Plaid/Supabase/Google variables as **repository secrets**
(Settings > Secrets and variables > Actions) — the names must match
[`.github/workflows/daily-sync.yml`](./.github/workflows/daily-sync.yml).
The workflow runs daily at 12:00 UTC and can also be triggered manually
from the Actions tab (`workflow_dispatch`).

### 7. Connect your accounts

Visit `/connect` on your deployed app and sign in with your allowed
Google account. Connect Chase, SoFi, and the Amazon/Synchrony card (each
uses the `transactions` product) and Fidelity (`investments` product).
Then trigger the sync workflow manually once to verify the first pull
before waiting on the daily schedule.

my529 and the HSA aren't Plaid-supported institutions — enter their
balances at `/manual-entry` instead, whenever you check a statement.

## Budget categories

`config/budget.json` maps [Plaid's personal finance category
taxonomy](https://plaid.com/documents/transactions-personal-finance-category-taxonomy.csv)
(`FOOD_AND_DRINK`, `GENERAL_MERCHANDISE`, etc.) to a monthly dollar
target. Edit the targets, or add categories that show up under "Spending
outside your budget config" on the dashboard, and commit the change.

## Local scripts

```bash
npm run dev    # local dashboard
npm run sync   # run the daily sync job by hand (reads .env.local)
npm run build  # production build / typecheck
```
