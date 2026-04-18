# ClawdRouter Agent Guide

> For AI agents integrating with or extending the Solana Clawd Router.

This document is for Claude Code, Copilot, or any AI agent that needs to understand,
use, or extend the ClawdRouter API.

## What is ClawdRouter?

ClawdRouter is a Next.js edge proxy that routes AI requests through a unified API
surface. It wraps xAI's Grok API with:

1. **$CLAWD token gating** — checks if the caller holds the $CLAWD SPL token on Solana
2. **x402 payment fallback** — allows non-holders to pay for access
3. **Single `XAI_API_KEY`** — all Grok capabilities (chat, vision, image, video, voice,
   multi-agent) through one key
4. **Agentic tooling** — web search, X search, code execution, remote MCP, RAG

All code lives in `web/app/api/solana-clawd/`.

## Endpoint Map

```
/api/solana-clawd/chat          — OpenRouter proxy with Grok routing
/api/solana-clawd/image         — xAI image generation
/api/solana-clawd/video         — xAI video generation (async polling)
/api/solana-clawd/tts           — xAI text-to-speech
/api/solana-clawd/stt           — xAI speech-to-text
/api/solana-clawd/voice-token   — Ephemeral token for Voice Agent WebSocket
/api/solana-clawd/voices        — List available TTS voices
/api/solana-clawd/research      — 16-agent grok-4.20-multi-agent research
/api/solana-clawd/agentic       — Single-agent with full tool kit
/api/solana-clawd/mcp-tools     — MCP server registry
```

## Key Conventions

### Always pass `walletAddress`

Every write endpoint (POST) accepts `walletAddress` (Solana base58 pubkey) in the JSON
body. This determines holder status.

```typescript
const walletAddress = normalizeWalletAddress(body?.walletAddress);
const holder = await getClawdHolderStatus(walletAddress);
```

### Always return `clawd` metadata

Every response includes a `clawd` block:

```typescript
{
  clawd: {
    agent: "solana-clawd",
    provider: "xai",       // or "openrouter"
    model: "...",
    token: "CLAWD_TOKEN",
    access: { holder, paymentHeaderPresent }
  }
}
```

### Enforce payment gating

Every POST handler follows this pattern:

```typescript
if (isX402Enabled() && !holder.isHolder && !paymentHeaderPresent) {
  const requirement = getX402PaymentRequirement(req.nextUrl.pathname);
  const headers = new Headers();
  if (requirement) headers.set("x-payment-required", JSON.stringify(requirement));
  return NextResponse.json(
    { error: "Payment Required", ... },
    { status: 402, headers },
  );
}
```

### Import from shared libs

```typescript
// @/lib/solana-clawd — shared client utilities
import {
  CLAWD_SPL_TOKEN,
  buildSolanaClawdSystemPrompt,
  normalizeWalletAddress,
} from "@/lib/solana-clawd";

// @/lib/solana-clawd-server — server-only (env access)
import {
  getXaiApiKey,
  getClawdHolderStatus,
  isX402Enabled,
} from "@/lib/solana-clawd-server";
```

### Use XAI Responses API for agentic endpoints

The `research` and `agentic` endpoints use the xAI Responses API
(`https://api.x.ai/v1/responses`), **not** the Chat Completions API.

### Always handle streaming

When `stream: true`, proxy the response body directly:

```typescript
if (stream && response.body) {
  return new NextResponse(response.body, {
    headers: {
      "Content-Type": response.headers.get("Content-Type") ?? "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "x-clawd-access-tier": holder.isHolder ? "holder" : "x402",
    },
  });
}
```

## Adding a New Endpoint

1. Create `web/app/api/solana-clawd/<name>/route.ts`
2. Export `POST` (and `GET` if needed) handlers
3. Import shared utilities from `@/lib/solana-clawd` and `@/lib/solana-clawd-server`
4. Always enforce wallet → holder check → x402 gating
5. Return `clawd` metadata in all responses
6. Add `runtime = "nodejs"` and `dynamic = "force-dynamic"` for endpoints using
   `Buffer` or `FormData`
7. Add TypeScript types for request/response bodies
8. Add the endpoint to `docs/CLAWD_ROUTER.md` and this file

## File Reference

