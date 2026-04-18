# Solana Clawd Router — API Reference

A unified edge proxy for the Solana Clawd ecosystem. Routes AI requests through
$CLAWD token gating or x402 payments, using your own `XAI_API_KEY` to power
everything from chat to image generation to multi-agent research.

## Table of Contents

- [Quick Start](#quick-start)
- [Authentication](#authentication)
- [Endpoints](#endpoints)
  - [Chat](#1-post-apisolana-clawdchat)
  - [Image Generation](#2-post-apisolana-clawdimage)
  - [Video Generation](#3-post-apisolana-clawdvideo)
  - [Text-to-Speech](#4-post-apisolana-clawdtts)
  - [Speech-to-Text](#5-post-apisolana-clawdstt)
  - [Voice Token (Ephemeral)](#6-post-apisolana-clawdvoice-token)
  - [List Voices](#7-get-apisolana-clawdvoices)
  - [Research (Multi-Agent)](#8-post-apisolana-clawdresearch)
  - [Agentic (Tool-Augmented)](#9-post-apisolana-clawdagentic)
  - [MCP Tools Registry](#10-getpost-apisolana-clawdmcp-tools)
- [Access Control](#access-control)
- [Error Responses](#error-responses)
- [Environment Variables](#environment-variables)
- [Specialist Agents](#specialist-agents)

---

## Specialist Agents

The router ships with a registry of **43 specialist DeFi/CLAWD personas** whitelisted from `agents/src/*.json`. They surface in three places:

| Surface | Description |
| --- | --- |
| [`/clawdrouter`](../client/src/pages/ClawdRouter.tsx) page | Public UI with a searchable/filterable picker, detail view, and copy-to-clipboard model id |
| `GET /api/clawdrouter/agents` | Lightweight JSON summaries for pickers — `{ identifier, title, description, category, avatar, tags, tokenUsage, modelId }` |
| `GET /api/clawdrouter/agents/:id` | Full record including `config.systemRole` and `meta.*` |

Invocation (any OpenAI-compatible client):

```bash
curl $API/v1/chat/completions \
  -H "Authorization: Bearer clawd_sk_..." \
  -d '{"model":"clawdrouter/agent/smart-contract-auditor","messages":[{"role":"user","content":"Audit this Anchor handler: ..."}]}'
```

Backed by [server/_core/clawdrouterAgents.ts](../server/_core/clawdrouterAgents.ts) (whitelist, path-traversal guarded fs loader, mtime cache) and [client/src/lib/clawdrouter-agents.ts](../client/src/lib/clawdrouter-agents.ts) (browser types, `isAgentModel`, `extractAgentId`, `buildAgentModelId`, fetch helpers). Ported from `ClawdRouter-main/clawdrouter/src/agents/registry.ts`.

---

## Quick Start

All endpoints accept `POST` (or `GET`) requests to `/api/solana-clawd/<route>`.
All body parameters are JSON unless noted. Pass `walletAddress` (Solana pubkey)
to check $CLAWD holder status.

```bash
# Set your API key
export XAI_API_KEY="xai-..."

# Basic chat
curl -X POST https://your-domain.com/api/solana-clawd/chat \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "7GhK...",
    "messages": [{"role": "user", "content": "What is Solana?"}],
    "stream": false
  }'

# Image generation
curl -X POST https://your-domain.com/api/solana-clawd/image \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "7GhK...",
    "prompt": "A solana dolphin surfing on a blockchain wave",
    "model": "grok-imagine-image",
    "aspect_ratio": "1:1"
  }'

# 16-agent research
curl -X POST https://your-domain.com/api/solana-clawd/research \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "7GhK...",
    "messages": [{"role": "user", "content": "Analyze the Solana ecosystem in 2025"}],
    "agentCount": 16,
    "stream": false
  }'

# TTS with a specific voice
curl -X POST https://your-domain.com/api/solana-clawd/tts \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "7GhK...",
    "text": "Welcome to the future of decentralized AI.",
    "voice_id": "rex",
    "language": "en"
  }'
```

---

## Authentication

All endpoints check `$CLAWD` holder status via `walletAddress`. When `x402` is
enabled server-side, non-holders receive a `402 Payment Required` response with
an `x-payment-required` header.

| Check | Header | Notes |
| --- | --- | --- |
| `$CLAWD` holder | `walletAddress` (body) | Fastest — Helius DAS API lookup |
| x402 payment | `pay` request header | Falls back if not a holder |

---

## Endpoints

### 1. `POST /api/solana-clawd/chat`

Standard chat completions via OpenRouter proxy with Grok routing.

**Body params:**

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `walletAddress` | `string` | — | Solana wallet pubkey |
| `messages` | `ChatMessage[]` | — | Array of `{role, content}` |
| `model` | `string` | `grok-4.20-reasoning` | Model name |
| `stream` | `boolean` | `false` | SSE streaming |
| `mode` | `"chat" \| "research" \| "route"` | `"chat"` | Clawd mode |
| Other | — | — | Passed through to OpenRouter |

**Response:** Standard OpenRouter chat completion response + `clawd` metadata block.

```json
{
  "choices": [],
  "clawd": {
    "agent": "solana-clawd",
    "provider": "openrouter",
    "model": "...",
    "token": "CLAWD_TOKEN_ADDRESS",
    "access": { "holder": {}, "paymentHeaderPresent": false }
  }
}
```

---

### 2. `POST /api/solana-clawd/image`

Image generation via xAI Grok Imagine.

**Body params:**

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `walletAddress` | `string` | — | Solana wallet pubkey |
| `prompt` | `string` | — | Image description |
| `model` | `string` | `grok-imagine-image` | Image model |
| `n` | `number` | `1` | Number of images (max 10) |
| `aspect_ratio` | `string` | `1:1` | `1:1`, `16:9`, `9:16`, `4:3`, `3:4` |
| `resolution` | `string` | `1k` | `1k`, `2k` |

**Response:** xAI image generation response + `clawd` metadata.

---

### 3. `POST /api/solana-clawd/video`

Video generation via xAI Grok Imagine Video. Uses async polling (up to 10 min).

**Body params:**

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `walletAddress` | `string` | — | Solana wallet pubkey |
| `prompt` | `string` | — | Video description |
| `model` | `string` | `grok-imagine-video` | Video model |
| `duration` | `number` | `5` | Seconds (1–15) |
| `aspect_ratio` | `string` | `16:9` | `16:9`, `9:16`, `1:1` |
| `resolution` | `string` | `480p` | `480p`, `720p`, `1080p` |
| `image_url` | `string` | — | Optional image-to-video seed |
| `poll` | `boolean` | `true` | `false` returns `request_id` immediately |

**Response (poll=true):** Video URL + `clawd` metadata.
**Response (poll=false):** `{ request_id, status: "pending" }` for client-side polling.

---

### 4. `POST /api/solana-clawd/tts`

Text-to-Speech generation via xAI Grok TTS.

**Body params:**

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `walletAddress` | `string` | — | Solana wallet pubkey |
| `text` | `string` | — | Text to synthesize (max 15,000 chars) |
| `voice_id` | `string` | `eve` | Voice name |
| `language` | `string` | `en` | BCP-47 language code or `auto` |
| `codec` | `string` | `mp3` | `mp3`, `wav`, `pcm`, `mulaw`, `alaw` |
| `sample_rate` | `number` | `24000` | Sample rate in Hz |
| `bit_rate` | `number` | `128000` | Bit rate (MP3 only) |

**Voices:**

| ID | Name | Type | Tone |
| --- | --- | --- | --- |
| `eve` | Eve | Female | Energetic, upbeat |
| `ara` | Ara | Female | Warm, friendly |
| `rex` | Rex | Male | Confident, clear |
| `sal` | Sal | Neutral | Smooth, balanced |
| `leo` | Leo | Male | Authoritative, strong |

**Speech tags:** `[laugh]`, `[pause]`, `<whisper>`, `<sing-song>`, `<emphasis>`, and more.

**Response:** `{ audio: "<base64>", format, voice_id, language, size_bytes, clawd }`

---

### 5. `POST /api/solana-clawd/stt`

Speech-to-Text transcription via xAI Grok STT.

**Input:** JSON body with `url` field, OR `multipart/form-data` with `file` field.

**Query params:**

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| `walletAddress` | `string` | — | Solana wallet pubkey (query param) |
| `language` | `string` | — | BCP-47 language code |
| `format` | `boolean` | `false` | Text normalization (numbers, currency) |
| `diarize` | `boolean` | `false` | Speaker diarization |
| `multichannel` | `boolean` | `false` | Per-channel transcription |

**Supported formats:** MP3, WAV, OGG, Opus, FLAC, AAC, MP4, M4A, MKV, raw PCM/mulaw/alaw.

**Response:** `{ text, language, duration, words[], clawd }`

---

### 6. `POST /api/solana-clawd/voice-token`

Generate ephemeral tokens for browser-based Voice Agent WebSocket connections.
Keeps `XAI_API_KEY` server-side.

**Body params:**

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `walletAddress` | `string` | — | Solana wallet pubkey |
| `expires_seconds` | `number` | `300` | Token TTL (60–3600 seconds) |

**Browser usage:**

```javascript
// Fetch ephemeral token from your backend
const { client_secret } = await fetch("/api/solana-clawd/voice-token", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ walletAddress: "7GhK..." }),
}).then((r) => r.json());

// Connect with token in WebSocket protocol
const ws = new WebSocket("wss://api.x.ai/v1/realtime", [
  `xai-client-secret.${client_secret.value}`,
]);
```

---

### 7. `GET /api/solana-clawd/voices`

List available TTS voices. Falls back to local manifest if `XAI_API_KEY` not configured.

**Response:** `{ voices: [{ voice_id, name, type, tone }, ...] }`

---

### 8. `POST /api/solana-clawd/research`

**16-agent multi-agent research** via `grok-4.20-multi-agent`. Orchestrates a
team of agents that search, analyze, and synthesize findings.

**Body params:**

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `walletAddress` | `string` | — | Solana wallet pubkey |
| `messages` | `ChatMessage[]` | — | Array of `{role, content}` |
| `agentCount` | `number` | `4` | Agents: 4 or 16 |
| `reasoningEffort` | `string` | auto | `"low"`, `"medium"`, `"high"`, `"xhigh"` |
| `stream` | `boolean` | `false` | SSE streaming |
| `tools` | `boolean` | `true` | Enable built-in tools |
| `mcpTools` | `MCPTool[]` | — | Remote MCP server configs |
| `collectionIds` | `string[]` | — | Collections for RAG |

**Agent count mapping:**

- `agentCount: 4` → `reasoning.effort: "low"` or `"medium"` (4 agents)
- `agentCount: 16` → `reasoning.effort: "high"` or `"xhigh"` (16 agents)

**Built-in tools:** `web_search`, `x_search`, `code_execution` (enabled by default).

**Response:** xAI multi-agent response + `clawd` metadata with `agentCount` and `reasoningEffort`.

---

### 9. `POST /api/solana-clawd/agentic`

Single-agent tool-augmented chat via Grok Responses API. Full control over which
tools are enabled.

**Body params:**

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `walletAddress` | `string` | — | Solana wallet pubkey |
| `messages` | `ChatMessage[]` | — | Array of `{role, content}` |
| `model` | `string` | `grok-4.20-reasoning` | Any Grok model |
| `mode` | `string` | `"agentic"` | System prompt mode |
| `stream` | `boolean` | `false` | SSE streaming |
| `enabledTools` | `string[]` | `["web_search", "x_search"]` | Tools to enable |
| `allowedDomains` | `string[]` | — | Restrict web search to domains |
| `excludedDomains` | `string[]` | — | Exclude domains from search |
| `allowedXHandles` | `string[]` | — | Filter X search to handles |
| `excludedXHandles` | `string[]` | — | Exclude X handles from search |
| `xSearchFromDate` | `string` | — | ISO8601 start date for X search |
| `xSearchToDate` | `string` | — | ISO8601 end date for X search |
| `enableImageUnderstanding` | `boolean` | `false` | Analyze images in search |
| `enableVideoUnderstanding` | `boolean` | `false` | Analyze videos in X search |
| `collectionIds` | `string[]` | — | Collections for RAG |
| `maxFileResults` | `number` | `10` | Max RAG results (max 50) |
| `mcpTools` | `MCPTool[]` | — | Remote MCP server configs |
| `previousResponseId` | `string` | — | Continue a conversation |
| `store` | `boolean` | `true` | Store conversation on xAI servers |
| `reasoningContent` | `string` | — | Encrypted reasoning content |

**MCPTool shape:**

```json
{
  "server_url": "https://mcp.example.com/mcp",
  "server_label": "my-tools",
  "server_description": "...",
  "allowed_tools": ["tool_a", "tool_b"],
  "authorization": "Bearer token",
  "headers": { "X-Custom": "value" }
}
```

---

### 10. `GET|POST /api/solana-clawd/mcp-tools`

MCP server registry for remote tool discovery and registration.

**GET — List available MCP servers:**

```bash
curl "https://your-domain.com/api/solana-clawd/mcp-tools?walletAddress=7GhK..."
```

**Response:**

```json
{
  "servers": [
    {
      "server_label": "deepwiki",
      "server_url": "https://mcp.deepwiki.com/mcp",
      "server_description": "DeepWiki — codebase and documentation search",
      "allowed_tools": ["search", "get_repo", "list_repos"],
      "auth_required": false,
      "category": "code"
    }
  ],
  "clawd": { "agent": "solana-clawd" }
}
```

**POST — Validate an MCP server:**

```json
POST /api/solana-clawd/mcp-tools
{ "action": "validate", "server_url": "https://..." }
```

**POST — Register a holder-defined MCP server:**

```json
POST /api/solana-clawd/mcp-tools
{
  "action": "register",
  "walletAddress": "7GhK...",
  "server_label": "my-db",
  "server_url": "https://db-mcp.internal/mcp",
  "server_description": "Internal database tools",
  "allowed_tools": ["query", "insert"],
  "authorization": "Bearer secret-token"
}
```

---

## Access Control

Every endpoint enforces the same pattern:

```
if (x402_enabled && !isHolder && !hasPaymentHeader) → 402
```

| Scenario | Result |
| --- | --- |
| Holder of `$CLAWD` | ✅ Access granted |
| Valid x402 payment header | ✅ Access granted |
| Neither | ❌ `402 Payment Required` |

The `x-payment-required` header on 402 responses tells x402-compatible clients how to pay.

---

## Error Responses

All endpoints return consistent error shapes:

```json
{
  "error": "Payment Required",
  "message": "Hold the $CLAWD SPL token or retry with a valid x402 payment.",
  "token": "CLAWD_TOKEN_ADDRESS",
  "holder": { "isHolder": false, "balance": 0 },
  "x402": { "enabled": true, "paymentRequirement": {} }
}
```

Standard HTTP status codes: `200` success, `400` bad request, `402` payment required,
`500` server error.

---

## Environment Variables

```bash
# Required
XAI_API_KEY="xai-..."

# Optional
XAI_MODEL=grok-4.20-reasoning    # Default chat model
XAI_MULTI_AGENT_MODEL=grok-4.20-multi-agent
XAI_IMAGE_MODEL=grok-imagine-image
XAI_VIDEO_MODEL=grok-imagine-video
XAI_VOICE_ID=eve
XAI_RESEARCH_TOOLS=web_search,x_search,code_execution
XAI_DEFAULT_AGENT_COUNT=4
MCP_DEFAULT_SERVERS=https://mcp.deepwiki.com/mcp

# x402 (optional — enables paid access)
X402_ENABLED=true
X402_PAYMENT_ADDRESS=...

# Solana (for holder lookup)
HELIUS_API_KEY=                  # helius.dev (free tier)
SOLANA_RPC_URL=https://api.mainnet-beta.rpc.expert

# Token gate
CLAWD_SPL_TOKEN=7n5oJ1wstyWui7i...
```

---

## Agent Minting API (tRPC)

The terminal includes tRPC endpoints for minting AI agents on Solana via the Metaplex protocol. The `agents.metaplex.mintAgent` endpoint is **public** (no authentication required).

### Endpoint: `agents.metaplex.mintAgent`

Mint a new AI agent as an NFT on Solana.

**Request:**

```json
POST /api/trpc/agents.metaplex.mintAgent
{
  "name": "DeFi Analyst",
  "uri": "https://ipfs.io/ipfs/bafybeig...",
  "description": "Autonomous DeFi research agent for Solana protocols",
  "services": [
    { "name": "hosted-chat", "endpoint": "https://agents.pinata.cloud/chat" },
    { "name": "A2A", "endpoint": "https://agents.pinata.cloud/a2a" }
  ],
  "network": "solana-mainnet"
}
```

**Parameters:**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | `string` | Yes | Agent name (1-32 chars) |
| `uri` | `string` | Yes | IPFS URI for agent metadata (ERC-8004 format) |
| `description` | `string` | Yes | Agent description (1-2000 chars) |
| `services` | `Service[]` | No | Service endpoints |
| `network` | `string` | No | Network: `solana-mainnet`, `solana-devnet`, `sonic-mainnet`, etc. |

**Response:**

```json
{
  "result": {
    "assetAddress": "7xKX...",
    "network": "solana-mainnet",
    "transactionSignature": "..."
  }
}
```

### Related Endpoints

| Endpoint | Auth | Description |
| --- | --- | --- |
| `agents.metaplex.config` | Public | Check if payer is configured |
| `agents.metaplex.readAgent` | Public | Read agent by asset address |
| `agents.metaplex.sendMessage` | Public | Send message to agent |
| `agents.metaplex.recentAgents` | Public | List recent agents |
| `agents.metaplex.browseRegistry` | Public | Search registry |
| `agents.metaplex.registerIdentity` | Protected | Register agent identity |
| `agents.metaplex.registerExecutive` | Protected | Register as executive |
| `agents.metaplex.delegateExecution` | Protected | Delegate execution authority |

### Minting Flow

```
1. Client → POST /api/trpc/agents.metaplex.mintAgent { name, uri, description }
2. Server validates METAPLEX_PAYER_SECRET_KEY is configured
3. Server calls Metaplex API to mint NFT
4. Server registers agent in EIP-8004 registry
5. Client receives { assetAddress, network, transactionSignature }
6. Agent is now discoverable via A2A protocol
```

### Server Requirements

For minting to work, the server needs:

```bash
METAPLEX_PAYER_SECRET_KEY=base58_encoded_key
METAPLEX_NETWORK=solana-mainnet
METAPLEX_API_BASE_URL=https://api.metaplex.com  # optional, uses default
```

---

See also: [clawdrouter-agent-guide.md](./clawdrouter-agent-guide.md) for the
agent integration contract, and [CLAWD_ROUTER_BUILD.md](./CLAWD_ROUTER_BUILD.md)
for complete source-file templates.
