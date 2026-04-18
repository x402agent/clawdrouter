import { ApiError, getSession } from "../api.js";
import { getBaseUrl, getSessionPath, readSession } from "../config.js";
import { color, err, info, success } from "../ui.js";

export interface StatusOptions {
  baseUrl?: string;
  json?: boolean;
}

export async function runStatus(opts: StatusOptions): Promise<number> {
  const session = readSession();
  if (!session) {
    if (opts.json) {
      console.log(JSON.stringify({ paired: false }, null, 2));
    } else {
      info(`No session file at ${color.dim(getSessionPath())}.`);
      console.log(`  Run ${color.cyan("solana-clawd pair <CODE>")} to pair.`);
    }
    return 1;
  }

  const baseUrl = getBaseUrl(opts.baseUrl ?? session.base_url);
  try {
    const remote = await getSession(baseUrl, session.session_token);
    if (opts.json) {
      console.log(
        JSON.stringify(
          {
            paired: true,
            base_url: baseUrl,
            wallet_address: remote.wallet_address ?? session.wallet_address,
            scopes: remote.scopes,
            paired_at: session.paired_at,
            session_path: getSessionPath(),
          },
          null,
          2
        )
      );
      return 0;
    }
    success(`Session active for ${color.bold(remote.wallet_address ?? session.wallet_address)}`);
    console.log(`  ${color.dim("Base URL")}     ${baseUrl}`);
    console.log(`  ${color.dim("Scopes")}       ${remote.scopes.join(", ") || "(none)"}`);
    console.log(`  ${color.dim("Paired at")}    ${session.paired_at}`);
    console.log(`  ${color.dim("Session file")} ${getSessionPath()}`);
    return 0;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      err("Session expired. Run `solana-clawd pair <CODE>` to re-pair.");
      return 1;
    }
    err(`Status check failed: ${(error as Error).message}`);
    return 1;
  }
}
