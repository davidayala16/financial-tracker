import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";

function getEnv(): "sandbox" | "production" {
  const env = process.env.PLAID_ENV ?? "sandbox";
  if (env !== "sandbox" && env !== "production") {
    throw new Error(`Unsupported PLAID_ENV: ${env}`);
  }
  return env;
}

export function getPlaidClient(): PlaidApi {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  if (!clientId || !secret) {
    throw new Error("PLAID_CLIENT_ID / PLAID_SECRET are not set");
  }

  const configuration = new Configuration({
    basePath: PlaidEnvironments[getEnv()],
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": clientId,
        "PLAID-SECRET": secret,
      },
    },
  });

  return new PlaidApi(configuration);
}
