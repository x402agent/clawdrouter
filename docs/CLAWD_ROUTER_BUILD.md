# ClawdRouter — Complete Source Files

This document contains every source file needed to rebuild ClawdRouter from
scratch or adapt it for your own token-gated AI proxy.

> Companion to [CLAWD_ROUTER.md](./CLAWD_ROUTER.md) (API reference) and
> [clawdrouter-agent-guide.md](./clawdrouter-agent-guide.md) (agent contract).

## Project Layout

```
web/
├── app/
│   └── api/
│       └── solana-clawd/
│           ├── chat/route.ts
│           ├── image/route.ts
│           ├── video/route.ts
│           ├── tts/route.ts
│           ├── stt/route.ts
│           ├── voice-token/route.ts
│           ├── voices/route.ts
│           ├── research/route.ts
│           ├── agentic/route.ts
│           └── mcp-tools/route.ts
├── lib/
│   ├── solana-clawd.ts
│   └── solana-clawd-server.ts
├── docs/
│   ├── CLAWD_ROUTER.md
│   ├── AGENT.md
│   └── BUILD.md   ← you are here
└── .env.example
```

---

## lib/solana-clawd.ts

Shared client/server types and utilities.

```typescript
export type SolanaClawdMode = "chat" | "route" | "research";

export interface SolanaClawdModelPreset {
  id: string;
  name: string;
  provider: "openrouter" | "xai" | "zai";
  description: string;
  recommended?: boolean;
}

export const CLAWD_SPL_TOKEN = {
  symbol: "CLAWD",
  chain: "Solana",
  standard: "SPL",
  mint: "8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump",
} as const;

export const DEFAULT_SOLANA_CLAWD_MODEL = "minimax/minimax-m2.7";

export const SOLANA_CLAWD_MODEL_PRESETS: SolanaClawdModelPreset[] = [
  {
    id: "minimax/minimax-m2.7",
    name: "MiniMax M2.7",
    provider: "openrouter",
    description: "Wide context and strong routing default for the app surface.",
    recommended: true,
  },
  {
    id: "openai/gpt-5.4-nano",
    name: "GPT-5.4 Nano",
    provider: "openrouter",
    description: "Fast, economical reasoning lane for lightweight operator tasks.",
  },
  {
    id: "anthropic/claude-sonnet-4.5",
    name: "Claude Sonnet",
    provider: "openrouter",
    description: "Balanced coding and planning lane through OpenRouter.",
  },
  {
    id: "grok-4.20-multi-agent",
    name: "Grok Multi-Agent",
    provider: "xai",
    description: "Research swarm mode for multi-agent Solana scans.",
  },
  {
    id: "glm-z-ai-5.1",
    name: "GLM-5.1",
    provider: "zai",
    description: "200K context, thinking mode, function calling. Best for coding and agents.",
    recommended: true,
  },
];

export const SOLANA_CLAWD_MODE_LABELS: Record<SolanaClawdMode, string> = {
  chat: "Direct chat",
  route: "Model router",
  research: "Research swarm",
};

export function isLikelySolanaAddress(value: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value.trim());
}

export function normalizeWalletAddress(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function buildSolanaClawdSystemPrompt(opts: {
  mode: SolanaClawdMode;
  walletAddress?: string;
  holderStatus?: "holder" | "guest";
}): string {
  const walletLine = opts.walletAddress
    ? `Wallet context: ${opts.walletAddress}.`
    : "Wallet context: anonymous session.";
  const holderLine =
    opts.holderStatus === "holder"
      ? "Access tier: verified $CLAWD holder."
      : "Access tier: guest or x402 pay-per-request.";

  return [
    "You are Solana Clawd, the routing layer for the $CLAWD agent stack.",
    "Operate like a Solana-native agent operator: direct, technical, concise, and onchain-aware.",
    "Use the user's selected model lane and keep answers action-oriented.",
    "When discussing execution, align recommendations with Solana wallets, SPL tokens, agent workflows, and x402 access rails.",
    `Mode: ${opts.mode}.`,
    walletLine,
    holderLine,
    "Never expose secrets or claim verified payment settlement unless the server says it is verified.",
  ].join(" ");
}
```

---

## lib/solana-clawd-server.ts

Server-only utilities. **Never import from client code.**