| File | Purpose |
| --- | --- |
| `lib/solana-clawd.ts` | Shared client types/utils (`CLAWD_SPL_TOKEN`, `normalizeWalletAddress`, `buildSolanaClawdSystemPrompt`) |
| `lib/solana-clawd-server.ts` | Server-only: env vars, Helius RPC, token gating |
| `app/api/solana-clawd/chat/route.ts` | Chat completions (OpenRouter) |
| `app/api/solana-clawd/image/route.ts` | Image generation |
| `app/api/solana-clawd/video/route.ts` | Video generation + polling |
| `app/api/solana-clawd/tts/route.ts` | Text-to-speech |
| `app/api/solana-clawd/stt/route.ts` | Speech-to-text |
| `app/api/solana-clawd/voice-token/route.ts` | Ephemeral tokens |
| `app/api/solana-clawd/voices/route.ts` | Voice listing |
| `app/api/solana-clawd/research/route.ts` | Multi-agent research |
| `app/api/solana-clawd/agentic/route.ts` | Agentic tool-augmented chat |
| `app/api/solana-clawd/mcp-tools/route.ts` | MCP server registry |
| `.env.example` | All environment variables |
| `docs/CLAWD_ROUTER.md` | Full API reference |

## xAI API Patterns

### Responses API (for research/agentic)

```
POST https://api.x.ai/v1/responses
Authorization: Bearer {XAI_API_KEY}
Content-Type: application/json
```

### Tool config shapes

**Web Search:**

```json
{
  "type": "web_search",
  "allowed_domains": [],
  "enable_image_understanding": true
}
```

**X Search:**

```json
{
  "type": "x_search",
  "allowed_x_handles": [],
  "from_date": "2025-01-01",
  "enable_image_understanding": true
}
```

**Code Execution:**

```json
{ "type": "code_execution" }
```

**File Search (RAG):**

```json
{
  "type": "file_search",
  "vector_store_ids": ["collection_id"],
  "max_num_results": 10
}
```

**Remote MCP:**

```json
{
  "type": "mcp",
  "server_url": "https://...",
  "server_label": "...",
  "allowed_tools": [],
  "authorization": "Bearer ..."
}
```

### Multi-agent reasoning effort

```json
{ "reasoning": { "effort": "low|medium|high|xhigh" } }
```

- `low` / `medium` → 4 agents
- `high` / `xhigh` → 16 agents

## TypeScript Notes

- Always use `Record<string, unknown>` for xAI request bodies (flexible, avoids strict
  schema errors)
- For `Buffer` in `Blob`, convert: `new Blob([new Uint8Array(buffer)])`
- Mark file-handling routes with `export const runtime = "nodejs"`
- Mark streaming routes with `export const dynamic = "force-dynamic"`

---

## Agent Minting (EIP-8004)

The ClawdRouter terminal also exposes tRPC endpoints for minting AI agents on Solana
via the Metaplex protocol. These are accessible at `/api/trpc/agents.*`.

### Key Minting Endpoints

| Endpoint | Auth | Description |
| --- | --- | --- |
| `agents.metaplex.mintAgent` | **Public** | Mint agent as NFT (no auth required) |
| `agents.metaplex.readAgent` | Public | Read agent metadata by asset address |
| `agents.metaplex.sendMessage` | Public | Send message to agent via A2A |
| `agents.metaplex.recentAgents` | Public | List recently minted agents |
| `agents.metaplex.registerIdentity` | Protected | Register in EIP-8004 registry |

### Minting an Agent

The `mintAgent` endpoint is **public** — anyone can call it without authentication.
The server signs the mint transaction using the `METAPLEX_PAYER_SECRET_KEY`.

```typescript
// Example: Mint an agent via tRPC client
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

### Agent Card Format (ERC-8004)

Agents are minted as NFTs with metadata following EIP-8004:

```json
{
  "type": "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
  "name": "Agent Name",
  "description": "What the agent does",
  "image": "https://...",
  "services": [
    { "name": "hosted-chat", "endpoint": "https://..." }
  ],
  "supportedTrust": ["wallet-verified", "crypto-economic"],
  "x402Support": true,
  "active": true
}
```

### Server Environment

```bash
METAPLEX_PAYER_SECRET_KEY=base58_encoded_key  # Required for minting
METAPLEX_NETWORK=solana-mainnet              # Default network
METAPLEX_API_BASE_URL=https://api.metaplex.com
```

For full API documentation, see [CLAWD_ROUTER.md](./CLAWD_ROUTER.md).
