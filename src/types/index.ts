export interface PlaidItemRow {
  item_id: string;
  access_token: string;
  institution_name: string;
  product: "transactions" | "investments";
  accounts_cursor: string | null;
  created_at: string;
}

export interface AccountRow {
  account_id: string;
  item_id: string;
  name: string;
  official_name: string | null;
  type: string;
  subtype: string | null;
  mask: string | null;
  current_balance: number | null;
  available_balance: number | null;
  iso_currency_code: string | null;
  updated_at: string;
}

export interface TransactionRow {
  transaction_id: string;
  account_id: string;
  amount: number;
  iso_currency_code: string | null;
  category_primary: string | null;
  category_detailed: string | null;
  merchant_name: string | null;
  name: string;
  pending: boolean;
  date: string;
  authorized_date: string | null;
  updated_at: string;
}

export interface InvestmentHoldingRow {
  id: number;
  account_id: string;
  security_id: string;
  security_name: string | null;
  ticker_symbol: string | null;
  quantity: number;
  institution_value: number;
  iso_currency_code: string | null;
  as_of_date: string;
}

export interface ManualBalanceRow {
  id: number;
  account_name: string;
  balance: number;
  as_of_date: string;
  note: string | null;
  created_at: string;
}

export interface SyncRunRow {
  id: number;
  started_at: string;
  finished_at: string | null;
  status: "running" | "success" | "error";
  detail: string | null;
}

export interface BudgetConfig {
  currency: string;
  categories: Record<string, number>;
}