```typescript
import "server-only";

import {
  CLAWD_SPL_TOKEN,
  DEFAULT_SOLANA_CLAWD_MODEL,
  SOLANA_CLAWD_MODEL_PRESETS,
  isLikelySolanaAddress,
} from "@/lib/solana-clawd";

const SOLANA_TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const TOKEN_2022_PROGRAM = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
const BASE_USDC_ASSET = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

export interface HolderStatus {
  walletAddress?: string;
  checked: boolean;
  isHolder: boolean;
  tokenBalance: number;
  minimumTokens: number;
  source:
    | "helius-rpc"
    | "invalid_wallet"
    | "missing_rpc"
    | "not_provided"
    | "error";
  error?: string;
}

export interface SolanaClawdPaymentRequirement {
  scheme: "exact";
  network: "base";
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: string;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;
  extra: {
    name: string;
    version: string;
  };
}

export function getOpenRouterApiKey(): string {
  return process.env.OPENROUTER_API_KEY?.trim() ?? "";
}

export function getXaiApiKey(): string {
  return process.env.XAI_API_KEY?.trim() ?? "";
}

export function getZaiApiKey(): string {
  return process.env.ZAI_API_KEY?.trim() ?? "";
}

export function getSolanaClawdModelCatalog() {
  return SOLANA_CLAWD_MODEL_PRESETS.filter((entry) => entry.provider === "openrouter");
}

export function resolveRequestedModel(model: unknown): string {
  if (typeof model === "string" && model.trim()) {
    return model.trim();
  }
  return DEFAULT_SOLANA_CLAWD_MODEL;
}

function getMinHolderTokens(): number {
  const raw = Number(process.env.SOLANA_CLAWD_MIN_HOLDER_TOKENS ?? "1");
  return Number.isFinite(raw) && raw > 0 ? raw : 1;
}

function getHeliusRpcUrl(): string | null {
  const direct = process.env.HELIUS_RPC_URL?.trim();
  if (direct) return direct;
  const apiKey = process.env.HELIUS_API_KEY?.trim();
  if (!apiKey) return null;
  return `https://mainnet.helius-rpc.com/?api-key=${apiKey}`;
}

async function fetchTokenBalanceForProgram(
  rpcUrl: string,
  walletAddress: string,
  programId: string,
): Promise<number> {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: `clawd-${Date.now()}`,
      method: "getTokenAccountsByOwner",
      params: [
        walletAddress,
        { programId },
        { encoding: "jsonParsed", commitment: "confirmed" },
      ],
    }),
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`RPC returned ${response.status}`);

  const payload = (await response.json()) as {
    error?: { message?: string };
    result?: {
      value?: Array<{
        account?: {
          data?: {
            parsed?: {
              info?: {
                mint?: string;
                tokenAmount?: {
                  uiAmount?: number;
                  amount?: string;
                  decimals?: number;
                };
              };
            };
          };
        };
      }>;
    };
  };

  if (payload.error) throw new Error(payload.error.message ?? "Unknown RPC error");

  return (payload.result?.value ?? []).reduce((sum, entry) => {
    const info = entry.account?.data?.parsed?.info;
    if (info?.mint !== CLAWD_SPL_TOKEN.mint) return sum;
    const uiAmount = info.tokenAmount?.uiAmount;
    if (typeof uiAmount === "number") return sum + uiAmount;
    const rawAmount = info.tokenAmount?.amount;
    const decimals = info.tokenAmount?.decimals ?? 0;
    if (!rawAmount) return sum;
    return sum + Number(rawAmount) / 10 ** decimals;
  }, 0);
}

export async function getClawdHolderStatus(walletAddress: string): Promise<HolderStatus> {
  const normalized = walletAddress.trim();
  const minimumTokens = getMinHolderTokens();

  if (!normalized) {
    return {
      checked: false,
      isHolder: false,
      tokenBalance: 0,
      minimumTokens,
      source: "not_provided",
    };
  }

  if (!isLikelySolanaAddress(normalized)) {
    return {
      walletAddress: normalized,
      checked: true,
      isHolder: false,
      tokenBalance: 0,
      minimumTokens,
      source: "invalid_wallet",
      error: "Wallet address does not look like a valid Solana public key.",
    };
  }

  const rpcUrl = getHeliusRpcUrl();
  if (!rpcUrl) {
    return {
      walletAddress: normalized,
      checked: true,
      isHolder: false,
      tokenBalance: 0,
      minimumTokens,
      source: "missing_rpc",
      error: "HELIUS_RPC_URL or HELIUS_API_KEY is required for holder checks.",
    };
  }

  try {
    const [legacyBalance, token2022Balance] = await Promise.all([
      fetchTokenBalanceForProgram(rpcUrl, normalized, SOLANA_TOKEN_PROGRAM),
      fetchTokenBalanceForProgram(rpcUrl, normalized, TOKEN_2022_PROGRAM).catch(() => 0),
    ]);
    const tokenBalance = legacyBalance + token2022Balance;

    return {
      walletAddress: normalized,
      checked: true,
      isHolder: tokenBalance >= minimumTokens,
      tokenBalance,
      minimumTokens,
      source: "helius-rpc",
    };
  } catch (error) {
    return {
      walletAddress: normalized,
      checked: true,
      isHolder: false,
      tokenBalance: 0,
      minimumTokens,
      source: "error",
      error: error instanceof Error ? error.message : "Unknown holder-check error.",
    };
  }
}

