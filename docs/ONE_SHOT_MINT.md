# One-Shot Agent Minting with `solana-clawd`

> **TL;DR:** Mint an AI agent on Solana in three terminal commands — no manual configuration required.

The `solana-clawd` CLI ships a one-shot minting flow that pairs your terminal directly to a Solana wallet and deploys a fully-hosted AI agent as an NFT on-chain. The mint is **free for $CLAWD holders** and **$0.50 via USDC** for everyone else.

---

## The One-Shot Flow

### Step 1 — Install (30 seconds)

```bash
npm i -g solana-clawd
```

Or run without installing:

```bash
npx solana-clawd
```

This pulls the latest version, prints the ASCII banner, and drops you into interactive mode.

### Step 2 — Pair Your Wallet (1 minute)

Open the Clawd terminal at **[solanaclawd.com](https://solanaclawd.com)** and connect any Solana wallet (Phantom, Backpack, Solflare, Ledger, Trezor, WalletConnect).

Click **"Generate code"** on the terminal UI. You'll get a 6-character alphanumeric code valid for 5 minutes.

On your laptop, run:

```bash
solana-clawd pair ABC123
```

The CLI hashes the code and your wallet pubkey together, sends it to the server, and confirms the pairing. The terminal UI shows "CLI paired" as confirmation.

### Step 3 — Mint Your Agent (10 seconds)

Back in the terminal, configure your agent:

- **Name** (1–32 chars)
- **Description** (what the agent does)
- **Art prompt** (optional — generates AI artwork automatically)
- **AI Model** (defaults to `anthropic/claude-opus-4.7`)

Click **"MINT AGENT (FREE)"** if you hold $CLAWD, or **"PAY WITH USDC"** to pay $0.50.

The CLI automatically generates the mint command for you:

```bash
solana-clawd mint --name "DeFi Scanner" --description "Autonomous DeFi research agent" --image-prompt "Cyberpunk Solana AI agent avatar"
```

But you don't need to type it — just click the button.

---

## What Happens Under the Hood

### Free Mint (CLAWD Holders)

```
1. Verify $CLAWD holding ≥ 1 token (via Helius DAS API)
2. Treasury funds the Metaplex payer from burn vault (~0.001 SOL)
3. Metaplex Core NFT minted on Solana mainnet
4. Agent Identity PDA created in the same atomic transaction
5. Off-chain EIP-8004 registration via Pinata IPFS
6. Treasury burns ~$0.05 worth of $CLAWD
```

### USDC Mint (Non-Holders)

```
1. Detect no $CLAWD holding
2. Generate x402 payment requirements
3. User signs USDC transfer transaction (~0.001 USDC)
4. Server verifies on-chain USDC receipt
5. Mint transaction signed and broadcast
6. Agent registered same as free mint flow
```

---

## What You Get

| Asset | Details |
| --- | --- |
| **Solana NFT** | Metaplex Core asset, permanently on-chain |
| **Agent Identity** | Program-derived address (PDA) for on-chain operations |
| **IPFS Metadata** | EIP-8004 compliant agent card, pinned via Pinata |
| **CDN Images** | Artwork served via Cloudflare R2 |
| **A2A Endpoint** | Discoverable via agent-to-agent protocol |
| **Hosted Web** | Live agent page at `/agents/hosted/<asset_address>` |

---

## Minting Without the UI (Pure CLI)

If you prefer the terminal-only workflow:

```bash
# 1. Generate pair code via curl (requires wallet sig in production)
curl -X POST https://solanaclawd.com/api/cli/pair \
  -H "Content-Type: application/json" \
  -d '{"walletAddress": "YOUR_PUBKEY"}'

# Response: { "code": "XYZ789", "expiresAt": "...", "ttlSeconds": 300 }

# 2. Pair (CLI handles this)
solana-clawd pair XYZ789

# 3. Mint (CLI pulls config from terminal)
solana-clawd mint --name "My Agent" --description "What it does"
```

---

## Minting via tRPC (Programmatic)

For integrations, the mint endpoint is public (no auth required):

```typescript
// Using @trpc/client
const result = await trpcClient.agents.metaplex.mintAgent.mutate({
  name: "DeFi Analyst",
  uri: "https://ipfs.io/ipfs/bafybeig...",
  description: "Autonomous DeFi research agent",
  services: [
    { name: "hosted-chat", endpoint: "https://agents.example.com/chat" },
  ],
  network: "solana-mainnet",
});

// Returns: { assetAddress, network, transactionSignature }
```

See [CLAWD_ROUTER.md](./CLAWD_ROUTER.md) for the full tRPC API reference.

---

## Troubleshooting

| Error | Fix |
| --- | --- |
| `"Wallet doesn't hold $CLAWD"` | Need 1+ $CLAWD for free mint, or use USDC option |
| `"Transaction failed"` | Ensure you have enough SOL for fees (~0.001 SOL) |
| `"Metadata URI too long"` | Don't worry — auto-pins to IPFS for permanent storage |
| Pair code expired | Generate a new one from the terminal (5-minute TTL) |

---

## Server Requirements

For the mint flow to work, the server needs:

```bash
METAPLEX_PAYER_SECRET_KEY=base58_encoded_key  # Pays Solana fees
METAPLEX_NETWORK=solana-mainnet
METAPLEX_API_BASE_URL=https://api.metaplex.com  # optional, uses default
```

---

## Quick Reference

| Command | Description |
| --- | --- |
| `npm i -g solana-clawd` | One-shot install |
| `solana-clawd pair <CODE>` | Pair terminal wallet to CLI |
| `solana-clawd mint` | Mint agent (with args from terminal UI) |
| `solana-clawd birth` | Hatch a Blockchain Buddy |
| `solana-clawd --version` | Check version |

---

## See Also

- [MINTING_GUIDE.md](./MINTING_GUIDE.md) — End-to-end minting walkthrough
- [CLAWD_ROUTER.md](./CLAWD_ROUTER.md) — tRPC API reference
- [clawdrouter-agent-guide.md](./clawdrouter-agent-guide.md) — AI agent integration contract
