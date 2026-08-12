import { getServerSupabase } from "@/lib/db";
import type { SyncRunRow } from "@/types";

export async function SyncStatus() {
  const supabase = getServerSupabase();
  const { data } = await supabase
    .from("sync_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const run = data as SyncRunRow | null;

  if (!run) {
    return (
      <p className="text-xs text-neutral-500">
        No sync has run yet — connect accounts at{" "}
        <a href="/connect" className="underline">
          /connect
        </a>{" "}
        and trigger the daily-sync workflow once to verify it.
      </p>
    );
  }

  const when = new Date(run.finished_at ?? run.started_at).toLocaleString();

  if (run.status === "running") {
    return <p className="text-xs text-neutral-500">Sync in progress…</p>;
  }

  if (run.status === "error") {
    return (
      <p className="text-xs text-red-600">
        Last sync ({when}) finished with errors: {run.detail}
      </p>
    );
  }

  return (
    <p className="text-xs text-neutral-500">Last synced {when}</p>
  );
}