export function isX402Enabled(): boolean {
  return Boolean(process.env.SOLANA_CLAWD_X402_PAYTO?.trim());
}

export function getX402PaymentRequirement(resource: string): SolanaClawdPaymentRequirement | null {
  const payTo = process.env.SOLANA_CLAWD_X402_PAYTO?.trim();
  if (!payTo) return null;

  return {
    scheme: "exact",
    network: "base",
    maxAmountRequired: process.env.SOLANA_CLAWD_X402_PRICE ?? "25000",
    resource,
    description:
      process.env.SOLANA_CLAWD_X402_DESCRIPTION ??
      "Solana Clawd routed model request",
    mimeType: "application/json",
    payTo,
    maxTimeoutSeconds: Number(process.env.SOLANA_CLAWD_X402_TIMEOUT_SECONDS ?? "120"),
    asset: BASE_USDC_ASSET,
    extra: { name: "USD Coin", version: "2" },
  };
}

export function hasX402PaymentHeader(request: Request): boolean {
  return Boolean(request.headers.get("x-payment")?.trim());
}
```

---

## app/api/solana-clawd/chat/route.ts

Multi-provider chat proxy: OpenRouter (default), xAI multi-agent (research mode),
Z.AI GLM-5.1.

```typescript
import { NextRequest, NextResponse } from "next/server";

import {
  CLAWD_SPL_TOKEN,
  buildSolanaClawdSystemPrompt,
  normalizeWalletAddress,
  type SolanaClawdMode,
} from "@/lib/solana-clawd";
import {
  getClawdHolderStatus,
  getOpenRouterApiKey,
  getX402PaymentRequirement,
  getXaiApiKey,
  getZaiApiKey,
  hasX402PaymentHeader,
  isX402Enabled,
  resolveRequestedModel,
} from "@/lib/solana-clawd-server";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const XAI_RESPONSES_URL = "https://api.x.ai/v1/responses";
const ZAI_API_URL = "https://api.z.ai/api/paas/v4/chat/completions";

type ChatRole = "system" | "user" | "assistant" | "tool";

interface ChatMessage {
  role: ChatRole;
  content: unknown;
}

function isChatMessage(value: unknown): value is ChatMessage {
  return Boolean(
    value &&
      typeof value === "object" &&
      "role" in value &&
      "content" in value &&
      typeof (value as { role?: unknown }).role === "string",
  );
}

function withSystemPrompt(messages: ChatMessage[], systemPrompt: string): ChatMessage[] {
  const cloned = [...messages];
  if (cloned[0]?.role === "system" && typeof cloned[0].content === "string") {
    cloned[0] = { ...cloned[0], content: `${systemPrompt}\n\n${cloned[0].content}` };
    return cloned;
  }
  return [{ role: "system", content: systemPrompt }, ...cloned];
}

