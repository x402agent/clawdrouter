# clawdrouter

> The Solana-native agent routing stack: a token-gated LLM router, an x402
> payment gateway, and the one-shot agent minting CLI — all in one monorepo.

## Packages

| Folder | Package | Purpose |
| --- | --- | --- |
| [`cli/`](./cli) | [`solana-clawd`](https://www.npmjs.com/package/solana-clawd) | One-shot agent minting CLI. Pair a wallet, mint a Metaplex Core agent NFT. |
| [`clawdrouter/`](./clawdrouter) | [`@solana-clawd/clawdrouter`](https://www.npmjs.com/package/@solana-clawd/clawdrouter) | Local LLM router with 15-dim scoring, 55+ models, Ed25519 wallet auth, USDC x402 micropayments. |
| [`gateway/`](./gateway) | *(unpublished)* | Express gateway proxying Solana / Supabase / Birdeye / Telegram with $CLAWD gating. |
| [`docs/`](./docs) | — | Deep-dive documentation for each subsystem. |

## Quick start (mint an agent)

```bash
npm i -g solana-clawd
# 1. Open https://solanaclawd.com, connect your wallet, click "Generate code"
# 2. Pair
solana-clawd pair ABC123
# 3. Mint
solana-clawd mint --name "DeFi Scanner" --description "Autonomous DeFi research agent"
```

Free for verified `$CLAWD` holders; non-holders get a pay URL for $0.50 USDC.

## Quick start (local LLM router)

```bash
npm i -g @solana-clawd/clawdrouter
clawdrouter         # runs a local OpenAI-compatible proxy on :8402
```

## Documentation

- [`ONE_SHOT_MINT.md`](./docs/ONE_SHOT_MINT.md) — full mint flow walkthrough
- [`MINTING_GUIDE.md`](./docs/MINTING_GUIDE.md) — end-to-end minting guide
- [`CLAWD_ROUTER.md`](./docs/CLAWD_ROUTER.md) — router API reference
- [`CLAWD_ROUTER_BUILD.md`](./docs/CLAWD_ROUTER_BUILD.md) — building / rebuilding the router
- [`clawdrouter-agent-guide.md`](./docs/clawdrouter-agent-guide.md) — agent integration contract
- [`CLI_PAIR_FLOW.md`](./docs/CLI_PAIR_FLOW.md) — terminal ↔ CLI pairing protocol
- [`grok-prompting.md`](./docs/grok-prompting.md) — Grok prompting notes
- [`ipfs-setup.md`](./docs/ipfs-setup.md) — Pinata / IPFS configuration
- [`migrate-from-openclaw.md`](./docs/migrate-from-openclaw.md) — migration from the OpenClaw layout
- [`openrouter-attribution.md`](./docs/openrouter-attribution.md) — OpenRouter attribution requirements

## Development

Each package has its own `package.json` and is independently installable /
publishable — there's no root workspace.

```bash
# CLI
cd cli && npm install && npm run build

# Router
cd clawdrouter && npm install && npm run build

# Gateway
cd gateway && npm install && npm run build
```

## Security

- Never commit `.env` files, private keys, or wallet JSONs. The repo's
  `.gitignore` blocks them by default.
- The `solana-clawd` CLI stores sessions at `~/.clawd/solana-clawd/session.json`
  with mode `0600`; rotate if compromised via `solana-clawd logout`.

## License

MIT — see [`LICENSE`](./LICENSE).
