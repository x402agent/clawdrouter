# Migrate from OpenClaw to solana-clawd

This guide walks you through migrating an existing **OpenClaw** (or legacy `~/.clawdbot/` / `~/.moldbot/`) installation to **solana-clawd v1.4+**. The `clawd migrate` command handles the heavy lifting automatically, but this document explains what happens under the hood and how to verify the result.

> **solana-clawd** is a Solana-native agentic engine with 31 MCP tools, blockchain buddies, OODA trading loops, and 3-tier epistemological memory. If you were using OpenClaw for general-purpose agent work and want to keep that config while gaining Solana superpowers, this migration is for you.

---

## Table of Contents

- [Quick Start](#quick-start)
- [What Gets Migrated](#what-gets-migrated)
- [Solana-Specific Migration](#solana-specific-migration)
- [Config Key Mappings](#config-key-mappings)
- [API Key Resolution Order](#api-key-resolution-order)
- [What Gets Archived](#what-gets-archived)
- [After Migration Checklist](#after-migration-checklist)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

### Preview first (recommended)

```bash
clawd migrate --dry-run
```

This scans your system for OpenClaw / legacy config directories and prints a detailed plan of what will be copied, converted, or skipped -- without touching any files.

Example output:

```text
[dry-run] Detected source: ~/.clawdbot (OpenClaw v0.8.3)
[dry-run] SOUL.md -> ~/.clawd/SOUL.md (merge with existing: no)
[dry-run] MEMORY.md -> 3-tier memory conversion:
           14 KNOWN entries  (ephemeral, will expire in 60s)
           31 LEARNED entries (-> Honcho persistent store)
            9 INFERRED entries (-> local vault markdown)
[dry-run] 7 skills -> ~/.clawd/skills/openclaw-imports/
[dry-run] mcp_servers.json -> ~/.clawd/mcp_servers.json (3 servers)
[dry-run] model: gpt-4-turbo -> openrouter (minimax/minimax-m2.7)
[dry-run] wallet: paper_trading -> buddy wallet migration
[dry-run] 2 Helius webhooks detected
[dry-run] No files were modified. Run `clawd migrate` to apply.
```

### Apply the migration

```bash
clawd migrate
```

Add `--verbose` for step-by-step output, or `--source <path>` to point at a non-default config directory:

```bash
clawd migrate --source ~/.moldbot --verbose
```

### Additional flags

| Flag | Description |
|------|-------------|
| `--dry-run` | Preview changes without writing anything |
| `--source <path>` | Override auto-detected source directory |
| `--no-backup` | Skip creating a `.bak` of the source (not recommended) |
| `--force` | Overwrite existing `~/.clawd/` files without prompting |
| `--skip-memory` | Migrate config and skills only, leave memory untouched |
| `--skip-wallet` | Do not migrate wallet configs or paper trading state |
| `--verbose` | Print every file operation |

---

## What Gets Migrated

### 1. Persona (SOUL.md)

| Source | Destination |
|--------|-------------|
| `~/.clawdbot/SOUL.md` | `~/.clawd/SOUL.md` |
| `~/.moldbot/persona.md` | `~/.clawd/SOUL.md` |
| `~/.openclaw/agent.yaml` `persona:` field | `~/.clawd/SOUL.md` |

The migrator preserves your custom persona text and wraps it in solana-clawd's SOUL.md format, which includes the epistemological model headers (`## How I Think`, `## My Principles`, etc.). Your original persona content is inserted under `## Who I Am (migrated)`.

If `~/.clawd/SOUL.md` already exists, the migrator appends a `## Legacy Persona (OpenClaw)` section rather than overwriting.

### 2. Memory (MEMORY.md / memory.json)

OpenClaw stores memory as a flat markdown file or JSON array. solana-clawd uses a **3-tier epistemological memory model**:

| OpenClaw Memory Type | solana-clawd Tier | Storage | Behavior |
|----------------------|-------------------|---------|----------|
| Timestamped facts, API snapshots | **KNOWN** | Ephemeral session state | Expires ~60s; live data only |
| User preferences, learned patterns | **LEARNED** | Honcho persistent store | Durable, cross-session, high trust |
| Hypotheses, weak correlations | **INFERRED** | Local vault (markdown) | Tentative, revisable |

The migrator classifies each memory entry using pattern matching:

- Entries containing price data, balances, or timestamps -> **KNOWN** (marked as already-expired since they are stale)
- Entries about user preferences, trading patterns, or repeated observations -> **LEARNED**
- Everything else -> **INFERRED**

Each converted entry includes a `source: "openclaw-migration"` tag and the original creation timestamp.

```text
~/.clawd/memory/
  learned.jsonl        # LEARNED tier (syncs to Honcho on next session)
  inferred/            # INFERRED tier (searchable markdown vault)
    openclaw-import-001.md
    openclaw-import-002.md
    ...
```

### 3. Skills

| Source | Destination |
|--------|-------------|
| `~/.clawdbot/skills/*.md` | `~/.clawd/skills/openclaw-imports/` |
| `~/.openclaw/plugins/*.yaml` | `~/.clawd/skills/openclaw-imports/` (converted to SKILL.md) |

OpenClaw skills are converted to solana-clawd's `SKILL.md` format with YAML frontmatter:

```yaml
---
name: my-openclaw-skill
description: "Migrated from OpenClaw"
version: "1.0.0-migrated"
author: "openclaw-migration"
tags: ["migrated", "openclaw"]
permissionLevel: "safe"
enabled: true
---

<!-- Original skill content below -->
```

The skill registry automatically picks up files from `~/.clawd/skills/openclaw-imports/` on next launch.

### 4. MCP Servers Config

| Source | Destination |
|--------|-------------|
| `~/.clawdbot/mcp_servers.json` | `~/.clawd/mcp_servers.json` |
| `~/.openclaw/mcp.yaml` | `~/.clawd/mcp_servers.json` (converted) |

Server entries are preserved as-is. The migrator validates each server's `command` and `args` fields and warns if binaries are not found on `$PATH`.

### 5. Model and Provider Config

OpenClaw's model configuration is mapped to solana-clawd's tri-provider model catalog:

| OpenClaw `model` | solana-clawd `model.id` | Provider |
|-------------------|--------------------------|----------|
| `gpt-4-turbo` | `minimax/minimax-m2.7` | `openrouter` |
| `gpt-4o` | `minimax/minimax-m2.7` | `openrouter` |
| `gpt-3.5-turbo` | `openai/gpt-5.4-nano` | `openrouter` |
| `claude-3-opus` | `claude-sonnet-4-6` | `anthropic` |
| `claude-3-sonnet` | `claude-sonnet-4-6` | `anthropic` |
| `claude-3-haiku` | `claude-sonnet-4-6` | `anthropic` |
| `grok-*` | `grok-4-1-fast` | `xai` |
| Any OpenRouter model ID | Preserved as-is | `openrouter` |

If the source config specifies a custom OpenRouter model ID, it is carried forward directly.

### 6. Agent Behavior

| OpenClaw Setting | solana-clawd Equivalent | Notes |
|------------------|-------------------------|-------|
| `timeout: 300` | `maxTurns: 25` | Rough conversion: 12s per turn average |
| `timeout: 600` | `maxTurns: 50` | Adjustable post-migration |
| `auto_approve: true` | `permissionMode: "auto"` | Auto-approve reads, ask for writes |
| `auto_approve: false` | `permissionMode: "ask"` | Default; prompt before irreversible actions |
| `sandbox: true` | `permissionMode: "readOnly"` | Deny all writes/trades at engine level |
| `dangerous_mode: true` | `permissionMode: "bypassAll"` | Dev only; skip all permission checks |
| `allowed_tools: [...]` | `alwaysAllowTools: [...]` | Tool names auto-approved in session |
| `denied_tools: [...]` | `alwaysDenyTools: [...]` | Tool names always rejected |

Permission rules in solana-clawd use a **deny-first** evaluation order: `deny > ask > allow > default`.

### 7. Blockchain-Specific Config

| OpenClaw Setting | solana-clawd Equivalent |
|------------------|-------------------------|
| `rpc_url` | `SOLANA_RPC_URL` env / `helius.cluster` config |
| `helius_key` | `HELIUS_API_KEY` env / `helius.apiKey` config |
| `wallet_path` | Buddy wallet system |
| `network: mainnet` | `helius.cluster: "mainnet"` |
| `network: devnet` | `helius.cluster: "devnet"` |

---

## Solana-Specific Migration

### Wallet Migration

OpenClaw wallet configurations are migrated to solana-clawd's Buddy Wallet system. Paper trading wallets are migrated automatically. **Live wallet private keys are never read, copied, or stored** by the migrator.

If your OpenClaw config references a live wallet keypair file, the migrator logs a warning and skips it:

```text
[warn] Skipping live wallet keypair at ~/.clawdbot/wallet.json
       solana-clawd does not store private keys. Use permissionMode: "ask"
       and connect your wallet through the MCP client at runtime.
```

### Buddy Companion Migration

If you had companion or pet configurations in OpenClaw, they map to solana-clawd's Blockchain Buddy system. If the source companion type does not map to any blockchain species, the migrator defaults to `soldog` and preserves the original type name in a `migrationNote` field.

### Trading Personality Profiles

| OpenClaw Strategy | solana-clawd Personality | Risk Tolerance |
|-------------------|--------------------------|----------------|
| `conservative` | `diamond_hands` | `low` |
| `moderate` | `sniper` | `medium` |
| `aggressive` | `degen` | `high` |
| `scalper` | `bot` | `medium` |
| `swing` | `ninja` | `medium` |
| `hodl` | `diamond_hands` | `low` |
| `yolo` | `ape` | `degen` |

### OODA Strategy Configs

```text
OpenClaw loop:
  scan -> analyze -> trade -> sleep

solana-clawd OODA cycle:
  observe -> orient -> decide -> act -> learn -> idle
```

The migrator converts loop timing settings:

```yaml
# OpenClaw
loop_interval: 30
max_iterations: 100

# Becomes (solana-clawd)
ooda:
  cycleDurationMs: 30000
  maxCycles: 100
  learnAfterEveryAct: true
  autoStartOnBoot: false
```

### Helius Webhook Migration

If your OpenClaw config includes Helius webhook definitions, they are migrated to solana-clawd's `HeliusWebhookConfig` format. The migrator does **not** re-register webhooks with Helius. It writes the config so solana-clawd can manage them on next launch.

---

## Config Key Mappings

| OpenClaw Key | solana-clawd Key | Type | Notes |
|--------------|------------------|------|-------|
| `model` | `model.id` | `string` | See model mapping |
| `provider` | `model.provider` | provider | |
| `api_key` | `ANTHROPIC_API_KEY` / `OPENROUTER_API_KEY` / `XAI_API_KEY` | env | |
| `temperature` | `model.temperature` | `number` | Preserved |
| `max_tokens` | `model.maxTokens` | `number` | |
| `system_prompt` | `SOUL.md` | file | Converted |
| `memory_file` | `memory/learned.jsonl` + `memory/inferred/` | dir | 3-tier split |
| `timeout` | `maxTurns` | `number` | |
| `auto_approve` | `permissionMode` | mode | |
| `allowed_tools` | `alwaysAllowTools` | `string[]` | |
| `denied_tools` | `alwaysDenyTools` | `string[]` | |
| `mcp_servers` | `mcp_servers.json` | file | Direct copy |
| `rpc_url` | `SOLANA_RPC_URL` | env | |
| `helius_key` | `HELIUS_API_KEY` | env | |
| `network` | `helius.cluster` | `mainnet` or `devnet` | |

---

## API Key Resolution Order

solana-clawd resolves API keys in this priority order:

```text
1. Explicit config    ~/.clawd/config.json
2. Environment var    ANTHROPIC_API_KEY=sk-...
3. .env file          ~/.clawd/.env
4. Auth profile       ~/.clawd/auth/anthropic.json
5. System keychain    (macOS Keychain / Linux secret-service, if available)
```

The migrator checks for API keys in your OpenClaw config and places them in `~/.clawd/.env` by default. It does **not** write keys to `config.json` to avoid accidental git commits.

---

## What Gets Archived

Some OpenClaw features have no direct equivalent in solana-clawd. These are copied to `~/.clawd/archive/openclaw/` for reference but are not actively used.

| OpenClaw Feature | Why It Is Archived | Alternative in solana-clawd |
|------------------|--------------------|-----------------------------|
| `chat_history/` | Uses session-scoped tool call records instead | Use memory tiers |
| `fine_tune_data/` | No fine-tuning pipeline | Use SKILL.md files |
| `embeddings/` | Uses pattern-based memory extraction instead | LEARNED + INFERRED |
| `custom_functions/` | Replaced by MCP tool protocol | Convert to MCP or SKILL |
| `proxy_config` | Direct provider access | Set `HTTP_PROXY` |
| `telemetry_config` | No telemetry | -- |
| `team_config` | No multi-user support | Single-agent model |

---

## After Migration Checklist

Run through this checklist after `clawd migrate` completes:

```bash
clawd doctor
clawd memory stats
clawd skills list
clawd mcp status
clawd config get model
clawd auth test
clawd helius status
clawd buddy show
clawd config get permissionMode
clawd ooda status
```

---

## Troubleshooting

### "No OpenClaw installation found"

The migrator checks these paths in order:

1. `~/.clawdbot/`
2. `~/.moldbot/`
3. `~/.openclaw/`
4. `~/.config/openclaw/`

If your config lives elsewhere, use `--source`.

### "Memory conversion failed: unsupported format"

Supported formats:

- `MEMORY.md`
- `memory.json`
- `memory.jsonl`

### "Model not found in catalog"

If your OpenClaw model is not in the mapping table, the migrator defaults to `minimax/minimax-m2.7` via OpenRouter. Override post-migration:

```bash
clawd config set model.id "claude-sonnet-4-6"
clawd config set model.provider "anthropic"
```

### Rolling back

The migrator creates a backup of your source directory before modifying anything:

```bash
rm -rf ~/.clawd
mv ~/.clawdbot.bak ~/.clawdbot
```

---

## Further Reading

- [SOUL.md](../SOUL.md) -- solana-clawd's identity and epistemological model

---

*solana-clawd v1.4.0 -- MIT -- github.com/x402agent/solana-clawd*
