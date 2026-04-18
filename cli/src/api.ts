export interface RedeemResponse {
  session_token: string;
  session_token_prefix?: string;
  wallet_address: string;
  scopes: string[];
}

export interface SessionResponse {
  wallet_address: string | null;
  user_id: string;
  scopes: string[];
}

export interface DeployRequest {
  name: string;
  description?: string;
  agentUri?: string;
  services?: Array<{ name: string; endpoint: string }>;
  registrations?: Array<Record<string, unknown>>;
  supportedTrust?: string[];
}

export interface DeploySuccess {
  asset_address: string;
  signature: string;
  network: string;
  funded_sol?: number;
  clawd_balance?: number;
  explorer_url: string;
}

export interface DeployError {
  error: string;
  code?: "INSUFFICIENT_CLAWD" | "WALLET_INVALID" | "CONFIG_MISSING" | "NO_WALLET" | string;
  pay_url?: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly payUrl?: string;

  constructor(status: number, message: string, code?: string, payUrl?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.payUrl = payUrl;
  }
}

export async function redeemPairCode(
  baseUrl: string,
  code: string,
  device: string
): Promise<RedeemResponse> {
  return postJson<RedeemResponse>(`${baseUrl}/api/cli/pair/redeem`, { code, device });
}

export async function getSession(
  baseUrl: string,
  sessionToken: string
): Promise<SessionResponse> {
  const response = await fetch(`${baseUrl}/api/cli/session`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${sessionToken}`,
      Accept: "application/json",
    },
  });
  return handleResponse<SessionResponse>(response);
}

export async function revokeSession(baseUrl: string, sessionToken: string): Promise<void> {
  const response = await fetch(`${baseUrl}/api/cli/session`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${sessionToken}`,
      Accept: "application/json",
    },
  });
  await handleResponse<unknown>(response);
}

export async function deployAgent(
  baseUrl: string,
  sessionToken: string,
  body: DeployRequest
): Promise<DeploySuccess> {
  const response = await fetch(`${baseUrl}/api/cli/deploy`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sessionToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  return handleResponse<DeploySuccess>(response);
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  return handleResponse<T>(response);
}

async function handleResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    const errorBody = (payload ?? {}) as DeployError;
    const message =
      typeof errorBody === "object" && errorBody
        ? errorBody.error ?? response.statusText
        : String(errorBody ?? response.statusText);
    throw new ApiError(response.status, message, errorBody.code, errorBody.pay_url);
  }

  return (payload as T) ?? ({} as T);
}
