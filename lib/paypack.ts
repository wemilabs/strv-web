import "server-only";
import { formatRwandanPhone } from "./utils";

type CashinResponse = {
  amount: number;
  created_at: string;
  kind: "CASHIN";
  ref: string;
  status: "pending" | "successful" | "failed";
};

type CashoutResponse = {
  amount: number;
  created_at: string;
  kind: "CASHOUT";
  ref: string;
  status: "pending" | "successful" | "failed";
};

type TransactionEvent = {
  event_id: string;
  event_kind: "transaction:processed" | "transaction:created";
  created_at: string;
  data: {
    ref: string;
    kind: "CASHIN" | "CASHOUT";
    fee: number;
    merchant: string;
    client: string;
    amount: number;
    status: "pending" | "successful" | "failed";
    created_at: string;
    processed_at?: string;
  };
};

const PAYPACK_BASE_URL = "https://payments.paypack.rw/api";

let accessToken: string | null = null;
let tokenExpiry: number = 0;

async function getAccessToken(): Promise<string> {
  if (accessToken && Date.now() < tokenExpiry) {
    return accessToken;
  }

  const response = await fetch(`${PAYPACK_BASE_URL}/auth/agents/authorize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.PAYPACK_CLIENT_ID,
      client_secret: process.env.PAYPACK_CLIENT_SECRET,
    }),
  });

  if (!response.ok) {
    throw new Error(`Paypack auth failed: ${response.statusText}`);
  }

  const data = await response.json();
  accessToken = data.access;
  // Token expires in 1 hour, refresh 5 minutes early
  tokenExpiry = Date.now() + 55 * 60 * 1000;
  return data.access as string;
}

async function paypackRequest(
  endpoint: string,
  method: "GET" | "POST" = "POST",
  body?: Record<string, unknown>,
) {
  const token = await getAccessToken();
  const response = await fetch(`${PAYPACK_BASE_URL}${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Paypack request failed: ${error}`);
  }

  return response.json();
}

export async function initiatePayment(
  phoneNumber: string,
  amount: number,
): Promise<CashinResponse> {
  const formattedPhone = formatRwandanPhone(phoneNumber);

  const environment = process.env.PAYPACK_ENVIRONMENT || "development";

  const response = await paypackRequest("/transactions/cashin", "POST", {
    number: formattedPhone,
    amount,
    environment,
  });
  return response as CashinResponse;
}

export async function initiateCashout(
  phoneNumber: string,
  amount: number,
): Promise<CashoutResponse> {
  const formattedPhone = formatRwandanPhone(phoneNumber);

  const environment = process.env.PAYPACK_ENVIRONMENT || "development";

  const response = await paypackRequest("/transactions/cashout", "POST", {
    number: formattedPhone,
    amount,
    environment,
  });

  return response as CashoutResponse;
}

export async function getTransactionEvents(
  ref: string,
): Promise<TransactionEvent[]> {
  const response = await paypackRequest(
    `/events/transactions?ref=${ref}&limit=10`,
    "GET",
  );

  return response.transactions as TransactionEvent[];
}

export async function getAccountInfo() {
  return paypackRequest("/merchants/me", "GET");
}
