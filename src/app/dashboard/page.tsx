import { getServerSupabase } from "@/lib/db";
import type { BudgetConfig, TransactionRow } from "@/types";
import budgetConfig from "../../../config/budget.json";

function firstOfMonth(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

function formatCategory(key: string) {
  return key
    .toLowerCase()
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

export default async function DashboardPage() {
  const budget = budgetConfig as BudgetConfig;
  const supabase = getServerSupabase();

  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .gte("date", firstOfMonth())
    .gt("amount", 0);

  const transactions = (data ?? []) as TransactionRow[];

  const spendByCategory = new Map<string, number>();
  for (const tx of transactions) {
    const key = tx.category_primary ?? "UNCATEGORIZED";
    spendByCategory.set(key, (spendByCategory.get(key) ?? 0) + tx.amount);
  }

  const categories = Object.keys(budget.categories).map((key) => {
    const spent = spendByCategory.get(key) ?? 0;
    const target = budget.categories[key];
    const pct = target > 0 ? Math.min((spent / target) * 100, 100) : spent > 0 ? 100 : 0;
    const over = target > 0 && spent > target;
    return { key, spent, target, pct, over };
  });

  // Any category with spend that isn't in the budget config.
  const untracked = [...spendByCategory.entries()].filter(
    ([key]) => !(key in budget.categories),
  );

  const totalSpent = [...spendByCategory.values()].reduce((a, b) => a + b, 0);
  const totalTarget = Object.values(budget.categories).reduce(
    (a, b) => a + b,
    0,
  );

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-xl font-semibold">This month&apos;s spending</h1>
      {error && (
        <p className="mt-2 text-sm text-red-600">
          Couldn&apos;t load transactions: {error.message}
        </p>
      )}

      <div className="mt-2 text-sm text-neutral-500">
        {formatCurrency(totalSpent, budget.currency)} spent of{" "}
        {formatCurrency(totalTarget, budget.currency)} budgeted
      </div>

      <div className="mt-6 space-y-4">
        {categories.map(({ key, spent, target, pct, over }) => (
          <div key={key}>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{formatCategory(key)}</span>
              <span className={over ? "text-red-600" : "text-neutral-500"}>
                {formatCurrency(spent, budget.currency)} /{" "}
                {formatCurrency(target, budget.currency)}
              </span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
              <div
                className={`h-full rounded-full ${over ? "bg-red-500" : "bg-neutral-900 dark:bg-white"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {untracked.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-medium text-neutral-500">
            Spending outside your budget config
          </h2>
          <ul className="mt-2 space-y-1 text-sm">
            {untracked.map(([key, spent]) => (
              <li key={key} className="flex justify-between">
                <span>{formatCategory(key)}</span>
                <span>{formatCurrency(spent, budget.currency)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-neutral-500">
            Add these to <code>config/budget.json</code> to track them.
          </p>
        </div>
      )}
    </main>
  );
}