function messageContentToString(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((entry) => {
        if (typeof entry === "string") return entry;
        if (entry && typeof entry === "object" && "text" in entry) {
          return (entry as { text: string }).text;
        }
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

function buildPaymentRequiredResponse(
  request: NextRequest,
  holder: Awaited<ReturnType<typeof getClawdHolderStatus>>,
) {
  const requirement = getX402PaymentRequirement(request.nextUrl.pathname);
  const headers = new Headers();
  if (requirement) headers.set("x-payment-required", JSON.stringify(requirement));
  return NextResponse.json(
    {
      error: "Payment Required",
      message:
        "This Solana Clawd route is gated. Hold the $CLAWD SPL token or retry with a valid x402 payment.",
      token: CLAWD_SPL_TOKEN,
      holder,
      x402: { enabled: isX402Enabled(), paymentRequirement: requirement },
    },
    { status: 402, headers },
  );
}

// ── upstream proxies omitted for brevity — see full implementation in the repo ──

export async function POST(request: NextRequest) {
  // See docs/CLAWD_ROUTER.md for the full request/response contract.
  // The handler should:
  //   1. Parse body, normalize walletAddress, fetch holder status
  //   2. If x402 enabled and not holder and no payment header → 402
  //   3. Route by `mode` + `model`: research → xAI, glm-z-ai-5.1 → Z.AI, else OpenRouter
  //   4. Inject system prompt via buildSolanaClawdSystemPrompt
  //   5. Stream passthrough when stream=true; otherwise wrap with `clawd` metadata
  return NextResponse.json({ error: "Not implemented in excerpt" }, { status: 501 });
}
```

---

## app/api/solana-clawd/image/route.ts

Image generation via xAI Grok Imagine.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { CLAWD_SPL_TOKEN, normalizeWalletAddress } from "@/lib/solana-clawd";
import {
  getClawdHolderStatus,
  getX402PaymentRequirement,
  getXaiApiKey,
  hasX402PaymentHeader,
  isX402Enabled,
} from "@/lib/solana-clawd-server";

const XAI_IMAGE_URL = "https://api.x.ai/v1/images/generations";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const walletAddress = normalizeWalletAddress(body?.walletAddress);
    const holder = await getClawdHolderStatus(walletAddress);
    const paymentHeaderPresent = hasX402PaymentHeader(request);

    if (isX402Enabled() && !holder.isHolder && !paymentHeaderPresent) {
      const requirement = getX402PaymentRequirement(request.nextUrl.pathname);
      const headers = new Headers();
      if (requirement) headers.set("x-payment-required", JSON.stringify(requirement));
      return NextResponse.json(
        {
          error: "Payment Required",
          message:
            "This Solana Clawd route is gated. Hold the $CLAWD SPL token or retry with a valid x402 payment.",
          token: CLAWD_SPL_TOKEN,
          holder,
          x402: { enabled: isX402Enabled(), paymentRequirement: requirement },
        },
        { status: 402, headers },
      );
    }

    const apiKey = getXaiApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: "XAI_API_KEY not configured for image generation." },
        { status: 500 },
      );
    }

    const { walletAddress: _walletAddress, ...imageParams } = body as Record<string, unknown>;
    const prompt = typeof imageParams.prompt === "string" ? imageParams.prompt : null;
    if (!prompt) return NextResponse.json({ error: "prompt is required" }, { status: 400 });

    const model = (imageParams.model as string) || "grok-imagine-image";
    const n = Number(imageParams.n) || 1;
    const aspect_ratio = (imageParams.aspect_ratio as string) || "1:1";
    const resolution = (imageParams.resolution as string) || "1k";

    const response = await fetch(XAI_IMAGE_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt, n: Math.min(n, 10), aspect_ratio, resolution }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `xAI image error: ${response.status}`, detail: await response.text() },
        { status: response.status },
      );
    }
    const data = await response.json();
    return NextResponse.json({
      ...data,
      clawd: {
        agent: "solana-clawd",
        provider: "xai",
        model,
        token: CLAWD_SPL_TOKEN,
        access: { holder, paymentHeaderPresent },
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
```

---

## app/api/solana-clawd/video/route.ts

Video generation via xAI Grok Imagine Video. Async polling up to 10 minutes.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { CLAWD_SPL_TOKEN, normalizeWalletAddress } from "@/lib/solana-clawd";
import {
  getClawdHolderStatus,
  getX402PaymentRequirement,
  getXaiApiKey,
  hasX402PaymentHeader,
  isX402Enabled,
} from "@/lib/solana-clawd-server";

const XAI_VIDEO_GEN_URL = "https://api.x.ai/v1/videos/generations";
const XAI_VIDEO_STATUS_URL = "https://api.x.ai/v1/videos";

const DEFAULT_POLL_INTERVAL_MS = 5000;
const DEFAULT_POLL_TIMEOUT_MS = 10 * 60 * 1000;

type VideoStatus = "pending" | "done" | "expired" | "failed";

async function pollVideoStatus(
  requestId: string,
  apiKey: string,
): Promise<Record<string, unknown>> {
  const startTime = Date.now();
  while (Date.now() - startTime < DEFAULT_POLL_TIMEOUT_MS) {
    const response = await fetch(`${XAI_VIDEO_STATUS_URL}/${requestId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!response.ok) throw new Error(`xAI video status error: ${response.status}`);
    const data = (await response.json()) as {
      status: VideoStatus;
      video?: { url: string; duration: number };
      model?: string;
    };
    if (data.status === "done" && data.video) {
      return {
        status: "done",
        url: data.video.url,
        duration: data.video.duration,
        model: data.model,
      };
    }
    if (data.status === "expired") throw new Error("Video generation request expired.");
    if (data.status === "failed") throw new Error("Video generation failed.");
    await new Promise((resolve) => setTimeout(resolve, DEFAULT_POLL_INTERVAL_MS));
  }
  throw new Error("Video generation timed out.");
}

// See docs/CLAWD_ROUTER.md for the full POST handler. The shape mirrors
// /image/route.ts: 402 gate → POST /videos/generations → poll → return url.
```

---

## app/api/solana-clawd/tts/route.ts

Text-to-Speech. Returns base64 audio. Voices: eve, ara, rex, sal, leo.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { CLAWD_SPL_TOKEN, normalizeWalletAddress } from "@/lib/solana-clawd";
import {
  getClawdHolderStatus,
  getX402PaymentRequirement,
  getXaiApiKey,
  hasX402PaymentHeader,
  isX402Enabled,
} from "@/lib/solana-clawd-server";

const XAI_TTS_URL = "https://api.x.ai/v1/tts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const walletAddress = normalizeWalletAddress(body?.walletAddress);
  const holder = await getClawdHolderStatus(walletAddress);
  const paymentHeaderPresent = hasX402PaymentHeader(request);

  if (isX402Enabled() && !holder.isHolder && !paymentHeaderPresent) {
    const requirement = getX402PaymentRequirement(request.nextUrl.pathname);
    const headers = new Headers();
    if (requirement) headers.set("x-payment-required", JSON.stringify(requirement));
    return NextResponse.json(
      {
        error: "Payment Required",
        token: CLAWD_SPL_TOKEN,
        holder,
        x402: { enabled: isX402Enabled(), paymentRequirement: requirement },
      },
      { status: 402, headers },
    );
  }

  const apiKey = getXaiApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: "XAI_API_KEY not configured for TTS." }, { status: 500 });
  }

  const text = typeof body?.text === "string" ? body.text : null;
  if (!text || !text.trim()) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const voice_id = (body?.voice_id as string) || "eve";
  const language = (body?.language as string) || "en";
  const codec = (body?.codec as string) || "mp3";
  const sample_rate = Number(body?.sample_rate) || 24000;
  const bit_rate = Number(body?.bit_rate) || 128000;
  const output_format =
    codec === "mp3" ? { codec, sample_rate, bit_rate } : { codec, sample_rate };

  const response = await fetch(XAI_TTS_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ text: text.slice(0, 15000), voice_id, language, output_format }),
  });
  if (!response.ok) {
    return NextResponse.json(
      { error: `xAI TTS error: ${response.status}`, detail: await response.text() },
      { status: response.status },
    );
  }

  const audioBuffer = Buffer.from(await response.arrayBuffer());
  return NextResponse.json({
    audio: audioBuffer.toString("base64"),
    format: output_format,
    voice_id,
    language,
    size_bytes: audioBuffer.length,
    clawd: {
      agent: "solana-clawd",
      provider: "xai",
      model: "grok-tts",
      token: CLAWD_SPL_TOKEN,
      access: { holder, paymentHeaderPresent },
    },
  });
}
```

---

## app/api/solana-clawd/stt/route.ts

Speech-to-Text. Accepts multipart file upload or remote URL.

```typescript
// Key points:
// - export const runtime = "nodejs";
// - export const dynamic = "force-dynamic";
// - Reads walletAddress from the query string (not the body) so multipart uploads work
// - Supports JSON { url } OR multipart { file, url }
// - Passes language/format/diarize/multichannel as query params to xAI
// - Converts Buffer → Blob via: new Blob([new Uint8Array(buffer)], { type: "audio/mpeg" })
```

---

## app/api/solana-clawd/voice-token/route.ts

Ephemeral token for Voice Agent WebSocket. Keeps XAI_API_KEY server-side.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { CLAWD_SPL_TOKEN, normalizeWalletAddress } from "@/lib/solana-clawd";
import {
  getClawdHolderStatus,
  getXaiApiKey,
  hasX402PaymentHeader,
  isX402Enabled,
} from "@/lib/solana-clawd-server";

const XAI_CLIENT_SECRETS_URL = "https://api.x.ai/v1/realtime/client_secrets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const walletAddress = normalizeWalletAddress(body?.walletAddress ?? "");
  const holder = await getClawdHolderStatus(walletAddress);
  const paymentHeaderPresent = hasX402PaymentHeader(request);

  if (isX402Enabled() && !holder.isHolder && !paymentHeaderPresent) {
    return NextResponse.json({ error: "Payment Required" }, { status: 402 });
  }

  const apiKey = getXaiApiKey();
  if (!apiKey) return NextResponse.json({ error: "XAI_API_KEY not configured." }, { status: 500 });

  const expiresSeconds = Math.min(Math.max(Number(body?.expires_seconds) || 300, 60), 3600);

  const response = await fetch(XAI_CLIENT_SECRETS_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ expires_after: { seconds: expiresSeconds } }),
  });
  if (!response.ok) {
    return NextResponse.json(
      { error: `xAI ephemeral token error: ${response.status}`, detail: await response.text() },
      { status: response.status },
    );
  }

  const data = await response.json();
  return NextResponse.json({
    ...data,
    clawd: {
      agent: "solana-clawd",
      provider: "xai",
      token: CLAWD_SPL_TOKEN,
      access: { holder, paymentHeaderPresent },
    },
  });
}
```

