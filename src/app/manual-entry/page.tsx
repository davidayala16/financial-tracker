"use client";

import { useState, type FormEvent } from "react";

const ACCOUNTS = ["my529", "HSA (Elevate)"] as const;

export default function ManualEntryPage() {
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    const form = new FormData(event.currentTarget);

    const res = await fetch("/api/manual-balances", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        account_name: form.get("account_name"),
        balance: Number(form.get("balance")),
        as_of_date: form.get("as_of_date"),
        note: form.get("note") || undefined,
      }),
    });

    setStatus(res.ok ? "saved" : "error");
    if (res.ok) event.currentTarget.reset();
  }

  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="text-xl font-semibold">Manual balance entry</h1>
      <p className="mt-1 text-sm text-neutral-500">
        For my529 and the HSA, which aren&apos;t Plaid-supported. Log a
        balance snapshot whenever you check your statement — monthly or
        quarterly is fine.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium" htmlFor="account_name">
            Account
          </label>
          <select
            id="account_name"
            name="account_name"
            required
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          >
            {ACCOUNTS.map((account) => (
              <option key={account} value={account}>
                {account}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium" htmlFor="balance">
            Balance (USD)
          </label>
          <input
            id="balance"
            name="balance"
            type="number"
            step="0.01"
            min="0"
            required
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium" htmlFor="as_of_date">
            As of date
          </label>
          <input
            id="as_of_date"
            name="as_of_date"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium" htmlFor="note">
            Note (optional)
          </label>
          <input
            id="note"
            name="note"
            type="text"
            placeholder="e.g. from Q2 statement"
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>

        <button
          type="submit"
          disabled={status === "saving"}
          className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
        >
          {status === "saving" ? "Saving…" : "Save balance"}
        </button>

        {status === "saved" && (
          <p className="text-sm text-green-600">Saved.</p>
        )}
        {status === "error" && (
          <p className="text-sm text-red-600">
            Something went wrong — try again.
          </p>
        )}
      </form>
    </main>
  );
}
