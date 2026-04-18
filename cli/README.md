# solana-clawd

One-shot agent minting CLI for the Solana Clawd terminal. Pair a wallet, mint a
Metaplex Core agent NFT in three commands.

## Install

```bash
npm i -g solana-clawd
```

Or run without installing:

```bash
npx solana-clawd
```

## Quick start

1. Open the terminal at [solanaclawd.com](https://solanaclawd.com), connect a
   Solana wallet, and click **Generate code**.
2. Pair the CLI with the 6-character code:

   ```bash
   solana-clawd pair ABC123
   ```

3. Mint an agent:

   ```bash
   solana-clawd mint --name "DeFi Scanner" --description "Autonomous DeFi research agent"
   ```

Free for verified `$CLAWD` holders; non-holders get a pay URL that completes
the $0.50 USDC flow in the web UI.

## Commands

### `pair <CODE>`

Redeem a pair code from the terminal UI. Stores a session token at
`~/.clawd/solana-clawd/session.json` (mode `0600`).

| Flag | Description |
| --- | --- |
| `--label <text>` | Device label shown in the web UI. Defaults to hostname + platform. |
| `--base-url <url>` | Override the server. |

### `mint`

Mints a Metaplex Core agent NFT using the paired wallet.

| Flag | Description |
| --- | --- |
| `-n, --name <text>` | **Required.** 3–64 characters. |
| `-d, --description <text>` | Up to 2000 characters. |
| `-u, --agent-uri <url>` | Pre-pinned IPFS/HTTPS metadata URI. If omitted, the server pins a default card. |
| `--service name=url` | Add an A2A service endpoint. Repeatable. |
| `--trust <type>` | Declare a supported trust model (e.g. `wallet-verified`). Repeatable. |
| `--json` | Emit the raw JSON response instead of a pretty summary. |
| `--base-url <url>` | Override the server. |

On success, prints the asset address, signature, network, and Solscan URL.

### `status`

Checks the current session against the server.

```bash
solana-clawd status
solana-clawd status --json
```

### `logout`

Revokes the server session and deletes the local session file. Use
`--keep-local` to revoke server-side only.

### `birth`

Placeholder for the Blockchain Buddy hatch flow. Currently exits with a message
directing you to the web UI.

## Exit codes

| Code | Meaning |
| --- | --- |
| 0 | Success |
| 1 | Session / runtime error |
| 2 | Validation error (missing or invalid arg) |
| 3 | `INSUFFICIENT_CLAWD` — non-holder, see pay URL |
| 4 | `CONFIG_MISSING` — server not fully configured |
| 64 | Unknown command |

## Environment

| Variable | Purpose |
| --- | --- |
| `SOLANA_CLAWD_BASE_URL` | Override the API base URL for every command. |
| `SOLANA_CLAWD_DEBUG=1` | Print full stack traces on unexpected errors. |
| `NO_COLOR` | Disable ANSI colors. |

## Session storage

Sessions live at `~/.clawd/solana-clawd/session.json` with mode `0600`. The
file contains the bearer token (`clawd_sk_*`), paired wallet address, scopes,
and the base URL used at pair time.

## Development

```bash
pnpm install
pnpm build
node dist/index.js --help

# or for iteration:
pnpm dev -- --help
```

The CLI has zero runtime dependencies — everything uses Node built-ins and the
global `fetch`.

## License

MIT
