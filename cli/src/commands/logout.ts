import { ApiError, revokeSession } from "../api.js";
import { clearSession, getBaseUrl, readSession } from "../config.js";
import { err, info, success, warn } from "../ui.js";

export interface LogoutOptions {
  baseUrl?: string;
  keepLocal?: boolean;
}

export async function runLogout(opts: LogoutOptions): Promise<number> {
  const session = readSession();
  if (!session) {
    info("No active session — nothing to revoke.");
    return 0;
  }

  const baseUrl = getBaseUrl(opts.baseUrl ?? session.base_url);

  try {
    await revokeSession(baseUrl, session.session_token);
    success("Server session revoked.");
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      warn("Server session was already invalid.");
    } else {
      err(`Failed to revoke remote session: ${(error as Error).message}`);
    }
  }

  if (!opts.keepLocal) {
    if (clearSession()) {
      success("Local session file removed.");
    }
  }
  return 0;
}
