import { auth } from "@/lib/auth";
import { getServerSupabase } from "@/lib/db";
import { getPlaidClient } from "@/lib/plaid";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { public_token, institution_name } = (await request.json()) as {
    public_token: string;
    institution_name: string;
  };

  const plaidClient = getPlaidClient();
  const exchange = await plaidClient.itemPublicTokenExchange({
    public_token,
  });

  const supabase = getServerSupabase();
  const { error } = await supabase.from("plaid_items").upsert({
    item_id: exchange.data.item_id,
    access_token: exchange.data.access_token,
    institution_name,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