---

## app/api/solana-clawd/voices/route.ts

List TTS voices. Falls back to a local manifest if `XAI_API_KEY` is not
configured. See the implementation in the repo — the shape is:

```typescript
export async function GET() {
  const apiKey = getXaiApiKey();
  if (!apiKey) {
    return NextResponse.json({ voices: LOCAL_VOICE_MANIFEST });
  }
  const response = await fetch("https://api.x.ai/v1/tts/voices", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!response.ok) return NextResponse.json({ voices: LOCAL_VOICE_MANIFEST });
  return NextResponse.json(await response.json());
}
```

---

## app/api/solana-clawd/research/route.ts

Multi-agent research via xAI Responses API. Maps `agentCount` → `reasoning.effort`:
4 → `low`/`medium`, 16 → `high`/`xhigh`. Enables `web_search`, `x_search`,
`code_execution` by default. Accepts `mcpTools` and `collectionIds` (RAG).

---

## app/api/solana-clawd/agentic/route.ts

Single-agent tool-augmented chat via xAI Responses API. Full control surface:
`enabledTools`, `allowedDomains`, `excludedDomains`, `allowedXHandles`,
`xSearchFromDate`, `xSearchToDate`, `enableImageUnderstanding`,
`enableVideoUnderstanding`, `collectionIds`, `maxFileResults`, `mcpTools`,
`previousResponseId`, `store`, `reasoningContent`.

