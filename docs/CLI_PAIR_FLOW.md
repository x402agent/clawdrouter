# Pair the `solana-clawd` CLI to solanaclawd.com

> Mint treasury-sponsored agents from your terminal. No private keys on our
> server, no wallet re-prompts, one pair-code between you and `solana-clawd mint`.

This is the engineering guide for the pair-code flow that connects the public
[`solana-clawd`](https://www.npmjs.com/package/solana-clawd) npm package to
`solanaclawd.com`. It's also the reference for anyone extending the flow —
adding scopes, porting to another site, or debugging a stuck pair.

---

## Why this exists

Before this flow, deploying a CLAWD agent meant clicking through `/agents/mint`
in a browser, approving the mint in your wallet, and waiting. Good for a first
mint, painful for CI, agents, or anyone who lives in a shell.

The constraint: we can't meaningfully do `npm install` inside a browser tab
(WebContainers can't run the Solana/Metaplex stack cleanly), and we refuse to
ever see a user's private key. So we split the ceremony:

- The **web** is where you prove ownership of a $CLAWD wallet (Phantom sign).
- The **CLI** is where you actually trigger deploys — bound to the wallet you
  proved, through a short-lived pair code that trades up to a long-lived
  narrow-scope API key.

Everything expensive (treasury-sponsored mint, x402 fallback, Metaplex registry
call) still runs on our server. The CLI is a remote trigger, not an elevated
client.

---

## User flow

```
Web (solanaclawd.com)                   Terminal (user laptop)
─────────────────────                   ──────────────────────
connect wallet                          $ npm i -g solana-clawd
click "Generate code"       ──code──►   $ solana-clawd pair 4F-H2KX
                                        ✓ paired as 7xKp…3nRt
                                        $ solana-clawd mint \
                                            --name solscan \
                                            --description "…"
                                        ⠋ minting via treasury…
                                        ✓ 9JwP…aQ2
                                          https://solscan.io/token/…
```

Three minutes end to end on a cold install. Subsequent mints from that machine
are one command — no code, no wallet prompt — until `solana-clawd unpair` or
the user revokes the key from the web.

---

## Surface map

### Six HTTP endpoints under `/api/cli/*`

| Method | Path                     | Auth                | Purpose                                     |
| ------ | ------------------------ | ------------------- | ------------------------------------------- |
| POST   | `/api/cli/pair`          | web session cookie  | Issue a 7-char pair code (5 min TTL)        |
| POST   | `/api/cli/pair/redeem`   | none (body carries code) | Swap code → long-lived `clawd_sk_…` key |
| GET    | `/api/cli/pair/status`   | web session cookie  | UI polls this every 3s while a code is live |
| GET    | `/api/cli/session`       | Bearer `clawd_sk_…` | `whoami` — returns wallet + scopes          |
| DELETE | `/api/cli/session`       | Bearer `clawd_sk_…` | `unpair` — revokes the key server-side      |
| POST   | `/api/cli/deploy`        | Bearer `clawd_sk_…` | Triggers `oneShotDeploy` as the paired wallet |

Plain HTTP on purpose — the CLI stays dependency-light (`fetch` only, no tRPC
client in the published bundle). The server handlers live in
[`server/_core/app.ts`](../server/_core/app.ts) alongside the existing
`/api/auth/*` block, so they inherit the same helmet/CORS/session plumbing.

### Rate limits

- `cliPairLimiter`: 5 / minute per IP on `POST /api/cli/pair`.
- `cliRedeemLimiter`: 20 / 5 minutes per IP on `POST /api/cli/pair/redeem`.

`deploy` has no CLI-specific limiter — it inherits the global general limiter
and the underlying `oneShotDeploy` already coordinates treasury state.

### The React card

[`client/src/components/PairCodeCard.tsx`](../client/src/components/PairCodeCard.tsx)
is a self-contained four-state component: `idle → pending → paired → expired`.
While a code is live it runs a 3-second poll against `/api/cli/pair/status` so
the UI flips to "paired" the instant the CLI redeems — no manual refresh.

It's slotted into two places:

- [`/start`](../client/src/pages/Start.tsx) — right above the numbered quickstart, as the "Prefer the command line?" section.
- [`/agents/mint`](../client/src/pages/AgentMint.tsx) — at the top of the form. When the user fills in name / description / image prompt, those values become the `--name` / `--description` / `--image-prompt` flags in the copy-paste CLI snippet below, so a user can configure on the web and deploy from the shell without retyping anything.

### The CLI subcommands

Shipped in `solana-clawd@1.8.0` as four new subcommands next to the existing `demo` / `birth` / `spinners`:

```bash
solana-clawd pair <CODE>                       # consume a code, save session
solana-clawd whoami                            # show paired wallet + scopes
solana-clawd mint --name X [--description Y]  # treasury-sponsored deploy
solana-clawd unpair                            # revoke + wipe local session
```

Session file at `~/.solana-clawd/session.json` (chmod 600). Point at a local
server with `SOLANA_CLAWD_API_URL=http://localhost:3000`.

---

## Sequence: one mint, zero friction

```
Browser          Web Server        Postgres        CLI             Solana / Metaplex
   │                 │                │              │                    │
   │─POST /api/cli/pair──►            │              │                    │
   │                 │ auth cookie ──►│              │                    │
   │                 │ ←─ userId ─────│              │                    │
   │                 │ INSERT cli_pair_codes         │                    │
   │                 │   codeHash, wallet, 5-min TTL │                    │
   │ ◄─ { code } ────│                │              │                    │
   │ show "4F-H2KX"  │                │              │                    │
   │                 │                │              │                    │
   │ (user types code on laptop)                                          │
   │                 │                │              │                    │
   │                 │    ◄── POST /api/cli/pair/redeem ({ code }) ───────│
   │                 │ SELECT by codeHash             │                    │
   │                 │ validate TTL, not-used        │                    │
   │                 │ createApiKey(userId, [agent.mint, agent.read])     │
   │                 │ UPDATE cli_pair_codes SET consumedAt, consumedApiKeyId │
   │                 │ ── { session_token, wallet_address } ──►           │
   │                 │                │              │ save ~/.solana-clawd/session.json │
   │ (poll flips to "paired" within 3s)              │                    │
   │                 │                │              │                    │
   │                 │    ◄── POST /api/cli/deploy (Bearer clawd_sk_…) ───│
   │                 │ validateApiKey → user + walletAddress              │
   │                 │ scope check: agent.mint ✓     │                    │
   │                 │ oneShotDeploy(walletAddress, name, description)    │
   │                 │   ─ verifyClawdHolding ─►    │                    │
   │                 │   ─ prepareTreasurySponsoredMint ──────────────►  │
   │                 │   ─ mintAndRegisterAgent ─────────────────────►  │
   │                 │   ←─ { assetAddress, signature } ──────────────── │
   │                 │   ─ executeTreasuryBurnForUsdCost ──────────►    │
   │                 │ ── { asset_address, explorer_url } ──►            │
   │                 │                │              │ ✓ 9JwP…aQ2        │
```

The CLI never learns anything about the treasury payer, the burn vault, or
Metaplex credentials. The web server never holds a private key for the user's
wallet — the mint is *authorized by* the user's wallet (via proof of holding)
but *paid for* by the treasury.

---

## Security model

### Pair codes

- Format: two chars, dash, five chars, alphabet `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (Crockford-ish — no 0/O/1/I). `32^7 ≈ 34 billion` combinations, 5-minute window.
- Stored as `sha256("cli-pair:" + code)`. We never persist plaintext codes; a DB dump doesn't leak usable codes.
- One-shot: `consumedAt` set on first successful redeem. Subsequent redeems return **410 Gone**.
- Brute-force shield: `cliRedeemLimiter` caps 20 redeems per IP per 5 minutes. Code entropy + rate limit make a blind guess well under `10⁻⁸` per window.

### Session tokens

- The pair redeem mints a normal row in the existing `api_keys` table with scopes `["agent.mint", "agent.read"]`. CLI sessions are simply "narrow-scope API keys labeled `CLI: …`".
- That means every CLI bearer is:
  - Rotatable via the existing `revokeApiKey` path.
  - Audited via `api_key_audit_log` (one row per request with route + IP + UA).
  - Expiring if `expiresAt` is set (currently unset — 30-day sliding via `lastUsedAt` is the spec but not enforced yet; first enhancement below).
- Scopes are checked at the endpoint: `/api/cli/deploy` refuses any key missing `agent.mint` (HTTP 403).

### What the CLI cannot do

- Transfer SOL from the user wallet.
- Sign arbitrary transactions.
- Escalate to a different wallet.
- Mint on behalf of a wallet other than the one that issued the pair code.

### What the user should do

Rotate the session token if they ever share it, lose the machine, or hand a
laptop to someone else. `solana-clawd unpair` does both the server-side revoke
and the local file wipe.

---

## Data model

Single new table. Everything else reuses existing infrastructure.

```sql
CREATE TABLE cli_pair_codes (
  id               SERIAL PRIMARY KEY,
  "userId"         INTEGER NOT NULL,
  "walletAddress"  VARCHAR(64) NOT NULL,
  "codeHash"       VARCHAR(64) NOT NULL UNIQUE,
  label            VARCHAR(128),
  "expiresAt"      TIMESTAMP NOT NULL,
  "consumedAt"     TIMESTAMP,
  "consumedApiKeyId" INTEGER,     -- points at api_keys.id when redeemed
  "consumedDevice" TEXT,          -- "solana-clawd/1.8.0 darwin-arm64"
  "createdAt"      TIMESTAMP NOT NULL DEFAULT NOW()
);
```

Applied via `pnpm run db:push` (now runs `drizzle-kit push`, which diffs
`schema.ts` against the live DB — the previous `generate && migrate` flow was
tripping over stale snapshots).

---

## Running it locally

### Web

```bash
# In clawd-terminal
pnpm run db:push          # prompts for y, creates cli_pair_codes
pnpm run dev              # http://localhost:3000
```

Smoke the endpoints with `curl`:

```bash
# 1. Web user generates a code (copy your real session cookie)
curl -s http://localhost:3000/api/cli/pair \
  -H 'Cookie: app_session_id=…' \
  -H 'Content-Type: application/json' -d '{}'

# 2. CLI redeems it
curl -s http://localhost:3000/api/cli/pair/redeem \
  -H 'Content-Type: application/json' \
  -d '{"code":"4F-H2KX","device":"curl smoke"}'

# 3. Use the session_token
TOKEN=clawd_sk_…
curl -s http://localhost:3000/api/cli/session \
  -H "Authorization: Bearer $TOKEN"
```

### CLI (against local web)

```bash
SOLANA_CLAWD_API_URL=http://localhost:3000 \
  solana-clawd pair 4F-H2KX

SOLANA_CLAWD_API_URL=http://localhost:3000 \
  solana-clawd mint --name testagent --description "local smoke"
```

---

## Troubleshooting

**`pnpm run db:push` exits with code 1 immediately after `applying migrations…`**
drizzle-kit's journal / snapshot was out of sync with the live DB, so the auto-generated diff tried to re-create `telegram_links`. Fixed by switching `db:push` to `drizzle-kit push`. If you're on an older branch: run `pnpm exec drizzle-kit push` directly.

**`401 Invalid or expired session` on the CLI**
The local `~/.solana-clawd/session.json` points at a revoked key. `solana-clawd unpair` cleans it up, then re-pair from the web.

**`402` from `/api/cli/deploy`**
The wallet doesn't hold enough $CLAWD for a free mint. The response body includes a `pay_url` — the CLI prints it so the user can complete the x402 paid flow on the web, then retry. A future enhancement (below) polls for completion so the CLI doesn't need to re-run.

**`412 NO_WALLET` on pair**
The user is signed in with a guest identity, not a wallet-backed one. They need to connect Phantom (or equivalent) before generating a code — the pair code binds to a wallet at issuance, not at redeem.

**CLI hangs forever on `solana-clawd mint`**
`oneShotDeploy` normally completes in <15s. If it's stuck, check the server logs for `[cli/deploy]` — the most common cause is Metaplex RPC latency during high congestion. The same request will retry on Ctrl+C.

---

## What's next

Not done in this pass; good first-issues for a follow-up:

1. **x402 handoff for non-holders.** When `/api/cli/deploy` returns 402, have the CLI open the browser to `pay_url`, then poll a new `/api/cli/deploy/status?intent_id=…` endpoint until paid, then auto-retry the mint. Eliminates the "go back to the web" friction for free-tier users.
2. **Session TTL + sliding refresh.** The spec calls for 30-day sliding expiry. Today the DB field is present but unused; wire `validateApiKey` to reject keys past 30 days since `lastUsedAt`.
3. **Paired devices UI.** List all active CLI sessions on `/terminal` settings with last-used + device string, plus per-row revoke. The underlying `api_keys` rows already carry the data.
4. **CLI project config file.** Let users drop a `solana-clawd.json` in their project root with defaults (name, description, services, trust list) so `solana-clawd mint` needs no flags in CI. Mirrors the way `wrangler.toml` works.
5. **A2A deploy hook.** After a successful mint, post a Webhook URL the user configured so their backend can pick up the new `asset_address` without polling.

---

## Reference

- Commit: this feature was built as a single commit on the `newnew` branch. See `git log --follow -- server/_core/app.ts client/src/components/PairCodeCard.tsx drizzle/schema.ts`.
- Underlying mint pipeline: [`server/_core/agentDeploy.ts`](../server/_core/agentDeploy.ts) (`oneShotDeploy`) → [`server/_core/metaplexAgent.ts`](../server/_core/metaplexAgent.ts) (`mintAndRegisterAgent`).
- Treasury accounting: `executeTreasuryBurnForUsdCost` in `server/routers.ts` (the same path `/agents/mint` uses for the web holder flow).
- API key lifecycle: `createApiKey` / `validateApiKey` / `revokeApiKey` in [`server/db.ts`](../server/db.ts). All three are reused by the CLI endpoints — no parallel session system.
