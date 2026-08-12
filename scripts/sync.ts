import "dotenv/config";
import { getServerSupabase } from "../src/lib/db";
import { getPlaidClient } from "../src/lib/plaid";
import { mirrorToSheets } from "../src/lib/sheets";
import type { PlaidItemRow } from "../src/types";

const supabase = getServerSupabase();
const plaidClient = getPlaidClient();

// Structural subset shared by Plaid's AccountBase and InvestmentAccount
// types — accepting this instead of either concrete type lets the same
// helper handle both transactions and investments items.
interface PlaidAccountLike {
  account_id: string;
  name: string;
  official_name: string | null;
  type: string;
  subtype: string | null;
  mask: string | null;
  balances: {
    current: number | null;
    available: number | null;
    iso_currency_code: string | null;
  };
}

async function upsertAccounts(itemId: string, accounts: PlaidAccountLike[]) {
  if (accounts.length === 0) return;
  const { error } = await supabase.from("accounts").upsert(
    accounts.map((account) => ({
      account_id: account.account_id,
      item_id: itemId,
      name: account.name,
      official_name: account.official_name,
      type: account.type,
      subtype: account.subtype,
      mask: account.mask,
      current_balance: account.balances.current,
      available_balance: account.balances.available,
      iso_currency_code: account.balances.iso_currency_code,
      updated_at: new Date().toISOString(),
    })),
  );
  if (error) throw new Error(`upsertAccounts: ${error.message}`);
}

async function syncTransactionsItem(item: PlaidItemRow) {
  let cursor = item.accounts_cursor ?? undefined;
  let hasMore = true;

  while (hasMore) {
    const response = await plaidClient.transactionsSync({
      access_token: item.access_token,
      cursor,
    });
    const { added, modified, removed, accounts, next_cursor, has_more } =
      response.data;

    await upsertAccounts(item.item_id, accounts);

    const upserts = [...added, ...modified].map((tx) => ({
      transaction_id: tx.transaction_id,
      account_id: tx.account_id,
      amount: tx.amount,
      iso_currency_code: tx.iso_currency_code,
      category_primary: tx.personal_finance_category?.primary ?? null,
      category_detailed: tx.personal_finance_category?.detailed ?? null,
      merchant_name: tx.merchant_name,
      name: tx.name,
      pending: tx.pending,
      date: tx.date,
      authorized_date: tx.authorized_date,
      updated_at: new Date().toISOString(),
    }));

    if (upserts.length > 0) {
      const { error } = await supabase.from("transactions").upsert(upserts);
      if (error) throw new Error(`transactions upsert: ${error.message}`);
    }

    if (removed.length > 0) {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .in(
          "transaction_id",
          removed.map((tx) => tx.transaction_id),
        );
      if (error) throw new Error(`transactions delete: ${error.message}`);
    }

    cursor = next_cursor;
    hasMore = has_more;
  }

  const { error } = await supabase
    .from("plaid_items")
    .update({ accounts_cursor: cursor })
    .eq("item_id", item.item_id);
  if (error) throw new Error(`cursor update: ${error.message}`);
}

async function syncInvestmentsItem(item: PlaidItemRow) {
  const response = await plaidClient.investmentsHoldingsGet({
    access_token: item.access_token,
  });
  const { accounts, holdings, securities } = response.data;

  await upsertAccounts(item.item_id, accounts);

  const securityById = new Map(securities.map((sec) => [sec.security_id, sec]));
  const asOfDate = new Date().toISOString().slice(0, 10);

  const upserts = holdings.map((holding) => {
    const security = securityById.get(holding.security_id);
    return {
      account_id: holding.account_id,
      security_id: holding.security_id,
      security_name: security?.name ?? null,
      ticker_symbol: security?.ticker_symbol ?? null,
      quantity: holding.quantity,
      institution_value: holding.institution_value,
      iso_currency_code: holding.iso_currency_code,
      as_of_date: asOfDate,
    };
  });

  if (upserts.length > 0) {
    const { error } = await supabase
      .from("investment_holdings")
      .upsert(upserts, { onConflict: "account_id,security_id,as_of_date" });
    if (error) throw new Error(`investment_holdings upsert: ${error.message}`);
  }
}

async function main() {
  const { data: run, error: runError } = await supabase
    .from("sync_runs")
    .insert({ status: "running" })
    .select()
    .single();
  if (runError) throw new Error(`sync_runs insert: ${runError.message}`);

  try {
    const { data: items, error } = await supabase
      .from("plaid_items")
      .select("*");
    if (error) throw new Error(`plaid_items select: ${error.message}`);

    for (const item of (items ?? []) as PlaidItemRow[]) {
      console.log(`Syncing ${item.institution_name} (${item.product})…`);
      if (item.product === "investments") {
        await syncInvestmentsItem(item);
      } else {
        await syncTransactionsItem(item);
      }
    }

    await mirrorToSheets(supabase);

    await supabase
      .from("sync_runs")
      .update({ status: "success", finished_at: new Date().toISOString() })
      .eq("id", run.id);
    console.log("Sync complete.");
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    await supabase
      .from("sync_runs")
      .update({
        status: "error",
        detail,
        finished_at: new Date().toISOString(),
      })
      .eq("id", run.id);
    throw err;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