---

## app/api/solana-clawd/mcp-tools/route.ts

MCP server registry. `GET` lists known servers; `POST { action: "validate" }`
probes a URL; `POST { action: "register", walletAddress, ... }` registers a
holder-defined MCP server.

---

## .env.example

```bash
# Required
XAI_API_KEY=
OPENROUTER_API_KEY=
ZAI_API_KEY=

# Holder check
HELIUS_API_KEY=
HELIUS_RPC_URL=
SOLANA_CLAWD_MIN_HOLDER_TOKENS=1

# x402
SOLANA_CLAWD_X402_PAYTO=
SOLANA_CLAWD_X402_PRICE=25000
SOLANA_CLAWD_X402_DESCRIPTION=Solana Clawd routed model request
SOLANA_CLAWD_X402_TIMEOUT_SECONDS=120

# Models
XAI_MODEL=grok-4.20-reasoning
XAI_MULTI_AGENT_MODEL=grok-4.20-multi-agent
XAI_IMAGE_MODEL=grok-imagine-image
XAI_VIDEO_MODEL=grok-imagine-video
XAI_VOICE_ID=eve
XAI_RESEARCH_TOOLS=web_search,x_search,code_execution
XAI_DEFAULT_AGENT_COUNT=4
MCP_DEFAULT_SERVERS=https://mcp.deepwiki.com/mcp
```

> **Note:** The source for some routes was truncated in the original guide
> submission (`voices`, `research`, `agentic`, `mcp-tools`). The public API
> contract for each is fully documented in [CLAWD_ROUTER.md](./CLAWD_ROUTER.md);
> implement the handlers using the same 402-gating pattern shown above.
