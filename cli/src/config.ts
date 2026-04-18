import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync, unlinkSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export interface SessionFile {
  session_token: string;
  session_token_prefix?: string;
  wallet_address: string;
  scopes: string[];
  base_url: string;
  paired_at: string;
}

export const DEFAULT_BASE_URL = "https://solanaclawd.com";

export function getBaseUrl(override?: string): string {
  const fromArg = override?.trim();
  if (fromArg) return stripTrailingSlash(fromArg);
  const fromEnv = process.env.SOLANA_CLAWD_BASE_URL?.trim();
  if (fromEnv) return stripTrailingSlash(fromEnv);
  return DEFAULT_BASE_URL;
}

export function getSessionPath(): string {
  return join(homedir(), ".clawd", "solana-clawd", "session.json");
}

export function readSession(): SessionFile | null {
  const path = getSessionPath();
  if (!existsSync(path)) return null;
  try {
    const raw = readFileSync(path, "utf8");
    const parsed = JSON.parse(raw) as SessionFile;
    if (!parsed.session_token || !parsed.wallet_address) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeSession(session: SessionFile): void {
  const path = getSessionPath();
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  writeFileSync(path, JSON.stringify(session, null, 2), { mode: 0o600 });
  try {
    chmodSync(path, 0o600);
  } catch {
    // chmod can fail on Windows — ignore
  }
}

export function clearSession(): boolean {
  const path = getSessionPath();
  if (!existsSync(path)) return false;
  try {
    unlinkSync(path);
    return true;
  } catch {
    return false;
  }
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}
