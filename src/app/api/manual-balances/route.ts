import { auth } from "@/lib/auth";
import { getServerSupabase } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const ManualBalanceInput = z.object({
  account_name: z.enum(["my529", "HSA (Elevate)"]),
  balance: z.number().positive(),
  as_of_date: z.iso.date(),
  note: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("manual_balances")
    .select("*")
    .order("as_of_date", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ balances: data });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = ManualBalanceInput.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const supabase = getServerSupabase();
  const { error } = await supabase
    .from("manual_balances")
    .upsert(parsed.data, { onConflict: "account_name,as_of_date" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
