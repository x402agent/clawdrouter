import { hostname, platform } from "node:os";
import { ApiError, redeemPairCode } from "../api.js";
import { getBaseUrl, writeSession } from "../config.js";
import { color, err, info, success } from "../ui.js";

export interface PairOptions {
  code: string;
  baseUrl?: string;
  label?: string;
}

export async function runPair(opts: PairOptions): Promise<number> {
  const code = opts.code.trim().toUpperCase();
  if (!/^[A-Z0-9]{4,16}$/.test(code)) {
    err(`Invalid pair code: ${opts.code}`);
    console.error("  Codes are 4–16 alphanumeric characters (e.g. ABC123).");
    return 2;
  }

  const baseUrl = getBaseUrl(opts.baseUrl);
  const device = opts.label?.trim() || buildDeviceLabel();

  info(`Pairing with ${color.cyan(baseUrl)} as ${color.dim(device)}…`);

  try {
    const result = await redeemPairCode(baseUrl, code, device);
    writeSession({
      session_token: result.session_token,
      session_token_prefix: result.session_token_prefix,
      wallet_address: result.wallet_address,
      scopes: result.scopes ?? [],
      base_url: baseUrl,
      paired_at: new Date().toISOString(),
    });
    success(`Paired with wallet ${color.bold(result.wallet_address)}`);
    console.log(
      `  ${color.dim("Scopes:")} ${(result.scopes ?? []).join(", ") || "(none)"}`
    );
    console.log(
      `  ${color.dim("Next:")} ${color.cyan("solana-clawd mint --name \"My Agent\" --description \"…\"")}`
    );
    return 0;
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 404) {
        err("Pair code not found or expired. Generate a fresh code from the terminal.");
      } else if (error.status === 410) {
        err("Pair code was already used. Generate a new one.");
      } else if (error.status === 503) {
        err("Server is unavailable. Try again in a moment.");
      } else {
        err(`Pairing failed (${error.status}): ${error.message}`);
      }
      return 1;
    }
    err(`Pairing failed: ${(error as Error).message}`);
    return 1;
  }
}

function buildDeviceLabel(): string {
  const host = safe(hostname);
  const plat = safe(platform);
  return `solana-clawd CLI (${host} • ${plat})`.slice(0, 128);
}

function safe(fn: () => string): string {
  try {
    return fn() || "unknown";
  } catch {
    return "unknown";
  }
}
