import { ApiError, deployAgent, type DeployRequest } from "../api.js";
import { getBaseUrl, readSession } from "../config.js";
import { color, err, info, success, warn } from "../ui.js";

export interface MintOptions {
  name?: string;
  description?: string;
  agentUri?: string;
  services?: Array<{ name: string; endpoint: string }>;
  trust?: string[];
  baseUrl?: string;
  json?: boolean;
}

export async function runMint(opts: MintOptions): Promise<number> {
  const session = readSession();
  if (!session) {
    err("No active session. Run `solana-clawd pair <CODE>` first.");
    return 1;
  }

  const name = opts.name?.trim();
  if (!name) {
    err("--name is required (3–64 chars).");
    return 2;
  }
  if (name.length < 3 || name.length > 64) {
    err("--name must be 3–64 characters.");
    return 2;
  }
  if (opts.description && opts.description.length > 2000) {
    err("--description must be ≤ 2000 characters.");
    return 2;
  }

  const baseUrl = getBaseUrl(opts.baseUrl ?? session.base_url);

  const body: DeployRequest = {
    name,
    description: opts.description?.trim() || undefined,
    agentUri: opts.agentUri?.trim() || undefined,
    services: opts.services?.length ? opts.services : undefined,
    supportedTrust: opts.trust?.length ? opts.trust : undefined,
  };

  info(`Minting ${color.bold(name)} for ${color.cyan(session.wallet_address)}…`);
  console.log(`  ${color.dim("via")} ${baseUrl}`);

  try {
    const result = await deployAgent(baseUrl, session.session_token, body);

    if (opts.json) {
      console.log(JSON.stringify(result, null, 2));
      return 0;
    }

    success("Agent minted.");
    console.log(`  ${color.dim("Asset")}     ${color.bold(result.asset_address)}`);
    console.log(`  ${color.dim("Network")}   ${result.network}`);
    console.log(`  ${color.dim("Signature")} ${result.signature}`);
    if (typeof result.funded_sol === "number") {
      console.log(`  ${color.dim("Funded")}    ${result.funded_sol} SOL`);
    }
    if (typeof result.clawd_balance === "number") {
      console.log(`  ${color.dim("$CLAWD")}    ${result.clawd_balance}`);
    }
    console.log(`  ${color.dim("Explorer")}  ${color.cyan(result.explorer_url)}`);
    return 0;
  } catch (error) {
    if (error instanceof ApiError) {
      switch (error.code) {
        case "INSUFFICIENT_CLAWD":
          warn("Wallet does not hold enough $CLAWD for the free mint.");
          if (error.payUrl) {
            console.log(`  ${color.dim("Pay $0.50 USDC:")} ${color.cyan(error.payUrl)}`);
          }
          return 3;
        case "NO_WALLET":
          err("Session has no wallet attached. Re-run `solana-clawd pair <CODE>`.");
          return 1;
        case "CONFIG_MISSING":
          err(`Server misconfigured: ${error.message}`);
          return 4;
        case "WALLET_INVALID":
          err(`Invalid wallet on session: ${error.message}`);
          return 2;
        default:
          if (error.status === 401) {
            err("Session expired. Run `solana-clawd pair <CODE>` again.");
            return 1;
          }
          err(`Mint failed (${error.status}): ${error.message}`);
          return 1;
      }
    }
    err(`Mint failed: ${(error as Error).message}`);
    return 1;
  }
}

export function parseService(raw: string): { name: string; endpoint: string } | null {
  const idx = raw.indexOf("=");
  if (idx < 1) return null;
  const name = raw.slice(0, idx).trim();
  const endpoint = raw.slice(idx + 1).trim();
  if (!name || !endpoint) return null;
  return { name, endpoint };
}
