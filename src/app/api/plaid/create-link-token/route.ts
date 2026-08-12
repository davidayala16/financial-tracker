import { auth } from "@/lib/auth";
import { getPlaidClient } from "@/lib/plaid";
import { CountryCode, Products } from "plaid";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { productType } = (await request.json()) as {
    productType: "transactions" | "investments";
  };

  const products =
    productType === "investments"
      ? [Products.Investments]
      : [Products.Transactions];

  const plaidClient = getPlaidClient();
  const response = await plaidClient.linkTokenCreate({
    user: { client_user_id: session.user?.email ?? "owner" },
    client_name: "Personal Finance Dashboard",
    products,
    country_codes: [CountryCode.Us],
    language: "en",
  });

  return NextResponse.json({ link_token: response.data.link_token });
}
