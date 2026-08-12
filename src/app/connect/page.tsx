import { PlaidConnectButton } from "@/components/PlaidConnectButton";

const CREDIT_CARDS = [
  { label: "Chase credit card", institutionName: "Chase" },
  { label: "SoFi credit card", institutionName: "SoFi" },
  { label: "Amazon store card (Synchrony)", institutionName: "Synchrony" },
] as const;

export default function ConnectPage() {
  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="text-xl font-semibold">Connect accounts</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Each button opens Plaid Link scoped to the product that account
        needs. Pick the matching institution when Link opens.
      </p>

      <section className="mt-6">
        <h2 className="text-sm font-medium text-neutral-500">
          Credit cards (spending)
        </h2>
        <div className="mt-2 space-y-2">
          {CREDIT_CARDS.map((card) => (
            <PlaidConnectButton
              key={card.institutionName}
              label={card.label}
              institutionName={card.institutionName}
              productType="transactions"
            />
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-medium text-neutral-500">
          Investments (net worth)
        </h2>
        <div className="mt-2 space-y-2">
          <PlaidConnectButton
            label="Fidelity brokerage"
            institutionName="Fidelity"
            productType="investments"
          />
        </div>
      </section>

      <p className="mt-6 text-xs text-neutral-500">
        my529 and the HSA aren&apos;t Plaid-supported — enter those balances
        manually on the{" "}
        <a href="/manual-entry" className="underline">
          manual entry
        </a>{" "}
        page instead.
      </p>
    </main>
  );
}
