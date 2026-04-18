# Grok Prompting for solana-clawd

This guide is the companion to [SOUL.md](../SOUL.md) and [SOUL_TEMPLATE.md](../SOUL_TEMPLATE.md).

Use it when you want Grok to behave like a disciplined `solana-clawd` operator instead of a generic chat model.

The guidance here is aligned with xAI's developer docs:

- xAI overview: https://docs.x.ai/docs/overview
- Grok tutorial: https://docs.x.ai/docs/tutorial
- Grok code prompt engineering: https://docs.x.ai/developers/advanced-api-usage/grok-code-prompt-engineering
- Prompt caching: https://docs.x.ai/developers/advanced-api-usage/prompt-caching
- Prompt caching best practices: https://docs.x.ai/developers/advanced-api-usage/prompt-caching/best-practices

---

## Core Rule

For Grok, split the prompt stack into three layers:

1. **Stable identity prefix**: `SOUL.md`
2. **Stable specialization prefix**: filled `SOUL_TEMPLATE.md`
3. **Live mission packet**: the current user task, context, and constraints

Keep layers `1` and `2` stable across turns whenever possible.

---

## Why This Works

xAI recommends:

- a detailed system prompt
- explicit goals and requirements
- clearly marked sections using Markdown or XML
- stable prompt prefixes for cache hits

That maps cleanly to the `SOUL.md` engine:

- `SOUL.md` provides the stable identity and operating principles
- `SOUL_TEMPLATE.md` provides the stable role specialization
- the user prompt carries fast-changing context

---

## Recommended Prompt Structure

### System Prompt

```md
[Paste SOUL.md here]

[Paste filled SOUL_TEMPLATE.md here]
```

### User Prompt

```md
# Task
`SPECIFIC_JOB_TO_DO`

# Context
- Objective: `WHAT GOOD LOOKS LIKE`
- Asset or wallet: `MINT / ADDRESS / PROTOCOL`
- Allowed actions: `ANALYSIS_ONLY | ASK_BEFORE_EXECUTION | EXECUTION_ALLOWED`
- Time horizon: `NOW | TODAY | SWING | LONGER`
- Constraints: `RISK LIMITS / VENUES / EXCLUSIONS`

# Required Sources
- Must use: `HELIUS / BIRDEYE / JUPITER / ON-CHAIN / USER DATA`
- Freshness requirement: `e.g. <= 60s`

# Output Requirements
- Format: `TABLE | MEMO | BULLETS | JSON`
- Depth: `SHORT | STANDARD | DEEP`
- Include: `RISKS | INVALIDATION | NEXT ACTION`
```

---

## Prompt Design Rules

### 1. Be explicit about the job

Bad:

```md
Look at this token.
```

Better:

```md
Assess whether this Solana token is tradable in the next 30 minutes.
Use KNOWN vs INFERRED separation.
Do not suggest execution unless liquidity, holder concentration, and dev-wallet behavior are acceptable.
Return: verdict, evidence, invalidation, next step.
```

### 2. Separate static from live context

Keep durable identity and behavior in `SOUL.md` plus the template.
Keep changing values like token mint, wallet, or timeframe in the user prompt.

### 3. Ask for source-aware answers

For `solana-clawd`, this matters more than tone.

Good instruction:

```md
Label any material claim as KNOWN, LEARNED, or INFERRED.
If the data is stale or absent, say so instead of filling the gap.
```

### 4. Tell Grok what not to do

Good instruction:

```md
Do not recommend a live trade, signature, or fund movement without explicit confirmation.
Do not present speculative wallet clustering as fact.
```

### 5. Give a response contract

Good instruction:

```md
Return:
1. Verdict
2. KNOWN
3. INFERRED
4. Risk
5. Next step
```

---

## Caching and API Notes

If you call Grok over the API:

- keep the system prompt stable
- append messages instead of rewriting earlier ones
- set `x-grok-conv-id` or `prompt_cache_key`

This follows xAI's prompt caching guidance and improves speed and cost when the same `SOUL.md` engine is reused across a conversation.

---

## Best Patterns for solana-clawd

### Pattern 1: Token Triage

```md
# Task
Decide whether this token is watchlist-only, small-risk tradable, or hard pass.

# Context
- Mint: `TOKEN_MINT`
- Venue: pump.fun
- Allowed actions: ANALYSIS_ONLY
- Time horizon: next 30 minutes

# Required Sources
- Must use: on-chain state, holder distribution, dev-wallet behavior
- Freshness requirement: <= 60s

# Output Requirements
- Format: bullets
- Include: KNOWN, INFERRED, risk grade, invalidation, next step
```

### Pattern 2: Wallet Review

```md
# Task
Review this wallet's recent behavior and tell me whether it looks like smart flow, noisy momentum chasing, or likely insider activity.

# Context
- Wallet: `PUBLIC_WALLET`
- Allowed actions: ANALYSIS_ONLY
- Time horizon: last 7 days

# Output Requirements
- Format: memo
- Include: KNOWN transactions, LEARNED patterns, INFERRED behavioral read, confidence level
```

### Pattern 3: Trade Plan Review

```md
# Task
Stress-test this Solana trade plan before execution.

# Context
- Plan: `ENTRY / SIZE / STOP / TP / THESIS`
- Allowed actions: ASK_BEFORE_EXECUTION
- Constraints: preserve capital first

# Output Requirements
- Format: table
- Include: hidden risks, invalidation, slippage concerns, sizing critique, final verdict
```

---

## One Good Default

If you want one compact live prompt that works well with the `SOUL.md` engine, use this:

```md
# Task
Help me with this Solana decision.

# Context
- Goal: `WHAT I AM TRYING TO DECIDE`
- Asset / wallet / protocol: `TARGET`
- Allowed actions: `ANALYSIS_ONLY | ASK_BEFORE_EXECUTION`
- Time horizon: `TIMEFRAME`
- Constraints: `RISK / VENUE / CAPITAL LIMITS`

# Rules
- Separate KNOWN from INFERRED
- Do not fake real-time certainty
- Preserve capital before upside
- Ask before anything irreversible

# Output
- Verdict
- Evidence
- Risks
- Invalidation
- Next step
```
