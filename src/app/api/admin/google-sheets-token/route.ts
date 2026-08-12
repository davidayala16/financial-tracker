import { auth } from "@/lib/auth";
import { google } from "googleapis";
import { NextResponse } from "next/server";

// One-time (or re-run-as-needed) utility to obtain a Google OAuth refresh
// token for the Sheets mirror, without a GCP service account -- this
// project's org policy blocks service-account key creation, and Google
// now blocks the classic "OAuth Playground trick" for unverified clients.
// This route does the same handshake directly against this app's own
// domain instead, which Google has no issue with for a testing-mode app's
// own registered test user. Protected by the same auth gate as everything
// else (see src/proxy.ts) -- only ALLOWED_EMAIL can reach it.
export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const clientId = process.env.AUTH_GOOGLE_ID;
  const clientSecret = process.env.AUTH_GOOGLE_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET are not set" },
      { status: 500 },
    );
  }

  const url = new URL(request.url);
  const redirectUri = `${url.origin}/api/admin/google-sheets-token`;
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  const code = url.searchParams.get("code");
  if (!code) {
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    return NextResponse.redirect(authUrl);
  }

  const { tokens } = await oauth2Client.getToken(code);
  if (!tokens.refresh_token) {
    return new NextResponse(
      "No refresh_token returned. If you've authorized this app before, revoke its access at https://myaccount.google.com/permissions and try this URL again -- Google only issues a refresh token on first consent.",
      { status: 400 },
    );
  }

  return new NextResponse(
    `Copy this into GOOGLE_REFRESH_TOKEN, then discard this page:\n\n${tokens.refresh_token}`,
    { headers: { "Content-Type": "text/plain" } },
  );
}
