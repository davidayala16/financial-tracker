import { google } from "googleapis";
import type { SupabaseClient } from "@supabase/supabase-js";

type SheetValue = string | number | boolean | null;

function getSheetsClient() {
  const clientId = process.env.AUTH_GOOGLE_ID;
  const clientSecret = process.env.AUTH_GOOGLE_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!clientId || !clientSecret || !refreshToken || !sheetId) {
    throw new Error(
      "AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET / GOOGLE_REFRESH_TOKEN / GOOGLE_SHEET_ID are not set",
    );
  }

  // No GCP service account here on purpose: this project's org policy
  // blocks service-account key creation. Instead this reuses the same
  // OAuth client used for login, authenticated once as a long-lived
  // refresh token tied to the sheet owner's own Google account (see
  // README) -- no key file, no separate "share with service account"
  // step needed since it's already the account's own sheet.
  const auth = new google.auth.OAuth2(clientId, clientSecret);
  auth.setCredentials({ refresh_token: refreshToken });

  return { sheets: google.sheets({ version: "v4", auth }), sheetId };
}

async function writeSheet(
  sheets: ReturnType<typeof google.sheets>,
  sheetId: string,
  tabName: string,
  rows: SheetValue[][],
) {
  await sheets.spreadsheets.values.clear({
    spreadsheetId: sheetId,
    range: `${tabName}!A:Z`,
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `${tabName}!A1`,
    valueInputOption: "RAW",
    requestBody: { values: rows },
  });
}

// Mirrors the current Supabase state into a Google Sheet, purely as a free
// human-readable backup/export. The dashboard reads from Supabase directly;
// this sheet is not a data source.
export async function mirrorToSheets(supabase: SupabaseClient) {
  const { sheets, sheetId } = getSheetsClient();

  const [accounts, transactions, holdings, manualBalances] =
    await Promise.all([
      supabase.from("accounts").select("*").order("name"),
      supabase
        .from("transactions")
        .select("*")
        .order("date", { ascending: false })
        .limit(1000),
      supabase
        .from("investment_holdings")
        .select("*")
        .order("as_of_date", { ascending: false })
        .limit(500),
      supabase
        .from("manual_balances")
        .select("*")
        .order("as_of_date", { ascending: false }),
    ]);

  await writeSheet(sheets, sheetId, "Accounts", [
    ["Name", "Type", "Subtype", "Mask", "Current Balance", "Currency", "Updated At"],
    ...(accounts.data ?? []).map((a) => [
      a.name,
      a.type,
      a.subtype,
      a.mask,
      a.current_balance,
      a.iso_currency_code,
      a.updated_at,
    ]),
  ]);

  await writeSheet(sheets, sheetId, "Transactions", [
    ["Date", "Name", "Merchant", "Category", "Amount", "Currency", "Pending"],
    ...(transactions.data ?? []).map((t) => [
      t.date,
      t.name,
      t.merchant_name,
      t.category_primary,
      t.amount,
      t.iso_currency_code,
      t.pending,
    ]),
  ]);

  await writeSheet(sheets, sheetId, "Holdings", [
    ["As Of", "Security", "Ticker", "Quantity", "Value", "Currency"],
    ...(holdings.data ?? []).map((h) => [
      h.as_of_date,
      h.security_name,
      h.ticker_symbol,
      h.quantity,
      h.institution_value,
      h.iso_currency_code,
    ]),
  ]);

  await writeSheet(sheets, sheetId, "ManualBalances", [
    ["As Of", "Account", "Balance", "Note"],
    ...(manualBalances.data ?? []).map((m) => [
      m.as_of_date,
      m.account_name,
      m.balance,
      m.note,
    ]),
  ]);
}
