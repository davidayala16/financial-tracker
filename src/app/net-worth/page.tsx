import { getServerSupabase } from "@/lib/db";
import type { AccountRow, ManualBalanceRow } from "@/types";

function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

function latestByAccountName(rows: ManualBalanceRow[]) {
  const latest = new Map<string, ManualBalanceRow>();
  for (const row of rows) {
    const existing = latest.get(row.account_name);
    if (!existing || row.as_of_date > existing.as_of_date) {
      latest.set(row.account_name, row);
    }
  }
  return [...latest.values()];
}

export default async function NetWorthPage() {
  const supabase = getServerSupabase();

  const [investmentAccounts, manualBalances] = await Promise.all([
    supabase.from("accounts").select("*").eq("type", "investment"),
    supabase
      .from("manual_balances")
      .select("*")
      .order("as_of_date", { ascending: false }),
  ]);

  const accounts = (investmentAccounts.data ?? []) as AccountRow[];
  const manual = latestByAccountName(
    (manualBalances.data ?? []) as ManualBalanceRow[],
  );

  const autoTotal = accounts.reduce(
    (sum, a) => sum + (a.current_balance ?? 0),
    0,
  );
  const manualTotal = manual.reduce((sum, m) => sum + m.balance, 0);
  const total = autoTotal + manualTotal;

  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="text-xl font-semibold">Net worth</h1>
      <p className="mt-2 text-3xl font-semibold">{formatCurrency(total)}</p>

      <section className="mt-8">
        <h2 className="text-sm font-medium text-neutral-500">
          Auto-synced (Plaid)
        </h2>
        <ul className="mt-2 divide-y divide-neutral-200 dark:divide-neutral-800">
          {accounts.map((a) => (
            <li key={a.account_id} className="flex justify-between py-2 text-sm">
              <span>{a.name}</span>
              <span>{formatCurrency(a.current_balance ?? 0, a.iso_currency_code ?? "USD")}</span>
            </li>
          ))}
          {accounts.length === 0 && (
            <li className="py-2 text-sm text-neutral-500">
              No investment accounts connected yet — see{" "}
              <a href="/connect" className="underline">
                /connect
              </a>
              .
            </li>
          )}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-medium text-neutral-500">
          Manually entered
        </h2>
        <ul className="mt-2 divide-y divide-neutral-200 dark:divide-neutral-800">
          {manual.map((m) => (
            <li key={m.account_name} className="flex justify-between py-2 text-sm">
              <span>
                {m.account_name}{" "}
                <span className="text-xs text-neutral-500">
                  as of {m.as_of_date}
                </span>
              </span>
              <span>{formatCurrency(m.balance)}</span>
            </li>
          ))}
          {manual.length === 0 && (
            <li className="py-2 text-sm text-neutral-500">
              No manual balances yet — see{" "}
              <a href="/manual-entry" className="underline">
                /manual-entry
              </a>
              .
            </li>
          )}
        </ul>
      </section>
    </main>
  );
}
