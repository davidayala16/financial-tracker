"use client";

import { useCallback, useEffect, useState } from "react";
import { usePlaidLink, type PlaidLinkOnSuccess } from "react-plaid-link";

interface PlaidConnectButtonProps {
  label: string;
  institutionName: string;
  productType: "transactions" | "investments";
}

export function PlaidConnectButton({
  label,
  institutionName,
  productType,
}: PlaidConnectButtonProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "connected" | "error">(
    "idle",
  );

  useEffect(() => {
    let ignore = false;

    fetch("/api/plaid/create-link-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productType }),
    })
      .then(async (res) => {
        if (ignore) return;
        if (!res.ok) {
          setStatus("error");
          return;
        }
        const data = (await res.json()) as { link_token: string };
        if (!ignore) setLinkToken(data.link_token);
      })
      .catch(() => {
        if (!ignore) setStatus("error");
      });

    return () => {
      ignore = true;
    };
  }, [productType]);

  const onSuccess = useCallback<PlaidLinkOnSuccess>(
    async (public_token) => {
      setStatus("loading");
      const res = await fetch("/api/plaid/exchange-public-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          public_token,
          institution_name: institutionName,
          productType,
        }),
      });
      setStatus(res.ok ? "connected" : "error");
    },
    [institutionName, productType],
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
  });

  return (
    <button
      type="button"
      onClick={() => open()}
      disabled={!ready || status === "loading"}
      className="w-full rounded-lg border border-neutral-200 px-4 py-3 text-left text-sm font-medium transition hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-800 dark:hover:border-neutral-600"
    >
      <div className="flex items-center justify-between">
        <span>{label}</span>
        <span className="text-xs text-neutral-500">
          {status === "connected"
            ? "Connected ✓"
            : status === "loading"
              ? "Connecting…"
              : status === "error"
                ? "Error, retry"
                : "Not connected"}
        </span>
      </div>
    </button>
  );
}
